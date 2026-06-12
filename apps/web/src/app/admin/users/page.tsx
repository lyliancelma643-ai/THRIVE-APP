'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COACH' | 'PARENT' | 'CHILD';

type ProfileRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
};

type ParentOption = { id: string; email: string; name: string };

const ROLE_META: Record<Role, { label: string; cls: string }> = {
  SUPER_ADMIN: { label: 'Super admin', cls: 'bg-purple-100 text-purple-700' },
  ADMIN: { label: 'Admin', cls: 'bg-indigo-100 text-indigo-700' },
  COACH: { label: 'Coach', cls: 'bg-blue-100 text-blue-700' },
  PARENT: { label: 'Parent', cls: 'bg-emerald-100 text-emerald-700' },
  CHILD: { label: 'Enfant', cls: 'bg-amber-100 text-amber-700' },
};

const FILTERS: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'SUPER_ADMIN', label: 'Super admins' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'COACH', label: 'Coaches' },
  { value: 'PARENT', label: 'Parents' },
  { value: 'CHILD', label: 'Enfants' },
];

export default function AdminUsersPage() {
  const { user, session } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [childrenCount, setChildrenCount] = useState(0);
  const [filter, setFilter] = useState<Role | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modale création de compte
  const [showCreate, setShowCreate] = useState(false);
  const [createRole, setCreateRole] = useState<'PARENT' | 'COACH' | 'ADMIN'>('PARENT');
  const [accountForm, setAccountForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', speciality: '',
  });
  const [creating, setCreating] = useState(false);

  // Modale création d'enfant
  const [showChild, setShowChild] = useState(false);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [childForm, setChildForm] = useState({
    parentId: '', firstName: '', lastName: '', age: '', gender: '', sport: 'Hockey',
  });

  const load = useCallback(async () => {
    const [profilesRes, childrenRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('children').select('id', { count: 'exact', head: true }),
    ]);
    setProfiles((profilesRes.data ?? []) as ProfileRow[]);
    setChildrenCount(childrenRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime : tout nouveau compte apparaît instantanément
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(
    () =>
      profiles.filter(
        (p) =>
          (filter === 'ALL' || p.role === filter) &&
          (!search ||
            `${p.first_name} ${p.last_name} ${p.email}`
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [profiles, filter, search]
  );

  const flash = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const toggleActive = async (p: ProfileRow) => {
    setBusyId(p.id);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !p.is_active })
      .eq('id', p.id);
    if (error) flash('err', error.message);
    else flash('ok', `${p.first_name} ${p.is_active ? 'désactivé' : 'activé'}.`);
    await load();
    setBusyId(null);
  };

  const changeRole = async (p: ProfileRow, role: Role) => {
    if (!isSuperAdmin) return;
    setBusyId(p.id);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id);
    if (error) flash('err', error.message);
    else flash('ok', `${p.first_name} est maintenant ${ROLE_META[role].label}.`);
    await load();
    setBusyId(null);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ircpewhmmcpghucnywis.supabase.co'}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            email: accountForm.email,
            password: accountForm.password,
            firstName: accountForm.firstName,
            lastName: accountForm.lastName,
            role: createRole,
            phone: accountForm.phone || undefined,
            speciality: createRole === 'COACH' ? accountForm.speciality || undefined : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Création impossible');
      flash('ok', `Compte ${ROLE_META[createRole].label} créé : ${data.profile.email} ✓`);
      setShowCreate(false);
      setAccountForm({ firstName: '', lastName: '', email: '', password: '', phone: '', speciality: '' });
      await load();
    } catch (err: any) {
      flash('err', err?.message ?? 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const openChildModal = async () => {
    setShowChild(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'PARENT')
      .eq('is_active', true)
      .order('first_name');
    setParents(
      (data ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        name: `${p.first_name} ${p.last_name}`.trim() || p.email,
      }))
    );
  };

  const createChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { parentId, firstName, lastName, age, gender, sport } = childForm;
      if (!parentId || !firstName || !age) throw new Error('Parent, prénom et âge sont requis.');

      // Famille du parent (créée si absente)
      let { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_id', parentId)
        .maybeSingle();

      if (!family) {
        const parent = parents.find((p) => p.id === parentId);
        const { data: newFam, error: famErr } = await supabase
          .from('families')
          .insert({ name: `Famille ${parent?.name ?? ''}`.trim(), parent_id: parentId })
          .select('id')
          .single();
        if (famErr) throw famErr;
        family = newFam;
      }

      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - Number(age));

      const { error: childErr } = await supabase.from('children').insert({
        family_id: family!.id,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        date_of_birth: dob.toISOString().split('T')[0],
        gender: gender || null,
        sport: sport || null,
        is_active: true,
      });
      if (childErr) throw childErr;

      flash('ok', `Profil enfant « ${firstName} » créé et rattaché à sa famille ✓`);
      setShowChild(false);
      setChildForm({ parentId: '', firstName: '', lastName: '', age: '', gender: '', sport: 'Hockey' });
      await load();
    } catch (err: any) {
      flash('err', err?.message ?? 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold">Comptes 👤</h1>
        <div className="flex gap-2">
          <button
            onClick={openChildModal}
            className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200"
          >
            + Créer un enfant
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800"
          >
            + Créer un compte
          </button>
        </div>
      </div>
      <p className="text-gray-500 mb-6">
        {profiles.length} comptes · {childrenCount} profils enfants — tout se synchronise en
        temps réel, sans validation manuelle.
      </p>

      {notice && (
        <p
          className={`mb-4 p-3 rounded-xl text-sm ${
            notice.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === f.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Rechercher nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-64"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Rôle</th>
                <th className="px-5 py-3 font-medium">Créé le</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = ROLE_META[p.role] ?? ROLE_META.PARENT;
                const isSelf = p.id === user?.id;
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium">
                      {p.first_name} {p.last_name}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.email}</td>
                    <td className="px-5 py-3">
                      {isSuperAdmin && !isSelf && p.role !== 'SUPER_ADMIN' ? (
                        <select
                          value={p.role}
                          disabled={busyId === p.id}
                          onChange={(e) => changeRole(p, e.target.value as Role)}
                          className={`rounded-full px-2 py-1 text-xs font-semibold border-0 ${meta.cls}`}
                        >
                          {(['PARENT', 'COACH', 'ADMIN'] as Role[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                          {meta.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && p.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={busyId === p.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                            p.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {p.is_active ? 'Désactiver' : 'Réactiver'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-gray-400 text-sm">Aucun compte trouvé.</p>
          )}
        </div>
      )}

      {/* ── Modale : créer un compte ── */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Créer un compte">
          <form onSubmit={createAccount} className="space-y-4">
            <div className="flex gap-2">
              {(['PARENT', 'COACH', ...(isSuperAdmin ? (['ADMIN'] as const) : [])] as const).map(
                (r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setCreateRole(r)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 ${
                      createRole === r
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {ROLE_META[r].label}
                  </button>
                )
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Prénom" className="input-admin" value={accountForm.firstName}
                onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })} />
              <input required placeholder="Nom" className="input-admin" value={accountForm.lastName}
                onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })} />
            </div>
            <input required type="email" placeholder="Email" className="input-admin" value={accountForm.email}
              onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
            <input required type="text" minLength={8} placeholder="Mot de passe (min. 8 caractères)"
              className="input-admin" value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} />
            <input placeholder="Téléphone (optionnel)" className="input-admin" value={accountForm.phone}
              onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} />
            {createRole === 'COACH' && (
              <input placeholder="Spécialité (ex. Hockey)" className="input-admin" value={accountForm.speciality}
                onChange={(e) => setAccountForm({ ...accountForm, speciality: e.target.value })} />
            )}
            <button type="submit" disabled={creating}
              className="w-full py-3 rounded-xl bg-black text-white font-semibold disabled:opacity-50">
              {creating ? 'Création…' : `Créer le compte ${ROLE_META[createRole].label}`}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Compte actif immédiatement, aucun email de validation requis.
            </p>
          </form>
        </Modal>
      )}

      {/* ── Modale : créer un enfant ── */}
      {showChild && (
        <Modal onClose={() => setShowChild(false)} title="Créer un profil enfant">
          <form onSubmit={createChild} className="space-y-4">
            <select required className="input-admin" value={childForm.parentId}
              onChange={(e) => setChildForm({ ...childForm, parentId: e.target.value })}>
              <option value="">— Rattacher au parent… —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Prénom" className="input-admin" value={childForm.firstName}
                onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })} />
              <input placeholder="Nom (optionnel)" className="input-admin" value={childForm.lastName}
                onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input required type="number" min={4} max={17} placeholder="Âge" className="input-admin"
                value={childForm.age}
                onChange={(e) => setChildForm({ ...childForm, age: e.target.value })} />
              <select className="input-admin" value={childForm.gender}
                onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}>
                <option value="">Genre…</option>
                <option value="MALE">Garçon</option>
                <option value="FEMALE">Fille</option>
                <option value="PREFER_NOT_TO_SAY">Préfère ne pas dire</option>
              </select>
              <input placeholder="Sport" className="input-admin" value={childForm.sport}
                onChange={(e) => setChildForm({ ...childForm, sport: e.target.value })} />
            </div>
            <button type="submit" disabled={creating}
              className="w-full py-3 rounded-xl bg-black text-white font-semibold disabled:opacity-50">
              {creating ? 'Création…' : "Créer l'enfant"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              L&apos;enfant apparaît immédiatement chez le parent et dans « Assignations ».
            </p>
          </form>
        </Modal>
      )}

      <style jsx global>{`
        .input-admin {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.65rem 0.9rem;
          font-size: 0.875rem;
          background: #fff;
        }
        .input-admin:focus {
          outline: 2px solid #000;
          outline-offset: 0;
        }
      `}</style>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
