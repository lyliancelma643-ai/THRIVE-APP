'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore, logout } from '@/stores/auth.store';
import { WebPushToggle } from '@/components/WebPushToggle';
import { humanAuthError } from '@/lib/auth-errors';
import {
  downloadMyData,
  fetchPendingDeletion,
  requestAccountDeletion,
  sendPasswordChangeLink,
  type DeletionRequest,
} from '@/lib/account';
import { formatDateFr } from '@/lib/billing';

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
    '👤';

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError('');
    setSavedAt(false);
    const { error: upErr } = await supabase.auth.updateUser({
      data: { firstName: firstName.trim(), lastName: lastName.trim() },
    });
    if (upErr) {
      setError(humanAuthError(upErr));
      setSaving(false);
      return;
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
            <span className="text-sm text-sage-ink font-medium">✓ Enregistré</span>
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
        <PasswordChange email={user?.email ?? ''} />
        <p className="text-xs text-faint mt-4 leading-relaxed">
          Pour changer d&apos;adresse e-mail, écris au support THRIVE depuis la{' '}
          <Link href="/parent/messages" className="font-semibold text-soft underline underline-offset-2">
            messagerie
          </Link>
          .
        </p>
      </section>

      {/* Notifications push (PWA — invisible si non supporté/configuré) */}
      {user?.id && <WebPushToggle userId={user.id} />}

      {user?.id && <MyData userId={user.id} email={user.email ?? ''} />}

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

// ── Mot de passe : lien envoyé à sa propre adresse ──────────────────────────
function PasswordChange({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const send = async () => {
    if (!email) return;
    setError('');
    setState('sending');
    try {
      await sendPasswordChangeLink(email);
      setState('sent');
    } catch (e) {
      setError(humanAuthError(e));
      setState('idle');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-line">
      {state === 'sent' ? (
        <p role="status" className="text-sm text-sage-ink font-medium leading-relaxed">
          ✓ Lien envoyé à {email}. Ouvre-le pour choisir ton nouveau mot de passe.
        </p>
      ) : (
        <button
          onClick={send}
          disabled={state === 'sending' || !email}
          className="h-12 px-6 rounded-full border border-line2 text-sm font-semibold text-ink hover:bg-chip active:scale-95 transition-all disabled:opacity-60"
        >
          {state === 'sending' ? 'Envoi du lien…' : 'Changer mon mot de passe'}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-danger-ink mt-2">{error}</p>}
    </div>
  );
}

// ── Mes données : export + suppression du compte ───────────────────────────
function MyData({ userId, email }: { userId: string; email: string }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [pending, setPending] = useState<DeletionRequest | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPendingDeletion(userId)
      .then((r) => alive && setPending(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const doExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      await downloadMyData();
    } catch {
      setExportError('L’export n’a pas pu être préparé. Vérifie ta connexion et réessaie.');
    } finally {
      setExporting(false);
    }
  };

  const doDelete = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      setPending(await requestAccountDeletion(reason));
      setConfirming(false);
    } catch {
      setDeleteError('La demande n’a pas pu être envoyée. Vérifie ta connexion et réessaie.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-card bg-night-surface shadow-[var(--shadow)] p-5 md:p-6 mb-5">
      <h2 className="nc-eyebrow mb-4">Mes données</h2>

      <p className="text-sm text-soft leading-relaxed">
        Télécharge une copie de tes données et de celles de ta famille (profil, enfants, séances,
        bilans, messages) au format JSON.
      </p>
      <button
        onClick={doExport}
        disabled={exporting}
        className="mt-3 h-12 px-6 rounded-full border border-line2 text-sm font-semibold text-ink hover:bg-chip active:scale-95 transition-all disabled:opacity-60"
      >
        {exporting ? 'Préparation…' : 'Télécharger mes données'}
      </button>
      {exportError && <p role="alert" className="text-sm text-danger-ink mt-2">{exportError}</p>}

      <div className="mt-6 pt-5 border-t border-line">
        <h3 className="text-sm font-semibold text-ink mb-1">Supprimer mon compte</h3>
        {pending ? (
          <p role="status" className="text-sm text-body leading-relaxed">
            Ta demande de suppression du {formatDateFr(pending.requested_at)} est enregistrée.
            L&apos;équipe THRIVE supprime ton compte et les données de ta famille, puis te le
            confirme à {email}.
          </p>
        ) : !confirming ? (
          <>
            <p className="text-xs text-soft leading-relaxed mb-3">
              Ton compte, les profils de tes enfants, leurs bilans et vos messages seront
              définitivement effacés.
            </p>
            <button
              onClick={() => setConfirming(true)}
              className="h-12 px-6 rounded-full border border-red-500/40 text-danger-ink text-sm font-bold hover:bg-red-500/10 active:scale-95 transition-all"
            >
              Supprimer mon compte…
            </button>
          </>
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4">
            <p className="text-sm text-body leading-relaxed">
              Cette action est <strong>définitive</strong>. Un abonnement Maison pris sur le web
              est arrêté avec le compte ; un abonnement pris sur iPhone ou Android s&apos;annule
              depuis les réglages du téléphone.
            </p>
            <label className="block mt-3">
              <span className="block text-xs font-medium text-soft mb-1.5">
                Pourquoi pars-tu ? (facultatif)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl bg-chip border border-line2 text-ink text-base placeholder-faint focus:border-sun/60 focus:outline-none transition-colors"
              />
            </label>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="h-12 px-6 rounded-full bg-red-500/15 border border-red-500/40 text-danger-ink text-sm font-bold hover:bg-red-500/25 active:scale-95 transition-all disabled:opacity-60"
              >
                {deleting ? 'Envoi…' : 'Confirmer la suppression'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="h-12 px-6 rounded-full border border-line2 text-sm font-semibold text-soft hover:bg-chip transition-all"
              >
                Annuler
              </button>
            </div>
            {deleteError && <p role="alert" className="text-sm text-danger-ink mt-2">{deleteError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
