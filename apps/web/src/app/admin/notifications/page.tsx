'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Centre de notifications administrateur — trois onglets :
//   · Mes alertes  : tout ce qui s'est passé dans l'app (tâche terminée,
//     message, mention, inscription, abonnement…), cliquable jusqu'à la page
//     concernée, avec filtres par famille et « tout marquer lu ».
//   · Réglages     : interrupteur général, cases par famille d'évènements,
//     push sur cet appareil, notification de test.
//   · Envoyer      : message manuel à un utilisateur ou à toute l'équipe admin.
//
// La distribution est faite EN BASE (migration 060) : chaque admin/super admin
// actif reçoit sa propre ligne, filtrée par ses préférences, et le Web Push
// suit automatiquement (trigger de la migration 047).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AdminPushToggle } from '@/components/admin/AdminPushToggle';
import {
  ALL_CATEGORIES,
  DEFAULT_PREFS,
  NOTIF_CATEGORIES,
  adminNotifTarget,
  deleteNotification,
  fetchNotifPrefs,
  notifCategory,
  notifEmoji,
  saveNotifPrefs,
  sendManualNotification,
  sendTestNotification,
  timeAgo,
  type Notif,
  type NotifCategory,
  type NotifPrefs,
} from '@/lib/notifications';

type Tab = 'inbox' | 'settings' | 'send';
type Filter = 'all' | 'unread' | NotifCategory;

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const me = user?.id;
  const notifications = useAdminNotifications(me, 100, 'page');
  const { items, unread, loading, markRead, markAllRead, refresh } = notifications;

  const [tab, setTab] = useState<Tab>('inbox');
  const [filter, setFilter] = useState<Filter>('all');

  // ── Réglages ───────────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!me) return;
    fetchNotifPrefs(me).then((p) => {
      setPrefs(p);
      setPrefsLoaded(true);
    });
  }, [me]);

  const persist = useCallback(
    async (next: NotifPrefs) => {
      if (!me) return;
      setPrefs(next);
      setSavingPrefs(true);
      const err = await saveNotifPrefs(me, next);
      setSavingPrefs(false);
      setPrefsMsg(err
        ? { kind: 'error', text: `Enregistrement impossible : ${err}` }
        : { kind: 'ok', text: 'Préférences enregistrées.' });
    },
    [me],
  );

  const toggleCategory = (key: NotifCategory) => {
    const has = prefs.categories.includes(key);
    persist({
      ...prefs,
      categories: has
        ? prefs.categories.filter((c) => c !== key)
        : ALL_CATEGORIES.filter((c) => c === key || prefs.categories.includes(c)),
    });
  };

  const [testMsg, setTestMsg] = useState<string | null>(null);
  const runTest = async () => {
    const err = await sendTestNotification();
    setTestMsg(err ? `Échec : ${err}` : 'Test envoyé — la cloche doit s’allumer tout de suite.');
    if (!err) await refresh();
  };

  // ── Envoi manuel ───────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<{ id: string; first_name: string; last_name: string; role: string }[]>([]);
  const [form, setForm] = useState({
    audience: 'USER' as 'USER' | 'ADMINS' | 'SUPER_ADMINS',
    user_id: '', title: '', body: '', path: '',
  });
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (tab !== 'send' || profiles.length) return;
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .order('first_name')
      .then(({ data }) => setProfiles((data ?? []) as typeof profiles));
  }, [tab, profiles.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !form.title.trim()) return;
    const path = form.path.trim();
    if (path && !path.startsWith('/')) {
      setSendMsg({ kind: 'error', text: 'Le lien doit être un chemin interne commençant par « / » (ex. /parent/bilans).' });
      return;
    }
    if (form.audience === 'USER' && !form.user_id) {
      setSendMsg({ kind: 'error', text: 'Choisissez un destinataire.' });
      return;
    }
    setSending(true);
    const err = await sendManualNotification({
      title: form.title.trim(),
      body: form.body.trim() || undefined,
      userId: form.audience === 'USER' ? form.user_id : undefined,
      path: path || undefined,
      audience: form.audience,
    });
    setSending(false);
    if (err) {
      setSendMsg({ kind: 'error', text: `Envoi impossible : ${err}` });
      return;
    }
    setForm({ audience: form.audience, user_id: '', title: '', body: '', path: '' });
    setSendMsg({ kind: 'ok', text: 'Notification envoyée.' });
    await refresh();
  };

  // ── Liste filtrée ──────────────────────────────────────────────────────────
  const filtered = items.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return notifCategory(n) === filter;
  });

  const openNotif = async (n: Notif) => {
    if (!n.is_read) await markRead([n.id]);
    router.push(adminNotifTarget(n));
  };

  const tabCls = (t: Tab) =>
    `px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
      tab === t ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">🔔 Notifications</h1>
          <p className="text-gray-500 mt-1">
            Tout ce qui se passe dans THRIVE, pour vous et pour l’équipe d’administration.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllRead()}
            className="bg-navy-600 hover:bg-navy-700 text-white rounded-xl px-5 py-3 min-h-[44px] font-semibold transition-colors cursor-pointer"
          >
            Tout marquer lu ({unread})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button className={tabCls('inbox')} onClick={() => setTab('inbox')}>Mes alertes</button>
        <button className={tabCls('settings')} onClick={() => setTab('settings')}>Réglages</button>
        <button className={tabCls('send')} onClick={() => setTab('send')}>Envoyer</button>
      </div>

      {/* ── Mes alertes ─────────────────────────────────────────────────────── */}
      {tab === 'inbox' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { key: 'all' as Filter, label: 'Toutes' },
              { key: 'unread' as Filter, label: `Non lues${unread ? ` (${unread})` : ''}` },
              ...NOTIF_CATEGORIES.map((c) => ({ key: c.key as Filter, label: `${c.emoji} ${c.label}` })),
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  filter === f.key ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <p className="text-gray-400 p-6">Chargement…</p>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-3xl mb-3">🔔</p>
                <p className="text-gray-500">
                  {filter === 'all'
                    ? 'Aucune notification pour le moment.'
                    : 'Rien dans ce filtre.'}
                </p>
              </div>
            ) : (
              <ul>
                {filtered.map((n) => (
                  <li key={n.id} className={`border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-yellow-50/40' : ''}`}>
                    <div className="flex items-start gap-3 px-4 sm:px-6 py-4">
                      <button
                        onClick={() => openNotif(n)}
                        className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <span className="text-lg leading-6 shrink-0" aria-hidden>{notifEmoji(n)}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-navy-900">{n.title}</span>
                          {n.body && <span className="block text-xs text-gray-500 mt-0.5">{n.body}</span>}
                          <span className="block text-[11px] text-gray-400 mt-1">
                            {timeAgo(n.created_at)} · {NOTIF_CATEGORIES.find((c) => c.key === notifCategory(n))?.label}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.is_read && (
                          <button
                            onClick={() => markRead([n.id])}
                            className="text-[11px] font-semibold text-navy-600 hover:text-navy-800 cursor-pointer"
                          >
                            Marquer lu
                          </button>
                        )}
                        <button
                          onClick={async () => { await deleteNotification(n.id); await refresh(); }}
                          aria-label="Supprimer la notification"
                          className="text-gray-300 hover:text-red-500 text-lg leading-none px-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── Réglages ────────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 max-w-2xl">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-navy-900">Recevoir les notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Interrupteur général : coupé, plus aucune alerte administrateur ne vous est envoyée
                (ni cloche, ni push).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.enabled}
              aria-label="Recevoir les notifications administrateur"
              disabled={!prefsLoaded}
              onClick={() => persist({ ...prefs, enabled: !prefs.enabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 cursor-pointer ${
                prefs.enabled ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                prefs.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <fieldset disabled={!prefs.enabled || !prefsLoaded} className="py-5 border-b border-gray-100 disabled:opacity-50">
            <legend className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
              Ce que je veux recevoir
            </legend>
            <ul className="space-y-2.5">
              {NOTIF_CATEGORIES.map((c) => (
                <li key={c.key}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 accent-navy-600 cursor-pointer"
                      checked={prefs.categories.includes(c.key)}
                      onChange={() => toggleCategory(c.key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-navy-900">{c.emoji} {c.label}</span>
                      <span className="block text-xs text-gray-500">{c.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <label className="flex items-start gap-3 mt-5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-navy-600 cursor-pointer"
                checked={prefs.includeSelf}
                onChange={() => persist({ ...prefs, includeSelf: !prefs.includeSelf })}
              />
              <span>
                <span className="block text-sm font-medium text-navy-900">M’avertir aussi de mes propres actions</span>
                <span className="block text-xs text-gray-500">
                  Par défaut, ce que vous faites vous-même ne vous notifie pas.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="py-5 border-b border-gray-100">
            {me && <AdminPushToggle userId={me} />}
          </div>

          <div className="pt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={runTest}
              className="bg-navy-600 hover:bg-navy-700 text-white rounded-xl px-5 py-3 min-h-[44px] text-sm font-semibold transition-colors cursor-pointer"
            >
              Envoyer un test
            </button>
            {savingPrefs && <span className="text-xs text-gray-400">Enregistrement…</span>}
            {testMsg && <span className="text-xs text-gray-500">{testMsg}</span>}
          </div>

          {prefsMsg && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                prefsMsg.kind === 'ok'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                  : 'bg-red-50 border border-red-100 text-red-700'
              }`}
            >
              {prefsMsg.text}
            </p>
          )}
        </div>
      )}

      {/* ── Envoi manuel ────────────────────────────────────────────────────── */}
      {tab === 'send' && (
        <form onSubmit={handleSend} className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-navy-900 mb-1">Envoyer une notification</h2>
          <p className="text-sm text-gray-500 mb-5">
            Elle arrive dans la cloche du destinataire et, s’il a activé le push, sur son téléphone.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block" htmlFor="audience">Destinataires</label>
              <select
                id="audience"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as typeof form.audience })}
              >
                <option value="USER">Un utilisateur</option>
                <option value="ADMINS">Toute l’équipe admin</option>
                <option value="SUPER_ADMINS">Les super admins</option>
              </select>
            </div>

            {form.audience === 'USER' && (
              <div>
                <label className="text-sm text-gray-500 mb-1 block" htmlFor="recipient">Utilisateur</label>
                <select
                  id="recipient"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                >
                  <option value="">Sélectionner…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} — {p.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-500 mb-1 block" htmlFor="notif-title">Titre</label>
              <input
                id="notif-title"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre de la notification"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block" htmlFor="notif-body">Message</label>
              <input
                id="notif-body"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Contenu optionnel"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-500 mb-1 block" htmlFor="notif-path">Lien au clic (optionnel)</label>
              <input
                id="notif-path"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="/admin/roadmap, /parent/bilans, …"
              />
            </div>
          </div>

          {sendMsg && (
            <p
              role="alert"
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                sendMsg.kind === 'ok'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                  : 'bg-red-50 border border-red-100 text-red-700'
              }`}
            >
              {sendMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !form.title.trim()}
            className="mt-5 bg-navy-600 hover:bg-navy-700 text-white rounded-xl px-6 py-3 min-h-[44px] font-semibold disabled:opacity-50 transition-colors cursor-pointer"
          >
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      )}
    </div>
  );
}
