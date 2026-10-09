// ─────────────────────────────────────────────────────────────────────────────
// Cœur PUR de la monétisation hybride (aucune API Deno, aucun réseau) :
// testable tel quel (billing_core.test.ts).
//
// Règle n° 1 : l'App User ID RevenueCat = l'id Supabase de l'utilisateur,
// partout (web Stripe, iOS, Android). Tout identifiant qui n'est pas un UUID
// (ex. $RCAnonymousID:…) est ignoré côté serveur.
// ─────────────────────────────────────────────────────────────────────────────

/** Entitlement RevenueCat unique de P3, identique sur web, iOS et Android. */
export const RC_ENTITLEMENT = "thrive_moments";

/** Essai gratuit web (Stripe Checkout) : 1 mois, une seule fois par compte. */
export const TRIAL_DAYS = 30;

/** Plans web → lookup_key des prix Stripe (le montant vit dans Stripe). */
export const PLAN_LOOKUP_KEYS = {
  mensuel: "thrive_moments_mensuel",
  annuel: "thrive_moments_annuel",
} as const;
export type PlanCode = keyof typeof PLAN_LOOKUP_KEYS;

export function isPlanCode(v: unknown): v is PlanCode {
  return v === "mensuel" || v === "annuel";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// ── Origines de retour (anti open-redirect) ─────────────────────────────────
export const DEFAULT_APP_ORIGINS = [
  "https://app.thrivesportpositive.com",
  "http://localhost:3001",
];

export function parseOrigins(csv: string | undefined | null): string[] {
  const list = (csv ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => /^https?:\/\/[^/]+$/.test(s));
  return list.length ? list : DEFAULT_APP_ORIGINS;
}

/** L'origine demandée si elle est autorisée, sinon la première autorisée. */
export function resolveReturnOrigin(requested: string | null | undefined, allowed: string[]): string {
  const clean = String(requested ?? "").trim().replace(/\/+$/, "");
  return allowed.includes(clean) ? clean : allowed[0];
}

// ── Encodage x-www-form-urlencoded façon Stripe (objets et tableaux imbriqués) ─
export type FormValue = string | number | boolean | null | undefined | FormValue[] | { [k: string]: FormValue };

export function encodeStripeForm(params: Record<string, FormValue>): string {
  const out = new URLSearchParams();
  const walk = (prefix: string, value: FormValue) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(`${prefix}[${k}]`, v);
    } else {
      out.append(prefix, String(value));
    }
  };
  for (const [k, v] of Object.entries(params)) walk(k, v);
  return out.toString();
}

// ── Lecture de l'état RevenueCat (API REST v1 /subscribers/{id}) ────────────
export type RcSubscriber = {
  entitlements?: Record<string, {
    expires_date: string | null;
    product_identifier?: string;
    purchase_date?: string;
  }>;
  subscriptions?: Record<string, {
    store?: string;
    period_type?: string;
    expires_date?: string | null;
    unsubscribe_detected_at?: string | null;
    billing_issues_detected_at?: string | null;
    is_sandbox?: boolean;
  }>;
  non_subscriptions?: Record<string, unknown[]>;
};

export type BillingStatus = {
  active: boolean;
  store: string | null;
  product_id: string | null;
  period_type: string | null;
  will_renew: boolean | null;
  expires_at: string | null;
  billing_issue_at: string | null;
  is_sandbox: boolean;
  ever_subscribed: boolean;
};

/** Normalise le nom de store RevenueCat (APP_STORE, app_store, stripe…). */
export function normalizeStore(store: string | null | undefined): string | null {
  if (!store) return null;
  return store.trim().toLowerCase();
}

/**
 * Traduit l'état RevenueCat en ligne billing_subscriptions.
 * `active` = l'entitlement existe et n'est pas expiré à `now` (expires_date
 * null = sans fin, ex. accès offert à vie).
 */
