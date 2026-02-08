-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Tables (Ensuring they exist before the functions use them)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    customer_name TEXT,
    phone TEXT,
    address TEXT,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'abandoned'
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    reference UUID NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RPC: create_order_secure
-- Atomically checks stock, reserves it, and creates the order/transaction
-- Usage: const { data } = await supabase.rpc('create_order_secure', { p_email: '...', p_items: [...] })
-- CREATE OR REPLACE FUNCTION create_order_secure(p_email TEXT, p_items JSONB, p_customer_name TEXT,
--   p_phone TEXT,
--   p_address TEXT)
-- RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE
--     v_order_id UUID;
--     v_transaction_id UUID;
--     v_total NUMERIC := 0;
--     v_item JSONB;
--     v_product_id UUID;
--     v_qty INT;
--     v_price NUMERIC;
-- BEGIN
--     FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
--         v_product_id := (v_item->>'id')::UUID;
--         v_qty := (v_item->>'quantity')::INT;

--         IF NOT EXISTS (
--             SELECT 1 FROM products
--             WHERE id = v_product_id AND stock >= v_qty
--         ) THEN
--             RAISE EXCEPTION 'Product % is out of stock or insufficient quantity', v_item->>'id';
--         END IF;
--     END LOOP;

--     -- 1. Create order
--     INSERT INTO orders (email, total, status, customer_name, phone, address)
--     VALUES (p_email, 0, 'pending', p_customer_name, p_phone, p_address)
--     RETURNING id INTO v_order_id;

--     -- 2. Process items and reserve stock
--     FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
--         v_product_id := (v_item->>'id')::UUID;
--         v_qty := (v_item->>'quantity')::INT;

--         -- Atomic stock decrement and get current price
--         UPDATE products
--         SET stock = stock - v_qty
--         WHERE id = v_product_id AND stock >= v_qty
--         RETURNING price INTO v_price;

--         IF v_price IS NULL THEN
--             RAISE EXCEPTION 'Concurrency error: Stock changed for product %', v_product_id;
--         END IF;

--         v_total := v_total + (v_price * v_qty);

--         INSERT INTO order_items (order_id, product_id, quantity, price)
--         VALUES (v_order_id, v_product_id, v_qty, v_price);
--     END LOOP;

--     -- 3. Update order total
--     UPDATE orders SET total = v_total WHERE id = v_order_id;

--     -- 4. Create transaction (Reference set to Transaction ID)
--     v_transaction_id := gen_random_uuid();
--     INSERT INTO transactions (id, order_id, reference, amount, status)
--     VALUES (v_transaction_id, v_order_id, v_transaction_id, v_total, 'pending');

--     RETURN jsonb_build_object(
--         'order_id', v_order_id,
--         'transaction_id', v_transaction_id,
--         'amount', v_total,
--         'expires_at', (SELECT expires_at FROM orders WHERE id = v_order_id)
--     );
-- END;
-- $$;

CREATE OR REPLACE FUNCTION create_order_secure(
    p_email TEXT,
    p_items JSONB,
    p_customer_name TEXT,
    p_phone TEXT,
    p_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_transaction_id UUID;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID; -- Fixed from UUID to INT to match products(id)
    v_qty INT;
    v_price NUMERIC; -- original price
    v_discount_active BOOLEAN;
    v_discount_type TEXT;
    v_discount_value NUMERIC;
    v_final_price NUMERIC;
    v_reserved_at TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Create the order and capture timestamps
    INSERT INTO orders (
        email,
        total,
        status,
        customer_name,
        phone,
        address,
        reserved_at,
        expires_at
    )
    VALUES (
        p_email,
        0,
        'pending',
        p_customer_name,
        p_phone,
        p_address,
        NOW(),
        NOW() + INTERVAL '15 minutes'
    )
    RETURNING
        id,
        reserved_at,
        expires_at
    INTO
        v_order_id,
        v_reserved_at,
        v_expires_at;

    -- 2. Process items and reserve stock atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'id')::UUID; -- Match frontend payload 'id'
        v_qty := (v_item->>'quantity')::INT;

        -- Atomic stock decrement and get current price/discount info
        UPDATE products
        SET stock = stock - v_qty
        WHERE id = v_product_id AND stock >= v_qty
        RETURNING price, discount_active, discount_type, discount_value 
        INTO v_price, v_discount_active, v_discount_type, v_discount_value;

        IF v_price IS NULL THEN
            RAISE EXCEPTION 'Product % is out of stock or insufficient quantity', v_product_id;
        END IF;

        -- Calculate final price server-side
        v_final_price := v_price;
        IF v_discount_active THEN
            IF v_discount_type = 'percentage' THEN
                v_final_price := v_price * (1 - v_discount_value / 100);
            ELSIF v_discount_type = 'fixed' THEN
                v_final_price := v_price - v_discount_value;
            END IF;
            v_final_price := GREATEST(0, v_final_price);
        END IF;

        v_total := v_total + (v_final_price * v_qty);

        INSERT INTO order_items (
            order_id, 
            product_id, 
            quantity, 
            price, 
            original_price, 
            discount_type, 
            discount_value
        )
        VALUES (
            v_order_id, 
            v_product_id, 
            v_qty, 
            v_final_price, 
            v_price, 
            v_discount_type, 
            v_discount_value
        );
    END LOOP;

    -- 3. Update order total
    UPDATE orders
    SET total = v_total
    WHERE id = v_order_id;

    -- 4. Create transaction (Reference is Transaction UUID)
    v_transaction_id := gen_random_uuid();
    INSERT INTO transactions (id, order_id, reference, amount, status)
    VALUES (v_transaction_id, v_order_id, v_transaction_id, v_total, 'pending');

    -- 5. Return full info to frontend
    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'transaction_id', v_transaction_id,
        'amount', v_total,
        'reserved_at', v_reserved_at,
        'expires_at', v_expires_at
    );
