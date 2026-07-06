'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Sécurité du compte — enrôlement / gestion du second facteur (TOTP).
// Page ADDITIVE : ne touche pas au flux de connexion existant. Un utilisateur
// enrôle ici une application d'authentification (Google Authenticator, 1Password…).
// L'enforcement (exiger l'aal2 pour /admin) est géré par la garde de layout.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import {
  getMfaStatus,
  enrollTotp,
  verifyTotp,
  unenrollTotp,
  type MfaStatus,
  type TotpEnrollment,
} from '@/lib/mfa';

type UiState = 'loading' | 'idle' | 'enrolling';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  const [ui, setUi] = useState<UiState>('loading');
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  const refresh = useCallback(async () => {
    const s = await getMfaStatus();
    setStatus(s);
    setUi('idle');
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  const startEnroll = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const e = await enrollTotp();
      setEnrollment(e);
      setUi('enrolling');
    } catch (err: any) {
      // Erreur fréquente : le facteur TOTP n'est pas activé dans le Dashboard.
      setError(
        err?.message?.includes('disabled') || err?.message?.includes('not enabled')
          ? "Le facteur TOTP n'est pas activé côté Supabase (Dashboard → Authentication → MFA)."
          : (err?.message ?? "Impossible de démarrer l'enrôlement.")
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment || busy) return;
    if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      setError('Entre le code à 6 chiffres affiché par ton application.');
      return;
    }
    setError(''); setBusy(true);
    try {
      await verifyTotp(enrollment.factorId, code);
      setEnrollment(null);
      setCode('');
      setNotice('Double authentification activée avec succès.');
      await refresh();
      setUi('idle');
    } catch {
      setError('Code invalide ou expiré. Réessaie avec le code courant.');
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    // Un facteur non vérifié reste "unverified" côté Supabase : on le retire.
    if (enrollment) { try { await unenrollTotp(enrollment.factorId); } catch { /* ignoré */ } }
    setEnrollment(null); setCode(''); setError(''); setUi('idle');
  };

  const disableMfa = async () => {
    if (!status?.verifiedFactorId || busy) return;
    setError(''); setBusy(true);
    try {
      await unenrollTotp(status.verifiedFactorId);
      setNotice('Double authentification désactivée.');
      await refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Désactivation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <main className="min-h-screen bg-cream flex justify-center p-4">
      <div className="w-full max-w-lg pt-10">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-navy-600/70 hover:text-navy-900 transition-colors"
        >
          ← Retour
        </button>

        <div className="glass-strong rounded-3xl p-6 md:p-8">
          <h1 className="font-display text-2xl font-semibold text-navy-900 mb-1">
            Sécurité du compte
          </h1>
          <p className="text-sm text-navy-600/70 mb-6">
            Double authentification (2FA) par application d&apos;authentification.
          </p>

          {isPrivileged && (
            <p className="mb-5 rounded-2xl bg-sun/15 border border-sun/30 px-4 py-3 text-sm text-navy-800">
              Ton compte a des accès d&apos;administration : la double authentification
              est <strong>fortement recommandée</strong>.
            </p>
          )}

          {notice && (
            <p role="status" className="mb-4 rounded-2xl bg-sage/25 border border-sage/40 px-4 py-3 text-sm text-navy-800">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {ui === 'loading' && (
            <div className="py-8 flex justify-center" role="status" aria-label="Chargement">
              <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {ui === 'idle' && status?.hasVerifiedFactor && (
            <div>
              <div className="flex items-center gap-3 rounded-2xl bg-sage/20 border border-sage/40 px-4 py-4 mb-5">
                <span className="text-2xl" aria-hidden>🔒</span>
                <div>
                  <p className="font-bold text-navy-900">Double authentification activée</p>
                  <p className="text-sm text-navy-600/70">
                    Un second facteur est requis pour les accès sensibles.
                  </p>
                </div>
              </div>
              <button
                onClick={disableMfa}
                disabled={busy}
                className="w-full min-h-[48px] py-3 rounded-full border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Désactivation…' : 'Désactiver la double authentification'}
              </button>
            </div>
          )}

          {ui === 'idle' && !status?.hasVerifiedFactor && (
            <div>
              <p className="text-sm text-navy-700 mb-5">
                Protège ton compte avec une application d&apos;authentification
                (Google Authenticator, Microsoft Authenticator, 1Password…). À chaque
                connexion sensible, un code à 6 chiffres te sera demandé.
              </p>
              <button
                onClick={startEnroll}
                disabled={busy}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
              >
                {busy ? 'Préparation…' : 'Activer la double authentification'}
              </button>
            </div>
          )}

          {ui === 'enrolling' && enrollment && (
            <form onSubmit={confirmEnroll} className="space-y-5">
              <ol className="text-sm text-navy-700 space-y-1 list-decimal list-inside">
                <li>Ouvre ton application d&apos;authentification.</li>
                <li>Scanne le QR code ci-dessous (ou saisis la clé manuellement).</li>
                <li>Entre le code à 6 chiffres généré.</li>
              </ol>

              <div className="flex justify-center">
                <div className="rounded-2xl bg-white p-4 border border-navy-100">
                  <QrCode svg={enrollment.qrCodeSvg} />
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-navy-600/60 mb-1">
                  Clé manuelle
                </p>
                <code className="text-xs break-all text-navy-800 select-all">
                  {enrollment.secret}
                </code>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
                  Code à 6 chiffres
                </label>
                <input
                  className="input-auth text-center tracking-[0.4em] text-lg"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEnroll}
                  disabled={busy}
                  className="flex-1 min-h-[48px] py-3 rounded-full border-2 border-navy-200 text-navy-600 font-bold hover:bg-white/70 disabled:opacity-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 min-h-[48px] py-3 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
                >
                  {busy ? 'Vérification…' : 'Vérifier et activer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

// Le QR renvoyé par Supabase est soit un SVG brut, soit une data-URI.
// La CSP autorise data: sur img-src ; le SVG inline est du markup (pas de script).
function QrCode({ svg }: { svg: string }) {
  if (svg.trim().startsWith('<svg')) {
    return (
      <div
        className="w-44 h-44"
        // SVG de confiance généré par Supabase à partir de l'URI otpauth.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={svg} alt="QR code d'enrôlement 2FA" width={176} height={176} />;
}
