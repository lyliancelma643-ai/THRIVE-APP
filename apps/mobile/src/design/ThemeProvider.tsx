import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { DEFAULT_STYLE, getTokens, isStyleKey, type StyleKey, type Tokens } from './tokens';

export const UI_STYLE_STORAGE_KEY = 'thrive.uiStyle';

export type ThemeContextValue = Tokens & {
  setStyle: (s: StyleKey) => void;
  /** Réglage système « Réduire la transparence » : surfaces opaques. */
  reduceTransparency: boolean;
  /** Réglage système « Réduire les animations ». */
  reduceMotion: boolean;
  fontsLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = { children: ReactNode; fontsLoaded?: boolean; initialStyle?: StyleKey };

export function ThemeProvider({ children, fontsLoaded = false, initialStyle = DEFAULT_STYLE }: Props) {
  const [style, setStyleState] = useState<StyleKey>(initialStyle);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Style persisté localement ; toute erreur de stockage retombe sur le défaut.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(UI_STYLE_STORAGE_KEY);
        if (alive && isStyleKey(v)) setStyleState(v);
      } catch {
        /* défaut conservé */
      }
    })();
    return () => { alive = false; };
  }, []);

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

  const setStyle = useCallback((s: StyleKey) => {
    setStyleState(s);
    AsyncStorage.setItem(UI_STYLE_STORAGE_KEY, s).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...getTokens(style), setStyle, reduceTransparency, reduceMotion, fontsLoaded }),
    [style, setStyle, reduceTransparency, reduceMotion, fontsLoaded],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tokens du style courant + préférences d'accessibilité. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.');
  return ctx;
}

/** Choix du style de l'app (persisté localement, défaut `natif`). */
export function useStyleChoice(): { style: StyleKey; setStyle: (s: StyleKey) => void } {
  const { style, setStyle } = useTheme();
  return { style, setStyle };
}
