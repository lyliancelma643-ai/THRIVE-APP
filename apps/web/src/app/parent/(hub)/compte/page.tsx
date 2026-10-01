'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, logout } from '@/stores/auth.store';
import { WebPushToggle } from '@/components/WebPushToggle';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin',
  COACH: 'Coach',
};

export default function ComptePage() {
  const { user, hydrate } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  const dirty =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '');

  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?';

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError('');
    setSavedAt(false);
    const { error: upErr } = await supabase.auth.updateUser({
      data: { firstName: firstName.trim(), lastName: lastName.trim() },
    });
    if (upErr) {
      setError(upErr.message ?? 'Enregistrement impossible');
      setSaving(false);
      return;
    }
    // Le nom affiché au coach et à l'équipe vient de la table profiles.
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ first_name: firstName.trim(), last_name: lastName.trim() })
        .eq('id', user.id);
    }
    // Rafraîchit le store pour propager le nouveau nom (avatar, en-têtes…)
    await hydrate();
    setSaving(false);
    setSavedAt(true);
    setTimeout(() => setSavedAt(false), 2500);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/parent/bilans"
        className="inline-flex items-center gap-1.5 min-h-[44px] mb-3 text-[15px] font-semibold text-soft hover:text-ink transition-colors select-none"
      >
        <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
        Bilan
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <span className="w-16 h-16 rounded-full bg-navy-600 ring-1 ring-line2 text-white flex items-center justify-center text-xl font-bold shrink-0">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-ink truncate">
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mon compte'}
          </h1>
          <p className="text-faint text-sm truncate">{user?.email}</p>
        </div>
      </div>

      {/* Informations du profil */}
      <section className="rounded-card bg-night-surface shadow-[var(--shadow)] p-5 md:p-6 mb-5">
        <h2 className="nc-eyebrow mb-4">
          Mon profil
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <label className="block">
            <span className="block text-xs font-medium text-soft mb-1.5">Prénom</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-chip border border-line2 text-ink placeholder-faint focus:border-sun/60 focus:outline-none transition-colors"
              placeholder="Prénom"
              autoComplete="given-name"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-soft mb-1.5">Nom</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-chip border border-line2 text-ink placeholder-faint focus:border-sun/60 focus:outline-none transition-colors"
              placeholder="Nom"
              autoComplete="family-name"
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-12 px-6 rounded-full bg-accent text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savedAt && (
            <span role="status" className="text-sm text-sage-ink font-medium">Enregistré</span>
          )}
          {error && <span role="alert" className="text-sm text-danger-ink">{error}</span>}
        </div>
      </section>

      {/* Détails du compte (lecture seule) */}
      <section className="rounded-card bg-night-surface shadow-[var(--shadow)] p-5 md:p-6 mb-5">
        <h2 className="nc-eyebrow mb-4">
          Compte
        </h2>
        <dl className="divide-y divide-line text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-soft">Adresse e-mail</dt>
            <dd className="font-medium text-ink truncate ml-4">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-soft">Type de compte</dt>
            <dd className="font-medium text-ink">
              {user?.role ? ROLE_LABELS[user.role] ?? user.role : '—'}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-faint mt-4 leading-relaxed">
          Pour changer d&apos;adresse e-mail, écris au support THRIVE depuis la messagerie.
        </p>
      </section>

      <PasswordSection />

      {/* Notifications push (PWA — invisible si non supporté/configuré) */}
      {user?.id && <WebPushToggle userId={user.id} />}

      <DataSection />

      {/* Déconnexion */}
      <section className="rounded-card border border-red-500/25 bg-red-500/[0.06] p-5 md:p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">Se déconnecter</h2>
        <p className="text-xs text-soft mb-4 leading-relaxed">
          Tu devras te reconnecter avec ton e-mail et ton mot de passe.
        </p>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full sm:w-auto h-12 px-6 rounded-full bg-red-500/15 border border-red-500/40 text-danger-ink text-sm font-bold hover:bg-red-500/25 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
        >
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </section>
    </div>
  );
}

const INPUT =
  'w-full h-12 px-4 rounded-xl bg-chip border border-line2 text-ink placeholder-faint focus:border-sun/60 focus:outline-none transition-colors';

