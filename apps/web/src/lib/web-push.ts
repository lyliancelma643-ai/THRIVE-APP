// Abonnement Web Push côté client (PWA).
// Prérequis : service worker actif (public/sw.js, généré en prod) et
// NEXT_PUBLIC_VAPID_PUBLIC_KEY posée — sinon tout est no-op (dev inclus).
import { supabaseClient as supabase } from '@thrive/shared';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function webPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  // ArrayBuffer explicite : TS 5.9 exige Uint8Array<ArrayBuffer> pour BufferSource.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  // getRegistration (et non .ready) : .ready ne résout jamais quand le SW
  // est désactivé (mode dev) et gèlerait le toggle.
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? null;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!webPushSupported()) return null;
  const reg = await getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** Demande la permission, s'abonne au push service et enregistre en base. */
export async function subscribeToWebPush(userId: string): Promise<'ok' | 'denied' | 'unavailable'> {
  if (!webPushSupported()) return 'unavailable';
  const reg = await getRegistration();
  if (!reg) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
  });

  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) return 'unavailable';

  const { error } = await supabase.from('web_push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    // Base injoignable ou RLS : on annule l'abonnement navigateur pour ne pas
    // laisser un endpoint orphelin que le serveur ne connaît pas.
    await sub.unsubscribe().catch(() => undefined);
    return 'unavailable';
  }
  return 'ok';
}

export async function unsubscribeFromWebPush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  await supabase.from('web_push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => undefined);
}
