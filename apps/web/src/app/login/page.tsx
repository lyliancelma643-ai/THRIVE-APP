'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';

type Mode = 'signin' | 'signup' | 'forgot';
type ChildRow = { firstName: string; age: string; sport: string };

const EMPTY_CHILD: ChildRow = { firstName: '', age: '', sport: '' };

const SPORT_OPTIONS = [
  'Hockey', 'Soccer', 'Basketball', 'Natation', 'Tennis',
  'Volleyball', 'Gymnastique', 'Arts martiaux', 'Baseball',
  'Patinage', 'Football', 'Athlétisme', 'Autre',
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();

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
        'Votre compte a été désactivé. Contactez un administrateur pour le réactiver.'
      );
    }
  }, []);

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
    } catch (err: any) {
      setError(err?.message ?? "Envoi de l'email impossible");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Tous les champs sont requis'); return; }
    try {
      setError('');
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Connexion impossible');
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
    const children = childRows.filter((c) => c.firstName.trim() && c.age);
    setError('');
    setSubmitting(true);
    try {
      // 1. Compte parent (toujours PARENT, confirmé automatiquement côté Supabase)
      const { error: upErr } = await supabase.auth.signUp({
        email: mail.trim(),
        password: pwd,
        options: {
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: 'PARENT',
          },
        },
      });
      if (upErr) throw upErr;

      // 2. Connexion immédiate (le trigger DB a déjà confirmé l'email)
      await signIn(mail.trim(), pwd);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Connexion impossible après inscription');

      // 3. Famille + enfants déclarés à l'inscription
      if (children.length > 0) {
        const { data: family, error: famErr } = await supabase
          .from('families')
          .insert({ name: `Famille ${lastName.trim()}`, parent_id: user.id })
          .select('id')
          .single();
        if (famErr) throw famErr;

        const rows = children.map((c) => {
          const dob = new Date();
          dob.setFullYear(dob.getFullYear() - Number(c.age));
          return {
            family_id: family.id,
            first_name: c.firstName.trim(),
            date_of_birth: dob.toISOString().split('T')[0],
            sport: c.sport.trim() || 'Hockey',
            is_active: true,
          };
        });
        const { error: childErr } = await supabase.from('children').insert(rows);
        if (childErr) throw childErr;
      }

      router.push('/parent');
    } catch (err: any) {
      const msg = err?.message ?? 'Inscription impossible';
      setError(/already|exist/i.test(msg) ? 'Un compte existe déjà avec cet email.' : msg);
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream relative flex items-center justify-center p-4">
      {/* Halos de fond (liquid glass) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-navy-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sage/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] rounded-full bg-sun/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-navy-900 shadow-card mb-3">
            <BrandLogo className="h-12 w-auto" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.25em] text-navy-600/60 font-bold">
            Sport Positive
          </span>
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
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${
                    mode === m ? 'bg-navy-600 text-white shadow-card' : 'text-navy-600'
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
                <p className="text-sm text-navy-600/80 mb-6">
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
                  <p className="text-sm text-navy-600/70">
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
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? 'Envoi…' : "Envoyer le lien de réinitialisation"}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="w-full text-sm text-navy-600/70 hover:text-navy-900"
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
                  className="input-auth"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
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
                className="block ml-auto text-xs font-medium text-navy-600/70 hover:text-navy-900"
              >
                Mot de passe oublié ?
              </button>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold disabled:opacity-50"
              >
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom">
                  <input className="input-auth" value={signup.firstName}
                    onChange={(e) => setSignup({ ...signup, firstName: e.target.value })} />
                </Field>
                <Field label="Nom">
                  <input className="input-auth" value={signup.lastName}
                    onChange={(e) => setSignup({ ...signup, lastName: e.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" className="input-auth" value={signup.email}
                  autoComplete="email"
                  onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
              </Field>
              <Field label="Mot de passe (min. 8 caractères)">
                <input type="password" className="input-auth" value={signup.password}
                  autoComplete="new-password" minLength={8}
                  onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
              </Field>

              {/* Enfants dès l'inscription */}
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-2">
                  Vos enfants (8–17 ans)
                </p>
                <div className="space-y-3">
                  {childRows.map((c, i) => (
                    <div key={i} className="rounded-2xl bg-white/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-navy-600/60 shrink-0">
                          Enfant {i + 1}
                        </span>
                        <div className="flex-1 border-t border-navy-100/60" />
                        {childRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setChildRows(childRows.filter((_, j) => j !== i))}
                            className="w-6 h-6 shrink-0 rounded-lg bg-red-50 text-red-500 font-bold leading-none"
                            aria-label="Retirer cet enfant"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <input
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
                          type="number" min={4} max={17} placeholder="Âge"
                          className="input-auth w-24"
                          value={c.age}
                          onChange={(e) => {
                            const next = [...childRows];
                            next[i] = { ...c, age: e.target.value };
                            setChildRows(next);
                          }}
                        />
                        <select
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
                  className="mt-2 text-sm font-bold text-navy-600 hover:text-navy-900"
                >
                  + Ajouter un autre enfant
                </button>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-sun hover:bg-sun-dark text-navy-900 font-bold disabled:opacity-50"
              >
                {submitting ? 'Création du compte…' : 'Créer mon compte parent'}
              </button>
              <p className="text-[11px] text-navy-600/60 text-center">
                Compte actif immédiatement — aucun email de validation requis.
              </p>
            </form>
          )}
        </div>
      </div>

      <style jsx global>{`
        .input-auth {
          width: 100%;
          border: 1px solid rgba(0, 78, 122, 0.18);
          border-radius: 0.85rem;
          padding: 0.7rem 0.95rem;
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.8);
          color: #022539;
        }
        .input-auth:focus {
          outline: 2px solid #004e7a;
          outline-offset: 0;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
