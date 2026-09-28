// Nettoyage de facturation AVANT la suppression définitive d'un compte.
//
// Sans ce nettoyage, supprimer un parent abonné sur le web supprime bien la
// ligne billing_subscriptions (cascade) mais laisse l'abonnement Stripe actif :
// la carte continuerait d'être prélevée pour un compte qui n'existe plus, et
// on perdrait le lien (stripe_customer_id) pour l'arrêter.
//
//   • Stripe : tout abonnement encore facturable du client est annulé
//     immédiatement. Si l'annulation échoue, la suppression du compte est
//     REFUSÉE (on ne supprime jamais un compte qui paie encore).
//   • RevenueCat : l'abonné est supprimé (Loi 25) — best effort.
//   • App Store / Google Play : impossible à annuler côté serveur ; on renvoie
//     le store pour que l'admin demande au parent d'annuler depuis son téléphone.
//   • Le client Stripe est conservé (factures : obligations comptables).
//
// Module sans dépendance Deno : testé par billing_cleanup.test.ts.

export type BillingRow = {
  stripe_customer_id: string | null;
  store: string | null;
  active: boolean | null;
} | null;

export type CleanupEnv = {
  stripeSecretKey: string;
  revenueCatSecretKey: string;
};

export type CleanupResult =
  | { ok: true; canceledStripeSubscriptions: string[]; storeSubscription: string | null; revenueCatDeleted: boolean }
  | { ok: false; status: number; error: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Statuts Stripe pour lesquels un prélèvement peut encore avoir lieu. */
const BILLABLE = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

export async function cleanupBilling(
  appUserId: string,
  row: BillingRow,
  env: CleanupEnv,
  fetchImpl: FetchLike = fetch,
): Promise<CleanupResult> {
  const canceled: string[] = [];

  if (row?.stripe_customer_id) {
    if (!env.stripeSecretKey) {
      return {
        ok: false,
        status: 503,
        error: "Ce compte a un client Stripe mais Stripe n'est pas configuré : suppression bloquée " +
          "pour ne pas laisser un abonnement actif. Réessaie une fois STRIPE_SECRET_KEY posé.",
      };
    }
    const headers = { Authorization: `Bearer ${env.stripeSecretKey}` };
    const customer = encodeURIComponent(row.stripe_customer_id);
    const list = await fetchImpl(
      `https://api.stripe.com/v1/subscriptions?customer=${customer}&status=all&limit=100`,
      { headers },
    );
    if (!list.ok) {
      return { ok: false, status: 502, error: `Stripe : lecture des abonnements impossible (${list.status})` };
    }
    const data = await list.json() as { data?: { id: string; status: string }[] };
    for (const sub of data.data ?? []) {
      if (!BILLABLE.has(sub.status)) continue;
      const res = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        return { ok: false, status: 502, error: `Stripe : annulation de ${sub.id} impossible (${res.status})` };
      }
      canceled.push(sub.id);
    }
  }

  let revenueCatDeleted = false;
  if (env.revenueCatSecretKey) {
    try {
      const res = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${env.revenueCatSecretKey}` },
      });
      revenueCatDeleted = res.ok || res.status === 404;
    } catch {
      // best effort : n'empêche pas la suppression du compte
    }
  }

  const store = (row?.store ?? "").toLowerCase();
  const storeSubscription = row?.active && (store === "app_store" || store === "play_store") ? store : null;

  return { ok: true, canceledStripeSubscriptions: canceled, storeSubscription, revenueCatDeleted };
}
