import { createClient } from "@supabase/supabase-js";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("x-paystack-signature");
  const bodyText = await req.text();
  console.log("Webhook received:", bodyText, signature, PAYSTACK_SECRET_KEY);

  // Verify HMAC signature
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"],
  );

  const isVerified = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToUint8Array(signature ?? ""),
    new TextEncoder().encode(bodyText),
  );

  if (!isVerified) return new Response("Unauthorized", { status: 401 });

  const event = JSON.parse(bodyText);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const reference = event.data.reference;
  const success = event.event === "charge.success";
  console.log(
    "Processing webhook for reference:",
    reference,
    success,
    event.data,
  );

  // Call atomic update RPC
  const { error } = await supabase.rpc("handle_paystack_webhook_v2", {
    p_reference: reference,
    p_success: success,
    p_raw_response: event.data,
  });

  if (error) {
    console.error("Webhook processing failed:", error);
    return new Response(error.message, { status: 400 });
  }

  return new Response("Event Processed");
});

function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) return new Uint8Array(0);
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}
