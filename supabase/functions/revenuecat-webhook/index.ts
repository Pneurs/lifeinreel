// RevenueCat webhook handler — syncs subscription state to profiles table.
// Verifies a shared secret in the Authorization header before processing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

const INACTIVE_TYPES = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "BILLING_ISSUE",
  "REFUND",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_HEADER");
    const incomingAuth = req.headers.get("authorization") ?? "";

    if (!expectedAuth) {
      console.error("Missing REVENUECAT_WEBHOOK_AUTH_HEADER secret");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept either raw secret or "Bearer <secret>"
    const normalized = incomingAuth.replace(/^Bearer\s+/i, "").trim();
    const expected = expectedAuth.replace(/^Bearer\s+/i, "").trim();

    if (normalized !== expected) {
      console.warn("Unauthorized webhook attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event = payload?.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId: string | undefined = event.app_user_id;
    const eventType: string = event.type ?? "UNKNOWN";
    const productId: string | null = event.product_id ?? null;
    const store: string | null = event.store ?? null;
    const environment: string | null = event.environment ?? null;
    const expirationMs: number | null = event.expiration_at_ms ?? null;
    const occurredAtMs: number = event.event_timestamp_ms ?? Date.now();

    if (!userId) {
      console.warn("Webhook event missing app_user_id", eventType);
      return new Response(JSON.stringify({ ok: true, skipped: "no app_user_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Audit log first — always record the event
    await supabase.from("premium_events").insert({
      user_id: userId,
      event_type: eventType,
      product_id: productId,
      store,
      environment,
      raw_event: payload,
      occurred_at: new Date(occurredAtMs).toISOString(),
    });

    // Decide premium state
    let isPremium: boolean | null = null;
    if (ACTIVE_TYPES.has(eventType)) isPremium = true;
    else if (INACTIVE_TYPES.has(eventType)) isPremium = false;

    // Lifetime / non-renewing detection (e.g., one-time unlock)
    const isLifetime =
      eventType === "NON_RENEWING_PURCHASE" ||
      (productId?.toLowerCase().includes("lifetime") ?? false);

    const updates: Record<string, unknown> = {
      revenuecat_customer_id: userId,
      premium_updated_at: new Date().toISOString(),
    };
    if (isPremium !== null) updates.is_premium = isPremium;
    if (productId) updates.active_product_id = productId;
    if (expirationMs) updates.premium_expires_at = new Date(expirationMs).toISOString();
    if (isLifetime && isPremium) updates.lifetime_purchase = true;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processed ${eventType} for user ${userId} → premium=${isPremium}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
