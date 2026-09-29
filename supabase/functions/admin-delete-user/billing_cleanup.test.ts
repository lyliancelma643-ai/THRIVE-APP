// deno test --no-config supabase/functions/admin-delete-user/billing_cleanup.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { cleanupBilling } from "./billing_cleanup.ts";

const USER = "7b0c1f7e-4a8b-4c3e-9d2a-1f2e3d4c5b6a";
const ENV = { stripeSecretKey: "sk_test_x", revenueCatSecretKey: "sk_rc_x" };

type Call = { url: string; method: string };

function fakeFetch(routes: (c: Call) => Response) {
  const calls: Call[] = [];
  const impl = (url: string, init?: RequestInit) => {
    const call = { url, method: init?.method ?? "GET" };
    calls.push(call);
    return Promise.resolve(routes(call));
  };
  return { impl, calls };
}

const ok = (body: unknown = {}) => new Response(JSON.stringify(body), { status: 200 });

Deno.test("annule les abonnements Stripe facturables et supprime l'abonné RevenueCat", async () => {
  const { impl, calls } = fakeFetch((c) =>
    c.method === "GET"
      ? ok({ data: [
        { id: "sub_trial", status: "trialing" },
        { id: "sub_old", status: "canceled" },
        { id: "sub_late", status: "past_due" },
      ] })
      : ok()
  );
  const res = await cleanupBilling(USER, { stripe_customer_id: "cus_1", store: "stripe", active: true }, ENV, impl);
  assertEquals(res, { ok: true, canceledStripeSubscriptions: ["sub_trial", "sub_late"], storeSubscription: null, revenueCatDeleted: true });
  assertEquals(calls.filter((c) => c.method === "DELETE").map((c) => c.url), [
    "https://api.stripe.com/v1/subscriptions/sub_trial",
    "https://api.stripe.com/v1/subscriptions/sub_late",
    `https://api.revenuecat.com/v1/subscribers/${USER}`,
  ]);
});

Deno.test("refuse la suppression si Stripe n'annule pas", async () => {
  const { impl, calls } = fakeFetch((c) =>
    c.method === "GET" ? ok({ data: [{ id: "sub_1", status: "active" }] }) : new Response("{}", { status: 500 })
  );
  const res = await cleanupBilling(USER, { stripe_customer_id: "cus_1", store: "stripe", active: true }, ENV, impl);
  assertEquals(res.ok, false);
  if (!res.ok) assertEquals(res.status, 502);
  // RevenueCat n'est pas touché tant que Stripe n'est pas réglé.
  assertEquals(calls.some((c) => c.url.includes("revenuecat")), false);
});

Deno.test("refuse la suppression d'un client Stripe si Stripe n'est pas configuré", async () => {
  const { impl, calls } = fakeFetch(() => ok());
  const res = await cleanupBilling(USER, { stripe_customer_id: "cus_1", store: null, active: false }, { ...ENV, stripeSecretKey: "" }, impl);
  assertEquals(res.ok, false);
  if (!res.ok) assertEquals(res.status, 503);
  assertEquals(calls.length, 0);
});

Deno.test("abonnement App Store : signalé, rien à annuler côté Stripe", async () => {
  const { impl, calls } = fakeFetch(() => ok());
  const res = await cleanupBilling(USER, { stripe_customer_id: null, store: "APP_STORE", active: true }, ENV, impl);
  assertEquals(res, { ok: true, canceledStripeSubscriptions: [], storeSubscription: "app_store", revenueCatDeleted: true });
  assertEquals(calls.map((c) => c.url), [`https://api.revenuecat.com/v1/subscribers/${USER}`]);
});

Deno.test("compte sans abonnement ni secrets : suppression autorisée sans appel réseau", async () => {
  const { impl, calls } = fakeFetch(() => ok());
  const res = await cleanupBilling(USER, null, { stripeSecretKey: "", revenueCatSecretKey: "" }, impl);
  assertEquals(res, { ok: true, canceledStripeSubscriptions: [], storeSubscription: null, revenueCatDeleted: false });
  assertEquals(calls.length, 0);
});

Deno.test("RevenueCat en erreur réseau : n'empêche pas la suppression", async () => {
  const impl = (url: string) =>
    url.includes("revenuecat") ? Promise.reject(new Error("réseau")) : Promise.resolve(ok({ data: [] }));
  const res = await cleanupBilling(USER, { stripe_customer_id: "cus_1", store: "stripe", active: false }, ENV, impl);
  assertEquals(res, { ok: true, canceledStripeSubscriptions: [], storeSubscription: null, revenueCatDeleted: false });
});
