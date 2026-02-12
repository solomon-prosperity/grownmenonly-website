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
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !flutterwaveKey) {
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

    // Fetch logo URL from settings (optional)
    const { data: logoSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "flutterwave_logo")
      .single();

    const logoUrl = logoSetting?.value || "https://sjnqzymcvbhagdepxecz.supabase.co/storage/v1/object/public/assets/logo.png";

    // Call atomic RPC for stock reservation and order creation
    console.log("Calling RPC create_order_secure...");
    const { data, error: rpcError } = await supabase.rpc(
      "create_order_secure",
      {
        p_email: email,
        p_items: items, // Pass raw items, RPC handles price/discount calculation
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

    console.log("Initializing Flutterwave transaction...");
    const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flutterwaveKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: transaction_id,
        amount: amount, // Flutterwave accepts float amounts (Naira)
        currency: "NGN",
        redirect_url: `${req.headers.get("origin") || "http://localhost:3000"}/success`,
        customer: {
          email: email,
          phonenumber: phone,
          name: customer_name,
        },
        customizations: {
          title: "Grown Men Only Brands Limited",
          logo: logoUrl,
        },
      }),
    });

    const flwData = await flwResponse.json();
    console.log("Flutterwave Response:", JSON.stringify(flwData, null, 2));

    if (flwData.status !== "success") {
      console.error("Flutterwave Error:", flwData.message);
      throw new Error(flwData.message || "Payment initialization failed");
    }

    return new Response(
      JSON.stringify({
        url: flwData.data.link,
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
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes("required") ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
