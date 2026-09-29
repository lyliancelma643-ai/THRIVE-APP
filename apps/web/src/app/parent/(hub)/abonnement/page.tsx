'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Abonnement P3 « Le moment qui compte » — web.
//
//   • Non abonné : l'offre, lue en direct chez Stripe (billing-plans), annuel
//     présélectionné, essai d'un mois si le compte n'en a jamais eu.
//     Paiement : Stripe Checkout (page hébergée, carte toujours demandée).
//   • Retour de paiement (?checkout=success&session_id=…) : on déclare l'achat à
//     RevenueCat et on relit l'accès (billing-sync), sans attendre les webhooks.
//   • Abonné : état + gestion au bon endroit selon la plateforme d'achat —
//     Portail client Stripe (web), réglages de l'iPhone (App Store) ou Google
//     Play (Android), ou accès offert.
//   • Coachs / admins : accès complet, aucun paywall.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { useAccessStore } from '@/lib/access';
import {
  annualSavingsPercent,
  BillingError,
  fetchPlans,
  formatDateFr,
  formatMoney,
  isSubscriptionActive,
  managementChannel,
  openCustomerPortal,
  periodLabel,
  startCheckout,
  useSubscriptionStore,
  type PlanCode,
  type PlansResponse,
  type WebPlan,
} from '@/lib/billing';

const PROMISES = [
  'Une activité de 10 minutes par jour, rien à préparer',
  'Choisie pour votre enfant, et de mieux en mieux au fil de vos retours',
  'Adossée aux 13 séances de la Méthode THRIVE',
  'Le carnet des moments et les objets à gagner ensemble',
  'Accès pour les deux parents',
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** « 1 mois », « 2 semaines », « 10 jours ». */
function trialDuration(days: number): string {
  if (days === 30 || days === 31) return '1 mois';
  if (days % 7 === 0) return days === 7 ? '1 semaine' : `${days / 7} semaines`;
  return `${days} jours`;
}

function trialLabel(days: number): string {
  const d = trialDuration(days);
  return d.endsWith('semaines') || d.endsWith('semaine') ? `${d} gratuite${d.endsWith('s') ? 's' : ''}` : `${d} gratuit${d.endsWith('jours') ? 's' : ''}`;
}

export default function AbonnementPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Abonnement />
    </Suspense>
  );
}

function Abonnement() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  const { row, isLoading, refresh, sync } = useSubscriptionStore();
  const refreshAccess = useAccessStore((s) => s.refresh);
  const params = useSearchParams();
  const router = useRouter();

  const [activating, setActivating] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'info' | 'warn'; text: string } | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Retour de Stripe (paiement, annulation, portail) — traité une seule fois.
  useEffect(() => {
    if (handled.current) return;
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    const portal = params.get('portal');
    if (!checkout && !portal) return;
    handled.current = true;

    (async () => {
      if (checkout === 'cancel') {
        setNotice({ tone: 'info', text: 'Paiement interrompu : rien n’a été prélevé. Vous pouvez reprendre quand vous voulez.' });
      } else if (checkout === 'success') {
        setActivating(true);
        let active = false;
        for (let attempt = 0; attempt < 6 && !active; attempt++) {
          try {
            active = await sync(sessionId ?? undefined);
          } catch {
            /* on réessaie : la confirmation Stripe peut prendre quelques secondes */
          }
          if (!active) await wait(2500);
        }
        setActivating(false);
        await refreshAccess();
        setNotice(
          active
            ? { tone: 'ok', text: 'Bienvenue ! Votre accès à Maison est ouvert.' }
            : {
                tone: 'warn',
                text: 'Votre paiement est bien reçu ; l’activation prend un peu plus de temps que prévu. Touchez « Actualiser mon accès » dans une minute.',
              }
        );
      } else if (portal === 'return') {
        try {
          await sync();
          await refreshAccess();
        } catch {
          /* l'affichage reste celui du miroir */
        }
      }
      router.replace('/parent/abonnement', { scroll: false });
    })();
  }, [params, router, sync, refreshAccess]);

  if (role && role !== 'PARENT') {
    return (
      <Shell>
        <section className="nc-card">
          <p className="text-[15px] leading-[1.55] text-body">
            Votre rôle donne accès à tout le contenu de THRIVE, sans abonnement.
          </p>
        </section>
      </Shell>
    );
  }

  if (isLoading || activating) {
    return activating ? (
      <Shell>
        <section className="nc-card text-center py-10" aria-live="polite">
          <div className="mx-auto w-10 h-10 rounded-full border-2 border-line border-t-accent animate-spin" aria-hidden />
          <p className="font-display text-[20px] font-semibold text-night-ink mt-5">Nous activons votre accès…</p>
          <p className="text-[14px] text-soft mt-1.5">Quelques secondes, ne fermez pas la page.</p>
        </section>
      </Shell>
    ) : (
      <PageSkeleton />
    );
  }

  const active = isSubscriptionActive(row);

  return (
    <Shell>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {active && row ? <ActiveSubscription /> : <Offer onNotice={setNotice} />}
    </Shell>
  );
}

