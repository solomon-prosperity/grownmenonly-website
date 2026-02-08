import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req: Request) => {
  // Simple check to prevent accidental public triggers
  // In production, use a custom secret header from the scheduler
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    // Optional: Only enforce if you want to strictly secure the trigger
    // return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabase.rpc("cleanup_stale_orders");

  if (error) {
    console.error("Cleanup job failed:", error);
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ abandoned_count: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
