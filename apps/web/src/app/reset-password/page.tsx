'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { BrandLogo } from '@/components/BrandLogo';

type Phase = 'loading' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Établit la session à partir du lien de réinitialisation reçu par email.
  // Supporte les deux formats Supabase : code PKCE (?code=) et token implicite (#access_token=).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1. Flux PKCE : ?code=...
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled && !exErr) { setPhase('ready'); return; }
        }

        // 2. Flux implicite : #access_token=...&refresh_token=...
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!cancelled && !sErr) { setPhase('ready'); return; }
        }

        // 3. Une session de récupération est peut-être déjà active
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setPhase(data.session ? 'ready' : 'invalid');
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      // Le middleware lit le token dans ce cookie pour protéger les routes
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      }
      setPhase('done');
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de mettre à jour le mot de passe');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream relative flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-navy-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sage/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] rounded-full bg-sun/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo className="w-20 h-20 shadow-card mb-3" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-navy-600/60 font-bold">
            Sport Positive
          </span>
        </div>

        <div className="glass-strong rounded-3xl p-6 md:p-8">
          {phase === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-navy-600/70">Vérification du lien…</p>
            </div>
          )}

          {phase === 'invalid' && (
            <div className="text-center py-4">
              <h2 className="font-display text-xl font-semibold text-navy-900 mb-2">
                Lien invalide ou expiré
              </h2>
              <p className="text-sm text-navy-600/80 mb-6">
                Ce lien de réinitialisation n&apos;est plus valable. Redemande un nouvel email
                depuis la page de connexion.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sage/40 flex items-center justify-center text-2xl">
                ✓
              </div>
              <h2 className="font-display text-xl font-semibold text-navy-900 mb-2">
                Mot de passe mis à jour
              </h2>
              <p className="text-sm text-navy-600/80">Redirection vers ton espace…</p>
            </div>
          )}

          {phase === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-navy-900 mb-1">
                  Nouveau mot de passe
                </h2>
                <p className="text-sm text-navy-600/70">Choisis un nouveau mot de passe sécurisé.</p>
              </div>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
                  Nouveau mot de passe (min. 8 caractères)
                </span>
                <input
                  type="password"
                  className="input-auth"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="••••••••"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
                  Confirme le mot de passe
                </span>
                <input
                  type="password"
                  className="input-auth"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </label>
              {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>

    </main>
  );
}
