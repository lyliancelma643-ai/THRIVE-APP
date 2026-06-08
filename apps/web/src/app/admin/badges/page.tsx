'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Badge {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  condition_type: string;
  condition_value: number;
  is_active: boolean;
  created_at: string;
}

interface ChildBadgeStat {
  badge_id: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  participation: 'Participation',
  progress: 'Progression',
  achievement: 'Exploit',
  social: 'Social',
  special: 'Spécial',
};

const CONDITION_LABELS: Record<string, string> = {
  sessions_completed: 'séances complétées',
  questionnaires_completed: 'questionnaires complétés',
  score_reached: '% de score',
  program_completed: 'programme(s) terminé(s)',
  manual: 'Attribution manuelle',
};

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', icon: '🏅', color: '#3B82F6',
    category: 'participation', condition_type: 'sessions_completed', condition_value: '1',
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [badgesRes, statsRes] = await Promise.all([
      supabase.from('badges').select('*').order('category'),
      supabase.from('child_badges').select('badge_id'),
    ]);
    setBadges(badgesRes.data ?? []);
    const statMap: Record<string, number> = {};
    for (const row of (statsRes.data ?? [])) {
      statMap[row.badge_id] = (statMap[row.badge_id] ?? 0) + 1;
    }
    setStats(statMap);
    setIsLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    await supabase.from('badges').insert({
      ...form,
      condition_value: parseInt(form.condition_value),
      is_active: true,
    });
    setForm({ name: '', description: '', icon: '🏅', color: '#3B82F6', category: 'participation', condition_type: 'sessions_completed', condition_value: '1' });
    setShowForm(false);
    await fetchAll();
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('badges').update({ is_active: !current }).eq('id', id);
    await fetchAll();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Badges</h1>
          <p className="text-[#a7c4bc] text-sm">{badges.length} badge{badges.length > 1 ? 's' : ''} configuré{badges.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${
            showForm 
              ? 'bg-white/10 backdrop-blur-md/10 text-[#F7F5F2] border-[#a7c4bc]/30 hover:bg-white/10 backdrop-blur-md/20' 
              : 'bg-[#a7c4bc] text-white border-[#a7c4bc] hover:bg-gray-800'
          }`}
        >
          {showForm ? 'Annuler' : 'Nouveau badge'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-[#a7c4bc]/30 mb-8">
          <h2 className="text-sm font-semibold text-[#F7F5F2] mb-4">Créer un badge</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Nom du badge</label>
              <input className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Champion du retour" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Icône (emoji)</label>
              <input className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Couleur</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-8 h-8 rounded border border-[#a7c4bc]/30 p-0.5 cursor-pointer" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                <span className="text-xs font-medium text-[#a7c4bc] uppercase">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Catégorie</label>
              <select className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Condition</label>
              <select className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.condition_type} onChange={(e) => setForm({ ...form, condition_type: e.target.value })}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Valeur cible</label>
              <input type="number" className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} min="1" required />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-[#a7c4bc] mb-1 block uppercase tracking-wider">Description</label>
              <input className="w-full bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Félicitations pour votre persévérance !" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={saving} className="bg-[#a7c4bc] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? 'Création...' : 'Créer le badge'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const isInactive = !badge.is_active;
            
            return (
              <div 
                key={badge.id} 
                className={`bg-white/10 backdrop-blur-md rounded-xl p-5 border transition-all ${
                  isInactive ? 'opacity-50 border-[#a7c4bc]/30' : 'border-[#a7c4bc]/30 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border border-[#a7c4bc]/10"
                    style={{ backgroundColor: badge.color + '20' }}
                  >
                    {badge.icon}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider bg-white/10 backdrop-blur-md/10 text-[#a7c4bc] px-2 py-0.5 rounded font-medium">
                    {CATEGORY_LABELS[badge.category] ?? badge.category}
                  </span>
                </div>
                
                <h3 className="font-semibold text-sm text-[#F7F5F2] mb-1">{badge.name}</h3>
                {badge.description && <p className="text-[#a7c4bc] text-xs mb-3 line-clamp-2">{badge.description}</p>}
                
                <div className="bg-[#a7c4bc]/20 rounded-lg p-2.5 mb-4 border border-[#a7c4bc]/10">
                  <p className="text-[10px] font-semibold text-[#a7c4bc] uppercase tracking-wider mb-0.5">Objectif</p>
                  <p className="text-xs font-medium text-[#F7F5F2]">{badge.condition_value} {CONDITION_LABELS[badge.condition_type] ?? badge.condition_type}</p>
                </div>
                
                <div className="flex justify-between items-center mt-auto pt-3 border-t border-[#a7c4bc]/10">
                  <p className="text-xs text-[#a7c4bc]">
                    <span className="font-medium text-[#F7F5F2]">{stats[badge.id] ?? 0}</span> obtention{(stats[badge.id] ?? 0) > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => toggleActive(badge.id, badge.is_active)}
                    className={`text-xs font-medium transition-colors ${
                      badge.is_active 
                        ? 'text-[#a7c4bc]/70 hover:text-red-600' 
                        : 'text-[#a7c4bc]/70 hover:text-green-600'
                    }`}
                  >
                    {badge.is_active ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
