'use client';

import { useRef, useState } from 'react';
import { useModalDismiss } from '@/lib/useModalDismiss';
import {
  PROGRAM_PACK_LABELS,
  PROGRAM_PACK_ORDER,
  type ProgramMode,
  type ProgramPack,
} from '@/lib/program-packs';
import { createAdminProgramLink, ProgramCheckoutError } from '@/lib/program-checkout';

// « Envoyer le lien de paiement » (fiche parent, ADMIN / SUPER_ADMIN) : crée une session
// Stripe Checkout POUR le parent (edge function admin-create-program-link). Aucun courriel
// n'est envoyé : l'admin copie le lien. Le montant est décidé par le serveur.

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10';
const btn = 'rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function ProgramPaymentLinkModal({
  parentId,
  parentName,
  onClose,
}: {
  parentId: string;
  parentName: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pack, setPack] = useState<ProgramPack>('GROUPE');
  const [mode, setMode] = useState<ProgramMode>('deux_versements');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expires_at: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useModalDismiss(() => { if (!busy) onClose(); }, true, true, ref);

  const create = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      setLink(await createAdminProgramLink(parentId, pack, mode));
    } catch (e) {
      setLink(null);
      setError(e instanceof ProgramCheckoutError ? e.message : 'Le lien n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setError('Copie impossible : sélectionne le lien et copie-le à la main.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-link-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="program-link-title" className="text-lg font-bold">Lien de paiement</h2>
            <p className="text-xs text-gray-600 mt-1">Pour {parentName}. Le montant est décidé par le serveur.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Fermer" className="text-gray-500 hover:text-gray-800 text-xl leading-none px-2">
            ×
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</p>}

        <div className="mt-4 grid grid-cols-1 gap-2">
          <label className="text-xs text-gray-600">Programme
            <select value={pack} onChange={(e) => setPack(e.target.value as ProgramPack)} className={input}>
              {PROGRAM_PACK_ORDER.map((p) => (
                <option key={p} value={p}>{PROGRAM_PACK_LABELS[p]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">Paiement
            <select value={mode} onChange={(e) => setMode(e.target.value as ProgramMode)} className={input}>
              <option value="deux_versements">En 2 versements (inscription et séance 7)</option>
              <option value="une_fois">En une fois</option>
            </select>
          </label>
        </div>

        <button
          onClick={create}
          disabled={busy}
          className={`${btn} mt-4 w-full bg-navy-600 text-white hover:bg-navy-700`}
        >
          {busy ? 'Création…' : link ? 'Créer un nouveau lien' : 'Créer le lien'}
        </button>

        {link && (
          <div className="mt-4 rounded-xl border border-gray-100 p-3">
            <input readOnly aria-label="Lien de paiement" value={link.url} onFocus={(e) => e.currentTarget.select()} className={input} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                {link.expires_at
                  ? `Expire le ${new Date(link.expires_at).toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' })}`
                  : 'Date d’expiration inconnue'}
              </p>
              <button onClick={copy} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">Envoie ce lien au parent toi-même : aucun courriel n’est envoyé automatiquement.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} disabled={busy} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
