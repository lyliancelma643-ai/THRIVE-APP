'use client';

import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Abonnement P3 « Le moment qui compte » côté web.
//
//   • Un seul droit d'accès (entitlement RevenueCat `thrive_moments`), payable
//     sur le web (Stripe Checkout), sur iPhone (App Store) ou sur Android
//     (Google Play). L'App User ID est toujours l'id Supabase du compte.
//   • Le web ne parle jamais à Stripe ni à RevenueCat directement : tout passe
//     par des edge functions (clés secrètes côté serveur uniquement).
//   • L'état affiché vient du miroir `billing_subscriptions` (lecture seule,
//     RLS : sa propre ligne), tenu à jour par les webhooks RevenueCat et Stripe
//     et par `billing-sync` au retour de paiement.
//   • Les prix affichés sont lus chez Stripe (billing-plans) : aucun montant
//     n'est écrit dans ce code.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanCode = 'mensuel' | 'annuel';

export type WebPlan = {
  plan: PlanCode;
  /** Montant en plus petite unité (cents). */
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  name: string | null;
};

export type PlansResponse = {
  plans: WebPlan[];
  trial_days: number;
  trial_eligible: boolean;
};

export type SubscriptionRow = {
  active: boolean;
  store: string | null;
  product_id: string | null;
  period_type: string | null;
  will_renew: boolean | null;
  expires_at: string | null;
  billing_issue_at: string | null;
  ever_subscribed: boolean;
  stripe_customer_id: string | null;
};

/** Où l'abonné gère son abonnement. */
export type ManagementChannel = 'web' | 'app_store' | 'play_store' | 'offert' | 'autre';

// ── Logique pure (testée) ───────────────────────────────────────────────────

export function isSubscriptionActive(row: Pick<SubscriptionRow, 'active' | 'expires_at'> | null, now = new Date()): boolean {
  if (!row?.active) return false;
  return row.expires_at === null || new Date(row.expires_at).getTime() > now.getTime();
}

export function managementChannel(store: string | null | undefined): ManagementChannel {
  switch ((store ?? '').toLowerCase()) {
    case 'stripe':
    case 'rc_billing':
      return 'web';
    case 'app_store':
    case 'mac_app_store':
      return 'app_store';
    case 'play_store':
      return 'play_store';
    case 'promotional':
      return 'offert';
    default:
      return 'autre';
  }
}

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

export function periodLabel(plan: Pick<WebPlan, 'interval' | 'interval_count'>): string {
  const n = plan.interval_count;
  const unit = { day: 'jour', week: 'semaine', month: 'mois', year: 'an' }[plan.interval];
  return n === 1 ? unit : `${n} ${plan.interval === 'month' ? 'mois' : `${unit}s`}`;
}

/** Montant ramené à l'année (pour comparer mensuel et annuel honnêtement). */
export function yearlyAmount(plan: Pick<WebPlan, 'amount' | 'interval' | 'interval_count'>): number {
  const perYear = { day: 365, week: 52, month: 12, year: 1 }[plan.interval] / plan.interval_count;
  return Math.round(plan.amount * perYear);
}

/** Économie réelle de l'annuel par rapport à 12 mensualités, en % arrondi. */
export function annualSavingsPercent(plans: WebPlan[]): number | null {
  const monthly = plans.find((p) => p.plan === 'mensuel');
  const annual = plans.find((p) => p.plan === 'annuel');
  if (!monthly || !annual || monthly.currency !== annual.currency) return null;
  const full = yearlyAmount(monthly);
  const paid = yearlyAmount(annual);
  if (full <= 0 || paid >= full) return null;
  return Math.round(((full - paid) / full) * 100);
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

// ── Appels serveur ──────────────────────────────────────────────────────────

export class BillingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

async function invoke<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = 'internal';
    let message = 'Le service de paiement ne répond pas. Réessayez dans un instant.';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const payload = await ctx.json().catch(() => null);
      if (payload?.code) code = String(payload.code);
      if (payload?.message) message = String(payload.message);
    }
    throw new BillingError(message, code);
  }
  return data as T;
}

export const fetchPlans = () => invoke<PlansResponse>('billing-plans');

/** Démarre Stripe Checkout et redirige le navigateur. */
export async function startCheckout(plan: PlanCode): Promise<void> {
  const { url } = await invoke<{ url: string }>('create-checkout-session', {
    plan,
    origin: window.location.origin,
  });
  window.location.assign(url);
}

/** Ouvre le Portail client Stripe (annulation, carte, factures, formule). */
export async function openCustomerPortal(): Promise<void> {
  const { url } = await invoke<{ url: string }>('create-portal-session', {
    origin: window.location.origin,
  });
  window.location.assign(url);
}

// ── Store ───────────────────────────────────────────────────────────────────

type SubscriptionStore = {
  row: SubscriptionRow | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Relit l'état chez RevenueCat (retour de paiement, « Actualiser mon accès »). */
  sync: (sessionId?: string) => Promise<boolean>;
};

const SELECT =
  'active, store, product_id, period_type, will_renew, expires_at, billing_issue_at, ever_subscribed, stripe_customer_id';

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  row: null,
  isLoading: true,

  refresh: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ row: null, isLoading: false });
      return;
    }
    const { data } = await supabase
      .from('billing_subscriptions')
      .select(SELECT)
      .eq('user_id', user.id)
      .maybeSingle();
    set({ row: (data as SubscriptionRow | null) ?? null, isLoading: false });
  },

  sync: async (sessionId) => {
    await invoke('billing-sync', sessionId ? { session_id: sessionId } : {});
    await get().refresh();
    return isSubscriptionActive(get().row);
  },
}));
