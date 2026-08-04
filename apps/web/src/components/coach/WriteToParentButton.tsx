'use client';

// « Écrire au parent » depuis la fiche d'un athlète : ouvre (ou retrouve) le fil
// coach ↔ parent et bascule sur la messagerie. Sans ce bouton, un coach ne peut
// que RÉPONDRE — il lui faut attendre que le parent écrive le premier.
//
// Le fil n'existe que si le forfait de la famille ouvre la messagerie
// (coachMessaging) : la RPC répond FEATURE_LOCKED sinon, et on l'affiche
// franchement plutôt que de laisser un bouton qui ne fait rien.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { messagingErrorLabel, openCoachConversation } from '@/lib/messaging';

export function WriteToParentButton({
  childId,
  childName,
  className = '',
}: {
  childId: string;
  childName?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { id, error: code } = await openCoachConversation(childId);
    setBusy(false);
    if (id) {
      router.push(`/coach/messages?c=${id}`);
      return;
    }
    setError(
      code === 'FEATURE_LOCKED'
        ? `Le forfait de la famille${childName ? ` de ${childName}` : ''} n’inclut pas la messagerie.`
        : messagingErrorLabel(code ?? 'UNKNOWN')
    );
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        <Icon name="mail" className="w-4 h-4" />
        {busy ? 'Ouverture…' : 'Écrire au parent'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
