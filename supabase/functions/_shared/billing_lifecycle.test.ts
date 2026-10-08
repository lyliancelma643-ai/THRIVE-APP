// Matrice du cycle de vie d'un abonnement P3, vue du serveur.
//
// Chaque scénario part d'un objet « subscriber » tel que le renvoie l'API
// RevenueCat v1 (GET /subscribers/{id}) à l'étape correspondante, et vérifie
// la ligne billing_subscriptions qui en découle (et donc l'accès à Maison :
// active && (expires_at null || expires_at > now), cf. migration 064).
//
// Ce que ces tests NE couvrent PAS : le comportement réel des stores (sandbox
// Apple, testeurs de licence Google) — voir docs/audit-abonnement-2026-10.md.
//
// Lancer : deno test supabase/functions/_shared/billing_lifecycle.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  appUserIdsFromRcEvent,
  deriveBillingStatus,
  RC_ENTITLEMENT,
  type RcSubscriber,
} from "./billing_core.ts";

const UID = "3f2b6a1e-8c4d-4e5f-9a0b-1c2d3e4f5a6b";
const UID2 = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const NOW = new Date("2026-10-01T12:00:00Z");
const IOS_M = "thrive_moments_mensuel";
const IOS_A = "thrive_moments_annuel";
const PLAY_M = "thrive_moments:mensuel";

function sub(
  product: string,
  store: string,
  expires: string | null,
  extra: Partial<NonNullable<RcSubscriber["subscriptions"]>[string]> = {},
): RcSubscriber {
  return {
    entitlements: { [RC_ENTITLEMENT]: { expires_date: expires, product_identifier: product } },
    subscriptions: {
      [product]: { store, period_type: "normal", expires_date: expires, unsubscribe_detected_at: null, ...extra },
    },
  };
}

/** Accès Maison tel que calculé par private.has_p3_subscription (migration 064). */
function hasAccess(s: ReturnType<typeof deriveBillingStatus>, now = NOW): boolean {
  return s.active && (s.expires_at === null || new Date(s.expires_at) > now);
}

Deno.test("E01 premier achat (iOS, mensuel) → accès, renouvellement prévu", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-11-01T12:00:00Z"), NOW);
  assertEquals([hasAccess(s), s.store, s.will_renew, s.ever_subscribed], [true, "app_store", true, true]);
});

Deno.test("E02 essai gratuit démarré (Android) → accès, period_type trial", () => {
  const s = deriveBillingStatus(
    sub(PLAY_M, "PLAY_STORE", "2026-10-31T12:00:00Z", { period_type: "TRIAL" }),
    NOW,
  );
  assertEquals([hasAccess(s), s.period_type, s.product_id], [true, "trial", PLAY_M]);
});

Deno.test("E03 conversion de l'essai → normal, nouvelle échéance", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-11-30T12:00:00Z"), NOW);
  assertEquals([hasAccess(s), s.period_type], [true, "normal"]);
});

Deno.test("E04 renouvellement → échéance repoussée, accès continu", () => {
  const before = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-10-01T13:00:00Z"), NOW);
  const after = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-11-01T13:00:00Z"), NOW);
  assertEquals([hasAccess(before), hasAccess(after)], [true, true]);
  // Sans le webhook de renouvellement, le miroir ferme l'accès à l'échéance :
  assertEquals(hasAccess(before, new Date("2026-10-01T13:00:01Z")), false);
});

Deno.test("E05 échec de paiement en période de grâce → accès conservé + alerte", () => {
  // RevenueCat : pendant la grâce, expires_date = fin de la période de grâce.
  const s = deriveBillingStatus(
    sub(IOS_M, "APP_STORE", "2026-10-07T12:00:00Z", {
      billing_issues_detected_at: "2026-09-30T12:00:00Z",
      unsubscribe_detected_at: "2026-09-30T12:00:00Z",
    }),
    NOW,
  );
  assertEquals([hasAccess(s), s.billing_issue_at !== null], [true, true]);
});

