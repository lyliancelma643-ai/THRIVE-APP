'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Coach {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  program_count?: number;
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCoaches = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'COACH')
      .order('created_at', { ascending: false });
    setCoaches(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName || !form.password) {
      setError('Tous les champs sont requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Créer le compte Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { firstName: form.firstName, lastName: form.lastName, role: 'COACH' },
        },
      });
      if (authError) throw new Error(authError.message);

      // Le trigger Supabase crée automatiquement le profil
      // On force le rôle COACH au cas où
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ role: 'COACH' })
          .eq('id', data.user.id);
      }

      setSuccess(`Coach ${form.firstName} ${form.lastName} créé avec succès !`);
      setForm({ email: '', firstName: '', lastName: '', password: '' });
      setShowForm(false);
      await fetchCoaches();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const toggleActive = async (coachId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', coachId);
    await fetchCoaches();
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0 border-b border-[#a7c4bc]/20 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F7F5F2] mb-1">Coaches</h1>
          <p className="text-[#a7c4bc] text-sm font-medium">{coaches.length} coach{coaches.length > 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
            showForm 
              ? 'bg-white/10 text-[#F7F5F2] border-[#a7c4bc]/30 hover:bg-white/20' 
              : 'bg-[#a7c4bc] text-[#004e7a] border-[#a7c4bc] hover:bg-[#b8d2cb] shadow-lg'
          }`}
        >
          {showForm ? 'Annuler' : '+ Nouveau coach'}
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-[#a7c4bc]/30 mb-6 shrink-0 shadow-2xl">
          <h2 className="text-sm font-bold text-[#F7F5F2] mb-4 uppercase tracking-widest">Créer un compte coach</h2>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-xs font-bold text-[#a7c4bc] mb-1.5 block uppercase tracking-wider">Prénom</label>
              <input
                className="w-full bg-black/20 border border-[#a7c4bc]/30 focus:border-[#a7c4bc] focus:ring-1 focus:ring-[#a7c4bc] rounded-xl px-4 py-3 text-sm text-[#F7F5F2] placeholder-[#a7c4bc]/50 transition-all outline-none"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#a7c4bc] mb-1.5 block uppercase tracking-wider">Nom</label>
              <input
                className="w-full bg-black/20 border border-[#a7c4bc]/30 focus:border-[#a7c4bc] focus:ring-1 focus:ring-[#a7c4bc] rounded-xl px-4 py-3 text-sm text-[#F7F5F2] placeholder-[#a7c4bc]/50 transition-all outline-none"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#a7c4bc] mb-1.5 block uppercase tracking-wider">Email</label>
              <input
                type="email"
                className="w-full bg-black/20 border border-[#a7c4bc]/30 focus:border-[#a7c4bc] focus:ring-1 focus:ring-[#a7c4bc] rounded-xl px-4 py-3 text-sm text-[#F7F5F2] placeholder-[#a7c4bc]/50 transition-all outline-none"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="coach@thrive.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#a7c4bc] mb-1.5 block uppercase tracking-wider">Mot de passe temporaire</label>
              <input
                type="password"
                className="w-full bg-black/20 border border-[#a7c4bc]/30 focus:border-[#a7c4bc] focus:ring-1 focus:ring-[#a7c4bc] rounded-xl px-4 py-3 text-sm text-[#F7F5F2] placeholder-[#a7c4bc]/50 transition-all outline-none"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 caractères"
              />
            </div>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-xl mb-4"><p className="text-red-200 text-sm font-medium">{error}</p></div>}
          {success && <div className="bg-green-500/20 border border-green-500/30 p-3 rounded-xl mb-4"><p className="text-green-300 text-sm font-medium">{success}</p></div>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#a7c4bc] text-[#004e7a] rounded-xl px-6 py-2.5 text-sm font-bold disabled:opacity-50 transition-all hover:bg-white shadow-lg"
            >
              {saving ? 'Création...' : 'Créer le coach'}
            </button>
          </div>
        </form>
      )}

      {success && !showForm && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6 text-green-300 font-medium text-sm shrink-0">{success}</div>
      )}

      {/* Liste coaches */}
      <div className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-2xl flex-1 flex flex-col min-h-0 shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-[#a7c4bc] font-bold uppercase tracking-widest bg-black/20 sticky top-0 z-10 border-b border-[#a7c4bc]/30">
              <tr>
                <th className="px-6 py-5">Coach</th>
                <th className="px-6 py-5">Email</th>
                <th className="px-6 py-5">Inscription</th>
                <th className="px-6 py-5">Statut</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a7c4bc]/10">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#a7c4bc]">Chargement...</td></tr>
              ) : coaches.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#a7c4bc]">Aucun coach enregistré.</td></tr>
              ) : (
                coaches.map((coach) => (
                  <tr key={coach.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#F7F5F2]">{coach.first_name} {coach.last_name}</div>
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]/90 font-medium">{coach.email}</td>
                    <td className="px-6 py-4 text-[#a7c4bc]/80 text-xs">
                      {new Date(coach.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest border ${
                        coach.is_active
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {coach.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActive(coach.id, coach.is_active)}
                        className={`text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                          coach.is_active 
                            ? 'text-red-300 border-red-500/30 hover:bg-red-500/20' 
                            : 'text-green-300 border-green-500/30 hover:bg-green-500/20'
                        }`}
                      >
                        {coach.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
