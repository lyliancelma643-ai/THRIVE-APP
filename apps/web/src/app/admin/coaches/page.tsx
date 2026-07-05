'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useModalDismiss } from '@/lib/useModalDismiss';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Coach {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // La vue expose "phone" (alias de phone_number), le fallback profiles expose "phone_number"
  phone?: string | null;
  phone_number?: string | null;
  speciality?: string | null;
  bio?: string | null;
  is_active: boolean;
  created_at: string;
  program_count?: number;
  session_count?: number;
  children_count?: number;
}

// Helper : récupère le téléphone quel que soit l'alias
const getPhone = (c: Coach) => c.phone ?? c.phone_number ?? null;

interface CoachForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  phone: string;
  speciality: string;
  bio: string;
}

const EMPTY_FORM: CoachForm = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  phone: '',
  speciality: '',
  bio: '',
};

// Calcul force du mot de passe
function passwordStrength(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS: Record<number, string> = { 0: '', 1: 'Faible', 2: 'Moyen', 3: 'Bien', 4: 'Fort' };
const STRENGTH_COLORS: Record<number, string> = { 0: '', 1: 'bg-red-400', 2: 'bg-yellow-400', 3: 'bg-navy-400', 4: 'bg-green-400' };

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<CoachForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Erreur des actions de ligne (activer/désactiver), distincte du formulaire.
  const [rowError, setRowError] = useState('');

  // Échap ferme la modale de création (sauf pendant l'enregistrement) —
  // 3e sortie en plus du clic sur le fond et du bouton ✕.
  useModalDismiss(
    () => { if (!saving) { setShowModal(false); setError(''); } },
    showModal,
  );

  // ── Chargement des coaches ─────────────────────────────────────────────────
  const fetchCoaches = useCallback(async () => {
    setIsLoading(true);
    // Essai via la vue enrichie
    const { data: viewData, error: viewError } = await supabase
      .from('admin_coaches_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (!viewError && viewData) {
      setCoaches(viewData);
    } else {
      // Fallback direct sur profiles si la vue n'est pas encore dispo
      const { data: fallback } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone_number, speciality, bio, is_active, created_at')
        .eq('role', 'COACH')
        .order('created_at', { ascending: false });
      setCoaches(fallback ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchCoaches(); }, [fetchCoaches]);

  // Realtime : tout changement de profil coach s'affiche sans recharger
  useEffect(() => {
    const channel = supabase
      .channel('admin-coaches-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCoaches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCoaches]);

  // ── Filtres ────────────────────────────────────────────────────────────────
  const filtered = coaches.filter((c) => {
    const matchSearch =
      !search ||
      `${c.first_name ?? ''} ${c.last_name ?? ''} ${c.email} ${c.speciality ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && c.is_active) ||
      (filterActive === 'inactive' && !c.is_active);
    return matchSearch && matchActive;
  });

  // ── Création coach via Edge Function ──────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.firstName || !form.lastName || !form.password) {
      setError('Prénom, nom, email et mot de passe sont obligatoires.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Adresse email invalide.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée, veuillez vous reconnecter.');

      // Appel Edge Function sécurisé — pas de getFunctionUrl() qui n'existe pas
      const { data, error: fnError } = await supabase.functions.invoke('admin-create-coach', {
        body: {
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || null,
          speciality: form.speciality.trim() || null,
          bio: form.bio.trim() || null,
        },
      });

      if (fnError) throw new Error(fnError.message ?? 'Erreur lors de la création');
      if (data?.error) throw new Error(data.error);

      setSuccess(`✅ ${form.firstName} ${form.lastName} a été créé avec succès !`);
      setForm(EMPTY_FORM);
      setShowModal(false);
      // Recharger la liste pour voir le nouveau coach
      await fetchCoaches();
    } catch (err: any) {
      setError(err.message ?? 'Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // ── Activer / désactiver (ban réel via Edge Function) ──────────────────────
  // On passe par admin-update-user pour que la désactivation BLOQUE vraiment la
  // connexion (ban Supabase Auth) et pas seulement le drapeau is_active.
  const toggleActive = async (coachId: string, current: boolean) => {
    setTogglingId(coachId);
    setRowError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-update-user', {
        body: { changes: [{ id: coachId, isActive: !current }] },
      });
      if (fnError) throw new Error(fnError.message ?? 'Action impossible');
      const failed = (data?.results as { ok: boolean; error?: string }[] | undefined)?.find(
        (r) => !r.ok
      );
      if (failed) throw new Error(failed.error ?? 'Action impossible');
      await fetchCoaches();
    } catch (err: any) {
      setRowError(err?.message ?? 'Action impossible');
    } finally {
      setTogglingId(null);
    }
  };

  const strength = passwordStrength(form.password);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Coaches 🎯</h1>
          <p className="text-gray-500 mt-1">
            {coaches.length} coach{coaches.length > 1 ? 'es' : ''} enregistré{coaches.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); setSuccess(''); setForm(EMPTY_FORM); }}
          className="bg-navy-600 text-white rounded-xl px-5 py-3 font-semibold hover:bg-navy-700 transition-colors whitespace-nowrap"
        >
          + Nouveau coach
        </button>
      </div>

      {/* Banner succès */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Banner erreur des actions de ligne (ex. échec d'activation/désactivation) */}
      {rowError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm flex items-center justify-between">
          <span>{rowError}</span>
          <button onClick={() => setRowError('')} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher par nom, email, spécialité…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                filterActive === f ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {{ all: 'Tous', active: 'Actifs', inactive: 'Inactifs' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des coaches */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Coach</th>
              <th className="px-6 py-4 hidden md:table-cell">Email</th>
              <th className="px-6 py-4 hidden lg:table-cell">Spécialité</th>
              <th className="px-6 py-4 hidden lg:table-cell">Stats</th>
              <th className="px-6 py-4 hidden md:table-cell">Inscription</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-500 font-medium">
                    {search || filterActive !== 'all'
                      ? 'Aucun résultat pour cette recherche'
                      : 'Aucun coach enregistré'}
                  </p>
                  {!search && filterActive === 'all' && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-4 text-sm text-black underline"
                    >
                      Créer le premier coach
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((coach) => (
                <tr key={coach.id} className="border-t hover:bg-gray-50 transition-colors">
                  {/* Nom + avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                        {(coach.first_name?.[0] ?? '?').toUpperCase()}{(coach.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {coach.first_name} {coach.last_name}
                        </p>
                        {getPhone(coach) && (
                          <p className="text-xs text-gray-400">{getPhone(coach)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-6 py-4 text-gray-500 text-sm hidden md:table-cell">{coach.email}</td>
                  {/* Spécialité */}
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {coach.speciality ? (
                      <span className="bg-navy-50 text-navy-700 text-xs rounded-full px-3 py-1">
                        {coach.speciality}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  {/* Stats */}
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span title="Programmes">📋 {coach.program_count ?? 0}</span>
                      <span title="Séances">🗓️ {coach.session_count ?? 0}</span>
                      <span title="Enfants suivis">👶 {coach.children_count ?? 0}</span>
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-6 py-4 text-gray-400 text-sm hidden md:table-cell">
                    {new Date(coach.created_at).toLocaleDateString('fr-CA')}
                  </td>
                  {/* Statut */}
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      coach.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {coach.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(coach.id, coach.is_active)}
                      disabled={togglingId === coach.id}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors ${
                        coach.is_active
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {togglingId === coach.id ? '…' : coach.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal création coach ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!saving) { setShowModal(false); setError(''); } }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Créer un coach</h2>
                <p className="text-gray-500 text-sm mt-0.5">Le coach peut se connecter immédiatement</p>
              </div>
              <button
                onClick={() => { if (!saving) { setShowModal(false); setError(''); } }}
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-xl transition-colors"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Marie"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Adresse email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="marie.dupont@thrive.com"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Téléphone <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 514 000 0000"
                />
              </div>

              {/* Spécialité */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Spécialité <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30"
                  value={form.speciality}
                  onChange={(e) => setForm({ ...form, speciality: e.target.value })}
                  placeholder="Nutrition sportive, développement comportemental…"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Bio <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30 resize-none"
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Courte description du coach…"
                />
              </div>

              {/* Mot de passe */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accès</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/30 pr-16"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min. 8 caractères"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        {showPassword ? 'Masquer' : 'Voir'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">
                      Confirmer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                        form.confirmPassword && form.password !== form.confirmPassword
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-gray-200 focus:ring-black/10 focus:border-black/30'
                      }`}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Répéter"
                    />
                  </div>
                </div>

                {/* Indicateur de force */}
                {form.password && (
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          lvl <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-100'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1 w-10">{STRENGTH_LABELS[strength]}</span>
                  </div>
                )}
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); }}
                  disabled={saving}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-navy-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Création…
                    </>
                  ) : 'Créer le coach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
