'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, homeForRole } from '@/stores/auth.store';
import { needsMfaStepUp } from '@/lib/mfa';
import { BrandLogo } from '@/components/BrandLogo';
import {
  confirmRedirectUrl,
  finalizePendingSignup,
  resendConfirmation,
} from '@/lib/pending-signup';
import { Icon } from '@/components/ui/Icon';
import { DICT, LANG_KEY, SPORTS, humanAuthError, type Lang } from '@/components/login/i18n';
import {
  Alert,
  BackButton,
  Confetti,
  Eyebrow,
  Field,
  GhostButton,
  HeroScene,
  LangSwitch,
  Lead,
  MASCOT,
  MascotArch,
  RevealButton,
  Stars,
  Steps,
  StrengthMeter,
  SunButton,
  Title,
  passwordLevel,
} from '@/components/login/pieces';

// Écrans du parcours. Sur ordinateur, l'accueil est le panneau de gauche :
// la colonne de droite montre alors directement la connexion.
type Screen = 'welcome' | 'signin' | 'signup' | 'athlete' | 'forgot' | 'confirm' | 'ready';
type ChildRow = { firstName: string; age: number; sport: string };

const newChild = (): ChildRow => ({ firstName: '', age: 11, sport: 'Hockey' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL du site vitrine (marketing). Configurable via NEXT_PUBLIC_SITE_URL ;
// sinon site local (Vite, port 5173) en dev, site déployé en production.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://thrivesportpositive.com'
    : 'http://localhost:5173');

// Destination demandée avant la redirection vers /login (posée par le
// middleware). N'accepte qu'un chemin interne vers un espace connu : jamais
// d'URL absolue ni de « //domaine » (pas de redirection ouverte).
function safeNext(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  if (!/^\/(parent|coach|admin|settings)(\/|$|\?)/.test(next)) return null;
  return next;
}

// Un espace n'est accessible qu'à certains rôles : on ne suit `next` que s'il
// correspond au rôle, sinon on irait droit sur un rebond du middleware.
function destinationFor(role?: string | null): string {
  const next = safeNext();
  if (next) {
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (next.startsWith('/admin') && isAdmin) return next;
    if (next.startsWith('/coach') && (role === 'COACH' || isAdmin)) return next;
    if (next.startsWith('/parent') && (role === 'PARENT' || !role || isAdmin)) return next;
    if (next.startsWith('/settings')) return next;
  }
  return homeForRole(role);
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, hydrate, isAuthenticated, sessionVerified, user } = useAuthStore();
  // Session réellement confirmée pendant cette visite (et non simple état
  // relu du localStorage, qui peut être périmé).
  const confirmed = isAuthenticated && sessionVerified;

  const [lang, setLang] = useState<Lang>('fr');
  const t = DICT[lang];
  const [screen, setScreen] = useState<Screen>('welcome');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Inscription parent + enfants
  const [signup, setSignup] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [childRows, setChildRows] = useState<ChildRow[]>([newChild()]);
  // Après l'inscription : où mène le bouton principal de l'écran « compte créé ».
  const [readyDest, setReadyDest] = useState<string | null>(null);

  // Réinitialisation du mot de passe
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Confirmation d'e-mail obligatoire (Loi 25) : adresse en attente de
  // confirmation, et état du bouton « renvoyer le lien ».
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const tm = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(tm);
  }, [resendCooldown]);

  // Session coupée à distance (compte désactivé) : la raison est lue depuis
  // sessionStorage (posée avant la déconnexion, robuste aux courses de
  // navigation) avec repli sur le paramètre d'URL.
  const [accountDisabled, setAccountDisabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let reason = params.get('reason');
    try {
      const stored = window.sessionStorage.getItem('thrive_logout_reason');
      if (stored) {
        reason = stored;
        window.sessionStorage.removeItem('thrive_logout_reason');
      }
    } catch {
      /* sessionStorage indisponible : on garde le paramètre d'URL */
    }
    if (reason === 'disabled') setAccountDisabled(true);
    // Renvoyé ici depuis une page protégée, ou compte coupé : c'est un membre,
    // on lui épargne l'écran d'accueil.
    if (reason || params.get('next')) setScreen('signin');

    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'fr') setLang(saved);
    } catch {
      /* stockage indisponible : français par défaut */
    }
  }, []);

  // La langue choisie vaut pour <html lang> le temps de la visite ; le reste
  // de l'app est en français, on le rétablit en quittant l'écran.
  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = 'fr';
    };
  }, [lang]);

  const changeLang = (l: Lang) => {
    setLang(l);
    setError('');
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* rien à faire */
    }
  };

  const go = (s: Screen) => {
    setScreen(s);
    setError('');
    window.scrollTo({ top: 0 });
  };

  // Un utilisateur déjà connecté ne reste pas sur /login. Utile aussi quand le
  // middleware renvoie ici une session au cookie (access token) expiré : hydrate
  // revalide/rafraîchit la session, puis on part DIRECTEMENT vers son espace.
  // On attend la confirmation (sessionVerified) : se fier à l'état persisté
  // provoquait un aller-retour /login ↔ middleware puis un spinner sans fin.
  // Exception : l'écran « compte créé », que le parent quitte lui-même.
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!confirmed || submitting || screen === 'ready') return;
    const dest = destinationFor(user?.role);
    router.replace(dest);
    // Filet de sécurité : si la navigation client n'a pas abouti (réseau
    // capricieux, rebond), on force un chargement complet une seule fois.
    const tm = setTimeout(() => {
      if (window.location.pathname === '/login') window.location.replace(dest);
    }, 4_000);
    return () => clearTimeout(tm);
  }, [confirmed, submitting, screen, user?.role, router]);

  const resend = async (address: string) => {
    if (resendState === 'busy' || resendCooldown > 0) return;
    setResendState('busy');
    setError('');
    try {
      await resendConfirmation(address);
      setResendState('sent');
      setResendCooldown(60);
    } catch (err: any) {
      setResendState('idle');
      setError(
        /rate|too many|seconds/i.test(err?.message ?? '')
          ? t.errResendRate
          : humanAuthError(err?.message ?? t.errSendMail, t)
      );
    }
  };

  const handleForgot = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!forgotEmail.trim()) { setError(t.errEmailRequired); return; }
    setError('');
    setSubmitting(true);
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (rErr) throw rErr;
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message ? humanAuthError(err.message, t) : t.errSendMail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // anti double-submit
    if (!email || !password) { setError(t.errRequired); return; }
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Première connexion après confirmation : crée les enfants déclarés à
      // l'inscription (si le lien a été ouvert sur un autre appareil).
      await finalizePendingSignup();
      // Si un second facteur est enrôlé, on passe par le step-up avant l'app.
      // Vérification 100 % locale (lecture du JWT) : aucun appel réseau en plus.
      const dest = destinationFor(useAuthStore.getState().user?.role);
      router.replace(
        (await needsMfaStepUp()) ? `/mfa-verify?next=${encodeURIComponent(dest)}` : dest
      );
      // `submitting` reste vrai : le bouton garde son état jusqu'au changement de page.
    } catch (err: any) {
      const msg = err?.message ?? t.errSignin;
      if (/not confirmed|email_not_confirmed/i.test(msg) || err?.code === 'email_not_confirmed') {
        setUnconfirmedEmail(email.trim());
        setResendState('idle');
        setError(t.errNotConfirmed);
        setSubmitting(false);
        return;
      }
      setError(humanAuthError(msg, t));
      setSubmitting(false);
    }
  };

  // Étape 1 : on valide le parent avant de passer à l'athlète.
  const handleParentStep = (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, email: mail, password: pwd } = signup;
    if (!firstName.trim() || !lastName.trim() || !mail.trim() || !pwd) { setError(t.errRequired); return; }
    if (!EMAIL_RE.test(mail.trim())) { setError(t.errEmail); return; }
    if (pwd.length < 8) { setError(t.errPwShort); return; }
    go('athlete');
  };

  // Étape 2 : création du compte, puis des enfants déclarés (facultatifs).
  const handleSignup = async (withChildren: boolean) => {
    if (submitting) return;
    const { firstName, lastName, email: mail, password: pwd } = signup;
    let children: ChildRow[] = [];
    if (withChildren) {
      children = childRows.filter((c) => c.firstName.trim());
      // Un prénom manquant parmi plusieurs enfants : on le signale plutôt que
      // de l'ignorer en silence. Un seul formulaire vide vaut « passer ».
      const missing = childRows.findIndex((c) => !c.firstName.trim());
      if (children.length > 0 && missing !== -1) { setError(t.errChildName(missing + 1)); return; }
      // L'app cible les 8-17 ans : le sélecteur borne déjà l'âge, on revérifie.
      if (children.some((c) => !Number.isInteger(c.age) || c.age < 8 || c.age > 17)) return;
    }
    setError('');
    setSubmitting(true);

    // ── Création du compte. Aucune session tant que l'e-mail n'est pas confirmé
    // (Loi 25) : les enfants déclarés sont mis en attente dans les métadonnées
    // et créés à la première connexion confirmée (voir lib/pending-signup).
    try {
      const { data, error: upErr } = await supabase.auth.signUp({
        email: mail.trim(),
        password: pwd,
        options: {
          emailRedirectTo: confirmRedirectUrl(),
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            pendingChildren: children.map((c) => ({
              firstName: c.firstName.trim(),
              age: c.age,
              sport: c.sport || 'Hockey',
            })),
          },
        },
      });
      if (upErr) throw upErr;
      // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité
      // (anti-énumération). On affiche le même écran, sans rien révéler.
      if (!data.session) {
        setAwaitingConfirm(mail.trim());
        setResendState('idle');
        setResendCooldown(60);
        setSubmitting(false);
        go('confirm');
        return;
      }
      // Projet configuré sans confirmation (autoconfirm) : on entre directement,
      // en passant par l'écran « compte créé ».
      await signIn(mail.trim(), pwd);
      const { failed } = await finalizePendingSignup();
      setReadyDest(!failed && children.length > 0 ? '/parent/bilans' : '/parent?setup=children');
      setScreen('ready');
      setSubmitting(false);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      setError(humanAuthError(err?.message ?? t.errSignup, t));
      setSubmitting(false);
    }
  };

  const updateChild = (i: number, patch: Partial<ChildRow>) =>
    setChildRows((rows) => rows.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  // Session confirmée : état de redirection plutôt qu'un flash du formulaire.
  // Tant qu'une session persistée est en cours de vérification (quelques
  // centaines de ms, 6 s au pire), on affiche aussi ce même état.
  if (
    screen !== 'ready' &&
    !submitting &&
    (confirmed || (isAuthenticated && !sessionVerified))
  ) {
    return (
      <main className="login-root flex min-h-dvh items-center justify-center" aria-busy>
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-sun border-t-transparent"
          role="status"
          aria-label={t.redirecting}
        />
      </main>
    );
  }

  const goBack = () => {
    if (screen === 'athlete') go('signup');
    else if (screen === 'forgot') { setResetSent(false); go('signin'); }
    else if (screen === 'confirm') go('signup');
    else go('welcome');
  };

  const inSignup = screen === 'signup' || screen === 'athlete';
  const pwLevel = passwordLevel(signup.password);

  // ─── Morceaux d'écran (variables JSX, pas des composants : les champs ne
  // doivent pas être remontés à chaque frappe) ────────────────────────────────

  const brandLockup = (
    <div className="flex items-center gap-2.5">
      <BrandLogo className="h-8 w-8 shadow-[0_0_0_1px_rgba(255,255,255,.14),0_6px_16px_rgba(0,0,0,.35)] lg:h-10 lg:w-10" />
      <div className="flex flex-col gap-[3px] lg:gap-1">
        <span className="text-[13px] font-extrabold leading-none tracking-[.24em] lg:text-[15px]">THRIVE</span>
        <span className="text-[9px] font-bold uppercase leading-none tracking-[.22em] text-sage lg:text-[10px]">
          Sport Positive
        </span>
      </div>
    </div>
  );

  const siteLink = (
    <a
      href={SITE_URL}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-3.5 text-sm font-semibold text-[rgba(234,243,241,.85)] transition-colors hover:bg-white/[.09] hover:text-cream"
    >
      <Icon name="arrow-left" className="h-4 w-4" strokeWidth={2.2} />
      {t.backSite}
    </a>
  );

  const tabs = (
    <div
      role="group"
      aria-label={t.modeLabel}
      className="mt-7 hidden grid-cols-2 gap-1 rounded-full border border-white/[.08] bg-white/[.05] p-1 lg:grid"
    >
      {([
        ['signin', t.tabSignin],
        ['signup', t.tabSignup],
      ] as const).map(([m, label]) => {
        const active = m === 'signin' ? screen === 'signin' || screen === 'welcome' : inSignup;
        return (
          <button
            key={m}
            type="button"
            disabled={submitting}
            aria-pressed={active}
            onClick={() => go(m)}
            className={`h-11 rounded-full text-[15px] font-bold transition-colors duration-base disabled:opacity-60 ${
              active ? 'bg-sun text-navy-900' : 'text-[rgba(234,243,241,.78)] hover:text-cream'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const cardCls =
    'flex flex-col gap-4 rounded-[26px] border border-white/[.08] bg-[#0c2029] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none';

  const legal = (
    <p className="text-center text-xs leading-normal text-[rgba(234,243,241,.66)] lg:text-left">
      {t.confirmNote} {t.legal}
    </p>
  );

  const signinPanel = (
    <div className="login-rise flex flex-col">
      <div className="flex items-end gap-3.5">
        <div className="flex flex-1 flex-col gap-2.5 pb-1.5">
          <Eyebrow>{t.familySpace}</Eyebrow>
          <Title className="text-[36px] lg:text-[42px]">{t.signinTitle}</Title>
          <Lead className="lg:text-base">{t.signinSub}</Lead>
        </div>
        <MascotArch src={MASCOT.shield} alt={t.signinAlt} small mat={7} className="w-[116px] lg:hidden" />
      </div>
      {tabs}
      {accountDisabled && (
        <div className="mt-6">
          <Alert>{t.disabled}</Alert>
        </div>
      )}
      <form onSubmit={handleLogin} noValidate className={`mt-6 ${cardCls}`}>
        <Field
          id="login-email"
          label={t.email}
          icon="mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t.emailPh}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
        />
        <Field
          id="login-password"
          label={t.password}
          icon="lock"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          aside={
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setResetSent(false); go('forgot'); }}
              className="-my-2 px-1 py-2 text-[13px] font-semibold text-sun transition-colors hover:text-[#fff6a3]"
            >
              {t.forgotShort}
            </button>
          }
          trailing={
            <RevealButton shown={showPw} onToggle={() => setShowPw((v) => !v)} showLabel={t.showPw} hideLabel={t.hidePw} />
          }
        />
        {error && <Alert>{error}</Alert>}
        {unconfirmedEmail && (
          <GhostButton
            onClick={() => resend(unconfirmedEmail)}
            disabled={resendState === 'busy' || resendCooldown > 0}
            className="h-12 text-sm disabled:opacity-60"
          >
            {resendState === 'busy'
              ? t.sending
              : resendState === 'sent'
                ? resendCooldown > 0 ? t.resentIn(resendCooldown) : t.resendAgain
                : t.resendConfirm}
          </GhostButton>
        )}
        <SunButton type="submit" disabled={submitting} loading={submitting} className="mt-1">
          {submitting ? t.signingIn : t.signin}
        </SunButton>
      </form>
      <p className="mt-5 text-center text-[15px] text-[rgba(234,243,241,.78)] lg:hidden">
        {t.newHere}{' '}
        <button type="button" onClick={() => go('signup')} className="px-1 py-2.5 font-bold text-sun hover:text-[#fff6a3]">
          {t.createAccount}
        </button>
      </p>
    </div>
  );

  const welcomeMobile = (
    <div className="flex flex-1 flex-col lg:hidden">
      <div className="flex flex-1 items-center">
        <HeroScene src={MASCOT.hello} alt={t.heroAlt} bubble={t.bubble} />
      </div>
      <div className="login-rise flex flex-col items-center gap-3 text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <Title className="text-[33px] leading-[1.06]">
          <span className="block">{t.slogan1}</span>
          <span className="block italic text-sun">{t.slogan2}</span>
        </Title>
        <Lead className="max-w-[312px]">{t.pitch}</Lead>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <SunButton type="button" onClick={() => go('signup')}>{t.ctaCreate}</SunButton>
        <GhostButton onClick={() => go('signin')}>{t.ctaHave}</GhostButton>
      </div>
      <a
        href={SITE_URL}
        className="mt-1.5 inline-flex min-h-[44px] items-center gap-1.5 self-center px-2 text-[13px] font-semibold text-[rgba(234,243,241,.7)] hover:text-cream"
      >
        <Icon name="arrow-left" className="h-3.5 w-3.5" strokeWidth={2.2} />
        {t.backSite}
      </a>
    </div>
  );

  const parentPanel = (
    <div className="login-rise flex flex-col">
      <div className="flex items-end gap-3.5">
        <div className="flex flex-1 flex-col gap-2.5 pb-1">
          <Eyebrow>{t.signupEyebrow}</Eyebrow>
          <Title className="text-[34px] lg:text-[42px]">{t.parentTitle}</Title>
          <Lead className="lg:text-base">{t.parentSub}</Lead>
        </div>
        <MascotArch src={MASCOT.me} alt={t.parentAlt} small mat={7} className="w-[108px] lg:hidden" />
      </div>
      {tabs}
      <form onSubmit={handleParentStep} noValidate className={`mt-6 ${cardCls}`}>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="signup-first"
            label={t.firstName}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            value={signup.firstName}
            onChange={(e) => setSignup({ ...signup, firstName: e.target.value })}
          />
          <Field
            id="signup-last"
            label={t.lastName}
            autoComplete="family-name"
            autoCapitalize="words"
            enterKeyHint="next"
            value={signup.lastName}
            onChange={(e) => setSignup({ ...signup, lastName: e.target.value })}
          />
        </div>
        <Field
          id="signup-email"
          label={t.email}
          icon="mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPh}
          value={signup.email}
          onChange={(e) => setSignup({ ...signup, email: e.target.value })}
        />
        <Field
          id="signup-password"
          label={t.password}
          icon="lock"
          type={showSignupPw ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
          aria-describedby="signup-password-hint"
          placeholder="••••••••"
          value={signup.password}
          onChange={(e) => setSignup({ ...signup, password: e.target.value })}
          trailing={
            <RevealButton shown={showSignupPw} onToggle={() => setShowSignupPw((v) => !v)} showLabel={t.showPw} hideLabel={t.hidePw} />
          }
        />
        <StrengthMeter id="signup-password-hint" level={pwLevel} hint={t.pwHint} labels={t.pwLevels} />
        {error && <Alert>{error}</Alert>}
        <SunButton type="submit" className="mt-1">{t.next}</SunButton>
        {legal}
      </form>
      <p className="mt-4 text-center text-[15px] text-[rgba(234,243,241,.78)] lg:hidden">
        {t.haveAccount}{' '}
        <button type="button" onClick={() => go('signin')} className="px-1 py-2.5 font-bold text-sun hover:text-[#fff6a3]">
          {t.signin}
        </button>
      </p>
    </div>
  );

  const athletePanel = (
    <div className="login-rise flex flex-col">
      <div className="flex items-end gap-3.5">
        <div className="flex flex-1 flex-col gap-2.5 pb-1">
          <Eyebrow>{t.athleteEyebrow}</Eyebrow>
          <Title className="text-[30px] lg:text-[40px]">{t.athleteTitle}</Title>
          <Lead className="lg:text-base">{t.athleteSub}</Lead>
        </div>
        <MascotArch src={MASCOT.sports} alt={t.athleteAlt} small mat={7} className="w-[100px] lg:w-[120px]" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {childRows.map((c, i) => (
          <div
            key={i}
            role="group"
            aria-label={`${t.child} ${i + 1}`}
            className="flex min-w-0 flex-col gap-4 rounded-[26px] border border-white/[.08] bg-[#0c2029] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
          >
            {childRows.length > 1 && (
              <div className="-mb-1 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[.18em] text-sage">
                  {t.child} {i + 1}
                </span>
                <span className="flex-1 border-t border-white/[.08]" />
                <button
                  type="button"
                  onClick={() => setChildRows(childRows.filter((_, j) => j !== i))}
                  aria-label={`${t.removeChild} (${i + 1})`}
                  className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[rgba(234,243,241,.7)] transition-colors hover:bg-white/[.06] hover:text-[#fca5a5]"
                >
                  <Icon name="close" className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            )}
            <Field
              id={`child-${i}-first`}
              label={t.childFirst}
              autoComplete="off"
              autoCapitalize="words"
              placeholder={t.childFirstPh}
              value={c.firstName}
              onChange={(e) => updateChild(i, { firstName: e.target.value })}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span id={`child-${i}-age`} className="text-[13px] font-semibold text-[rgba(234,243,241,.82)]">
                  {t.age}
                </span>
                <span className="text-xs text-[rgba(234,243,241,.62)]">{t.ageHint}</span>
              </div>
              <div
                role="group"
                aria-labelledby={`child-${i}-age`}
                className="flex items-center gap-1 rounded-full border border-white/[.12] bg-white/[.06] p-[3px]"
              >
                <button
                  type="button"
                  onClick={() => updateChild(i, { age: Math.max(8, c.age - 1) })}
                  disabled={c.age <= 8}
                  aria-label={t.younger}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[.08] text-cream transition-opacity disabled:opacity-35"
                >
                  <Icon name="minus" className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </button>
                <output aria-live="polite" className="min-w-[64px] text-center font-display text-2xl font-semibold tabular-nums">
                  {c.age}{' '}
                  <span className="font-sans text-[13px] font-semibold text-[rgba(234,243,241,.66)]">{t.years}</span>
                </output>
                <button
                  type="button"
                  onClick={() => updateChild(i, { age: Math.min(17, c.age + 1) })}
                  disabled={c.age >= 17}
                  aria-label={t.older}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-sun text-navy-900 transition-opacity disabled:opacity-35"
                >
                  <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </button>
              </div>
            </div>
            <div role="group" aria-labelledby={`child-${i}-sport`} className="flex min-w-0 flex-col gap-2.5">
              <span id={`child-${i}-sport`} className="text-[13px] font-semibold text-[rgba(234,243,241,.82)]">
                {t.sport}
              </span>
              <div className="scrollbar-hide overscroll-x-contain -mx-5 grid auto-cols-max grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex lg:flex-wrap lg:px-0">
                {SPORTS.map((s) => {
                  const on = c.sport === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => updateChild(i, { sport: s.value })}
                      className={`flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-base ${
                        on
                          ? 'border-sun bg-sun text-navy-900'
                          : 'border-white/[.14] bg-white/[.05] text-cream hover:bg-white/[.09]'
                      }`}
                    >
                      {on && <Icon name="check" className="h-[15px] w-[15px]" strokeWidth={2.6} />}
                      {lang === 'fr' ? s.value : s.en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setChildRows([...childRows, newChild()])}
        className="mt-3 flex h-[52px] items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[rgba(167,196,188,.4)] text-[15px] font-semibold text-sage transition-colors hover:bg-[rgba(167,196,188,.06)]"
      >
        <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        {t.addChild}
      </button>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <SunButton type="button" onClick={() => handleSignup(true)} disabled={submitting} loading={submitting} className="mt-4">
        {submitting ? t.creating : t.createMine}
      </SunButton>
      <button
        type="button"
        onClick={() => handleSignup(false)}
        disabled={submitting}
        className="mt-1.5 inline-flex min-h-[44px] items-center self-center px-2 text-sm font-semibold text-[rgba(234,243,241,.72)] hover:text-cream disabled:opacity-50"
      >
        {t.skip}
      </button>
    </div>
  );

  const readyPanel = (
    <div className="flex flex-1 flex-col lg:justify-center">
      <div className="flex flex-1 items-center lg:flex-none">
        <div className="relative flex w-full justify-center py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,235,80,.22) 0%, rgba(249,235,80,.06) 40%, rgba(249,235,80,0) 66%)' }}
          />
          <MascotArch src={MASCOT.party} alt={t.readyAlt} priority className="w-[min(250px,64vw)]" />
        </div>
      </div>
      <div role="status" className="login-rise flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-[rgba(167,196,188,.14)] pl-1.5 pr-3 text-xs font-bold uppercase tracking-[.14em] text-sage">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage text-[#06222a]">
            <Icon name="check" className="h-3 w-3" strokeWidth={3} />
          </span>
          {t.readyBadge}
        </span>
        <Title className="text-[34px] lg:text-[44px]">
          <span className="block">{t.ready1}</span>
          <span className="block italic text-sun">{t.ready2}</span>
        </Title>
        <Lead className="max-w-[340px]">
          {readyDest === '/parent/bilans' ? t.readySub : t.readySubNoChild}
        </Lead>
      </div>
      <div className="mt-6 flex flex-col gap-1.5">
        <SunButton type="button" onClick={() => router.push(readyDest ?? '/parent')}>
          {readyDest === '/parent/bilans' ? t.readyCta : t.readyCtaNoChild}
        </SunButton>
        <button
          type="button"
          onClick={() => router.push('/parent')}
          className="inline-flex min-h-[44px] items-center self-center px-2 text-[15px] font-semibold text-[rgba(234,243,241,.78)] hover:text-cream"
        >
          {t.readyLater}
        </button>
      </div>
    </div>
  );

  const forgotPanel = (
    <div className="flex flex-1 flex-col">
      <div className="relative mt-4 flex justify-center lg:mt-0">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,235,80,.14) 0%, rgba(249,235,80,0) 64%)' }}
        />
        <MascotArch src={MASCOT.letter} alt={t.forgotAlt} mat={9} className="w-[184px]" />
      </div>
      {resetSent ? (
        <div
          role="status"
          className="login-rise mt-7 flex flex-col items-center gap-3 rounded-[26px] border border-white/[.08] bg-[#0c2029] px-5 py-6 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage text-[#06222a]">
            <Icon name="check" className="h-[22px] w-[22px]" strokeWidth={2.6} />
          </span>
          <Title className="text-[26px]">{t.sentTitle}</Title>
          <Lead>{t.sentSub(forgotEmail.trim())}</Lead>
          <button
            type="button"
            onClick={() => setResetSent(false)}
            className="min-h-[44px] px-3 text-sm font-bold text-sun hover:text-[#fff6a3]"
          >
            {t.resend}
          </button>
        </div>
      ) : (
        <>
          <div className="login-rise mt-7 flex flex-col items-center gap-2.5 text-center">
            <Title className="text-[32px] lg:text-[38px]">{t.forgotTitle}</Title>
            <Lead className="max-w-[320px]">{t.forgotSub}</Lead>
          </div>
          <form onSubmit={handleForgot} noValidate className="mt-7 flex flex-col gap-4">
            <Field
              id="forgot-email"
              label={t.email}
              icon="mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t.emailPh}
              value={forgotEmail}
              onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
            />
            {error && <Alert>{error}</Alert>}
            <SunButton type="submit" icon="send" disabled={submitting} loading={submitting}>
              {submitting ? t.sending : t.sendLink}
            </SunButton>
          </form>
        </>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => { setResetSent(false); go('signin'); }}
        className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 self-center px-2 text-[15px] font-semibold text-[rgba(234,243,241,.78)] hover:text-cream"
      >
        <Icon name="arrow-left" className="h-4 w-4" strokeWidth={2.2} />
        {t.backToSignin}
      </button>
    </div>
  );

  const confirmPanel = (
    <div className="flex flex-1 flex-col">
      <div className="relative mt-4 flex justify-center lg:mt-0">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,235,80,.14) 0%, rgba(249,235,80,0) 64%)' }}
        />
        <MascotArch src={MASCOT.letter} alt={t.confirmAlt} mat={9} className="w-[184px]" />
      </div>
      <div role="status" className="login-rise mt-7 flex flex-col items-center gap-2.5 text-center">
        <Title className="text-[30px] lg:text-[38px]">{t.confirmTitle}</Title>
        <Lead className="max-w-[340px]">{t.confirmSub(awaitingConfirm ?? '')}</Lead>
        <Lead className="max-w-[340px] text-sage">{t.confirmChildren}</Lead>
      </div>
      <div className="mt-7 flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        <SunButton
          type="button"
          onClick={() => {
            setEmail(awaitingConfirm ?? '');
            setAwaitingConfirm(null);
            go('signin');
          }}
        >
          {t.iConfirmed}
        </SunButton>
        <GhostButton
          onClick={() => awaitingConfirm && resend(awaitingConfirm)}
          disabled={resendState === 'busy' || resendCooldown > 0}
          className="disabled:opacity-60"
        >
          {resendState === 'busy'
            ? t.sending
            : resendCooldown > 0
              ? t.resendIn(resendCooldown)
              : t.resendLink}
        </GhostButton>
        {resendState === 'sent' && (
          <p role="status" className="text-center text-sm text-sage">{t.linkSent}</p>
        )}
      </div>
    </div>
  );

  // ─── En-tête : retour / logo / étapes à gauche et au centre, langue à droite ─
  const mobileLeft =
    screen === 'welcome' || screen === 'ready' ? brandLockup : <BackButton onClick={goBack} label={t.back} />;
  const desktopLeft =
    screen === 'athlete' || screen === 'forgot' || screen === 'confirm' ? <BackButton onClick={goBack} label={t.back} /> : siteLink;
  const center = inSignup ? (
    <Steps label={screen === 'signup' ? t.step1 : t.step2} current={screen === 'signup' ? 1 : 2} />
  ) : screen === 'signin' || screen === 'forgot' || screen === 'confirm' ? (
    <BrandLogo className="h-[30px] w-[30px] shadow-[0_0_0_1px_rgba(255,255,255,.14),0_6px_16px_rgba(0,0,0,.35)] lg:hidden" />
  ) : null;

  return (
    <main className="login-root min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
      {/* Ordinateur : l'accueil immersif, toujours visible à gauche */}
      <aside className="login-hero relative hidden overflow-hidden px-14 pb-11 pt-10 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <Stars />
        <div className="relative">{brandLockup}</div>
        <div className="relative flex min-h-[360px] flex-1 items-center">
          <HeroScene src={MASCOT.hello} alt={t.heroAlt} bubble={t.bubble} big />
        </div>
        <div className="login-rise relative flex flex-col items-center gap-3.5 text-center">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="font-display text-[clamp(40px,3.8vw,56px)] font-medium leading-[1.04] tracking-[-.015em] [font-variation-settings:'SOFT'_50]">
            <span className="block">{t.slogan1}</span>
            <span className="block italic text-sun">{t.slogan2}</span>
          </h2>
          <p className="max-w-[520px] text-[17px] leading-relaxed text-[rgba(234,243,241,.8)]">{t.pitchWide}</p>
          <ul className="mt-2.5 flex flex-wrap justify-center gap-2.5">
            {([
              ['users', t.feat1, 'text-sun'],
              ['chart', t.feat2, 'text-sage'],
              ['home', t.feat3, 'text-cream'],
            ] as const).map(([icon, label, tone]) => (
              <li
                key={icon}
                className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[.05] pl-3 pr-4 text-sm font-semibold text-[rgba(234,243,241,.88)]"
              >
                <Icon name={icon} className={`h-[18px] w-[18px] ${tone}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Parcours : plein écran sur téléphone, colonne de droite sur ordinateur */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] sm:px-10 lg:border-l lg:border-white/[.06] lg:bg-[#081b24] lg:px-14 lg:pb-10 lg:pt-9">
        {screen === 'welcome' && (
          <div className="lg:hidden">
            <Stars />
          </div>
        )}
        {screen === 'ready' && <Confetti />}

        <header className="relative grid h-[46px] grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start">
            <div className="lg:hidden">{mobileLeft}</div>
            <div className="hidden lg:block">{desktopLeft}</div>
          </div>
          <div className="justify-self-center">{center}</div>
          <div className="justify-self-end">
            <LangSwitch lang={lang} onChange={changeLang} label={t.langLabel} />
          </div>
        </header>

        <div
          className={`relative mx-auto flex w-full max-w-[420px] flex-1 flex-col ${
            screen === 'welcome' ? '' : 'pt-6'
          } lg:justify-center lg:py-8`}
        >
          {screen === 'welcome' && (
            <>
              {welcomeMobile}
              <div className="hidden lg:block">{signinPanel}</div>
            </>
          )}
          {screen === 'signin' && signinPanel}
          {screen === 'signup' && parentPanel}
          {screen === 'athlete' && athletePanel}
          {screen === 'forgot' && forgotPanel}
          {screen === 'confirm' && confirmPanel}
          {screen === 'ready' && readyPanel}
        </div>

        {(screen === 'signin' || screen === 'welcome') && (
          <p
            className={`relative mt-6 items-center justify-center gap-2 text-xs font-medium text-[rgba(234,243,241,.62)] ${
              screen === 'welcome' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <Icon name="shield" className="h-3.5 w-3.5" strokeWidth={2} />
            {t.secure}
          </p>
        )}
      </section>
    </main>
  );
}
