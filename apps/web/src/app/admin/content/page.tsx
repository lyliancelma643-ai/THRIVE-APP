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
    if (!form.title) return;
    setSaving(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    await supabase.from('content_items').insert({
      title: form.title,
      body: form.body,
      type: form.type,
      age_group: form.age_group || null,
      tags,
      is_published: false,
      created_by: user?.id,
    });
    setForm({ title: '', body: '', type: 'article', age_group: '', tags: '' });
    setShowForm(false);
    await fetchContent();
    setSaving(false);
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('content_items').update({ is_published: !current }).eq('id', id);
    await fetchContent();
  };

  const TYPES = ['article', 'video', 'exercise', 'tip', 'guide'];
  const AGE_GROUPS = ['', '8-11', '12-14', '15-17'];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Contenu pédagogique</h1>
          <p className="text-gray-500 text-sm">{items.length} ressource{items.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${
            showForm 
              ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' 
              : 'bg-black text-white border-black hover:bg-gray-800'
          }`}
        >
          {showForm ? 'Annuler' : 'Nouvelle ressource'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Nouvelle ressource</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wider">Titre</label>
              <input className="w-full bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de la ressource" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wider">Type</label>
              <select className="w-full bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wider">Groupe d'âge</label>
              <select className="w-full bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })}>
                {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag || 'Tous'}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wider">Contenu</label>
              <textarea className="w-full bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none custom-scrollbar" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Corps du contenu..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wider">Tags (séparés par virgule)</label>
              <input className="w-full bg-white border border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="motivation, sport, confiance" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors hover:bg-gray-800">
              {saving ? 'Enregistrement...' : 'Enregistrer (brouillon)'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50/50 sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Titre</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Groupe</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucune ressource.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{item.age_group ?? 'Tous'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {(item.tags ?? []).slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border ${
                        item.is_published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {item.is_published ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublish(item.id, item.is_published)}
                        className={`text-sm font-medium transition-colors ${
                          item.is_published ? 'text-gray-400 hover:text-gray-700' : 'text-gray-400 hover:text-green-600'
                        }`}
                      >
                        {item.is_published ? 'Dépublier' : 'Publier'}
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