Deno.test("E06 grâce épuisée sans paiement (retry en cours côté store) → accès fermé", () => {
  const s = deriveBillingStatus(
    sub(IOS_M, "APP_STORE", "2026-09-30T12:00:00Z", { billing_issues_detected_at: "2026-09-23T12:00:00Z" }),
    NOW,
  );
  assertEquals(hasAccess(s), false);
  assertEquals(s.ever_subscribed, true); // plus d'essai gratuit web
});

Deno.test("E07 nouvelle tentative réussie → renouvellement, alerte levée", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-10-30T12:00:00Z"), NOW);
  assertEquals([hasAccess(s), s.billing_issue_at], [true, null]);
});

Deno.test("E08 annulation → accès jusqu'à la FIN de la période payée, sans renouvellement", () => {
  const s = deriveBillingStatus(
    sub(IOS_A, "APP_STORE", "2027-03-01T12:00:00Z", { unsubscribe_detected_at: "2026-10-01T11:00:00Z" }),
    NOW,
  );
  assertEquals([hasAccess(s), s.will_renew], [true, false]);
  assertEquals(hasAccess(s, new Date("2027-03-01T12:00:01Z")), false);
});

Deno.test("E09 expiration → accès fermé, historique conservé", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-09-01T12:00:00Z"), NOW);
  assertEquals([hasAccess(s), s.ever_subscribed], [false, true]);
});

Deno.test("E10 réabonnement après expiration → accès rouvert", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-11-01T12:00:00Z"), NOW);
  assertEquals(hasAccess(s), true);
});

Deno.test("E11 remboursement / révocation (Apple, Google, partage familial retiré) → accès fermé", () => {
  // RevenueCat ramène expires_date à la date du remboursement.
  const s = deriveBillingStatus(
    sub(IOS_A, "APP_STORE", "2026-10-01T10:00:00Z", { unsubscribe_detected_at: "2026-10-01T10:00:00Z" }),
    NOW,
  );
  assertEquals(hasAccess(s), false);
});

Deno.test("E12 changement de forfait (mensuel → annuel) → produit suivi, accès continu", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: "2027-10-01T12:00:00Z", product_identifier: IOS_A } },
    subscriptions: {
      [IOS_M]: { store: "APP_STORE", expires_date: "2026-10-01T11:00:00Z", unsubscribe_detected_at: null },
      [IOS_A]: { store: "APP_STORE", period_type: "NORMAL", expires_date: "2027-10-01T12:00:00Z" },
    },
  }, NOW);
  assertEquals([hasAccess(s), s.product_id, s.will_renew], [true, IOS_A, true]);
});

Deno.test("E13 achat différé (pending, Ask to Buy) → pas d'entitlement, pas d'accès", () => {
  const s = deriveBillingStatus({ entitlements: {}, subscriptions: {} }, NOW);
  assertEquals([hasAccess(s), s.ever_subscribed], [false, false]);
});

Deno.test("E14 achat interrompu (réseau) puis restauration → même état que l'achat", () => {
  // L'achat est rattaché au compte par RevenueCat dès que le reçu arrive
  // (restore / prochain lancement) ; le serveur relit simplement l'abonné.
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-11-01T12:00:00Z"), NOW);
  assertEquals(hasAccess(s), true);
});

Deno.test("E15 accès offert à vie (promotionnel) → sans échéance", () => {
  const s = deriveBillingStatus({
    entitlements: { [RC_ENTITLEMENT]: { expires_date: null, product_identifier: "rc_promo_thrive_moments_lifetime" } },
    subscriptions: {},
  }, NOW);
  assertEquals([hasAccess(s), s.store], [true, "promotional"]);
});

Deno.test("E16 achat sandbox (App Review / TestFlight) → marqué is_sandbox", () => {
  const s = deriveBillingStatus(sub(IOS_M, "APP_STORE", "2026-10-01T12:05:00Z", { is_sandbox: true }), NOW);
  assertEquals([hasAccess(s), s.is_sandbox], [true, true]);
});

Deno.test("E17 transfert d'achat entre comptes → les deux comptes resynchronisés", () => {
  const ids = appUserIdsFromRcEvent({
    type: "TRANSFER",
    transferred_from: [UID],
    transferred_to: [UID2.toUpperCase(), "$RCAnonymousID:abc"],
  });
  assertEquals(ids.sort(), [UID, UID2].sort());
});
