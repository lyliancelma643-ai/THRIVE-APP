// Vérification de la signature HMAC des webhooks RevenueCat (audit P1-14).
//
// Format (doc RevenueCat > Integrations > Webhooks > HMAC signing) :
//   X-RevenueCat-Webhook-Signature: t=<unix_timestamp>,v1=<hex HMAC-SHA256>
//   v1 = HMAC-SHA256(secret, `${t}.${corps brut}`)
// Le corps doit être les octets EXACTS reçus (jamais du JSON re-sérialisé).
// RevenueCat recalcule t/v1 à chaque tentative (retries compris) : la fenêtre
// anti-rejeu de 5 minutes s'applique donc à chaque livraison.
// Doc vérifiée le 2026-10-09 (2e passe) : en-tête, format, hex, secondes, 5 min.
// Hypothèse documentée : t est en secondes ; une valeur > 1e12 est traitée
// comme des millisecondes par tolérance. Plusieurs v1 (rotation) acceptés.
import { constantTimeEqual } from "../_shared/billing_core.ts";

export const SIGNATURE_HEADER = "X-RevenueCat-Webhook-Signature";
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type SignatureVerdict =
  | { ok: true }
  | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" };

export function parseSignatureHeader(header: string): { t: number; v1: string[] } | null {
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t" && /^\d+$/.test(v)) t = Number(v);
    else if (k === "v1" && /^[0-9a-fA-F]{64}$/.test(v)) v1.push(v.toLowerCase());
  }
  if (t === null || v1.length === 0) return null;
  if (t > 1e12) t = Math.floor(t / 1000);
  return { t, v1 };
}

export async function hmacSha256Hex(secret: string, message: string | Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const data = typeof message === "string" ? enc.encode(message) : message;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyRevenueCatSignature(
  header: string | null,
  rawBody: string | Uint8Array,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = SIGNATURE_TOLERANCE_SECONDS,
): Promise<SignatureVerdict> {
  if (!header) return { ok: false, reason: "missing" };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: "malformed" };
  if (Math.abs(nowSeconds - parsed.t) > toleranceSeconds) return { ok: false, reason: "expired" };
  // Message signé = `${t}.` suivi des octets bruts du corps (aucun ré-encodage
  // si le corps est fourni en Uint8Array, cas de index.ts).
  const prefix = new TextEncoder().encode(`${parsed.t}.`);
  const body = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : rawBody;
  const message = new Uint8Array(prefix.length + body.length);
  message.set(prefix, 0);
  message.set(body, prefix.length);
  const expected = await hmacSha256Hex(secret, message);
  // Pas de sortie anticipée : chaque candidat est comparé à temps constant.
  let match = false;
  for (const candidate of parsed.v1) {
    if (constantTimeEqual(candidate, expected)) match = true;
  }
  return match ? { ok: true } : { ok: false, reason: "mismatch" };
}
