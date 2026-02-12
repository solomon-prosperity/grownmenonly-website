-- Rename the function to be more generic and compatible with Flutterwave
-- We drop the old one and create the new one to ensure clean signature

DROP FUNCTION IF EXISTS handle_paystack_webhook_v2(TEXT, BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION handle_payment_webhook(p_reference TEXT, p_success BOOLEAN, p_raw_response JSONB)
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
