import { createClient } from "@supabase/supabase-js";

const FLUTTERWAVE_SECRET_HASH = Deno.env.get("FLUTTERWAVE_SECRET_HASH") ?? "";

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("verif-hash");
  const bodyText = await req.text();
  console.log("Webhook received:", bodyText, signature);

  // 1. Verify Secret Hash
  if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
    console.warn("Invalid webhook signature");
    // Return 200 to acknowledge receipt but stop processing (prevents retries for bad requests)
    // Or 401 if you want them to retry (but usually bad signature means bad config)
    return new Response("Unauthorized", { status: 401 });
  }

  const event = JSON.parse(bodyText);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Flutterwave payload structure: event.data.tx_ref, event.data.status
  // Event type check: event.event === 'charge.completed'
  // Note: Flutterwave sends 'charge.completed' for successful payments.

  const reference = event.txRef || event.data.tx_ref;
  const status = event.status || event.data.status;
  const chargedAmount = event.charged_amount || event.data.charged_amount;
  const amount = event.amount || event.data.amount;
  const success =
    status === "successful" && chargedAmount >= amount;

  console.log(
    "Processing webhook for reference:",
    reference,
    success,
    status,
    event,
  );

  // Call generic payment handler RPC
  const { error } = await supabase.rpc("handle_payment_webhook", {
    p_reference: reference, // tx_ref should match our Transaction ID (UUID)
    p_success: success,
    p_raw_response: event,
  });

  if (error) {
    console.error("Webhook processing failed:", error);
    return new Response(error.message, { status: 400 });
  }

  return new Response("Event Processed", { status: 200 });
});
