#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Catalogue Stripe des programmes THRIVE (Groupe · Individuel · Complet).
//
//   node scripts/ops/stripe-setup-programmes.mjs --mode test            # dry-run (défaut)
//   node scripts/ops/stripe-setup-programmes.mjs --mode test --apply    # écrit en mode test
//   node scripts/ops/stripe-setup-programmes.mjs --mode live --apply    # écrit en LIVE
//
// • Clé lue dans l'environnement : STRIPE_SECRET_KEY_TEST (--mode test) ou
//   STRIPE_SECRET_KEY_LIVE (--mode live). Elle n'est JAMAIS affichée ; son
//   préfixe doit correspondre au mode (sk_test_/rk_test_ ou sk_live_/rk_live_).
// • --dry-run PAR DÉFAUT : seules des lectures (GET) sont faites ; rien n'est
//   créé sans --apply.
// • Idempotent : produits retrouvés par metadata.thrive_key, prix par lookup_key.
//   Un prix existant au bon montant est laissé tel quel ; un prix au MAUVAIS
//   montant n'est jamais modifié (Stripe ne le permet pas) : le script le signale
//   et s'arrête (décision humaine : nouvelle lookup_key _v2 ou transfer_lookup_key).
// • Montants = _shared/program_billing.ts (cents CAD, hors taxes, exclusive).
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'test';
const apply = args.includes('--apply');
if (!['test', 'live'].includes(mode)) {
  console.error('--mode test|live');
  process.exit(2);
}

// Miroir de supabase/functions/_shared/program_billing.ts (à garder synchronisé).
const PRODUCTS = [
  { key: 'thrive_groupe', name: 'THRIVE Groupe', total: 60000, base: 'thrive_groupe_v1' },
  { key: 'thrive_individuel', name: 'THRIVE Individuel', total: 150000, base: 'thrive_individuel_v1' },
  { key: 'thrive_complet', name: 'THRIVE Complet', total: 200000, base: 'thrive_complet_v1' },
];
const TAX_CODE = 'txcd_20030000';

const envName = mode === 'live' ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST';
const key = process.env[envName] ?? '';
const okPrefix = mode === 'live' ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/;
if (!okPrefix.test(key)) {
  console.error(`${envName} absente ou ne correspond pas au mode ${mode} (valeur non affichée).`);
  process.exit(2);
}

function form(params, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? form(x, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(x))));
    else if (typeof v === 'object') form(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}

async function api(method, path, params = {}, idem) {
  if (method !== 'GET' && !apply) throw new Error('écriture interdite en dry-run');
  const body = form(params).toString();
  const url = `https://api.stripe.com/v1${path}${method === 'GET' && body ? `?${body}` : ''}`;
  const headers = { Authorization: `Bearer ${key}` };
  if (method !== 'GET') headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idem) headers['Idempotency-Key'] = idem;
  const res = await fetch(url, { method, headers, body: method === 'GET' ? undefined : body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status} ${data?.error?.code ?? ''} ${data?.error?.message ?? ''}`);
  return data;
}

console.log(`Stripe ${mode.toUpperCase()} — ${apply ? 'APPLICATION' : 'dry-run (aucune écriture ; ajouter --apply)'}`);
let problems = 0;

for (const p of PRODUCTS) {
  const found = await api('GET', '/products/search', { query: `metadata['thrive_key']:'${p.key}'`, limit: 1 });
  let product = found.data?.[0];
  if (product) console.log(`= produit ${p.name} (${product.id})`);
  else if (apply) {
    product = await api('POST', '/products', {
      name: p.name, tax_code: TAX_CODE, metadata: { thrive_key: p.key, kind: 'program' },
    }, `thrive-product-${p.key}-${mode}`);
    console.log(`+ produit ${p.name} (${product.id})`);
  } else console.log(`+ produit ${p.name} (à créer)`);

  const wanted = [
    { lookup: `${p.base}_versement`, amount: Math.ceil(p.total / 2), nickname: `${p.name} — versement (1 de 2)` },
    { lookup: `${p.base}_complet`, amount: p.total, nickname: `${p.name} — paiement complet` },
  ];
  for (const w of wanted) {
    const prices = await api('GET', '/prices', { lookup_keys: [w.lookup], limit: 1 });
    const price = prices.data?.[0];
    if (price) {
      const good = price.unit_amount === w.amount && price.currency === 'cad' && price.tax_behavior === 'exclusive' && price.active;
      console.log(`${good ? '=' : '!'} prix ${w.lookup} ${price.unit_amount} ${price.currency} ${price.tax_behavior}${price.active ? '' : ' (inactif)'}`);
      if (!good) problems++;
      continue;
    }
    if (!apply || !product?.id) {
      console.log(`+ prix ${w.lookup} ${w.amount} cad exclusive (à créer)`);
      continue;
    }
    const created = await api('POST', '/prices', {
      product: product.id, currency: 'cad', unit_amount: w.amount, tax_behavior: 'exclusive',
      lookup_key: w.lookup, nickname: w.nickname, metadata: { kind: 'program', thrive_key: p.key },
    }, `thrive-price-${w.lookup}-${mode}`);
    console.log(`+ prix ${w.lookup} (${created.id})`);
  }
}

if (problems) {
  console.error(`\n${problems} prix existant(s) non conforme(s) : rien n'a été modifié. Décision humaine requise.`);
  process.exit(1);
}
console.log('\nTerminé.');
