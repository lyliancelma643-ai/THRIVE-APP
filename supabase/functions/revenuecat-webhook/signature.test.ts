// Lancer : deno test supabase/functions/revenuecat-webhook/
import { assertEquals } from "jsr:@std/assert@1";
import { hmacSha256Hex, parseSignatureHeader, verifyRevenueCatSignature } from "./signature.ts";

const SECRET = "whsec_test_secret";
const BODY = '{"api_version":"1.0","event":{"type":"RENEWAL","app_user_id":"abc"}}';
const NOW = 1_760_000_000;

async function header(t: number, body = BODY, secret = SECRET) {
  return `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${body}`)}`;
}

Deno.test("HMAC RevenueCat : signature valide acceptée", async () => {
  assertEquals(await verifyRevenueCatSignature(await header(NOW), BODY, SECRET, NOW), { ok: true });
  // décalage < 5 min dans les deux sens
  assertEquals(await verifyRevenueCatSignature(await header(NOW - 299), BODY, SECRET, NOW), { ok: true });
  assertEquals(await verifyRevenueCatSignature(await header(NOW + 299), BODY, SECRET, NOW), { ok: true });
});

Deno.test("HMAC RevenueCat : signature invalide rejetée", async () => {
  // mauvais secret
  assertEquals(
    await verifyRevenueCatSignature(await header(NOW, BODY, "autre"), BODY, SECRET, NOW),
    { ok: false, reason: "mismatch" },
  );
  // corps modifié
  assertEquals(
    await verifyRevenueCatSignature(await header(NOW), BODY.replace("RENEWAL", "EXPIRATION"), SECRET, NOW),
    { ok: false, reason: "mismatch" },
  );
  // horodatage modifié (signé pour un autre t)
  const forged = (await header(NOW - 10)).replace(`t=${NOW - 10}`, `t=${NOW}`);
  assertEquals(await verifyRevenueCatSignature(forged, BODY, SECRET, NOW), { ok: false, reason: "mismatch" });
  // en-tête absent / mal formé
  assertEquals(await verifyRevenueCatSignature(null, BODY, SECRET, NOW), { ok: false, reason: "missing" });
  assertEquals(await verifyRevenueCatSignature("v1=zz", BODY, SECRET, NOW), { ok: false, reason: "malformed" });
});

Deno.test("HMAC RevenueCat : signature expirée (> 5 min) rejetée", async () => {
  assertEquals(
    await verifyRevenueCatSignature(await header(NOW - 301), BODY, SECRET, NOW),
    { ok: false, reason: "expired" },
  );
  assertEquals(
    await verifyRevenueCatSignature(await header(NOW + 301), BODY, SECRET, NOW),
    { ok: false, reason: "expired" },
  );
});

Deno.test("HMAC RevenueCat : parsing de l'en-tête", () => {
  const v = "a".repeat(64);
  assertEquals(parseSignatureHeader(`t=${NOW}, v1=${v}`), { t: NOW, v1: [v] });
  assertEquals(parseSignatureHeader(`t=${NOW * 1000},v1=${v}`), { t: NOW, v1: [v] });
  assertEquals(parseSignatureHeader(`t=abc,v1=${v}`), null);
});
