// ─────────────────────────────────────────────────────────────────────────────
// « 1 mois offert » du Certificat THRIVE Maison — logique pure (testée par
// reward_core.test.ts, sans réseau ni Deno.env).
//
// Règle produit (CGU §5) : la famille qui termine la semaine 13 du programme
// Maison (les 3 fiches cœur ACT-1301 à ACT-1303) reçoit, une fois par famille,
// un crédit égal au prix d'un mois de la formule MENSUELLE :
//   • abonnement web actif (Stripe)    → coupon appliqué à l'abonnement (prochaine facture) ;
//   • sans abonnement en cours         → crédit réservé, appliqué au prochain Checkout ;
//   • abonnement App Store / Play      → impossible côté serveur : traitement manuel.
// ─────────────────────────────────────────────────────────────────────────────

export const CERTIFICATE_REWARD_ID = "certificat";
export const CERTIFICATE_COUPON_NAME = "Certificat THRIVE Maison — 1 mois offert";
export const CERTIFICATE_ACTIVITIES = ["ACT-1301", "ACT-1302", "ACT-1303"] as const;

/** Le certificat est mérité quand les 3 fiches cœur de la semaine 13 sont faites. */
export function isCertificateEarned(doneActivityIds: Iterable<string>): boolean {
  const done = new Set(doneActivityIds);
  return CERTIFICATE_ACTIVITIES.every((id) => done.has(id));
}

/** Identifiant de coupon déterministe : un coupon par montant et devise. */
export function couponIdFor(amountMinor: number, currency: string): string {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error("montant invalide");
  return `thrive-certificat-1-mois-${currency.toLowerCase()}-${amountMinor}`;
}

export type SubscriptionMirror = {
  user_id: string;
  active: boolean | null;
  store: string | null;
  expires_at: string | null;
  stripe_customer_id: string | null;
} | null;

export type RewardChannel = "stripe" | "store" | "deferred";

export function isActive(row: SubscriptionMirror, now: Date): boolean {
  return Boolean(row?.active) && (!row?.expires_at || new Date(row.expires_at).getTime() > now.getTime());
}

export function rewardChannel(row: SubscriptionMirror, now: Date): RewardChannel {
  if (!isActive(row, now)) return "deferred";
  const store = (row?.store ?? "").toLowerCase();
  if (store === "app_store" || store === "mac_app_store" || store === "play_store") return "store";
  return row?.stripe_customer_id ? "stripe" : "deferred";
}

/**
 * Qui reçoit le crédit : le premier des comptes de la famille (appelant puis
 * titulaire) qui a un abonnement actif ; à défaut le titulaire (crédit réservé).
 */
export function pickPayer(rows: SubscriptionMirror[], ownerId: string, now: Date): SubscriptionMirror {
  return rows.find((r) => isActive(r, now)) ?? rows.find((r) => r?.user_id === ownerId) ?? null;
}

/** Abonnement Stripe sur lequel appliquer le coupon (le plus récent encore facturable). */
export function billableSubscription<T extends { id: string; status?: string | null; created?: number }>(
  subs: T[],
): T | null {
  const billable = subs.filter((s) => ["trialing", "active", "past_due"].includes(String(s.status)));
  return billable.sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0] ?? null;
}

/** Remises à poser : celles déjà présentes (conservées) + le coupon du certificat. */
export function discountsWithCoupon(existing: (string | { id: string })[] | null | undefined, couponId: string) {
  const kept = (existing ?? []).map((d) => ({ discount: typeof d === "string" ? d : d.id }));
  return [...kept, { coupon: couponId }];
}
