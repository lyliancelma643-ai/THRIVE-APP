// Vérification de signature Stripe (HMAC SHA-256, tolérance anti-rejeu 5 min,
// comparaison à temps constant). Extraite d'index.ts pour être testable sans
// démarrer le serveur (index.ts appelle Deno.serve au niveau module).

const encoder = new TextEncoder();

export const PLAN_CODES = ["ESSENTIEL", "AVANCE", "PERFORMANCE"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export function isValidPlanCode(code: unknown): code is PlanCode {
  return typeof code === "string" && (PLAN_CODES as readonly string[]).includes(code);
}

export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  // Injectable pour les tests (défaut = horloge réelle, en secondes).
  nowSeconds: () => number = () => Date.now() / 1000,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=", 2) as [string, string]),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  // Tolérance anti-rejeu
  if (Math.abs(nowSeconds() - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Comparaison à temps constant
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
