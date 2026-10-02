'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, homeForRole } from '@/stores/auth.store';
import { finalizePendingSignup, resendConfirmation } from '@/lib/pending-signup';
import { BrandLogo } from '@/components/BrandLogo';
import { DICT, LANG_KEY, type Lang } from '@/components/login/i18n';
import { Alert, Field, Lead, MASCOT, MascotArch, Stars, SunButton, Title } from '@/components/login/pieces';

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
  // Même langue que l'écran de connexion (choix mémorisé).
  const [lang, setLang] = useState<Lang>('fr');
  const t = DICT[lang];
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'fr') setLang(saved);
    } catch {
      /* français par défaut */
    }
  }, []);

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
          ? t.errResendRate
          : t.errResend
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main lang={lang} className="login-root relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-10">
      <Stars />
      <div className="relative flex w-full max-w-[420px] flex-col items-center">
        <BrandLogo className="h-11 w-11 shadow-[0_0_0_1px_rgba(255,255,255,.14),0_6px_16px_rgba(0,0,0,.35)]" />
        <MascotArch src={MASCOT.letter} alt={t.confirmAlt} mat={9} className="mt-8 w-[168px]" />
        {state === 'working' ? (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-sun border-t-transparent"
              role="status"
              aria-label={t.confirmingAria}
            />
            <Lead>{t.confirming}</Lead>
          </div>
        ) : resent ? (
          <div role="status" className="login-rise mt-8 flex flex-col items-center gap-2.5 text-center">
            <Title className="text-[30px]">{t.newLinkTitle}</Title>
            <Lead>{t.newLinkSub(email)}</Lead>
          </div>
        ) : (
          <form onSubmit={resend} noValidate className="login-rise mt-8 flex w-full flex-col gap-4">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <Title className="text-[30px]">{t.linkExpiredTitle}</Title>
              <Lead>{t.linkExpiredSub}</Lead>
              <a href="/login" className="min-h-[44px] px-2 py-2.5 text-[15px] font-bold text-sun hover:text-[#fff6a3]">
                {t.signin}
              </a>
            </div>
            <Field
              id="confirm-email"
              label={t.email}
              icon="mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={t.emailPh}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <Alert>{error}</Alert>}
            <SunButton type="submit" icon="send" disabled={busy} loading={busy}>
              {busy ? t.sending : t.resendConfirm}
            </SunButton>
          </form>
        )}
      </div>
    </main>
  );
}