// ── Abonné ──────────────────────────────────────────────────────────────────

function ActiveSubscription() {
  const { row, sync } = useSubscriptionStore();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!row) return null;

  const channel = managementChannel(row.store);
  const isTrial = row.period_type === 'trial';
  const end = formatDateFr(row.expires_at);

  const openPortal = async () => {
    setError(null);
    setOpening(true);
    try {
      await openCustomerPortal();
    } catch (e) {
      setError(e instanceof BillingError ? e.message : 'Le portail ne répond pas. Réessayez dans un instant.');
      setOpening(false);
    }
  };

  return (
    <>
      <section className="nc-card">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-sage/15 text-sage-ink flex items-center justify-center shrink-0">
            <Icon name="check" className="w-5 h-5" />
          </span>
          <div>
            <p className="font-display text-[20px] font-semibold text-night-ink">
              {channel === 'offert' ? 'Accès offert par THRIVE' : isTrial ? 'Essai gratuit en cours' : 'Abonnement actif'}
            </p>
            <p className="text-[14px] text-soft">Le moment qui compte · Maison</p>
          </div>
        </div>

        {end && (
          <p className="text-[15px] leading-[1.55] text-body mt-4">
            {channel === 'offert'
              ? `Votre accès est ouvert jusqu’au ${end}.`
              : isTrial
                ? row.will_renew
                  ? `Gratuit jusqu’au ${end}. Le premier prélèvement aura lieu ce jour-là, sauf annulation avant.`
                  : `Gratuit jusqu’au ${end}. L’abonnement est annulé : aucun prélèvement ne sera fait.`
                : row.will_renew
                  ? `Prochain renouvellement le ${end}.`
                  : `Votre accès reste ouvert jusqu’au ${end}, sans renouvellement.`}
          </p>
        )}

        {row.billing_issue_at && (
          <p className="mt-4 rounded-lg border border-sun/30 bg-sun/[0.08] px-4 py-3 text-[14px] leading-relaxed text-body">
            Le dernier paiement n’est pas passé. Mettez à jour votre moyen de paiement pour garder votre accès.
          </p>
        )}

        <div className="mt-6 pt-5 border-t border-line space-y-3">
          {channel === 'web' && (
            <>
              <button
                onClick={openPortal}
                disabled={opening}
                className="w-full h-12 rounded-full bg-accent text-accent-on font-bold text-[15px] active:scale-95 disabled:opacity-60 transition-transform"
              >
                {opening ? 'Ouverture…' : 'Gérer mon abonnement'}
              </button>
              <p className="text-[13px] text-faint text-center">
                Annuler, changer de carte ou de formule, télécharger vos factures.
              </p>
            </>
          )}
          {channel === 'app_store' && (
            <p className="text-[14px] leading-[1.55] text-body">
              Vous avez souscrit sur iPhone. Pour modifier ou annuler : <strong>Réglages</strong> › votre nom ›{' '}
              <strong>Abonnements</strong> › THRIVE.
            </p>
          )}
          {channel === 'play_store' && (
            <p className="text-[14px] leading-[1.55] text-body">
              Vous avez souscrit sur Android. Pour modifier ou annuler : <strong>Google Play</strong> › votre profil ›{' '}
              <strong>Paiements et abonnements</strong> › Abonnements.
            </p>
          )}
          {channel === 'autre' && (
            <p className="text-[14px] leading-[1.55] text-body">
              Une question sur votre abonnement ? Écrivez-nous depuis la messagerie.
            </p>
          )}
          {error && <p className="text-[13px] text-red-300 text-center">{error}</p>}
        </div>
      </section>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href="/parent/fitness"
          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full border border-line text-[15px] font-semibold text-night-ink active:scale-95 transition-transform"
        >
          Ouvrir Maison <Icon name="arrow-right" className="w-4 h-4" />
        </Link>
        <RefreshAccessButton onDone={() => sync().then(() => undefined)} />
      </div>
    </>
  );
}

