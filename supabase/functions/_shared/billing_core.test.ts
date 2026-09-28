// Tests du cœur de la monétisation hybride.
// Lancer : deno test supabase/functions/_shared/billing_core.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  appUserIdFromCheckoutSession,
  appUserIdsFromRcEvent,
  constantTimeEqual,
  deriveBillingStatus,
  encodeStripeForm,
  isPlanCode,
  parseOrigins,
  resolveReturnOrigin,
  RC_ENTITLEMENT,
  stripeHistoryVerdict,
} from "./billing_core.ts";

const UID = "3f2b6a1e-8c4d-4e5f-9a0b-1c2d3e4f5a6b";
const NOW = new Date("2026-09-26T12:00:00Z");

Deno.test("plans : whitelist stricte", () => {
  assertEquals(isPlanCode("mensuel"), true);
  assertEquals(isPlanCode("annuel"), true);
  for (const ko of ["MENSUEL", "hebdo", "", null, 42]) assertEquals(isPlanCode(ko), false);
});

Deno.test("origines : seules les origines listées sont acceptées", () => {
  const allowed = parseOrigins("https://app.example.com, http://localhost:3001/");
  assertEquals(allowed, ["https://app.example.com", "http://localhost:3001"]);
  assertEquals(resolveReturnOrigin("http://localhost:3001", allowed), "http://localhost:3001");
  assertEquals(resolveReturnOrigin("https://evil.example", allowed), "https://app.example.com");
  assertEquals(resolveReturnOrigin(null, allowed), "https://app.example.com");
  // CSV vide ou invalide → liste par défaut
  assertEquals(parseOrigins("").length > 0, true);
  assertEquals(parseOrigins("javascript:alert(1)").includes("javascript:alert(1)"), false);
});

Deno.test("encodage Stripe : objets et tableaux imbriqués", () => {
  const body = encodeStripeForm({
    mode: "subscription",
    line_items: [{ price: "price_1", quantity: 1 }],
    subscription_data: { metadata: { app_user_id: UID }, trial_period_days: 30 },
    skipped: undefined,
  });
  const p = new URLSearchParams(body);
  assertEquals(p.get("mode"), "subscription");
  assertEquals(p.get("line_items[0][price]"), "price_1");
  assertEquals(p.get("line_items[0][quantity]"), "1");
  assertEquals(p.get("subscription_data[metadata][app_user_id]"), UID);
  assertEquals(p.get("subscription_data[trial_period_days]"), "30");
  assertEquals(p.has("skipped"), false);
});

Deno.test("état RC : abonnement Stripe en essai, actif", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: "2026-10-26T12:00:00Z", product_identifier: "prod_ABC" } },
    subscriptions: { prod_ABC: { store: "stripe", period_type: "trial", unsubscribe_detected_at: null } },
  }, NOW);
  assertEquals(s.active, true);
  assertEquals(s.store, "stripe");
  assertEquals(s.period_type, "trial");
  assertEquals(s.will_renew, true);
  assertEquals(s.ever_subscribed, true);
});

Deno.test("état RC : App Store annulé mais encore dans la période → actif, ne renouvelle pas", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: "2026-10-01T00:00:00Z", product_identifier: "thrive_moments_mensuel" } },
    subscriptions: {
      thrive_moments_mensuel: { store: "APP_STORE", period_type: "normal", unsubscribe_detected_at: "2026-09-20T00:00:00Z" },
    },
  }, NOW);
  assertEquals(s.active, true);
  assertEquals(s.store, "app_store");
  assertEquals(s.will_renew, false);
});

Deno.test("état RC : expiré → inactif, mais ever_subscribed (pas de second essai)", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: "2026-09-01T00:00:00Z", product_identifier: "thrive_moments:mensuel" } },
    subscriptions: { "thrive_moments:mensuel": { store: "play_store", period_type: "normal" } },
  }, NOW);
  assertEquals(s.active, false);
  assertEquals(s.ever_subscribed, true);
});

Deno.test("état RC : accès offert sans date de fin → actif", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: null, product_identifier: "rc_promo_thrive_moments_lifetime" } },
  }, NOW);
  assertEquals(s.active, true);
  assertEquals(s.store, "promotional");
});

Deno.test("état RC : aucun abonné → inactif, jamais abonné", () => {
  const s = deriveBillingStatus(null, NOW);
  assertEquals(s.active, false);
  assertEquals(s.ever_subscribed, false);
});

Deno.test("webhook RC : seuls les UUID Supabase sont resynchronisés, sans doublon", () => {
  const ids = appUserIdsFromRcEvent({
    app_user_id: UID,
    original_app_user_id: "$RCAnonymousID:abc",
    aliases: [UID.toUpperCase(), "$RCAnonymousID:abc"],
    transferred_to: ["not-a-uuid"],
  });
  assertEquals(ids, [UID]);
  assertEquals(appUserIdsFromRcEvent(null), []);
});

Deno.test("session Checkout : client_reference_id prioritaire, métadonnées en repli", () => {
  assertEquals(appUserIdFromCheckoutSession({ client_reference_id: UID }), UID);
  assertEquals(appUserIdFromCheckoutSession({ client_reference_id: null, metadata: { app_user_id: UID } }), UID);
  assertEquals(appUserIdFromCheckoutSession({ client_reference_id: "x", metadata: {} }), null);
});

Deno.test("comparaison à temps constant", () => {
  assertEquals(constantTimeEqual("abc", "abc"), true);
  assertEquals(constantTimeEqual("abc", "abd"), false);
  assertEquals(constantTimeEqual("abc", "ab"), false);
});

Deno.test("stripeHistoryVerdict : essai unique et refus du double abonnement", () => {
  assertEquals(stripeHistoryVerdict([]), { billable: false, everSubscribed: false });
  assertEquals(stripeHistoryVerdict(null), { billable: false, everSubscribed: false });
  // Checkout abandonné : ni facturable, ni « déjà abonné ».
  assertEquals(stripeHistoryVerdict([{ status: "incomplete_expired" }]), { billable: false, everSubscribed: false });
  // Ancien abonnement annulé : plus d'essai, mais nouveau checkout permis.
  assertEquals(stripeHistoryVerdict([{ status: "canceled" }]), { billable: false, everSubscribed: true });
  for (const status of ["trialing", "active", "past_due", "unpaid", "paused"]) {
    assertEquals(stripeHistoryVerdict([{ status }]), { billable: true, everSubscribed: true });
  }
});
