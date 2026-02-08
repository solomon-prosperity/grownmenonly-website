import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  const now = new Date().toISOString();
  console.log(`[${now}] Recieved ${req.method} request to ${req.url}`);

  if (req.method === "OPTIONS") {
    console.log("CORS preflight request received");
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    console.log("Processing POS request...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

    console.log("Environment Status:", {
      URL: supabaseUrl ? "FOUND" : "MISSING",
      SERVICE_KEY: supabaseServiceKey ? "FOUND" : "MISSING",
      PAYSTACK_KEY: paystackKey ? "FOUND" : "MISSING",
    });

    if (!supabaseUrl || !supabaseServiceKey || !paystackKey) {
      throw new Error("Missing required server-side environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body;
    try {
      body = await req.json();
      console.log("Decoded Request Body:", JSON.stringify(body, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to parse request JSON:", msg);
      throw new Error("Invalid JSON payload");
    }

    const { email, items, customer_name, phone, address } = body;

    if (!email || !items || !customer_name || !phone || !address) {
      console.error("Missing required fields");
      throw new Error("All delivery details and cart items are required");
    }

    // Call atomic RPC for stock reservation and order creation
    console.log("Calling RPC create_order_secure...");
    const { data, error: rpcError } = await supabase.rpc(
      "create_order_secure",
      {
        p_email: email,
        p_items: items,
        p_customer_name: customer_name,
        p_phone: phone,
        p_address: address,
      },
    );
    console.log("RPC raw data:", data);
    console.log("RPC raw error:", rpcError);
    if (rpcError) {
      console.error("RPC Error:", JSON.stringify(rpcError, null, 2));
      throw new Error(rpcError.message);
    }

    console.log("RPC Success. Data:", JSON.stringify(data, null, 2));

    const { transaction_id, amount, expires_at } = data;

    console.log("Initializing Paystack transaction...");
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Ensure integer (kobo)
          reference: transaction_id,
          callback_url: `${req.headers.get("origin") || "http://localhost:3000"}/success`,
        }),
      },
    );

    const paystackData = await paystackResponse.json();
    console.log("Paystack Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status) {
      console.error("Paystack Error:", paystackData.message);
      throw new Error(paystackData.message);
    }

    return new Response(
      JSON.stringify({
        url: paystackData.data.authorization_url,
        transaction_id,
        expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Critical Error in Checkout Function:", message);
    // return new Response(JSON.stringify({ error: message }), {
    //   status: 400,
    //   headers: { ...corsHeaders, "Content-Type": "application/json" },
    // });
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: message.includes("required") ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});