// ── Mot de passe ─────────────────────────────────────────────────────────────
function PasswordSection() {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pwd.length < 8) return setMsg({ ok: false, text: 'Au moins 8 caractères.' });
    if (pwd !== confirm) return setMsg({ ok: false, text: 'Les deux mots de passe ne sont pas identiques.' });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      const m = error.message ?? '';
      setMsg({
        ok: false,
        text: /same|different/i.test(m)
          ? 'Choisis un mot de passe différent de l’actuel.'
          : /reauth|recent/i.test(m)
            ? 'Par sécurité, déconnecte-toi puis utilise « Mot de passe oublié ? » sur l’écran de connexion.'
            : /weak|short|least/i.test(m)
              ? 'Mot de passe trop faible : allonge-le ou mélange lettres et chiffres.'
              : 'Changement impossible pour le moment. Réessaie dans un instant.',
      });
      return;
    }
    setPwd('');
    setConfirm('');
    setMsg({ ok: true, text: 'Mot de passe changé.' });
  };

  return (
    <section className="rounded-card bg-night-surface shadow-[var(--shadow)] p-5 md:p-6 mb-5">
      <h2 className="nc-eyebrow mb-4">Mot de passe</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-soft mb-1.5">Nouveau mot de passe</span>
            <input type="password" autoComplete="new-password" minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-soft mb-1.5">Confirmer</span>
            <input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
          </label>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            disabled={busy || !pwd}
            className="h-12 px-6 rounded-full bg-chip border border-line2 text-ink text-sm font-bold hover:bg-surface-sub active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            {busy ? 'Changement…' : 'Changer le mot de passe'}
          </button>
          {msg && (
            <span role={msg.ok ? 'status' : 'alert'} className={`text-sm font-medium ${msg.ok ? 'text-sage-ink' : 'text-danger-ink'}`}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Mes données (Loi 25) : copie, suppression, politique ─────────────────────
function DataSection() {
  const { user } = useAuthStore();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pendingSince, setPendingSince] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');

  // Demande de suppression déjà en cours ?
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('deletion_requests')
      .select('requested_at')
      .eq('target_profile_id', user.id)
      .eq('status', 'PENDING')
      .maybeSingle()
      .then(({ data }) => setPendingSince((data?.requested_at as string | undefined) ?? null));
  }, [user?.id]);

  const exportData = async () => {
    setExporting(true);
    setExportMsg('');
    const { data, error } = await supabase.functions.invoke('export-my-data', { method: 'POST' });
    setExporting(false);
    if (error || !data) {
      setExportMsg('Téléchargement impossible pour le moment. Réessaie dans un instant.');
      return;
    }
    const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thrive-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setExportMsg('Ton fichier est téléchargé.');
  };

  const requestDeletion = async () => {
    setDeleting(true);
    setDeleteMsg('');
    const { data, error } = await supabase.functions.invoke('request-account-deletion', {
      body: { reason: reason.trim() || null },
    });
    setDeleting(false);
    if (error || data?.error) {
      setDeleteMsg('La demande n’a pas pu être envoyée. Réessaie, ou écris au support THRIVE.');
      return;
    }
    setPendingSince((data?.request?.requested_at as string | undefined) ?? new Date().toISOString());
    setAskDelete(false);
  };

  return (
    <section className="rounded-card bg-night-surface shadow-[var(--shadow)] p-5 md:p-6 mb-5">
      <h2 className="nc-eyebrow mb-2">Mes données</h2>
      <p className="text-sm text-soft leading-relaxed mb-4">
        Tes renseignements et ceux de ton enfant t&apos;appartiennent.{' '}
        <Link href="/confidentialite" className="font-semibold text-accent-ink underline">
          Notre politique de confidentialité
        </Link>
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-chip border border-line2 text-ink text-sm font-bold hover:bg-surface-sub transition-colors disabled:opacity-50"
        >
          <Icon name="download" className="w-4 h-4" />
          {exporting ? 'Préparation…' : 'Télécharger mes données'}
        </button>
        {exportMsg && <span role="status" className="text-sm text-soft">{exportMsg}</span>}
      </div>

      <div className="mt-6 pt-5 border-t border-line">
        {pendingSince ? (
          <p role="status" className="text-sm text-body leading-relaxed">
            <span className="font-semibold text-ink">Demande de suppression enregistrée</span> le{' '}
            {new Date(pendingSince).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}. L&apos;équipe
            THRIVE te confirme la suppression par email, au plus tard sous 30 jours.
          </p>
        ) : askDelete ? (
          <div>
            <p className="text-sm text-body leading-relaxed">
              Ton compte, celui de ta famille et les données de ton enfant seront supprimés par l&apos;équipe THRIVE. Le
              parcours en cours s&apos;arrête. Cette action est définitive.
            </p>
            <label className="block mt-4">
              <span className="block text-xs font-medium text-soft mb-1.5">Une raison ? (facultatif)</span>
              <textarea
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${INPUT} h-auto py-3 resize-none`}
              />
            </label>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={requestDeletion}
                disabled={deleting}
                className="h-12 px-6 rounded-full bg-red-500/15 border border-red-500/40 text-danger-ink text-sm font-bold hover:bg-red-500/25 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Envoi…' : 'Confirmer la suppression'}
              </button>
              <button
                type="button"
                onClick={() => setAskDelete(false)}
                className="h-12 px-6 rounded-full text-sm font-semibold text-soft hover:text-ink"
              >
                Annuler
              </button>
            </div>
            {deleteMsg && <p role="alert" className="mt-3 text-sm text-danger-ink">{deleteMsg}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAskDelete(true)}
            className="min-h-[44px] text-sm font-semibold text-danger-ink hover:underline"
          >
            Supprimer mon compte et mes données
          </button>
        )}
      </div>
    </section>
  );
}
