'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

interface ContentItem {
  id: string;
  title: string;
  body?: string;
  type: string;
  age_group?: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

export default function AdminContentPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', type: 'article', age_group: '', tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchContent = async () => {
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchContent(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || saving) return;
    setSaving(true);
    setError('');
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error: insErr } = await supabase.from('content_items').insert({
      title: form.title,
      body: form.body,
      type: form.type,
      age_group: form.age_group || null,
      tags,
      is_published: false,
      created_by: user?.id,
    });
    if (insErr) {
      // Échec : on conserve la saisie et le formulaire ouvert
      setError(insErr.message ?? 'Enregistrement impossible');
      setSaving(false);
      return;
    }
    setForm({ title: '', body: '', type: 'article', age_group: '', tags: '' });
    setShowForm(false);
    await fetchContent();
    setSaving(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    if (togglingId) return;
    setTogglingId(id);
    setError('');
    const { error: upErr } = await supabase
      .from('content_items')
      .update({ is_published: !current })
      .eq('id', id);
    if (upErr) setError(upErr.message ?? 'Mise à jour impossible');
    await fetchContent();
    setTogglingId(null);
  };

  const TYPES = ['article', 'video', 'exercise', 'tip', 'guide'];
  const AGE_GROUPS = ['', '8-11', '12-14', '15-17'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Contenu pédagogique 📚</h1>
          <p className="text-gray-500 mt-1">{items.length} ressource{items.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-navy-600 text-white rounded-xl px-5 py-3 min-h-[44px] font-semibold hover:bg-navy-700 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvelle ressource'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">Nouvelle ressource</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-500 mb-1 block">Titre</label>
              <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de la ressource" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Type</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Groupe d'âge</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })}>
                {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag || 'Tous'}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-500 mb-1 block">Contenu</label>
              <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Corps du contenu..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-500 mb-1 block">Tags (séparés par virgule)</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="motivation, sport, confiance" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-navy-600 hover:bg-navy-700 text-white rounded-xl px-6 py-3 min-h-[44px] font-semibold disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-sm">
              <th className="px-6 py-4">Titre</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Groupe</th>
              <th className="px-6 py-4">Tags</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucune ressource.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-sm">{item.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 rounded-full px-3 py-1 text-xs">{item.type}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{item.age_group ?? 'Tous'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {(item.tags ?? []).slice(0, 3).map((tag, i) => (
                        <span key={i} className="bg-navy-50 text-navy-700 rounded-full px-2 py-0.5 text-xs">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublish(item.id, item.is_published)}
                      disabled={togglingId === item.id}
                      className="text-sm text-navy-600 hover:text-navy-900 underline py-2 disabled:opacity-50 transition-colors"
                    >
                      {togglingId === item.id ? '…' : item.is_published ? 'Dépublier' : 'Publier'}
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
