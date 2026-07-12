// Service worker THRIVE (généré vers public/sw.js par @serwist/next).
// Précache le shell Next + stratégies de cache runtime + fallback hors-ligne
// + réception des notifications Web Push (VAPID).
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Stratégies éprouvées de Serwist pour Next : statiques en cache-first,
  // pages en network-first — jamais de cache sur les appels Supabase
  // (cross-origin, non couverts par defaultCache → toujours réseau).
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push ──
// Payload attendu (edge function send-web-push) :
// { title, body, data: { url?, … } }
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; data?: Record<string, unknown> };
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'THRIVE', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    typeof (event.notification.data as { url?: unknown })?.url === 'string'
      ? ((event.notification.data as { url: string }).url as string)
      : '/parent/bilans';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            void client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
