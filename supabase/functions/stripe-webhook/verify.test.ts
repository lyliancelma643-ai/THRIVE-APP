// Tests Deno du webhook Stripe — cœur sécurité : vérification de signature.
// Lancer : deno test supabase/functions/stripe-webhook/verify.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { isValidPlanCode, verifyStripeSignature } from "./verify.ts";

const SECRET = "whsec_test_secret";
const encoder = new TextEncoder();

// Génère une signature Stripe valide pour un payload+timestamp donnés.
async function sign(payload: string, ts: number, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}.${payload}`));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${ts},v1=${hex}`;
}

const NOW = 1_780_000_000; // horloge figée (secondes)
const clock = () => NOW;

Deno.test("signature valide dans la fenêtre → true", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed" });
  const header = await sign(payload, NOW);
  assertEquals(await verifyStripeSignature(payload, header, SECRET, clock), true);
});

Deno.test("payload altéré après signature → false", async () => {
  const header = await sign(JSON.stringify({ amount: 1000 }), NOW);
  const tampered = JSON.stringify({ amount: 999999 });
  assertEquals(await verifyStripeSignature(tampered, header, SECRET, clock), false);
});

Deno.test("mauvais secret → false", async () => {
  const payload = "{}";
  const header = await sign(payload, NOW, "whsec_autre");
  assertEquals(await verifyStripeSignature(payload, header, SECRET, clock), false);
});

Deno.test("timestamp trop vieux (rejeu > 5 min) → false", async () => {
  const payload = "{}";
  const header = await sign(payload, NOW - 301);
  assertEquals(await verifyStripeSignature(payload, header, SECRET, clock), false);
});

Deno.test("timestamp dans la tolérance (< 5 min) → true", async () => {
  const payload = "{}";
  const header = await sign(payload, NOW - 299);
  assertEquals(await verifyStripeSignature(payload, header, SECRET, clock), true);
});

Deno.test("header vide / malformé → false", async () => {
  assertEquals(await verifyStripeSignature("{}", "", SECRET, clock), false);
  assertEquals(await verifyStripeSignature("{}", "garbage", SECRET, clock), false);
  assertEquals(await verifyStripeSignature("{}", "t=123", SECRET, clock), false); // pas de v1
});

Deno.test("plan_code : whitelist stricte", () => {
  for (const ok of ["ESSENTIEL", "AVANCE", "PERFORMANCE"]) {
    assertEquals(isValidPlanCode(ok), true);
  }
  for (const ko of ["essentiel", "GRATUIT", "", null, undefined, 42]) {
    assertEquals(isValidPlanCode(ko), false);
  }
});
