'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { DELETE_CONFIRM_WORD, isDeleteConfirmed } from '@/lib/delete-account';
import { useAuthStore } from '@/stores/auth.store';

// Suppression de compte (Apple 5.1.1(v), Loi 25) : confirmation en deux temps
// (étape 1 : explication, étape 2 : taper « SUPPRIMER »), appel de
// request-account-deletion, puis écran de confirmation avec le délai (30 jours).
// Partagé par l'espace parent et l'espace coach.

type Tone = 'night' | 'light';
const TONES: Record<Tone, { body: string; soft: string; ink: string; danger: string; line: string; input: string }> = {
  night: {
    body: 'text-body', soft: 'text-soft', ink: 'text-ink', danger: 'text-danger-ink', line: 'border-line',
    input: 'w-full h-12 px-4 rounded-2xl bg-chip border border-line2 text-ink text-base outline-none focus:border-accent',
  },
  light: {
    body: 'text-navy-600/90', soft: 'text-navy-600/70', ink: 'text-navy-600', danger: 'text-red-700', line: 'border-navy-100',
    input: 'w-full h-12 px-4 rounded-2xl bg-white border border-navy-100 text-navy-600 text-base outline-none focus:border-navy-600',
  },
};

export function DeleteAccountSection({ tone = 'night' }: { tone?: Tone }) {
  const c = TONES[tone];
  const { user } = useAuthStore();
  const [step, setStep] = useState<'idle' | 'ask' | 'type'>('idle');
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pendingSince, setPendingSince] = useState<string | null>(null);

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

  const submit = async () => {
    if (busy || !isDeleteConfirmed(typed)) return;
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase.functions.invoke('request-account-deletion', {
      body: { reason: reason.trim() || null },
    });
    setBusy(false);
    if (error || data?.error) {
      setMsg('La demande n’a pas pu être envoyée. Réessaie, ou écris au support THRIVE.');
      return;
    }
    setPendingSince((data?.request?.requested_at as string | undefined) ?? new Date().toISOString());
    setStep('idle');
  };

  const btn = 'min-h-12 px-6 rounded-full text-sm font-bold transition-colors disabled:opacity-60';

  if (pendingSince) {
    return (
      <div role="status" className={`text-sm leading-relaxed ${c.body}`}>
        <span className={`font-semibold ${c.ink}`}>Demande de suppression enregistrée</span> le{' '}
        {new Date(pendingSince).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}.
        L’équipe THRIVE te confirme la suppression par courriel, au plus tard sous 30 jours.
        <p className={`mt-2 ${c.soft}`}>
          Ton abonnement App Store ou Google Play se gère dans les réglages de ton téléphone : supprimer ton compte
          ne l’annule pas automatiquement.
        </p>
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <button type="button" onClick={() => setStep('ask')} className={`min-h-[44px] text-sm font-semibold hover:underline ${c.danger}`}>
        Supprimer mon compte et mes données
      </button>
    );
  }

  return (
    <div>
      <p className={`text-sm leading-relaxed ${c.body}`}>
        Ton compte et les données associées seront supprimés par l’équipe THRIVE, au plus tard sous 30 jours. Le
        parcours en cours s’arrête. Cette action est définitive.
      </p>
      <p className={`mt-2 text-sm leading-relaxed ${c.soft}`}>
        Ton abonnement App Store ou Google Play se gère dans les réglages de ton téléphone.
      </p>
      {step === 'ask' ? (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setStep('type')} className={`${btn} bg-red-500/15 border border-red-500/40 ${c.danger}`}>
            Continuer
          </button>
          <button type="button" onClick={() => setStep('idle')} className={`${btn} ${c.soft}`}>Annuler</button>
        </div>
      ) : (
        <>
          <label className="block mt-4">
            <span className={`block text-xs font-medium mb-1.5 ${c.soft}`}>Une raison ? (facultatif)</span>
            <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={`${c.input} h-auto py-3 resize-none`} />
          </label>
          <label className="block mt-4">
            <span className={`block text-xs font-medium mb-1.5 ${c.soft}`}>
              Pour confirmer, écris <strong>{DELETE_CONFIRM_WORD}</strong>
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={c.input}
            />
          </label>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !isDeleteConfirmed(typed)}
              className={`${btn} bg-red-500/15 border border-red-500/40 ${c.danger}`}
            >
              {busy ? 'Envoi…' : 'Confirmer la suppression'}
            </button>
            <button type="button" onClick={() => { setStep('idle'); setTyped(''); }} className={`${btn} ${c.soft}`}>Annuler</button>
          </div>
          {msg && <p role="alert" className={`mt-3 text-sm ${c.danger}`}>{msg}</p>}
        </>
      )}
    </div>
  );
}
