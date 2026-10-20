import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Lamp } from './Lamp';
import { ThemeContext, useTheme } from './ThemeProvider';
import { scopeTheme } from './themeValue';
import type { StyleKey } from './tokens';

export type ThemeScopeProps = {
  /** Style forcé pour tout le sous-arbre (les préférences d'accessibilité et `setStyle` restent ceux de l'app). */
  style: StyleKey;
  /**
   * Peint le fond du style forcé (`bgGrouped`) et son halo de lampe derrière `children`.
   * Sans `fill`, le scope ne change que les tokens : à utiliser quand l'enfant peint déjà son fond.
   */
  fill?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Forçage local du thème. Le mode activité est TOUJOURS en Veillée (fond marine #022539, halo de lampe, texte
 * crème), même si le parent a choisi Lin : `<ThemeScope style="veillee" fill>…</ThemeScope>`.
 * `setStyle()` agit toujours sur le choix global, jamais sur le scope.
 */
export function ThemeScope({ style, fill = false, containerStyle, children }: ThemeScopeProps) {
  const parent = useTheme();
  const value = useMemo(() => scopeTheme(parent, style), [parent, style]);
  return (
    <ThemeContext.Provider value={value}>
      {fill ? (
        <View style={[styles.fill, { backgroundColor: value.colors.bgGrouped }, containerStyle]}>
          <Lamp />
          {children}
        </View>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