END;
$$;


-- Ensure reference column is UUID (if it was created as TEXT in an older version)
DO $$ 
BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference') = 'text' THEN
        ALTER TABLE transactions ALTER COLUMN reference TYPE UUID USING reference::uuid;
    END IF;
END $$;

-- 3. RPC: handle_paystack_webhook
-- Handles payment verification and stock return if failed/expired
-- CREATE OR REPLACE FUNCTION handle_paystack_webhook_v2(
--     p_reference TEXT,  -- <-- change to TEXT
--     p_success BOOLEAN,
--     p_raw_response JSONB
-- )
-- RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
-- DECLARE
--     v_order_id UUID;
--     v_expires_at TIMESTAMPTZ;
--     v_status TEXT;
-- BEGIN
--     -- Cast the text to UUID when querying
--     SELECT order_id, status INTO v_order_id, v_status
--     FROM transactions
--     WHERE id = p_reference::uuid FOR UPDATE;

--     IF NOT FOUND OR v_status <> 'pending' THEN
--         RETURN;
--     END IF;

--     SELECT expires_at INTO v_expires_at
--     FROM orders WHERE id = v_order_id FOR UPDATE;

--     IF p_success AND NOW() <= v_expires_at THEN
--         -- Success
--         UPDATE transactions SET status = 'success', raw_response = p_raw_response WHERE id = p_reference::uuid;
--         UPDATE orders SET status = 'paid' WHERE id = v_order_id;
--     ELSE
--         -- Failed/Expired
--         UPDATE transactions SET status = 'failed', raw_response = p_raw_response WHERE id = p_reference::uuid;
--         UPDATE orders SET status = 'abandoned' WHERE id = v_order_id;
        
--         -- Return stock
--         UPDATE products p
--         SET stock = p.stock + oi.quantity
--         FROM order_items oi
--         WHERE p.id = oi.product_id AND oi.order_id = v_order_id;
--     END IF;
-- END;
-- $$;

CREATE OR REPLACE FUNCTION handle_paystack_webhook_v2(p_reference TEXT, p_success BOOLEAN, p_raw_response JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order_id UUID;
    v_order_status TEXT;
    v_item RECORD;
    v_stock_issue BOOLEAN := FALSE;
BEGIN
    -- 1. Lock the transaction
    SELECT order_id INTO v_order_id
    FROM transactions
    WHERE id = p_reference::uuid AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE NOTICE 'Transaction not found: %', p_reference;
        RETURN;
    END IF;

    -- 2. Mark transaction as success if payment succeeded
    IF p_success THEN
        UPDATE transactions
        SET status = 'success', raw_response = p_raw_response
        WHERE id = p_reference::uuid;
    ELSE
        -- Payment failed
        UPDATE transactions
        SET status = 'failed', raw_response = p_raw_response
        WHERE id = p_reference::uuid;

        UPDATE orders
        SET status = 'abandoned'
        WHERE id = v_order_id;

        -- Return stock for pending/failed orders
        UPDATE products p
        SET stock = p.stock + oi.quantity
        FROM order_items oi
        WHERE p.id = oi.product_id AND oi.order_id = v_order_id;

        RETURN;
    END IF;

    -- 3. Check order status
    SELECT status INTO v_order_status FROM orders WHERE id = v_order_id FOR UPDATE;

    IF v_order_status = 'pending' THEN
        UPDATE orders SET status = 'paid' WHERE id = v_order_id;
        RETURN;
    ELSIF v_order_status = 'abandoned' THEN
        -- 4. Re-reserve stock
        FOR v_item IN
            SELECT product_id, quantity FROM order_items WHERE order_id = v_order_id
        LOOP
            -- Only subtract if current stock >= quantity
            IF (SELECT stock FROM products WHERE id = v_item.product_id) >= v_item.quantity THEN
                UPDATE products
                SET stock = stock - v_item.quantity
                WHERE id = v_item.product_id;
            ELSE
                v_stock_issue := TRUE;
            END IF;
        END LOOP;

        IF v_stock_issue THEN
            UPDATE orders SET status = 'inventory_issue' WHERE id = v_order_id;
        ELSE
            UPDATE orders SET status = 'paid' WHERE id = v_order_id;
        END IF;
    END IF;

END;
$$;




-- 4. RPC: cleanup_stale_orders
-- Returns stock from expired pending orders
CREATE OR REPLACE FUNCTION cleanup_stale_orders()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_count INT := 0;
    v_order_id UUID;
BEGIN
    FOR v_order_id IN 
        UPDATE orders 
        SET status = 'abandoned' 
        WHERE status = 'pending' AND expires_at < NOW() 
        RETURNING id 
    LOOP
        -- Return stock
        UPDATE products p
        SET stock = p.stock + oi.quantity
        FROM order_items oi
        WHERE p.id = oi.product_id AND oi.order_id = v_order_id;

        -- Mark transaction as failed
        UPDATE transactions SET status = 'failed' WHERE order_id = v_order_id AND status = 'pending';
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;
