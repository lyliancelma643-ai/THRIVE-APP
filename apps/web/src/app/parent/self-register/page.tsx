'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type Step = 1 | 2 | 3;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  familyName: string;
  city: string;
}

export default function ParentSelfRegisterPage() {
  const router = useRouter();
  const { signIn } = useAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    familyName: '',
    city: '',
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── Étape 1 : Validation infos personnelles ──
  const handleStep1 = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Adresse email invalide.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setStep(2);
  };

  // ── Étape 2 : Validation infos famille ──
  const handleStep2 = () => {
    if (!form.familyName) {
      setError('Le nom de famille est requis.');
      return;
    }
    setStep(3);
  };

  // ── Étape 3 : Création du compte Supabase + profil + famille ──
  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Créer le compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            role: 'PARENT',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte.');

      const userId = authData.user.id;

      // 2. Créer ou mettre à jour le profil (le trigger Supabase en crée un automatiquement,
      //    on le met à jour avec les infos complètes)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          role: 'PARENT',
          onboarding_completed: true,
        });

      if (profileError) {
        console.warn('[THRIVE] Profil upsert warning:', profileError.message);
      }

      // 3. Créer la famille
      const { error: familyError } = await supabase
        .from('families')
        .insert({
          name: form.familyName,
          city: form.city || null,
          parent_id: userId,
        });

      if (familyError) {
        console.warn('[THRIVE] Family insert warning:', familyError.message);
      }

      // 4. Si la session est disponible directement (email confirm désactivé),
      //    connecter automatiquement. Sinon, faire un signIn.
      if (authData.session) {
        // Session disponible → connexion automatique
        await signIn(form.email, form.password);
      } else {
        // Email confirmation activé → rediriger vers login avec message
        router.push('/login?registered=1');
        return;
      }

      // 5. Rediriger vers select-profile
      router.push('/parent/select-profile');

    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Composant Input réutilisable ──
  const Input = ({
    label, type = 'text', value, onChange, placeholder, required = false,
  }: {
    label: string; type?: string; value: string;
    onChange: (v: string) => void; placeholder?: string; required?: boolean;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.6)' }}>
        {label}{required && <span style={{ color: '#a7c4bc' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(247,245,242,0.15)',
          color: '#F7F5F2',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#a7c4bc'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(247,245,242,0.15)'; }}
      />
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#004e7a' }}
    >
      {/* Logo */}
      <div className="mb-10">
        <Link href="/login">
          <span className="font-black text-3xl tracking-tight" style={{ color: '#F7F5F2' }}>
            THRIVE<span style={{ color: '#a7c4bc' }}>.</span>
          </span>
        </Link>
      </div>

      {/* Carte */}
      <div
        className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{ backgroundColor: '#003356', border: '1px solid rgba(167,196,188,0.2)' }}
      >
        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: step >= s ? '#a7c4bc' : 'rgba(167,196,188,0.15)',
                  color: step >= s ? '#003356' : 'rgba(247,245,242,0.4)',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className="h-px flex-1 w-12 transition-all"
                  style={{ backgroundColor: step > s ? '#a7c4bc' : 'rgba(167,196,188,0.2)' }}
                />
              )}
            </div>
          ))}
          <div className="ml-auto">
            <p className="text-xs font-medium" style={{ color: 'rgba(247,245,242,0.4)' }}>
              Étape {step}/3
            </p>
          </div>
        </div>

        {/* ── ÉTAPE 1 : Infos personnelles ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#F7F5F2' }}>Créer votre compte</h1>
              <p className="text-sm" style={{ color: 'rgba(247,245,242,0.5)' }}>Vos informations personnelles</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" value={form.firstName} onChange={(v) => update('firstName', v)} placeholder="Marie" required />
              <Input label="Nom" value={form.lastName} onChange={(v) => update('lastName', v)} placeholder="Dupont" required />
            </div>
            <Input label="Adresse email" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="marie@email.com" required />
            <Input label="Mot de passe" type="password" value={form.password} onChange={(v) => update('password', v)} placeholder="Min. 6 caractères" required />
            <Input label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="••••••••" required />
            {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}
            <button
              onClick={handleStep1}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ backgroundColor: '#a7c4bc', color: '#003356' }}
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Infos famille ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#F7F5F2' }}>Votre famille</h1>
              <p className="text-sm" style={{ color: 'rgba(247,245,242,0.5)' }}>Ces infos servent à créer votre espace famille</p>
            </div>
            <Input label="Nom de famille" value={form.familyName} onChange={(v) => update('familyName', v)} placeholder="ex: Famille Dupont" required />
            <Input label="Ville (optionnel)" value={form.city} onChange={(v) => update('city', v)} placeholder="ex: Montréal" />
            {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(247,245,242,0.6)', border: '1px solid rgba(247,245,242,0.15)' }}
              >
                ← Retour
              </button>
              <button
                onClick={handleStep2}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ backgroundColor: '#a7c4bc', color: '#003356' }}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Confirmation ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#F7F5F2' }}>Tout est prêt !</h1>
              <p className="text-sm" style={{ color: 'rgba(247,245,242,0.5)' }}>Vérifiez vos informations avant de créer votre compte</p>
            </div>

            {/* Récapitulatif */}
            <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(167,196,188,0.15)' }}>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.4)' }}>Nom</span>
                <span className="text-sm font-semibold" style={{ color: '#F7F5F2' }}>{form.firstName} {form.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.4)' }}>Email</span>
                <span className="text-sm font-semibold" style={{ color: '#F7F5F2' }}>{form.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.4)' }}>Famille</span>
                <span className="text-sm font-semibold" style={{ color: '#F7F5F2' }}>{form.familyName}</span>
              </div>
              {form.city && (
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(247,245,242,0.4)' }}>Ville</span>
                  <span className="text-sm font-semibold" style={{ color: '#F7F5F2' }}>{form.city}</span>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(247,245,242,0.6)', border: '1px solid rgba(247,245,242,0.15)' }}
              >
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ backgroundColor: '#a7c4bc', color: '#003356' }}
              >
                {isLoading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </div>
        )}

        {/* Lien connexion */}
        <p className="text-center text-sm mt-6" style={{ color: 'rgba(247,245,242,0.4)' }}>
          Déjà un compte ?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#a7c4bc' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
