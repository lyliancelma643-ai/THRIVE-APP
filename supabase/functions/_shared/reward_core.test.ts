import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  billableSubscription,
  couponIdFor,
  discountsWithCoupon,
  isCertificateEarned,
  pickPayer,
  rewardChannel,
} from "./reward_core.ts";

const now = new Date("2026-10-02T12:00:00Z");

Deno.test("certificat : les 3 fiches cœur de la semaine 13", () => {
  assert(isCertificateEarned(["ACT-1301", "ACT-1302", "ACT-1303", "ACT-0101"]));
  assert(!isCertificateEarned(["ACT-1301", "ACT-1302"]));
  assert(!isCertificateEarned([]));
});

Deno.test("coupon déterministe par montant et devise", () => {
  assertEquals(couponIdFor(1499, "CAD"), "thrive-certificat-1-mois-cad-1499");
  assertThrows(() => couponIdFor(0, "cad"));
  assertThrows(() => couponIdFor(14.99, "cad"));
});

Deno.test("canal selon l'abonnement", () => {
  const base = { user_id: "u", active: true, store: "stripe", expires_at: null, stripe_customer_id: "cus_1" };
  assertEquals(rewardChannel(base, now), "stripe");
  assertEquals(rewardChannel({ ...base, store: "app_store" }, now), "store");
  assertEquals(rewardChannel({ ...base, store: "play_store" }, now), "store");
  assertEquals(rewardChannel({ ...base, active: false }, now), "deferred");
  assertEquals(rewardChannel({ ...base, expires_at: "2026-10-01T00:00:00Z" }, now), "deferred");
  assertEquals(rewardChannel(null, now), "deferred");
});

Deno.test("payeur : abonné actif d'abord, sinon titulaire", () => {
  const owner = { user_id: "owner", active: false, store: null, expires_at: null, stripe_customer_id: null };
  const co = { user_id: "co", active: true, store: "stripe", expires_at: null, stripe_customer_id: "cus_2" };
  assertEquals(pickPayer([co, owner], "owner", now)?.user_id, "co");
  assertEquals(pickPayer([owner], "owner", now)?.user_id, "owner");
  assertEquals(pickPayer([], "owner", now), null);
});

Deno.test("abonnement facturable le plus récent", () => {
  assertEquals(
    billableSubscription([
      { id: "a", status: "canceled", created: 3 },
      { id: "b", status: "active", created: 1 },
      { id: "c", status: "trialing", created: 2 },
    ])?.id,
    "c",
  );
  assertEquals(billableSubscription([{ id: "x", status: "canceled" }]), null);
});

Deno.test("remises existantes conservées", () => {
  assertEquals(discountsWithCoupon(["di_1", { id: "di_2" }], "k"), [
    { discount: "di_1" },
    { discount: "di_2" },
    { coupon: "k" },
  ]);
  assertEquals(discountsWithCoupon(null, "k"), [{ coupon: "k" }]);
});
