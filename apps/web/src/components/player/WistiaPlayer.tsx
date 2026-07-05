'use client';

import { useEffect, useRef, useState } from 'react';

// Poignée minimale qui expose les contrôles dont l'InteractivePlayer a besoin,
// alignée sur l'API d'un élément <video> (time / duration / play / pause / seek).
export interface WistiaHandle {
  play: () => void;
  pause: () => void;
  time: () => number;
  duration: () => number;
  seek: (t: number) => void;
}

type WistiaVideo = {
  play: () => void;
  pause: () => void;
  time: (t?: number) => number;
  duration: () => number;
  bind: (event: string, cb: (...args: unknown[]) => void) => void;
  remove: () => void;
};

declare global {
  interface Window {
    _wq?: Array<Record<string, unknown>>;
    Wistia?: { api: (id: string) => WistiaVideo | null };
  }
}

const SCRIPT_SRC = 'https://fast.wistia.com/assets/external/E-v1.js';

// Reconnaît un identifiant Wistia : id brut de 10 caractères, ou une URL Wistia.
export function wistiaId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-z0-9]{10}$/i.test(trimmed)) return trimmed;
  const m = trimmed.match(/wistia\.com\/(?:medias|embed\/(?:iframe|medias))\/([a-z0-9]+)/i);
  return m ? m[1] : null;
}

function ensureScript(onError?: () => void) {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (existing) return;
  const s = document.createElement('script');
  s.src = SCRIPT_SRC;
  s.async = true;
  if (onError) s.onerror = onError;
  document.head.appendChild(s);
}

type Props = {
  hashedId: string;
  onReady?: (handle: WistiaHandle) => void;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onDuration?: (seconds: number) => void;
};

export function WistiaPlayer({
  hashedId,
  onReady,
  onTime,
  onEnded,
  onPlay,
  onPause,
  onDuration,
}: Props) {
  // On garde les callbacks dans un ref : les bindings Wistia sont posés une seule
  // fois (onReady) mais doivent toujours appeler la dernière version des handlers.
  const cbs = useRef({ onReady, onTime, onEnded, onPlay, onPause, onDuration });
  cbs.current = { onReady, onTime, onEnded, onPlay, onPause, onDuration };

  // Cycle de vie visible : spinner tant que Wistia n'a pas répondu, message +
  // bouton Réessayer si le script/lecteur ne charge pas (réseau mobile instable).
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setStatus('loading');
    ensureScript(() => setStatus('error'));
    window._wq = window._wq || [];

    // Filet de sécurité : lecteur toujours pas prêt après 15 s → état d'erreur
    const timeout = window.setTimeout(() => {
      setStatus((s) => (s === 'loading' ? 'error' : s));
    }, 15000);

    const matcher = {
      id: hashedId,
      onReady: (video: WistiaVideo) => {
        window.clearTimeout(timeout);
        setStatus('ready');
        const handle: WistiaHandle = {
          play: () => video.play(),
          pause: () => video.pause(),
          time: () => video.time(),
          duration: () => video.duration(),
          seek: (t: number) => video.time(t),
        };
        video.bind('timechange', (...args) => cbs.current.onTime?.(Number(args[0])));
        video.bind('end', () => cbs.current.onEnded?.());
        video.bind('play', () => cbs.current.onPlay?.());
        video.bind('pause', () => cbs.current.onPause?.());
        cbs.current.onDuration?.(video.duration());
        cbs.current.onReady?.(handle);
      },
    };

    window._wq.push(matcher);

    return () => {
      window.clearTimeout(timeout);
      // Révoque le matcher (sinon Wistia le rejoue au prochain montage du même
      // id → bindings dupliqués), puis retire le player.
      try {
        window._wq?.push({ revoke: matcher });
      } catch {
        /* file _wq indisponible */
      }
      try {
        window.Wistia?.api(hashedId)?.remove();
      } catch {
        /* le player n'était pas encore monté */
      }
    };
  }, [hashedId, retryKey]);

  return (
    <div className="relative w-full h-full" key={`${hashedId}-${retryKey}`}>
      <div
        className={`wistia_embed wistia_async_${hashedId} w-full h-full`}
        style={{ height: '100%', width: '100%', position: 'relative' }}
      >
        &nbsp;
      </div>

      {status === 'loading' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-900"
          role="status"
          aria-label="Chargement de la vidéo"
        >
          <div className="w-10 h-10 border-4 border-white/25 border-t-sun rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Chargement de la vidéo…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-900 p-6 text-center">
          <p className="text-white/80 text-sm">
            Impossible de charger la vidéo. Vérifie ta connexion internet.
          </p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="px-6 py-3 min-h-[44px] rounded-full bg-sun hover:bg-sun-dark text-navy-900 text-sm font-bold transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
