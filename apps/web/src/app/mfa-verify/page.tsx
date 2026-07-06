'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Step-up MFA : élève une session déjà ouverte (aal1) vers aal2 en vérifiant un
// code TOTP. Utilisée quand un utilisateur AYANT un facteur enrôlé accède à une
// zone sensible sans avoir encore passé le second facteur.
// DORMANT par nature : si l'utilisateur n'a pas de facteur, on repart aussitôt.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMfaStatus, verifyTotp } from '@/lib/mfa';
import { logout } from '@/stores/auth.store';

function MfaVerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));

  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const s = await getMfaStatus();
      // Pas de facteur, ou déjà en aal2 → rien à vérifier : on continue.
      if (!s.hasVerifiedFactor || !s.needsStepUp) {
        router.replace(next);
        return;
      }
      setFactorId(s.verifiedFactorId);
      setChecking(false);
    })();
  }, [router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || busy) return;
    if (!/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      setError('Entre le code à 6 chiffres de ton application.');
      return;
    }
    setError(''); setBusy(true);
    try {
      await verifyTotp(factorId, code);
      router.replace(next);
    } catch {
      setError('Code invalide ou expiré. Réessaie avec le code courant.');
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center" aria-busy>
        <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" role="status" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-strong rounded-3xl p-6 md:p-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-navy-600/10 flex items-center justify-center text-2xl" aria-hidden>
          🔐
        </div>
        <h1 className="font-display text-xl font-semibold text-navy-900 text-center mb-1">
          Vérification en deux étapes
        </h1>
        <p className="text-sm text-navy-600/70 text-center mb-6">
          Entre le code à 6 chiffres de ton application d&apos;authentification.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <input
            className="input-auth text-center tracking-[0.4em] text-lg"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            autoFocus
          />
          {error && <p role="alert" className="text-red-600 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
          >
            {busy ? 'Vérification…' : 'Vérifier'}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2 text-sm text-navy-600/70 hover:text-navy-900 transition-colors"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}

// N'accepte qu'un chemin interne (anti open-redirect — guide AppSec §5.3).
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={null}>
      <MfaVerifyInner />
    </Suspense>
  );
}
