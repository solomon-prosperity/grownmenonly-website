import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      throw new Error("Transaction reference is required");
    }

    const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!flutterwaveKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify with Flutterwave
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${flutterwaveKey}`,
        },
      },
    );

    const flwData = await flwRes.json();
    console.log(
      "Flutterwave Verification Response:",
      JSON.stringify(flwData, null, 2),
    );

    if (flwData.status !== "success") {
      throw new Error(flwData.message || "Flutterwave verification failed");
    }

    const status = flwData.data.status; // 'successful', 'failed'
    const success =
      status === "successful" &&
      flwData.data.charged_amount >= flwData.data.amount;

    if (success) {
      // Success: Do not update DB, let webhook handle it.
      return new Response(JSON.stringify({ status: "success" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Failed
      console.log(
        `Payment failed with status: ${status}. Updating database...`,
      );

      // Update DB to return stock and mark as failed
      const { error: rpcError } = await supabase.rpc("handle_payment_webhook", {
        p_reference: reference, // This is the Transaction ID
        p_success: false,
        p_raw_response: flwData.data,
      });

      if (rpcError) {
        console.error("RPC Error during failure update:", rpcError);
      }

      return new Response(
        JSON.stringify({
          status: "failed",
          message: flwData.message || "Payment failed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Verification error:", message);
    return new Response(
      JSON.stringify({
        status: "failed",
        message: "Payment verification failed.",
      }),
      {
        status: 200, // Return 200 so the client can parse the error message
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