// ── Non abonné : l'offre ────────────────────────────────────────────────────

function Offer({ onNotice }: { onNotice: (n: { tone: 'ok' | 'info' | 'warn'; text: string } | null) => void }) {
  const { sync } = useSubscriptionStore();
  const refreshAccess = useAccessStore((s) => s.refresh);
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanCode>('annuel');
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await fetchPlans());
    } catch (e) {
      setLoadError(
        e instanceof BillingError && e.code === 'not_configured'
          ? 'Le paiement en ligne ouvre très bientôt.'
          : 'L’offre ne s’affiche pas pour le moment. Réessayez dans un instant.'
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plans = useMemo(() => data?.plans ?? [], [data]);
  const savings = annualSavingsPercent(plans);
  const chosen = plans.find((p) => p.plan === selected) ?? plans[0];

  const subscribe = async () => {
    if (!chosen) return;
    onNotice(null);
    setPending(true);
    try {
      await startCheckout(chosen.plan);
    } catch (e) {
      setPending(false);
      if (e instanceof BillingError && e.code === 'already_subscribed') {
        await sync().catch(() => false);
        await refreshAccess();
        return;
      }
      onNotice({ tone: 'warn', text: e instanceof BillingError ? e.message : 'Le paiement ne s’ouvre pas. Réessayez.' });
    }
  };

  return (
    <>
      <section className="nc-card">
        <ul className="space-y-3">
          {PROMISES.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] leading-[1.5] text-body">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-accent/15 text-accent-ink flex items-center justify-center shrink-0">
                <Icon name="check" className="w-3.5 h-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </section>

      {loadError ? (
        <p className="nc-row-idle px-4 py-5 mt-6 text-[15px] text-soft">{loadError}</p>
      ) : !data ? (
        <div className="mt-6 grid gap-3" aria-hidden>
          <div className="h-24 rounded-[18px] bg-night-surface animate-pulse" />
          <div className="h-24 rounded-[18px] bg-night-surface animate-pulse" />
        </div>
      ) : (
        <>
          {data.trial_eligible && (
            <p className="mt-6 text-center font-display text-[20px] font-semibold text-accent-ink">
              {trialLabel(data.trial_days)}, puis au choix :
            </p>
          )}

          <div role="radiogroup" aria-label="Formule" className="mt-4 grid gap-3">
            {plans.map((p) => (
              <PlanOption
                key={p.plan}
                plan={p}
                checked={chosen?.plan === p.plan}
                badge={p.plan === 'annuel' && savings ? `−${savings} %` : null}
                onSelect={() => setSelected(p.plan)}
              />
            ))}
          </div>

          {chosen && (
            <>
              <button
                onClick={subscribe}
                disabled={pending}
                className="mt-6 w-full h-14 rounded-full bg-accent text-accent-on font-bold text-[16px] active:scale-95 disabled:opacity-60 transition-transform"
              >
                {pending ? 'Ouverture du paiement sécurisé…' : data.trial_eligible ? `Commencer mon essai de ${trialDuration(data.trial_days)}` : 'M’abonner'}
              </button>
              <p className="text-[13px] leading-[1.5] text-faint text-center mt-3 text-pretty">
                {data.trial_eligible
                  ? `Gratuit pendant ${trialDuration(data.trial_days)}, puis ${formatMoney(chosen.amount, chosen.currency)} par ${periodLabel(chosen)}. Annulez avant la fin de l’essai : aucun prélèvement.`
                  : `${formatMoney(chosen.amount, chosen.currency)} par ${periodLabel(chosen)}, sans engagement.`}{' '}
                Renouvellement automatique jusqu’à annulation, en deux clics. Paiement sécurisé par Stripe.
              </p>
            </>
          )}
        </>
      )}

      <div className="mt-8 pt-6 border-t border-line text-center">
        <p className="text-[14px] text-soft">Déjà abonné sur iPhone ou Android ?</p>
        <div className="mt-3 flex justify-center">
          <RefreshAccessButton
            onDone={async () => {
              const ok = await sync();
              await refreshAccess();
              onNotice(
                ok
                  ? { tone: 'ok', text: 'Votre abonnement est retrouvé : l’accès à Maison est ouvert.' }
                  : { tone: 'info', text: 'Aucun abonnement actif n’est rattaché à ce compte. Vérifiez que vous êtes connecté avec la même adresse que sur votre téléphone.' }
              );
            }}
          />
        </div>
      </div>
    </>
  );
}

function PlanOption({
  plan,
  checked,
  badge,
  onSelect,
}: {
  plan: WebPlan;
  checked: boolean;
  badge: string | null;
  onSelect: () => void;
}) {
  const perMonth = plan.interval === 'year' ? formatMoney(Math.round(plan.amount / (12 * plan.interval_count)), plan.currency) : null;
  return (
    <button
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`nc-row w-full text-left px-5 py-4 flex items-center gap-4 transition-shadow ${
        checked ? 'ring-2 ring-accent' : 'ring-1 ring-line'
      }`}
    >
      <span
        aria-hidden
        className={`w-5 h-5 rounded-full border-2 shrink-0 grid place-items-center ${checked ? 'border-accent' : 'border-line'}`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-night-ink text-[16px]">
            {plan.plan === 'annuel' ? 'Annuel' : 'Mensuel'}
          </span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-sage text-navy-900 text-[11px] font-bold">{badge}</span>
          )}
        </span>
        {perMonth && <span className="block text-[13px] text-soft mt-0.5">soit {perMonth} par mois</span>}
      </span>
      <span className="text-right shrink-0">
        <span className="block font-display text-[20px] font-semibold text-night-ink">
          {formatMoney(plan.amount, plan.currency)}
        </span>
        <span className="block text-[12px] text-faint">par {periodLabel(plan)}</span>
      </span>
    </button>
  );
}

