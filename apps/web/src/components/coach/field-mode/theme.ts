'use client';

// Thème du Mode Terrain.
//
// L'espace coach est clair uniquement ; le Mode Terrain embarque donc sa propre
// surface. Les deux palettes tiennent le contraste AAA (≥ 7:1) sur le texte
// principal — lisibilité en aréna comme en plein soleil.
import { useCallback, useEffect, useState } from 'react';

export type FieldTheme = 'auto' | 'dark' | 'bright';

const STORAGE_KEY = 'thrive-field-theme';

const DARK: Record<string, string> = {
  '--fm-bg': '#011A29',
  '--fm-surface': '#06273B',
  '--fm-surface-2': '#0C3550',
  '--fm-text': '#FFFFFF', // 15.8:1
  '--fm-dim': '#C7DCEA', // 12.6:1
  '--fm-accent': '#F9EB50', // 12.8:1
  '--fm-on-accent': '#011A29',
  '--fm-border': 'rgba(255,255,255,0.20)',
  '--fm-ok': '#A7C4BC', // 8.4:1
  '--fm-over': '#F0B24A', // 9.5:1 — dépassement signalé sans agressivité
};

const BRIGHT: Record<string, string> = {
  '--fm-bg': '#FFFFFF',
  '--fm-surface': '#F1F4F7',
  '--fm-surface-2': '#E3E9EF',
  '--fm-text': '#011A29', // 15.6:1
  '--fm-dim': '#33556B', // 7.9:1
  '--fm-accent': '#004E7A', // 8.8:1
  '--fm-on-accent': '#FFFFFF',
  '--fm-border': 'rgba(1,26,41,0.22)',
  '--fm-ok': '#1F5044', // 9.2:1
  '--fm-over': '#6B4600', // 8.3:1
};

export function useFieldTheme() {
  const [preference, setPreference] = useState<FieldTheme>('auto');
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FieldTheme | null;
      if (saved === 'auto' || saved === 'dark' || saved === 'bright') setPreference(saved);
    } catch {
      /* stockage indisponible : on garde « auto » */
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: 'dark' | 'bright' =
    preference === 'auto' ? (systemDark ? 'dark' : 'bright') : preference;

  /** Bascule explicite : le coach force la lisibilité selon la lumière ambiante. */
  const toggle = useCallback(() => {
    setPreference((p) => {
      const next: FieldTheme = (p === 'auto' ? (systemDark ? 'dark' : 'bright') : p) === 'dark'
        ? 'bright'
        : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* stockage indisponible */
      }
      return next;
    });
  }, [systemDark]);

  return {
    resolved,
    vars: (resolved === 'dark' ? DARK : BRIGHT) as React.CSSProperties,
    toggle,
  };
}
