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
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Badges 🏅</h1>
          <p className="text-slate-500 font-medium">{badges.length} badge{badges.length > 1 ? 's' : ''} configuré{badges.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-md ${
            showForm 
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25'
          }`}
        >
          {showForm ? 'Fermer l\'éditeur' : '+ Créer un badge'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Nouveau Badge</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Nom du badge</label>
                <input className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Champion du retour" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Icône (emoji)</label>
                <input className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-xl transition-all outline-none" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Couleur de fond</label>
                <div className="flex items-center gap-3">
                  <input type="color" className="w-12 h-12 rounded-xl cursor-pointer bg-slate-50 border border-slate-200 p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  <span className="text-sm font-medium text-slate-500 uppercase">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Catégorie</label>
                <select className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Condition d'obtention</label>
                <select className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none" value={form.condition_type} onChange={(e) => setForm({ ...form, condition_type: e.target.value })}>
                  {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Valeur cible</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none" value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} min="1" required />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Description courte</label>
                <input className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm font-medium transition-all outline-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Félicitations pour votre persévérance !" />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button type="submit" disabled={saving} className="bg-slate-900 text-white rounded-xl px-8 py-3.5 font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md shadow-slate-900/20">
                {saving ? 'Enregistrement...' : 'Sauvegarder le badge'}
              </button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {badges.map((badge) => {
            // Check if hex is dark or light to adjust text color slightly
            const isInactive = !badge.is_active;
            
            return (
              <div 
                key={badge.id} 
                className={`relative bg-white rounded-[24px] p-6 border-2 transition-all duration-300 group ${
                  isInactive ? 'opacity-60 border-slate-200' : 'border-transparent shadow-sm hover:shadow-xl hover:-translate-y-1'
                }`}
                style={!isInactive ? { borderColor: badge.color + '40' } : {}}
              >
                {!isInactive && (
                  <div className="absolute inset-0 opacity-[0.03] rounded-[24px]" style={{ backgroundColor: badge.color }}></div>
                )}
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-md transform group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: badge.color, boxShadow: `0 10px 25px -5px ${badge.color}60` }}
                    >
                      {badge.icon}
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-bold">
                      {CATEGORY_LABELS[badge.category] ?? badge.category}
                    </span>
                  </div>
                  
                  <h3 className="font-extrabold text-xl text-slate-900 mb-1">{badge.name}</h3>
                  {badge.description && <p className="text-slate-500 text-sm mb-4 leading-relaxed">{badge.description}</p>}
                  
                  <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">Objectif à atteindre</p>
                    <p className="text-sm font-bold text-blue-600 mt-0.5">{badge.condition_value} {CONDITION_LABELS[badge.condition_type] ?? badge.condition_type}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500">
                      🏆 <span className="text-slate-700">{stats[badge.id] ?? 0}</span> obtention{(stats[badge.id] ?? 0) > 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => toggleActive(badge.id, badge.is_active)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        badge.is_active 
                          ? 'text-rose-600 hover:bg-rose-50' 
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {badge.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
