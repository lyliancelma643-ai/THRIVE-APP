'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface NotifRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  profile?: { first_name: string; last_name: string; role: string };
}

const TYPE_ICONS: Record<string, string> = {
  MESSAGE: '💬',
  SESSION: '📅',
  BADGE: '🏅',
  PROGRAM: '🏆',
  SYSTEM: '🔔',
};

const TYPE_COLORS: Record<string, string> = {
  MESSAGE: 'bg-blue-100 text-blue-700',
  SESSION: 'bg-green-100 text-green-700',
  BADGE: 'bg-yellow-100 text-yellow-700',
  PROGRAM: 'bg-purple-100 text-purple-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'MESSAGE' | 'SESSION' | 'BADGE'>('all');
  const [showSendForm, setShowSendForm] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [form, setForm] = useState({ user_id: '', title: '', body: '', type: 'SYSTEM', path: '' });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    fetchAll();
    supabase.from('profiles').select('id, first_name, last_name').then(({ data }: { data: any }) => setProfiles(data ?? []));
  }, []);

  const fetchAll = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, profile:profiles(first_name, last_name, role)')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications(data ?? []);
    setIsLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id || !form.title || sending) return;
    const path = form.path.trim();
    if (path && !path.startsWith('/')) {
      setSendError('Le lien doit être un chemin interne commençant par « / » (ex. /parent/bilans).');
      return;
    }
    setSending(true);
    setSendError('');
    const { error: insErr } = await supabase.from('notifications').insert({
      user_id: form.user_id,
      type: form.type,
      title: form.title,
      body: form.body || null,
      // Destination du clic ; sans lien, le trigger en base en dérive un
      ...(path ? { data: { path } } : {}),
    });
    if (insErr) {
      // Échec : on garde la saisie, le formulaire reste ouvert
      setSendError(insErr.message ?? "Envoi impossible");
      setSending(false);
      return;
    }
    setForm({ user_id: '', title: '', body: '', type: 'SYSTEM', path: '' });
    setShowSendForm(false);
    await fetchAll();
    setSending(false);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter !== 'all') return n.type === filter;
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    today: notifications.filter((n) => new Date(n.created_at).toDateString() === new Date().toDateString()).length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">🔔 Notifications</h1>
          <p className="text-gray-500 mt-1">Centre de notifications de l'application</p>
        </div>
        <button
          onClick={() => setShowSendForm(!showSendForm)}
          className="bg-navy-600 text-white rounded-xl px-5 py-3 min-h-[44px] font-semibold hover:bg-navy-700 transition-colors"
        >
          {showSendForm ? 'Annuler' : '✉️ Envoyer une notif'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: '🔔' },
          { label: 'Non lues', value: stats.unread, icon: '🔴' },
          { label: "Aujourd'hui", value: stats.today, icon: '📅' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSendForm && (
        <form onSubmit={handleSend} className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4">Envoyer une notification manuelle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Destinataire</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              >
                <option value="">Sélectionner un utilisateur</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Type</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {['MESSAGE', 'SESSION', 'BADGE', 'PROGRAM', 'SYSTEM'].map((t) => (
                  <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Titre</label>
              <input
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre de la notification"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Message</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Contenu optionnel"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Lien au clic (optionnel)</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="/parent/bilans, /parent/messages, …"
              />
            </div>
          </div>
          {sendError && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {sendError}
            </p>
          )}
          <button
            type="submit"
            disabled={sending || !form.user_id || !form.title}
            className="mt-4 bg-navy-600 hover:bg-navy-700 text-white rounded-xl px-6 py-3 min-h-[44px] font-semibold disabled:opacity-50 transition-colors"
          >
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'unread', 'MESSAGE', 'SESSION', 'BADGE'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : `${TYPE_ICONS[f]} ${f}`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="text-gray-400 p-6">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs text-gray-500 font-semibold px-6 py-3">Type</th>
                <th className="text-left text-xs text-gray-500 font-semibold px-6 py-3">Destinataire</th>
                <th className="text-left text-xs text-gray-500 font-semibold px-6 py-3">Contenu</th>
                <th className="text-left text-xs text-gray-500 font-semibold px-6 py-3">Statut</th>
                <th className="text-left text-xs text-gray-500 font-semibold px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} className={`border-b border-gray-50 ${
                  !n.is_read ? 'bg-yellow-50/30' : ''
                }`}>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-700'
                    }`}>
                      {TYPE_ICONS[n.type]} {n.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">
                      {n.profile ? `${n.profile.first_name} ${n.profile.last_name}` : n.user_id.slice(0, 8)}
                    </p>
                    {n.profile && <p className="text-xs text-gray-400">{n.profile.role}</p>}
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 truncate">{n.body}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      n.is_read ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {n.is_read ? '✓ Lue' : '● Non lue'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('fr-CA', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
