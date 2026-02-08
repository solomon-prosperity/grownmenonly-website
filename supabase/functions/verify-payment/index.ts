/// <reference lib="deno.ns" />

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

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!paystackKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
        },
      },
    );

    const paystackData = await paystackRes.json();
    console.log(
      "Paystack Verification Response:",
      JSON.stringify(paystackData, null, 2),
    );

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Paystack verification failed");
    }

    const status = paystackData.data.status; // 'success', 'failed', 'abandoned', 'reversed', 'ongoing', 'pending'

    if (status === "success") {
      // Success: Do not update DB, let webhook handle it.
      return new Response(JSON.stringify({ status: "success" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (status === "ongoing" || status === "pending") {
      // Pending
      return new Response(JSON.stringify({ status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Failed / Abandoned / Reversed
      console.log(
        `Payment failed with status: ${status}. Updating database...`,
      );

      // Update DB to return stock and mark as failed
      const { error: rpcError } = await supabase.rpc(
        "handle_paystack_webhook_v2",
        {
          p_reference: reference, // This is the Transaction ID
          p_success: false,
          p_raw_response: paystackData.data,
        },
      );

      if (rpcError) {
        console.error("RPC Error during failure update:", rpcError);
      }

      return new Response(
        JSON.stringify({
          status: "failed",
          message: paystackData.data.gateway_response || "Payment failed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Verification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
