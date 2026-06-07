'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    name: '', description: '', icon: '🏅', color: '#FFD700',
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
    setForm({ name: '', description: '', icon: '🏅', color: '#FFD700', category: 'participation', condition_type: 'sessions_completed', condition_value: '1' });
    setShowForm(false);
    await fetchAll();
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('badges').update({ is_active: !current }).eq('id', id);
    await fetchAll();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Badges 🏅</h1>
          <p className="text-gray-500 mt-1">{badges.length} badge{badges.length > 1 ? 's' : ''} configuré{badges.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white rounded-xl px-5 py-3 font-semibold hover:bg-gray-800"
        >
          {showForm ? 'Annuler' : '+ Nouveau badge'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">Créer un badge</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Nom</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du badge" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Icône (emoji)</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-2xl" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Couleur</label>
              <input type="color" className="w-full h-12 border border-gray-200 rounded-xl cursor-pointer" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Catégorie</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Condition</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.condition_type} onChange={(e) => setForm({ ...form, condition_type: e.target.value })}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Valeur seuil</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} min="1" />
            </div>
            <div className="col-span-3">
              <label className="text-sm text-gray-500 mb-1 block">Description</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du badge" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-4 bg-black text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-50">
            {saving ? 'Création...' : 'Créer le badge'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-5">
        {isLoading ? (
          <p className="text-gray-400 col-span-3">Chargement...</p>
        ) : (
          badges.map((badge) => (
            <div key={badge.id} style={{ borderColor: badge.color }} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${!badge.is_active ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-4xl">{badge.icon}</span>
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 font-medium">
                  {CATEGORY_LABELS[badge.category] ?? badge.category}
                </span>
              </div>
              <h3 className="font-bold text-lg">{badge.name}</h3>
              {badge.description && <p className="text-gray-500 text-sm mt-1">{badge.description}</p>}
              <div className="mt-3 text-xs text-gray-400">
                <p>Condition : {badge.condition_value} {CONDITION_LABELS[badge.condition_type] ?? badge.condition_type}</p>
                <p className="mt-1">👥 {stats[badge.id] ?? 0} enfant{(stats[badge.id] ?? 0) > 1 ? 's' : ''} l’ont obtenu</p>
              </div>
              <button
                onClick={() => toggleActive(badge.id, badge.is_active)}
                className="mt-3 text-xs text-gray-400 hover:text-black underline"
              >
                {badge.is_active ? 'Désactiver' : 'Réactiver'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
