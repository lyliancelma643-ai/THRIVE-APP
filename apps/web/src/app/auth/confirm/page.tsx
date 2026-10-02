'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, homeForRole } from '@/stores/auth.store';
import { finalizePendingSignup, resendConfirmation } from '@/lib/pending-signup';
import { BrandLogo } from '@/components/BrandLogo';

// Atterrissage du lien « Confirmer mon adresse » envoyé à l'inscription.
// Supporte les trois formats Supabase : code PKCE (?code=), token_hash
// (?token_hash=&type=) et jetons implicites (#access_token=).
export default function ConfirmEmailPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [state, setState] = useState<'working' | 'error'>('working');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const linkError = url.searchParams.get('error_description') ?? hash.get('error_description');
        if (linkError) throw new Error(linkError);

        if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw e;
        } else if (tokenHash) {
          const { error: e } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as 'signup' | 'email') ?? 'signup',
          });
          if (e) throw e;
        } else if (hash.get('access_token') && hash.get('refresh_token')) {
          const { error: e } = await supabase.auth.setSession({
            access_token: hash.get('access_token')!,
            refresh_token: hash.get('refresh_token')!,
          });
          if (e) throw e;
        } else {
          throw new Error('Lien incomplet');
        }
        // Retire les jetons de l'URL (historique, captures d'écran).
        window.history.replaceState(null, '', window.location.pathname);

        await hydrate();
        const { failed } = await finalizePendingSignup();
        const role = useAuthStore.getState().user?.role;
        const home = homeForRole(role);
        router.replace(failed && home.startsWith('/parent') ? '/parent?setup=children' : home);
      } catch {
        setState('error');
      }
    })();
  }, [hydrate, router]);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await resendConfirmation(email);
      setResent(true);
    } catch (err: any) {
      setError(
        /rate|too many|seconds/i.test(err?.message ?? '')
          ? 'Un e-mail vient déjà d’être envoyé. Réessaie dans une minute.'
          : 'Envoi impossible. Vérifie l’adresse et réessaie.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><BrandLogo /></div>
        <div className="glass-strong rounded-3xl p-6 md:p-8 text-center">
          {state === 'working' ? (
            <>
              <div
                className="w-10 h-10 mx-auto mb-4 border-4 border-navy-600 border-t-transparent rounded-full animate-spin"
                role="status"
                aria-label="Confirmation en cours"
              />
              <p className="text-navy-700">Confirmation de ton adresse…</p>
            </>
          ) : resent ? (
            <>
              <h1 className="font-display text-xl font-semibold text-navy-900 mb-2">Nouveau lien envoyé</h1>
              <p className="text-sm text-navy-700">
                Ouvre l’e-mail reçu sur <span className="font-medium">{email}</span> et clique sur le lien
                (pense à vérifier tes spams).
              </p>
            </>
          ) : (
            <form onSubmit={resend} className="space-y-4 text-left">
              <h1 className="font-display text-xl font-semibold text-navy-900 text-center">
                Lien expiré ou déjà utilisé
              </h1>
              <p className="text-sm text-navy-700 text-center">
                Si ton adresse est déjà confirmée, <a className="underline" href="/login">connecte-toi</a>.
                Sinon, reçois un nouveau lien :
              </p>
              <input
                type="email"
                required
                className="input-auth"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                autoComplete="email"
              />
              {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50"
              >
                {busy ? 'Envoi…' : 'Renvoyer le lien de confirmation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