// ── Pièces communes ─────────────────────────────────────────────────────────

function RefreshAccessButton({ onDone }: { onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await onDone();
        } catch {
          /* le message d'état reste inchangé */
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="flex items-center justify-center h-12 px-6 rounded-full border border-line text-[15px] font-semibold text-body active:scale-95 disabled:opacity-60 transition-transform"
    >
      {busy ? 'Vérification…' : 'Actualiser mon accès'}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xl mx-auto animate-om-up">
      <header className="mb-6">
        <p className="nc-eyebrow">Mon abonnement</p>
        <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-1.5 text-pretty">
          Le moment qui compte
        </h1>
        <p className="text-[15px] leading-[1.5] text-soft mt-1.5">
          10 minutes par jour avec votre enfant. Ce n’est pas le nombre d’heures qui compte, c’est la qualité du moment.
        </p>
      </header>
      {children}
    </div>
  );
}

function Notice({ tone, children }: { tone: 'ok' | 'info' | 'warn'; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-sage/40 bg-sage/[0.10]'
      : tone === 'warn'
        ? 'border-sun/30 bg-sun/[0.08]'
        : 'border-line bg-chip';
  return (
    <div role="status" className={`mb-5 rounded-lg border px-4 py-3 text-[14px] leading-relaxed text-body ${cls}`}>
      {children}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-xl mx-auto space-y-4" aria-hidden>
      <div className="h-24 rounded-[22px] bg-night-surface animate-pulse" />
      <div className="h-64 rounded-[22px] bg-night-surface animate-pulse" />
    </div>
  );
}
