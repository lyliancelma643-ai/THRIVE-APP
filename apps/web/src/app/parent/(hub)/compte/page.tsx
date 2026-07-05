'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, logout } from '@/stores/auth.store';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin',
  COACH: 'Coach',
};

export default function ComptePage() {
  const { user, hydrate } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  const dirty =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '');

  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '👤';

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError('');
    setSavedAt(false);
    const { error: upErr } = await supabase.auth.updateUser({
      data: { firstName: firstName.trim(), lastName: lastName.trim() },
    });
    if (upErr) {
      setError(upErr.message ?? 'Enregistrement impossible');
      setSaving(false);
      return;
    }
    // Rafraîchit le store pour propager le nouveau nom (avatar, en-têtes…)
    await hydrate();
    setSaving(false);
    setSavedAt(true);
    setTimeout(() => setSavedAt(false), 2500);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/parent/bilans"
        className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white active:text-white mb-4 py-3 pr-4 -my-1 transition-colors select-none"
      >
        ← Retour
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <span className="w-16 h-16 rounded-full bg-navy-700 ring-1 ring-white/20 text-white flex items-center justify-center text-xl font-bold shrink-0">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-white truncate">
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mon compte'}
          </h1>
          <p className="text-white/50 text-sm truncate">{user?.email}</p>
        </div>
      </div>

      {/* Informations du profil */}
      <section className="rounded-2xl glass-navy p-5 md:p-6 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-4">
          Mon profil
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <label className="block">
            <span className="block text-xs font-medium text-white/55 mb-1.5">Prénom</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-white placeholder-white/30 focus:border-sun/60 focus:outline-none transition-colors"
              placeholder="Prénom"
              autoComplete="given-name"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-white/55 mb-1.5">Nom</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-white placeholder-white/30 focus:border-sun/60 focus:outline-none transition-colors"
              placeholder="Nom"
              autoComplete="family-name"
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-12 px-6 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savedAt && (
            <span className="text-sm text-sage font-medium">✓ Enregistré</span>
          )}
          {error && <span className="text-sm text-red-300">{error}</span>}
        </div>
      </section>

      {/* Détails du compte (lecture seule) */}
      <section className="rounded-2xl glass-navy p-5 md:p-6 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-4">
          Compte
        </h2>
        <dl className="divide-y divide-white/10 text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-white/55">Adresse e-mail</dt>
            <dd className="font-medium text-white truncate ml-4">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-white/55">Type de compte</dt>
            <dd className="font-medium text-white">
              {user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-white/40 mt-4 leading-relaxed">
          Pour changer d&apos;adresse e-mail ou de mot de passe, écris à ton coach
          THRIVE ou à l&apos;administrateur.
        </p>
      </section>

      {/* Déconnexion */}
      <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Se déconnecter</h2>
        <p className="text-xs text-white/50 mb-4 leading-relaxed">
          Tu devras te reconnecter avec ton e-mail et ton mot de passe.
        </p>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full sm:w-auto h-12 px-6 rounded-full bg-red-500/20 border border-red-400/40 text-red-100 text-sm font-bold hover:bg-red-500/30 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
        >
          {signingOut ? 'Déconnexion…' : '⏻ Se déconnecter'}
        </button>
      </section>
    </div>
  );
}
