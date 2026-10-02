'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, homeForRole } from '@/stores/auth.store';
import { needsMfaStepUp } from '@/lib/mfa';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import { CONSENT_POLICY_VERSION, LEGAL_LINKS, SIGNUP_CONSENTS } from '@/lib/legal';
import { humanAuthError } from '@/lib/auth-errors';
import {
  CHILD_MAX_AGE,
  CHILD_MIN_AGE,
  SPORT_OPTIONS,
  ageToDob,
  validateChildRows,
  type ChildRow,
} from '@/lib/child-form';

type Mode = 'signin' | 'signup' | 'forgot';

const EMPTY_CHILD: ChildRow = { firstName: '', age: '', sport: '' };

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

  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Inscription parent + enfants
  const [signup, setSignup] = useState({
    firstName: '', lastName: '', email: '', password: '',
  });
  const [childRows, setChildRows] = useState<ChildRow[]>([{ ...EMPTY_CHILD }]);
  // Consentement exprès (Loi 25, art. 4.1 et 12) : CGU, confidentialité et
  // renseignements sensibles de l'enfant (questionnaires de bien-être).
  const [consent, setConsent] = useState(false);

  // Réinitialisation du mot de passe
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Message affiché quand la session a été coupée à distance (compte désactivé).
  // On lit la raison depuis sessionStorage (posée avant la déconnexion, robuste
  // aux courses de navigation) avec repli sur le paramètre d'URL.
  const [accountNotice, setAccountNotice] = useState('');
  useEffect(() => {
    let reason = new URLSearchParams(window.location.search).get('reason');
    try {
      const stored = window.sessionStorage.getItem('thrive_logout_reason');
      if (stored) {
        reason = stored;
        window.sessionStorage.removeItem('thrive_logout_reason');
      }
    } catch {
      /* sessionStorage indisponible : on garde le paramètre d'URL */
    }
    if (reason === 'disabled') {
      setAccountNotice(
        'Ton compte a été désactivé. Contacte un administrateur pour le réactiver.'
      );
    }
  }, []);

  // Un utilisateur déjà connecté ne reste pas sur /login. Utile aussi quand le
  // middleware renvoie ici une session au cookie (access token) expiré : hydrate
  // revalide/rafraîchit la session, puis on part DIRECTEMENT vers son espace.
  // On attend la confirmation (sessionVerified) : se fier à l'état persisté
  // provoquait un aller-retour /login ↔ middleware puis un spinner sans fin.
  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!confirmed || submitting) return;
    const dest = destinationFor(user?.role);
    router.replace(dest);
    // Filet de sécurité : si la navigation client n'a pas abouti (réseau
    // capricieux, rebond), on force un chargement complet une seule fois.
    const t = setTimeout(() => {
      if (window.location.pathname === '/login') window.location.replace(dest);
    }, 4_000);
    return () => clearTimeout(t);
  }, [confirmed, submitting, user?.role, router]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Entre ton adresse email'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (rErr) throw rErr;
      setResetSent(true);
    } catch (err: unknown) {
      setError(humanAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // anti double-submit
    if (!email || !password) { setError('Tous les champs sont requis'); return; }
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Si un second facteur est enrôlé, on passe par le step-up avant l'app.
      // Vérification 100 % locale (lecture du JWT) : aucun appel réseau en plus.
      const dest = destinationFor(useAuthStore.getState().user?.role);
      router.replace(
        (await needsMfaStepUp()) ? `/mfa-verify?next=${encodeURIComponent(dest)}` : dest
      );
      // `submitting` reste vrai : le bouton garde son état jusqu'au changement de page.
    } catch (err: unknown) {
      setError(humanAuthError(err));
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, email: mail, password: pwd } = signup;
    if (!firstName.trim() || !lastName.trim() || !mail.trim() || !pwd) {
      setError('Tous les champs sont requis');
      return;
    }
    if (pwd.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères');
      return;
    }
    if (!consent) {
      setError('Coche la case de consentement pour créer ton compte.');
      return;
    }
    // Lignes vides ignorées ; une ligne à moitié remplie (prénom sans âge…) est
    // signalée au lieu d'être écartée en silence. Âge strictement 8–17 ans.
    const { children, error: childError } = validateChildRows(childRows);
    if (childError) {
      setError(childError);
      return;
    }
    setError('');
    setSubmitting(true);

    // ── Étape critique : compte parent + connexion. Un échec ici est bloquant. ──
    let userId: string;
    try {
      const { error: upErr } = await supabase.auth.signUp({
        email: mail.trim(),
        password: pwd,
        options: {
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: 'PARENT',
            // Trace du consentement aussi dans le compte (repli si l'insertion ci-dessous échoue).
            consentVersion: CONSENT_POLICY_VERSION,
            consentAt: new Date().toISOString(),
          },
        },
      });
      if (upErr) throw upErr;

      // Connexion immédiate (le trigger DB a déjà confirmé l'email)
      await signIn(mail.trim(), pwd);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Connexion impossible après inscription');
      userId = user.id;
    } catch (err: unknown) {
      setError(humanAuthError(err));
      setSubmitting(false);
      return;
    }

    // Registre des consentements (preuve datée, par finalité). Best effort :
    // la version du consentement est déjà dans les métadonnées du compte.
    const consentAt = new Date().toISOString();
    await supabase
      .from('consents')
      .insert(
        SIGNUP_CONSENTS.map((purpose) => ({
          profile_id: userId,
          purpose,
          policy_version: CONSENT_POLICY_VERSION,
          granted: true,
          granted_at: consentAt,
        }))
      )
      .then(() => undefined, () => undefined);

    // ── Étape best-effort : famille + enfants déclarés à l'inscription. ──
    // Si elle échoue, le compte est DÉJÀ créé et la session active : on emmène
    // le parent dans l'app plutôt que de le coincer dans un cul-de-sac « compte
    // existe déjà » au retry. Il ajoutera ses enfants via « + Ajouter un enfant ».
    try {
      if (children.length > 0) {
        const { data: family, error: famErr } = await supabase
          .from('families')
          .insert({ name: `Famille ${lastName.trim()}`, parent_id: userId })
          .select('id')
          .single();
        if (famErr) throw famErr;

        // last_name est obligatoire en base (NOT NULL) : sans lui, l'insertion
        // échouait à CHAQUE inscription et les enfants déclarés disparaissaient.
        // L'enfant prend le nom du parent ; il reste modifiable ensuite.
        const rows = children.map((c) => ({
          family_id: family.id,
          first_name: c.firstName,
          last_name: lastName.trim(),
          date_of_birth: ageToDob(Number(c.age)),
          sport: c.sport.trim() || null,
          is_active: true,
        }));
        const { error: childErr } = await supabase.from('children').insert(rows);
        if (childErr) throw childErr;
      }
      router.push('/parent/bilans');
    } catch {
      // Compte créé + session active : plutôt qu'un compte orphelin ou un
      // « Aucun profil enfant » muet, on ouvre directement l'ajout d'enfant.
      router.push('/parent/select-profile?retry=child');
    }
  };

  // Session confirmée : état de redirection plutôt qu'un flash du formulaire.
  // Tant qu'une session persistée est en cours de vérification (quelques
  // centaines de ms, 6 s au pire), on affiche aussi ce même état.
  if (confirmed || (isAuthenticated && !sessionVerified)) {
    return (
      <main className="min-h-dvh bg-cream flex items-center justify-center" aria-busy>
        <div
          className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Redirection vers ton espace…"
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-cream relative flex items-center justify-center p-4">
      {/* Retour vers le site vitrine */}
      <a
        href={SITE_URL}
        aria-label="Retourner au site Thrive Sport Positive"
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full bg-white/60 hover:bg-white/80 text-navy-600 hover:text-navy-900 text-sm font-bold shadow-card transition-colors"
      >
        <svg
          aria-hidden
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Retour au site
      </a>

      {/* Halos de fond (liquid glass) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-navy-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sage/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] rounded-full bg-sun/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <BrandLogo className="w-20 h-20 shadow-card mb-3" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-navy-700 font-bold">
            Sport Positive
          </span>
          <h1 className="sr-only">Espace membres THRIVE Sport Positive</h1>
        </div>

        <div className="glass-strong rounded-3xl p-6 md:p-8">
          {accountNotice && (
            <p className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {accountNotice}
            </p>
          )}
          {/* Onglets */}
          {mode !== 'forgot' && (
            <div className="flex gap-1 p-1 rounded-full bg-white/60 mb-6">
              {([
                ['signin', 'Se connecter'],
                ['signup', 'Créer un compte'],
              ] as [Mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  disabled={submitting}
                  aria-pressed={mode === m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 min-h-[44px] py-2.5 rounded-full text-sm font-bold transition-colors disabled:opacity-60 ${
                    mode === m ? 'bg-navy-600 text-white shadow-card' : 'text-navy-600 hover:bg-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' ? (
            resetSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sage/40 flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <h2 className="font-display text-xl font-semibold text-navy-900 mb-2">
                  Email envoyé !
                </h2>
                <p className="text-sm text-navy-700 mb-6">
                  Si un compte existe pour <span className="font-medium">{forgotEmail}</span>,
                  un lien de réinitialisation vient d&apos;être envoyé. Vérifie ta boîte de
                  réception (et tes spams).
                </p>
                <button
                  onClick={() => {
                    setMode('signin');
                    setResetSent(false);
                    setError('');
                  }}
                  className="w-full py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-navy-900 mb-1">
                    Mot de passe oublié
                  </h2>
                  <p className="text-sm text-navy-700">
                    Entre ton email : on t&apos;envoie un lien pour choisir un nouveau mot de passe.
                  </p>
                </div>
                <Field label="Email">
                  <input
                    type="email"
                    className="input-auth"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ton@email.com"
                    autoComplete="email"
                  />
                </Field>
                {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
                >
                  {submitting ? (<><ButtonSpinner />Envoi…</>) : "Envoyer le lien de réinitialisation"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="w-full min-h-[44px] py-2 text-sm text-navy-700 hover:text-navy-900 transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </form>
            )
          ) : mode === 'signin' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  required
                  className="input-auth"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  autoFocus
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
                  required
                  className="input-auth"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setMode('forgot');
                  setError('');
                }}
                className="block ml-auto -my-2 min-h-[44px] py-3 px-1 text-xs font-medium text-navy-700 hover:text-navy-900 transition-colors relative before:absolute before:-inset-1 before:content-['']"
              >
                Mot de passe oublié ?
              </button>
              {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50 transition-colors"
              >
                {submitting ? (<><ButtonSpinner />Connexion…</>) : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom">
                  <input className="input-auth" value={signup.firstName} autoComplete="given-name" autoCapitalize="words" enterKeyHint="next"
                    onChange={(e) => setSignup({ ...signup, firstName: e.target.value })} />
                </Field>
                <Field label="Nom">
                  <input className="input-auth" value={signup.lastName} autoComplete="family-name" autoCapitalize="words" enterKeyHint="next"
                    onChange={(e) => setSignup({ ...signup, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" className="input-auth" value={signup.email}
                  autoComplete="email" inputMode="email" autoCapitalize="none"
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
              </Field>
              <Field label="Mot de passe (min. 8 caractères)">
                <input type="password" className="input-auth" value={signup.password}
                  autoComplete="new-password" minLength={8}
                  onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
              </Field>

              {/* Enfants dès l'inscription */}
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-700 mb-2">
                  Tes enfants ({CHILD_MIN_AGE}–{CHILD_MAX_AGE} ans)
                </p>
                <div className="space-y-3">
                  {childRows.map((c, i) => (
                    <div key={i} className="rounded-2xl bg-white/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-navy-700 shrink-0">
                          Enfant {i + 1}
                        </span>
                        <div className="flex-1 border-t border-navy-100/60" />
                        {childRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setChildRows(childRows.filter((_, j) => j !== i))}
                            className="w-8 h-8 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 font-bold leading-none transition-colors relative before:absolute before:-inset-1.5 before:content-['']"
                            aria-label="Retirer cet enfant"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <input
                        aria-label={`Prénom de l'enfant ${i + 1}`}
                        autoComplete="off"
                        autoCapitalize="words"
                        placeholder="Prénom de l'enfant"
                        className="input-auth"
                        value={c.firstName}
                        onChange={(e) => {
                          const next = [...childRows];
                          next[i] = { ...c, firstName: e.target.value };
                          setChildRows(next);
                        }}
                      />
                      <div className="flex gap-2">
                        <input
                          aria-label={`Âge de l'enfant ${i + 1}`}
                          type="number" min={CHILD_MIN_AGE} max={CHILD_MAX_AGE} placeholder={`Âge (${CHILD_MIN_AGE}-${CHILD_MAX_AGE})`}
                          inputMode="numeric"
                          className="input-auth w-24"
                          value={c.age}
                          onChange={(e) => {
                            const next = [...childRows];
                            next[i] = { ...c, age: e.target.value };
                            setChildRows(next);
                          }}
                        />
                        <select
                          aria-label={`Sport de l'enfant ${i + 1}`}
                          className="input-auth flex-1"
                          value={c.sport}
                          onChange={(e) => {
                            const next = [...childRows];
                            next[i] = { ...c, sport: e.target.value };
                            setChildRows(next);
                          }}
                        >
                          <option value="">Sport…</option>
                          {SPORT_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChildRows([...childRows, { ...EMPTY_CHILD }])}
                  className="mt-1 min-h-[44px] py-2 text-sm font-bold text-navy-600 hover:text-navy-900 transition-colors"
                >
                  + Ajouter un autre enfant
                </button>
              </div>

              {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full min-h-[48px] py-3.5 rounded-full bg-sun hover:bg-sun-dark text-navy-900 font-bold disabled:opacity-50 transition-colors"
              >
                {submitting ? (<><ButtonSpinner light={false} />Création du compte…</>) : 'Créer mon compte parent'}
              </button>
              <label className="flex items-start gap-3 rounded-2xl bg-white/60 p-3 text-xs leading-relaxed text-navy-800">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-navy-600"
                />
                <span>
                  J&apos;accepte les{' '}
                  <Link href={LEGAL_LINKS.terms} target="_blank" className="font-bold underline underline-offset-2">
                    conditions d&apos;utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link href={LEGAL_LINKS.privacy} target="_blank" className="font-bold underline underline-offset-2">
                    politique de confidentialité
                  </Link>
                  . Comme titulaire de l&apos;autorité parentale, je consens à ce que THRIVE recueille les
                  renseignements de mon enfant décrits dans la politique, y compris ses réponses aux
                  questionnaires de bien-être.
                </span>
              </label>
              <p className="text-[11px] text-navy-700 text-center">
                Compte actif immédiatement — aucun email de validation requis.
              </p>
            </form>
          )}
        </div>
      </div>

    </main>
  );
}

// Petit spinner inline pour les boutons en action asynchrone
function ButtonSpinner({ light = true }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block w-4 h-4 mr-2 -mb-0.5 rounded-full border-2 animate-spin ${
        light ? 'border-white/40 border-t-white' : 'border-navy-900/30 border-t-navy-900'
      }`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wide text-navy-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
