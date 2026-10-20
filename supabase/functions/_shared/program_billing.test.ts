// Tests du cœur « programmes payés par Stripe » (GO 3 O1).
// Lancer : deno test supabase/functions/_shared/program_billing.test.ts
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  allProgramLookupKeys,
  buildProgramCheckoutParams,
  catalogPriceMatches,
  canStartCharge,
  chargeIdempotencyKey,
  decideChargeOutcome,
  decideRefund,
  envFlag,
  handleProgramEvent,
  installmentHtCents,
  isProgramEvent,
  programEventPayload,
  programLookupKey,
  programQuote,
  ProgramCheckoutRequest,
  qcTaxes,
  refundIdempotencyKey,
  RefundRequest,
  withQcTaxes,
  type RpcLike,
} from "./program_billing.ts";
import { encodeStripeForm } from "./billing_core.ts";

const UID = "3f2b6a1e-8c4d-4e5f-9a0b-1c2d3e4f5a6b";
const ORDER = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";
const INST = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

// ── Montants ────────────────────────────────────────────────────────────────
Deno.test("montants : grille serveur (cents CAD HT)", () => {
  assertEquals([installmentHtCents("GROUPE", "deux_versements", 1), installmentHtCents("GROUPE", "deux_versements", 2)], [30000, 30000]);
  assertEquals([installmentHtCents("INDIVIDUEL", "deux_versements", 1), installmentHtCents("INDIVIDUEL", "deux_versements", 2)], [75000, 75000]);
  assertEquals([installmentHtCents("COMPLET", "deux_versements", 1), installmentHtCents("COMPLET", "deux_versements", 2)], [100000, 100000]);
  assertEquals(installmentHtCents("GROUPE", "une_fois", 1), 60000);
  assertEquals(installmentHtCents("INDIVIDUEL", "une_fois", 1), 150000);
  assertEquals(installmentHtCents("COMPLET", "une_fois", 1), 200000);
  assertThrows(() => installmentHtCents("GROUPE", "une_fois", 2));
  assertThrows(() => installmentHtCents("GROUPE", "deux_versements", 3));
});

Deno.test("lookup_keys stables", () => {
  assertEquals(programLookupKey("GROUPE", "deux_versements"), "thrive_groupe_v1_versement");
  assertEquals(programLookupKey("INDIVIDUEL", "deux_versements"), "thrive_individuel_v1_versement");
  assertEquals(programLookupKey("COMPLET", "deux_versements"), "thrive_complet_v1_versement");
  assertEquals(programLookupKey("COMPLET", "une_fois"), "thrive_complet_v1_complet");
  assertEquals(allProgramLookupKeys().length, 6);
});

// ── Taxes d'affichage ×1,14975 ─────────────────────────────────────────────
Deno.test("taxes QC : versement 1 TTC = 344,93 / 862,31 / 1 149,75 $", () => {
  assertEquals(withQcTaxes(30000), 34493);
  assertEquals(withQcTaxes(75000), 86231);
  assertEquals(withQcTaxes(100000), 114975);
  assertEquals(qcTaxes(30000), { gst: 1500, qst: 2993, total: 4493 });
  assertEquals(qcTaxes(75000), { gst: 3750, qst: 7481, total: 11231 });
  assertThrows(() => qcTaxes(-1));
  assertThrows(() => qcTaxes(1.5));
  const q = programQuote("GROUPE", "deux_versements");
  assertEquals(q.installments.map((i) => [i.due_when, i.amount_ttc_cents]), [["inscription", 34493], ["seance_7", 34493]]);
});

