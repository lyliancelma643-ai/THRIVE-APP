import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { supabaseClient } from '@thrive/shared';
import { useAuthStore } from '../stores/auth.store';
import { normalizeStyle, parseStyle, type LegacyStyleKey } from './styleMigration';
import { fetchServerStyle, mergeStyle, pushServerStyle, type StyleSyncClient } from './styleSync';
import { themeFor, type ThemeContextValue } from './themeValue';
import { DEFAULT_STYLE, type StyleKey } from './tokens';

export const UI_STYLE_STORAGE_KEY = 'thrive.uiStyle';

export type { ThemeContextValue } from './themeValue';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = { children: ReactNode; fontsLoaded?: boolean; initialStyle?: StyleKey };

export function ThemeProvider({ children, fontsLoaded = false, initialStyle = DEFAULT_STYLE }: Props) {
  const [styleKey, setStyleState] = useState<StyleKey>(initialStyle);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Style persisté localement, normalisé (une ancienne clé est convertie puis réécrite) ;
  // toute erreur de stockage ou valeur inconnue retombe sur le défaut.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(UI_STYLE_STORAGE_KEY);
        const parsed = parseStyle(raw);
        if (!parsed) return;
        if (alive) setStyleState(parsed);
        if (raw !== parsed) AsyncStorage.setItem(UI_STYLE_STORAGE_KEY, parsed).catch(() => {});
      } catch {
        /* défaut conservé */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Synchro serveur (083) : au démarrage connecté, le style serveur l'emporte
  // sur le local et est réécrit ; échec silencieux (colonne/RPC absente, réseau).
  const userId = useAuthStore((st) => (st.isAuthenticated ? st.user?.id ?? null : null));
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const client = supabaseClient as unknown as StyleSyncClient;
        const server = await fetchServerStyle(client, userId);
        const local = await AsyncStorage.getItem(UI_STYLE_STORAGE_KEY).catch(() => null);
        const m = mergeStyle(local, server);
        if (m.style && alive) setStyleState(m.style);
        if (m.style && m.writeLocal) AsyncStorage.setItem(UI_STYLE_STORAGE_KEY, m.style).catch(() => {});
        if (m.style && m.pushServer) void pushServerStyle(client, m.style);
      } catch {
        /* le style local reste la référence */
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Préférences d'accessibilité système.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduceMotion(v)).catch(() => {});
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceTransparencyEnabled().then((v) => alive && setReduceTransparency(v)).catch(() => {});
    }
    const subs = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion),
      AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency),
    ];
    return () => { alive = false; subs.forEach((s) => s.remove()); };
  }, []);

  const setStyle = useCallback((s: StyleKey | LegacyStyleKey) => {
    const next = normalizeStyle(s);
    setStyleState(next);
    AsyncStorage.setItem(UI_STYLE_STORAGE_KEY, next).catch(() => {});
    if (useAuthStore.getState().isAuthenticated) {
      void pushServerStyle(supabaseClient as unknown as StyleSyncClient, next);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...themeFor(styleKey), setStyle, reduceTransparency, reduceMotion, fontsLoaded }),
    [styleKey, setStyle, reduceTransparency, reduceMotion, fontsLoaded],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tokens du style courant + préférences d'accessibilité. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.');
  return ctx;
}

/** Choix du style de l'app (persisté localement, défaut `lin`). */
export function useStyleChoice(): { styleKey: StyleKey; setStyle: (s: StyleKey | LegacyStyleKey) => void } {
  const { styleKey, setStyle } = useTheme();
  return { styleKey, setStyle };
}
