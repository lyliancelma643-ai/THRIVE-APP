// Vérification de signature Stripe (HMAC SHA-256, tolérance anti-rejeu 5 min,
// comparaison à temps constant). Extraite d'index.ts pour être testable sans
// démarrer le serveur (index.ts appelle Deno.serve au niveau module).

const encoder = new TextEncoder();

export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  // Injectable pour les tests (défaut = horloge réelle, en secondes).
  nowSeconds: () => number = () => Date.now() / 1000,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;
  // En-tête « t=…,v1=…,v1=… » : pendant la rotation du secret (« Roll secret »),
  // Stripe signe avec l'ancien ET le nouveau secret → plusieurs v1. Il suffit
  // qu'une seule corresponde au secret configuré.
  let timestamp = 0;
  const signatures: string[] = [];
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i < 0) continue;
    const k = kv.slice(0, i).trim();
    const v = kv.slice(i + 1).trim();
    if (k === "t") timestamp = Number(v);
    else if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  // Tolérance anti-rejeu
  if (Math.abs(nowSeconds() - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Comparaison à temps constant, sur chaque signature reçue
  let ok = false;
  for (const signature of signatures) {
    if (expected.length !== signature.length) continue;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff === 0) ok = true;
  }
  return ok;
}
