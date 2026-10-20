import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeProvider';
import { withAlpha } from './tokens';

export type FadeBottomProps = { height?: number };

/**
 * `.fade-bottom` : dégradé 120 pt collé en bas (transparent → fond du style à 85 %), sous la barre d'onglets,
 * pour que le contenu s'efface derrière. Ne capte aucun toucher.
 */
export function FadeBottom({ height = 120 }: FadeBottomProps) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[withAlpha(colors.bgGrouped, 0), withAlpha(colors.bgGrouped, 0.85)]}
      locations={[0, 0.7]}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, zIndex: 44 }}
    />
  );
}