export function deriveBillingStatus(subscriber: RcSubscriber | null | undefined, now: Date): BillingStatus {
  const ent = subscriber?.entitlements?.[RC_ENTITLEMENT];
  const subs = subscriber?.subscriptions ?? {};
  const everSubscribed = Object.keys(subs).length > 0 || Boolean(ent);

  if (!ent) {
    return {
      active: false, store: null, product_id: null, period_type: null, will_renew: null,
      expires_at: null, billing_issue_at: null, is_sandbox: false, ever_subscribed: everSubscribed,
    };
  }

  const expiresAt = ent.expires_date ?? null;
  const active = expiresAt === null || new Date(expiresAt).getTime() > now.getTime();
  const productId = ent.product_identifier ?? null;
  const sub = productId ? subs[productId] : undefined;

  return {
    active,
    store: normalizeStore(sub?.store ?? (productId?.startsWith("rc_promo") ? "promotional" : null)),
    product_id: productId,
    period_type: sub?.period_type ? sub.period_type.toLowerCase() : null,
    will_renew: sub ? !sub.unsubscribe_detected_at && !(sub.store ?? "").toLowerCase().includes("promo") : null,
    expires_at: expiresAt,
    billing_issue_at: sub?.billing_issues_detected_at ?? null,
    is_sandbox: Boolean(sub?.is_sandbox),
    ever_subscribed: true,
  };
}

// ── Webhook RevenueCat : quels comptes resynchroniser ────────────────────────
export type RcWebhookEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

/** Tous les App User IDs (UUID Supabase uniquement) touchés par un événement. */
export function appUserIdsFromRcEvent(event: RcWebhookEvent | null | undefined): string[] {
  if (!event) return [];
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ];
  return [...new Set(ids.filter(isUuid).map((s) => s.toLowerCase()))];
}

/** Comparaison à temps constant (secret partagé du webhook RevenueCat). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** App User ID porté par une session Checkout (client_reference_id en priorité). */
export function appUserIdFromCheckoutSession(session: {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
} | null | undefined): string | null {
  const candidates = [session?.client_reference_id, session?.metadata?.app_user_id];
  const found = candidates.find(isUuid);
  return found ? found.toLowerCase() : null;
}

// ── Historique Stripe du client (filet du checkout) ─────────────────────────
/** Statuts d'abonnement Stripe encore facturables (accès en cours ou impayé). */
const STRIPE_BILLABLE = new Set(["trialing", "active", "past_due", "unpaid", "paused"]);
/** Statuts qui ne prouvent pas qu'un abonnement a réellement existé. */
const STRIPE_NEVER_STARTED = new Set(["incomplete", "incomplete_expired"]);

/**
 * Lecture directe chez Stripe, indépendante du miroir RevenueCat :
 *   • billable        → un abonnement web est encore facturable (refus 409) ;
 *   • everSubscribed  → le client a déjà eu un abonnement (plus d'essai).
 */
export function stripeHistoryVerdict(subs: { status?: string | null }[] | null | undefined): {
  billable: boolean;
  everSubscribed: boolean;
} {
  const list = subs ?? [];
  return {
    billable: list.some((s) => STRIPE_BILLABLE.has(String(s.status))),
    everSubscribed: list.some((s) => !STRIPE_NEVER_STARTED.has(String(s.status))),
  };
}

// ── Pack THRIVE en cours (migration 080) ─────────────────────────────────────
/** Date du jour à Montréal (AAAA-MM-JJ), comme private.access_compute. */
export function torontoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(now);
}

/**
 * Un pack (Groupe / Individuel / Complet) en cours inclut déjà Maison : on ne
 * vend pas d'abonnement Maison par-dessus (pas de double facturation). Même
 * règle de dates que la base : début ≤ aujourd'hui ≤ fin (fin nulle = ouverte).
 */
export function hasActivePack(
  rows: { starts_on?: string | null; ends_on?: string | null }[] | null | undefined,
  today: string = torontoToday(),
): boolean {
  return (rows ?? []).some((r) =>
    typeof r.starts_on === "string" && r.starts_on <= today && (r.ends_on == null || r.ends_on >= today)
  );
}