// ── Refus d'un montant venu du client ──────────────────────────────────────
Deno.test("requête checkout : seuls pack + mode ; tout montant est refusé", () => {
  assertEquals(ProgramCheckoutRequest.safeParse({ pack: "GROUPE", mode: "deux_versements" }).success, true);
  for (const extra of [{ amount: 1 }, { unit_amount: 100 }, { price: "price_x" }, { currency: "usd" }, { amount_cents: 0 }]) {
    assertEquals(ProgramCheckoutRequest.safeParse({ pack: "GROUPE", mode: "une_fois", ...extra }).success, false);
  }
  assertEquals(ProgramCheckoutRequest.safeParse({ pack: "groupe", mode: "une_fois" }).success, false);
  assertEquals(ProgramCheckoutRequest.safeParse({ pack: "MAISON", mode: "une_fois" }).success, false);
  assertEquals(ProgramCheckoutRequest.safeParse({ pack: "GROUPE", mode: "trois_fois" }).success, false);
  assertEquals(ProgramCheckoutRequest.safeParse(null).success, false);
});

// ── Paramètres Checkout ─────────────────────────────────────────────────────
const base = {
  pack: "INDIVIDUEL" as const, mode: "deux_versements" as const, rank: 1 as const,
  orderId: ORDER, installmentId: INST, appUserId: UID, customerId: "cus_1",
  priceId: null, taxEnabled: false, successUrl: "https://a/s", cancelUrl: "https://a/c",
};

Deno.test("checkout : mode payment, carte conservée, metadata programme, montant serveur", () => {
  const p = buildProgramCheckoutParams(base) as Record<string, any>;
  assertEquals(p.mode, "payment");
  assertEquals(p.client_reference_id, UID);
  assertEquals(p.payment_intent_data.setup_future_usage, "off_session");
  assertEquals(p.metadata, {
    app_user_id: UID, kind: "program", pack: "INDIVIDUEL", mode: "deux_versements",
    installment: "1", order_id: ORDER, installment_id: INST,
  });
  assertEquals(p.payment_intent_data.metadata.kind, "program");
  assertEquals(p.line_items[0].price_data.unit_amount, 75000);
  assertEquals(p.line_items[0].price_data.tax_behavior, "exclusive");
  assertEquals(p.line_items[0].price_data.currency, "cad");
  assertEquals("automatic_tax" in p, false);
  // Loi 25 : aucune donnée d'enfant dans ce qui part chez Stripe.
  const body = encodeStripeForm(p);
  for (const k of ["child", "enfant", "first_name", "date_of_birth"]) assertEquals(body.includes(k), false);
});

Deno.test("checkout : prix catalogue, une fois sans setup_future_usage, taxe auto pilotée", () => {
  const p = buildProgramCheckoutParams({ ...base, mode: "une_fois", priceId: "price_123", taxEnabled: true }) as Record<string, any>;
  assertEquals(p.line_items, [{ price: "price_123", quantity: 1 }]);
  assertEquals("setup_future_usage" in p.payment_intent_data, false);
  assertEquals(p.automatic_tax, { enabled: true });
  assertEquals(p.billing_address_collection, "required");
  const p2 = buildProgramCheckoutParams({ ...base, rank: 2 }) as Record<string, any>;
  assertEquals("setup_future_usage" in p2.payment_intent_data, false);
  assertEquals(p2.metadata.installment, "2");
});

Deno.test("prix catalogue accepté seulement s'il égale le montant serveur", () => {
  const ok = { unit_amount: 30000, currency: "cad", tax_behavior: "exclusive", active: true };
  assertEquals(catalogPriceMatches(ok, 30000), true);
  assertEquals(catalogPriceMatches({ ...ok, unit_amount: 100 }, 30000), false);
  assertEquals(catalogPriceMatches({ ...ok, currency: "usd" }, 30000), false);
  assertEquals(catalogPriceMatches({ ...ok, tax_behavior: "inclusive" }, 30000), false);
  assertEquals(catalogPriceMatches(undefined, 30000), false);
});

