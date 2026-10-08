// Pont web ↔ coque native (WebView de l'app iOS/Android).
//
// La coque suffixe le user-agent de la WebView par « ThriveApp/<version> (ios|android) ».
// En contexte natif, le web n'affiche AUCUN moyen de paiement externe (Apple 3.1.1 /
// Google Play Billing) : l'achat passe par le paywall natif (RevenueCat).

export type NativeMessage =
  | { type: 'open-paywall' }
  | { type: 'open-account' }
  | { type: 'logout' }
  | { type: 'open-external'; url: string }
  | { type: 'haptic'; style?: 'light' | 'medium' | 'heavy' | 'success' | 'error' }
  | { type: 'download'; url: string; filename: string }
  | { type: 'session-expired' };

const UA_MARKER = /ThriveApp\/[\d.]+ \((ios|android)\)/;

/** Vrai si la page tourne dans la WebView de l'app THRIVE. */
export function isNativeApp(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return UA_MARKER.test(ua);
}

export function nativePlatform(userAgent?: string): 'ios' | 'android' | null {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return (UA_MARKER.exec(ua)?.[1] as 'ios' | 'android' | undefined) ?? null;
}

/** Envoie un message à la coque ; false si on n'est pas dans l'app. */
export function postToNative(msg: NativeMessage): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (s: string) => void } })
    .ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify(msg));
  return true;
}
