'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { useAuthStore } from '@/stores/auth.store';
import { isNativeApp } from '@/lib/native-bridge';
import {
  PROGRAM_PACK_DESCRIPTIONS,
  PROGRAM_PACK_LABELS,
  formatCad,
  programDisplayInstallments,
  type ProgramMode,
  type ProgramPack,
} from '@/lib/program-packs';
import { createProgramCheckout, ProgramCheckoutError } from '@/lib/program-checkout';

// Récapitulatif d'un programme + bouton vers Stripe Checkout. Les montants affichés
// sont indicatifs (constantes d'affichage) : le serveur décide du montant facturé.

const MODES: { key: ProgramMode; label: string }[] = [
  { key: 'deux_versements', label: 'En 2 versements' },
  { key: 'une_fois', label: 'En une fois' },
];

type Notice = { tone: 'ok' | 'info' | 'warn'; text: string };

export function ProgrammeView({ pack }: { pack: ProgramPack }) {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto h-64 rounded-[22px] bg-night-surface animate-pulse" aria-hidden />}>
      <Programme pack={pack} />
    </Suspense>
  );
}

function Programme({ pack }: { pack: ProgramPack }) {
  const params = useSearchParams();
  const role = useAuthStore((s) => s.user?.role ?? null);
  const access = useAccessStore((s) => s.access);
  const accessLoading = useAccessStore((s) => s.isLoading);
  const refreshAccess = useAccessStore((s) => s.refresh);

  const [mode, setMode] = useState<ProgramMode>('deux_versements');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activating, setActivating] = useState(false);
  const [native, setNative] = useState(false);
  const handled = useRef(false);

  useEffect(() => setNative(isNativeApp()), []);
  useEffect(() => {
    void refreshAccess({ silent: true });
  }, [refreshAccess]);

  // Retour de Stripe : état neutre, puis relecture de l'accès (access_state, jamais recalculé ici).
  useEffect(() => {
    if (handled.current) return;
    const checkout = params.get('checkout');
    if (!checkout) return;
    handled.current = true;
    if (checkout === 'cancel') {
      setNotice({ tone: 'info', text: 'Paiement interrompu : rien n’a été prélevé. Tu peux reprendre quand tu veux.' });
      return;
    }
    if (checkout !== 'success') return;
    setActivating(true);
    (async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        await refreshAccess({ silent: true });
        if (useAccessStore.getState().access?.programPack) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      setActivating(false);
      if (!useAccessStore.getState().access?.programPack) {
        setNotice({
          tone: 'info',
          text: 'Merci ! Ton paiement est en cours de confirmation. Ton accès s’ouvre dans quelques instants ; tu peux revenir ici plus tard.',
        });
      }
    })();
  }, [params, refreshAccess]);

  const installments = programDisplayInstallments(pack, mode);
  const label = PROGRAM_PACK_LABELS[pack];
  const hasPack = !!access?.programPack;
  const isStaff = (role && role !== 'PARENT') || access?.isStaff === true;

  const pay = async () => {
    setNotice(null);
    setPending(true);
    try {
      const url = await createProgramCheckout(pack, mode);
      window.location.assign(url);
    } catch (e) {
      setPending(false);
      setNotice({
        tone: 'warn',
        text: e instanceof ProgramCheckoutError ? e.message : 'Le paiement ne s’ouvre pas pour le moment. Réessaie dans un instant.',
      });
      if (e instanceof ProgramCheckoutError && (e.code === 'pack_active' || e.code === 'already_enrolled')) {
        void refreshAccess({ silent: true });
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-om-up">
      <header className="mb-6">
        <p className="nc-eyebrow">Programme</p>
        <h1 className="font-display text-[30px] md:text-4xl font-semibold text-night-ink leading-[1.12] mt-1.5 text-pretty">
          THRIVE {label}
        </h1>
        <p className="text-[15px] leading-[1.5] text-soft mt-1.5">{PROGRAM_PACK_DESCRIPTIONS[pack]}</p>
      </header>

      {notice && (
        <div
          role="status"
          className={`mb-5 rounded-lg border px-4 py-3 text-[14px] leading-relaxed text-body ${
            notice.tone === 'ok' ? 'border-sage/40 bg-sage/[0.10]' : notice.tone === 'warn' ? 'border-sun/30 bg-sun/[0.08]' : 'border-line bg-chip'
          }`}
        >
          {notice.text}
        </div>
      )}

      {activating ? (
        <section className="nc-card text-center py-10" aria-live="polite">
          <div className="mx-auto w-10 h-10 rounded-full border-2 border-line border-t-accent animate-spin" aria-hidden />
          <p className="font-display text-[20px] font-semibold text-night-ink mt-5">Nous activons ton accès…</p>
          <p className="text-[14px] text-soft mt-1.5">Quelques secondes, ne ferme pas la page.</p>
        </section>
      ) : accessLoading && !access ? (
        <div className="h-64 rounded-[22px] bg-night-surface animate-pulse" aria-hidden />
      ) : isStaff ? (
        <section className="nc-card">
          <p className="text-[15px] leading-[1.55] text-body">
            Ton rôle donne accès à tout le contenu de THRIVE, sans paiement.
          </p>
        </section>
      ) : hasPack ? (
        <section className="nc-card">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-sage/15 text-sage-ink flex items-center justify-center shrink-0">
              <Icon name="check" className="w-5 h-5" />
            </span>
            <p className="font-display text-[20px] font-semibold text-night-ink">Un programme THRIVE est en cours</p>
          </div>
          <p className="text-[15px] leading-[1.55] text-body mt-4">
            Ton accès est ouvert : Maison, Bilan et Mes séances sont à ta disposition.
          </p>
          <Link
            href="/parent/fitness"
            className="mt-5 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-accent text-accent-on text-[15px] font-bold"
          >
            Ouvrir Maison <Icon name="arrow-right" className="w-4 h-4" />
          </Link>
        </section>
      ) : (
        <>
          <section className="nc-card">
            <div role="radiogroup" aria-label="Mode de paiement" className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.key}
                  onClick={() => setMode(m.key)}
                  className={`min-h-[48px] rounded-full border text-[15px] font-semibold transition-colors ${
                    mode === m.key ? 'border-accent bg-accent/15 text-night-ink' : 'border-line text-soft'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <ul className="mt-5 divide-y divide-line">
              {installments.map((i) => (
                <li key={i.rank} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[15px] text-night-ink">{i.dueWhen === 'inscription' ? 'Aujourd’hui' : 'À la séance 7'}</p>
                    <p className="text-[13px] text-soft">
                      {i.dueWhen === 'inscription' ? 'Remboursable pendant la garantie' : 'Prélevé sur le même moyen de paiement'}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold text-night-ink whitespace-nowrap">{formatCad(i.htCents)} + tx</p>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-faint mt-1">
              {`Aujourd’hui : ${formatCad(installments[0].ttcCents)} taxes incluses (TPS + TVQ).`}
            </p>
            <p className="text-[13px] text-soft mt-4 leading-[1.5]">
              Garantie : les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.
            </p>

            {native ? (
              <p className="mt-5 text-[14px] leading-[1.55] text-body">
                Ton coach peut t’envoyer un lien de paiement par courriel.
              </p>
            ) : (
              <button
                onClick={pay}
                disabled={pending}
                className="mt-5 w-full h-14 rounded-full bg-accent text-accent-on font-bold text-[16px] active:scale-95 disabled:opacity-60 transition-transform"
              >
                {pending ? 'Ouverture du paiement…' : `Payer ${formatCad(installments[0].ttcCents)}`}
              </button>
            )}
          </section>
          <p className="text-[13px] text-faint mt-4 text-center">Paiement sécurisé par Stripe ; reçu par courriel.</p>
        </>
      )}
    </div>
  );
}
