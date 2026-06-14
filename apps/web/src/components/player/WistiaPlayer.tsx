'use client';

import { useEffect, useRef } from 'react';

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

function ensureScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
  const s = document.createElement('script');
  s.src = SCRIPT_SRC;
  s.async = true;
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

  useEffect(() => {
    ensureScript();
    window._wq = window._wq || [];

    const matcher = {
      id: hashedId,
      onReady: (video: WistiaVideo) => {
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
      try {
        window.Wistia?.api(hashedId)?.remove();
      } catch {
        /* le player n'était pas encore monté */
      }
    };
  }, [hashedId]);

  return (
    <div
      key={hashedId}
      className={`wistia_embed wistia_async_${hashedId} w-full h-full`}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      &nbsp;
    </div>
  );
}