// ── Webhook : routage et idempotence ────────────────────────────────────────
Deno.test("routage : programmes oui, Maison jamais", () => {
  const prog = { id: "evt_1", type: "checkout.session.completed", data: { object: { mode: "payment", metadata: { kind: "program" } } } };
  assertEquals(isProgramEvent(prog), true);
  assertEquals(isProgramEvent({ ...prog, data: { object: { mode: "subscription", metadata: { kind: "program" } } } }), false);
  assertEquals(isProgramEvent({ ...prog, data: { object: { mode: "subscription", metadata: { app_user_id: UID } } } }), false);
  assertEquals(isProgramEvent({ id: "e", type: "invoice.paid", data: { object: { metadata: { kind: "program" } } } }), false);
  assertEquals(isProgramEvent({ id: "e", type: "customer.subscription.updated", data: { object: {} } }), false);
  assertEquals(isProgramEvent({ id: "e", type: "payment_intent.succeeded", data: { object: { metadata: {} } } }), false);
  assertEquals(isProgramEvent({ id: "e", type: "payment_intent.payment_failed", data: { object: { metadata: { kind: "program" } } } }), true);
  assertEquals(isProgramEvent({ id: "e", type: "charge.refunded", data: { object: { payment_intent: "pi_1" } } }), true);
  assertEquals(isProgramEvent(null), false);
});

Deno.test("payload transmis à la base : champs utiles seulement", () => {
  const p = programEventPayload({
    id: "cs_1", amount_total: 30000, metadata: { kind: "program" },
    customer_details: { email: "x@y.z", name: "Parent" }, last_payment_error: { code: "card_declined", message: "long" },
  });
  assertEquals("customer_details" in p, false);
  assertEquals(p.last_payment_error, { code: "card_declined", decline_code: null });
});

Deno.test("idempotence : un event.id rejoué n'a qu'un seul effet", async () => {
  // Faux SQL reproduisant le contrat de program_apply_stripe_event (081).
  const processed = new Set<string>();
  let effects = 0;
  const rpc: RpcLike = (fn, args) => {
    assertEquals(fn, "program_apply_stripe_event");
    const id = String(args.p_event_id);
    if (processed.has(id)) return Promise.resolve({ data: "duplicate", error: null });
    processed.add(id);
    effects++;
    return Promise.resolve({ data: "paid_rank_1", error: null });
  };
  const ev = { id: "evt_42", type: "checkout.session.completed", data: { object: { metadata: { kind: "program" } } } };
  assertEquals(await handleProgramEvent(ev, rpc), "paid_rank_1");
  assertEquals(await handleProgramEvent(ev, rpc), "duplicate");
  assertEquals(effects, 1);
});

Deno.test("webhook : erreur SQL ⇒ exception (Stripe réessaiera, 500)", async () => {
  const rpc: RpcLike = () => Promise.resolve({ data: null, error: { message: "boom" } });
  let thrown = false;
  try {
    await handleProgramEvent({ id: "evt", type: "charge.refunded", data: { object: {} } }, rpc);
  } catch {
    thrown = true;
  }
  assertEquals(thrown, true);
});

// ── Versement 2 : SCA ──────────────────────────────────────────────────────
Deno.test("versement 2 : SCA ⇒ lien, pas de nouvelle tentative", () => {
  assertEquals(decideChargeOutcome({ errorCode: "authentication_required" }), "needs_link");
  assertEquals(decideChargeOutcome({ piStatus: "requires_action" }), "needs_link");
  assertEquals(decideChargeOutcome({ piStatus: "succeeded" }), "paid");
  assertEquals(decideChargeOutcome({ piStatus: "processing" }), "processing");
  assertEquals(decideChargeOutcome({ errorCode: "card_declined" }), "failed");
  assertEquals(decideChargeOutcome({}), "failed");
});

Deno.test("garde-fous d'environnement : seule la valeur « true » active", () => {
  assertEquals(envFlag(undefined), false);
  assertEquals(envFlag(""), false);
  assertEquals(envFlag("1"), false);
  assertEquals(envFlag("yes"), false);
  assertEquals(envFlag("TRUE"), true);
  assertEquals(envFlag(" true "), true);
});

