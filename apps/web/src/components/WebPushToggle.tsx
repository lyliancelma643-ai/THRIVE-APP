'use client';

// Interrupteur « notifications push » (PWA) — s'affiche uniquement quand le
// navigateur supporte Web Push ET que la clé VAPID publique est configurée
// (donc invisible en dev et sur les navigateurs non compatibles).
import { useEffect, useState } from 'react';
import {
  getCurrentSubscription,
  getVapidPublicKey,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  webPushSupported,
} from '@/lib/web-push';

type State = 'hidden' | 'off' | 'on' | 'busy' | 'denied';

export function WebPushToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<State>('hidden');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!webPushSupported()) return;
      if (!(await getVapidPublicKey())) return; // clé absente → toggle invisible
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      const sub = await getCurrentSubscription();
      if (!cancelled) setState(sub ? 'on' : 'off');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'hidden') return null;

  const toggle = async () => {
    if (state === 'busy' || state === 'denied') return;
    const was = state;
    setState('busy');
    if (was === 'on') {
      await unsubscribeFromWebPush();
      setState('off');
    } else {
      const res = await subscribeToWebPush(userId);
      setState(res === 'ok' ? 'on' : res === 'denied' ? 'denied' : 'off');
    }
  };

  return (
    <section className="rounded-2xl glass-navy p-5 md:p-6 mb-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-4">
        Notifications
      </h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Notifications push</p>
          <p className="text-xs text-white/55 mt-0.5">
            {state === 'denied'
              ? 'Bloquées par le navigateur — autorise les notifications dans ses réglages.'
              : 'Bilan prêt, nouveau message, jalon de parcours : reçois-les même app fermée.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={state === 'on'}
          aria-label="Activer les notifications push"
          disabled={state === 'busy' || state === 'denied'}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            state === 'on' ? 'bg-emerald-400' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              state === 'on' ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
