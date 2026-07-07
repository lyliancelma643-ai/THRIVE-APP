'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useModalDismiss } from '@/lib/useModalDismiss';

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
  COACH: { label: 'Coach', cls: 'bg-navy-100 text-navy-700' },
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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kkdcgzvdmipmrgkawnky.supabase.co';

export default function AdminUsersPage() {
  const { user, session } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [childrenCount, setChildrenCount] = useState(0);
  // Parents ayant au moins un enfant → verrouillés sur le rôle PARENT.
  const [parentsWithChildren, setParentsWithChildren] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Role | 'ALL'>('ALL');
  // Suppression DÉFINITIVE (Super Admin) : cible + confirmation par saisie de l'email
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Modifications de rôle / activation en attente, indexées par id de compte.
  const [edits, setEdits] = useState<Record<string, { role?: Role; isActive?: boolean }>>({});
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
    const [profilesRes, childrenRes, familiesRes, childRowsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('children').select('id', { count: 'exact', head: true }),
      supabase.from('families').select('id, parent_id'),
      supabase.from('children').select('family_id').eq('is_active', true),
    ]);
    setProfiles((profilesRes.data ?? []) as ProfileRow[]);
    setChildrenCount(childrenRes.count ?? 0);

    // Quels parents ont au moins un enfant (familles → enfants).
    const parentByFamily = new Map<string, string>();
    (familiesRes.data ?? []).forEach((f: { id: string; parent_id: string | null }) => {
      if (f.parent_id) parentByFamily.set(f.id, f.parent_id);
    });
    const withKids = new Set<string>();
    (childRowsRes.data ?? []).forEach((c: { family_id: string | null }) => {
      const pid = c.family_id ? parentByFamily.get(c.family_id) : undefined;
      if (pid) withKids.add(pid);
    });
    setParentsWithChildren(withKids);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime : tout nouveau compte apparaît instantanément
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, () => load())
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

  // ── Modifications en attente (appliquées via « Enregistrer ») ───────────
  const stageRole = (p: ProfileRow, role: Role) => {
    if (!isSuperAdmin) return;
    // Règle métier : un parent avec enfant(s) ne peut pas devenir COACH/ADMIN.
    if (parentsWithChildren.has(p.id) && role !== 'PARENT') {
      flash('err', `${p.first_name} a des enfants : ce compte doit rester Parent.`);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      const entry = { ...next[p.id] };
      if (role === p.role) delete entry.role;
      else entry.role = role;
      if (entry.role === undefined && entry.isActive === undefined) delete next[p.id];
      else next[p.id] = entry;
      return next;
    });
  };

  const stageActive = (p: ProfileRow) => {
    setEdits((prev) => {
      const next = { ...prev };
      const entry = { ...next[p.id] };
      const current = entry.isActive ?? p.is_active;
      const target = !current;
      if (target === p.is_active) delete entry.isActive;
      else entry.isActive = target;
      if (entry.role === undefined && entry.isActive === undefined) delete next[p.id];
      else next[p.id] = entry;
      return next;
    });
  };

  // Liste des changements réels (champ par champ) à envoyer à l'edge function.
  const pending = useMemo(() => {
    const list: { id: string; name: string; role?: Role; isActive?: boolean }[] = [];
    for (const p of profiles) {
      const e = edits[p.id];
      if (!e) continue;
      const change: { id: string; name: string; role?: Role; isActive?: boolean } = {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`.trim() || p.email,
      };
      let dirty = false;
      // On n'envoie jamais une promotion devenue invalide (parent avec enfants) :
      // l'edge function la refuserait, et le compteur resterait faux.
      const lockedToParent = parentsWithChildren.has(p.id);
      if (
        e.role !== undefined &&
        e.role !== p.role &&
        !(lockedToParent && e.role !== 'PARENT')
      ) {
        change.role = e.role;
        dirty = true;
      }
      if (e.isActive !== undefined && e.isActive !== p.is_active) { change.isActive = e.isActive; dirty = true; }
      if (dirty) list.push(change);
    }
    return list;
  }, [profiles, edits, parentsWithChildren]);

  const discardAll = () => setEdits({});

  const saveAll = async () => {
    if (pending.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-update-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          changes: pending.map(({ id, role, isActive }) => ({ id, role, isActive })),
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(data?.error ?? 'Synchronisation impossible');
      }
      const applied = data.applied ?? 0;
      const failed = data.failed ?? 0;
      if (failed > 0) {
        const firstErr = (data.results ?? []).find((r: { ok: boolean; error?: string }) => !r.ok)?.error;
        flash('err', `${applied} appliquée(s), ${failed} en échec${firstErr ? ` — ${firstErr}` : ''}.`);
      } else {
        flash('ok', `${applied} modification(s) synchronisée(s) ✓ — les nouveaux accès sont actifs.`);
      }
      setEdits({});
      await load();
    } catch (err: any) {
      flash('err', err?.message ?? 'Erreur lors de la synchronisation');
    } finally {
      setSaving(false);
    }
  };

  // Suppression définitive via l'edge function admin-delete-user (Super Admin).
  // Libère l'adresse mail : la personne pourra recréer un compte ensuite.
  const deleteAccount = async () => {
    if (!deleteTarget || !session?.accessToken) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? 'Erreur inattendue');
      setDeleteTarget(null);
      setDeleteConfirm('');
      await load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur inattendue');
    }
    setDeleting(false);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-create-user`,
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
            className="px-4 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700"
          >
            + Créer un compte
          </button>
        </div>
      </div>
      <p className="text-gray-500 mb-6">
        {profiles.length} comptes · {childrenCount} profils enfants — les changements de rôle et
        d&apos;activation sont mis en attente, puis appliqués d&apos;un clic sur « Enregistrer ».
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
                filter === f.value ? 'bg-navy-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
                const e = edits[p.id];
                const effRole = (e?.role ?? p.role) as Role;
                const effActive = e?.isActive ?? p.is_active;
                const roleDirty = e?.role !== undefined && e.role !== p.role;
                const activeDirty = e?.isActive !== undefined && e.isActive !== p.is_active;
                const rowDirty = roleDirty || activeDirty;
                const meta = ROLE_META[effRole] ?? ROLE_META.PARENT;
                const isSelf = p.id === user?.id;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-50 last:border-0 ${rowDirty ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-5 py-3 font-medium">
                      {p.first_name} {p.last_name}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                      {rowDirty && (
                        <span className="ml-2 align-middle text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          ● modifié
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.email}</td>
                    <td className="px-5 py-3">
                      {isSuperAdmin && !isSelf && p.role !== 'SUPER_ADMIN' && !parentsWithChildren.has(p.id) ? (
                        <select
                          value={effRole}
                          disabled={saving}
                          onChange={(ev) => stageRole(p, ev.target.value as Role)}
                          className={`rounded-full px-2 py-1 text-xs font-semibold border-0 ${meta.cls} ${
                            roleDirty ? 'ring-2 ring-amber-400' : ''
                          }`}
                        >
                          {(['PARENT', 'COACH', 'ADMIN'] as Role[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}
                          title={
                            parentsWithChildren.has(p.id)
                              ? 'Ce parent a des enfants : rôle verrouillé sur Parent.'
                              : undefined
                          }
                        >
                          {meta.label}
                          {parentsWithChildren.has(p.id) && p.role !== 'SUPER_ADMIN' && (
                            <span aria-hidden>🔒</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          effActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        } ${activeDirty ? 'ring-2 ring-amber-400' : ''}`}
                      >
                        {effActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && p.role !== 'SUPER_ADMIN' && (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => stageActive(p)}
                            disabled={saving}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
                              effActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {effActive ? 'Désactiver' : 'Réactiver'}
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => { setDeleteTarget(p); setDeleteConfirm(''); setDeleteError(null); }}
                              disabled={saving || deleting}
                              title="Suppression définitive (libère l'adresse mail)"
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Supprimer
                            </button>
                          )}
                        </span>
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
                        ? 'border-black bg-navy-600 text-white'
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
              className="w-full py-3 rounded-xl bg-navy-600 text-white font-semibold disabled:opacity-50">
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
              className="w-full py-3 rounded-xl bg-navy-600 text-white font-semibold disabled:opacity-50">
              {creating ? 'Création…' : "Créer l'enfant"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              L&apos;enfant apparaît immédiatement chez le parent et dans « Assignations ».
            </p>
          </form>
        </Modal>
      )}

      {/* ── Modale : suppression DÉFINITIVE d'un compte (Super Admin) ── */}
      {deleteTarget && (
        <Modal title="Suppression définitive" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <p className="font-bold mb-1">⚠ Action irréversible</p>
              <p>
                Le compte <span className="font-semibold">{deleteTarget.email}</span> (
                {ROLE_META[deleteTarget.role].label}) et TOUTES ses données liées
                (famille, enfants, bilans, messages…) seront définitivement supprimés.
                L&apos;adresse mail sera libérée : la personne pourra recréer un compte ensuite.
              </p>
            </div>
            <label className="block text-sm text-gray-600">
              Pour confirmer, tape l&apos;adresse mail exacte :
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget.email}
                autoFocus
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </label>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || deleteConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase()}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Barre flottante : enregistrer les modifications ── */}
      {pending.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{pending.length}</span> modification
            {pending.length > 1 ? 's' : ''} en attente
          </span>
          <button
            onClick={discardAll}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Synchronisation…' : `Enregistrer (${pending.length})`}
          </button>
        </div>
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
  // Sorties : clic sur le fond, bouton ✕, touche Échap (+ verrou du scroll)
  useModalDismiss(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xl transition-colors"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