// ── Remboursement : autorisation et plafond ────────────────────────────────
const paid = { id: INST, status: "payee", stripe_payment_intent_id: "pi_1", amount_paid_cents: 34493, amount_refunded_cents: 0 };
const req = (amount: number) => RefundRequest.parse({ installment_id: INST, amount_cents: amount, reason: "Garantie 2 séances" });

Deno.test("remboursement : ADMIN / SUPER_ADMIN seulement", () => {
  for (const role of ["PARENT", "COACH", "CHILD", "", "admin"]) {
    const d = decideRefund(role, req(100), paid);
    assertEquals(d.ok ? "ok" : d.code, "forbidden");
  }
  assertEquals(decideRefund("ADMIN", req(100), paid).ok, true);
  assertEquals(decideRefund("SUPER_ADMIN", req(100), paid).ok, true);
});

Deno.test("remboursement : montant ≤ payé − déjà remboursé, motif obligatoire, versement payé", () => {
  assertEquals(decideRefund("ADMIN", req(34493), paid).ok, true);
  const tooHigh = decideRefund("ADMIN", req(34494), paid);
  assertEquals(tooHigh.ok ? "ok" : tooHigh.code, "amount_too_high");
  const partial = decideRefund("ADMIN", req(30000), { ...paid, amount_refunded_cents: 10000 });
  assertEquals(partial.ok ? "ok" : partial.code, "amount_too_high");
  const unpaid = decideRefund("ADMIN", req(100), { ...paid, status: "due", stripe_payment_intent_id: null, amount_paid_cents: null });
  assertEquals(unpaid.ok ? "ok" : unpaid.code, "not_paid");
  assertEquals(RefundRequest.safeParse({ installment_id: INST, amount_cents: 100, reason: "  " }).success, false);
  assertEquals(RefundRequest.safeParse({ installment_id: INST, amount_cents: 100 }).success, false);
  assertEquals(RefundRequest.safeParse({ installment_id: INST, amount_cents: 1.5, reason: "abc" }).success, false);
  assertEquals(RefundRequest.safeParse({ installment_id: INST, amount_cents: -5, reason: "abc" }).success, false);
  assertEquals(RefundRequest.safeParse({ installment_id: "x", amount_cents: 5, reason: "abc" }).success, false);
});

Deno.test("remboursement : clé d'idempotence stable (double clic = un seul remboursement)", () => {
  assertEquals(refundIdempotencyKey(INST, 100, 0), refundIdempotencyKey(INST, 100, 0));
  assertEquals(refundIdempotencyKey(INST, 100, 0) === refundIdempotencyKey(INST, 100, 100), false);
});

Deno.test("versement 2 : jamais de second PaymentIntent tant que le premier attend le webhook", () => {
  assertEquals(canStartCharge({ status: "due", stripe_payment_intent_id: null }, false), { ok: true });
  assertEquals(canStartCharge({ status: "due", stripe_payment_intent_id: "pi_1" }, false), { ok: false, reason: "pending_payment_intent" });
  assertEquals(canStartCharge({ status: "due", stripe_payment_intent_id: "pi_1" }, true), { ok: false, reason: "pending_payment_intent" });
  assertEquals(canStartCharge({ status: "echouee", stripe_payment_intent_id: "pi_1" }, false), { ok: false, reason: "not_retryable" });
  assertEquals(canStartCharge({ status: "echouee", stripe_payment_intent_id: "pi_1" }, true), { ok: true });
  assertEquals(canStartCharge({ status: "payee", stripe_payment_intent_id: "pi_1" }, true), { ok: false, reason: "not_retryable" });
  assertEquals(chargeIdempotencyKey("i1", 2), chargeIdempotencyKey("i1", 2));
});
