'use client';

// Notifications push (PWA) pour un administrateur : même mécanique que côté
// parent (lib/web-push : service worker + clé VAPID + table
// web_push_subscriptions), habillage clair de la zone admin.
// L'abonnement est propre à CE navigateur : chaque poste/téléphone se branche
// une fois. Sans clé VAPID configurée, le bloc explique pourquoi il est inerte
// plutôt que de disparaître — un admin doit savoir où il en est.

import { useEffect, useState } from 'react';
import {
  getCurrentSubscription,
  getVapidPublicKey,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  webPushSupported,
} from '@/lib/web-push';

type State = 'loading' | 'unsupported' | 'unconfigured' | 'off' | 'on' | 'busy' | 'denied';

export function AdminPushToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!webPushSupported()) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (!(await getVapidPublicKey())) {
        if (!cancelled) setState('unconfigured');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }
      const sub = await getCurrentSubscription();
      if (!cancelled) setState(sub ? 'on' : 'off');
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = async () => {
    if (state !== 'on' && state !== 'off') return;
    const was = state;
    setState('busy');
    if (was === 'on') {
      await unsubscribeFromWebPush();
      setState('off');
    } else {
      const res = await subscribeToWebPush(userId);
      setState(res === 'ok' ? 'on' : res === 'denied' ? 'denied' : 'unconfigured');
    }
  };

  const hint: Record<State, string> = {
    loading: 'Vérification du navigateur…',
    unsupported: 'Ce navigateur ne gère pas les notifications push. Installez l’app (PWA) sur mobile pour en profiter.',
    unconfigured: 'Push indisponible : la clé VAPID n’est pas configurée sur cet environnement.',
    denied: 'Bloquées par le navigateur — autorisez les notifications dans ses réglages, puis rechargez.',
    off: 'Recevez les alertes sur ce poste même quand l’onglet THRIVE est fermé.',
    on: 'Ce navigateur reçoit les alertes THRIVE, même app fermée.',
    busy: 'Un instant…',
  };

  const isOn = state === 'on';
  const disabled = state !== 'on' && state !== 'off';

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-900">Notifications push sur cet appareil</p>
        <p className="text-xs text-gray-500 mt-0.5">{hint[state]}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label="Activer les notifications push sur cet appareil"
        disabled={disabled}
        onClick={toggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
          isOn ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            isOn ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
