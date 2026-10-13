export * from './tokens';
export * from './contrast';
export * from './tabConfig';
export { STYLE_MIGRATION, normalizeStyle, parseStyle, isLegacyStyleKey } from './styleMigration';
export type { LegacyStyleKey } from './styleMigration';
// Alias historiques (strictes : 'lin' | 'veillee'), encore importés par des écrans ; `StyleKey` etc. sont exportés tels quels.
export type { StyleKey as ThemeStyleKey } from './tokens';
export {
  STYLE_KEYS as THEME_STYLE_KEYS,
  STYLE_LABELS as THEME_STYLE_LABELS,
  STYLE_DESCRIPTIONS as THEME_STYLE_DESCRIPTIONS,
  COLORS as THEME_COLORS,
} from './tokens';
export { resolveTextStyle } from './typography';
export { FONT_ASSETS } from './fonts';
export { ThemeProvider, useTheme, useStyleChoice, UI_STYLE_STORAGE_KEY } from './ThemeProvider';
export { ThemeScope, type ThemeScopeProps } from './ThemeScope';
export { Lamp, type LampProps } from './Lamp';
export { Paper, Felt, Velvet, Enamel, type PaperProps, type FeltProps, type VelvetProps, type EnamelProps } from './Materials';
export { Star, type StarProps } from './Star';
export { Arch, type ArchProps } from './Arch';
export { Texture, type TextureProps } from './Texture';
export type { TextureName } from './materialSpecs';
export type { ThemeContextValue } from './ThemeProvider';
export { ThemedText, type ThemedTextProps } from './ThemedText';
export { GlassSurface, useGlassMode, type GlassMode, type GlassSurfaceProps } from './GlassSurface';
export { GlassButton, GlassPair, GlassGroup, type GlassButtonProps, type GlassPairItem } from './GlassButton';
export { ListRow, ListGroup, List, type ListRowProps, type ListProps } from './ListRow';
export { Sheet, type SheetProps } from './Sheet';
export { FloatingTabBar, TAB_BAR_INSET, type FloatingTab, type FloatingTabBarProps } from './FloatingTabBar';
export { Capsule, type CapsuleProps } from './Capsule';
export { Pill, type PillProps, type PillTone } from './Pill';
export { Slider, type SliderProps } from './Slider';
export { VignetteImage, type VignetteImageProps } from './VignetteImage';
export { VIGNETTE_IDS, BASE_VIGNETTE_ID, resolveVignetteId } from './vignetteIds';
export { MascotHero, BRAND_LOGO, type MascotHeroProps } from './MascotHero';
export { MascotMedallion, type MascotMedallionProps } from './MascotMedallion';
export { Icon, ICON_NAMES, type IconName, type IconProps } from './icons';
export { NavBar, LargeTitle, NAV_BAR_ROW, useNavBarHeight, useScrollEdge, useLargeTitle, type NavBarProps, type LargeTitleProps } from './NavBar';
export { Section, SectionHeader, SectionFooter, type SectionHeaderProps } from './Section';
export { Card, Kicker, Grid2, useCardShadow, type CardProps } from './Card';
export { Field, type FieldProps } from './Field';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Tag, Chip, Chips, Pills, type TagProps, type TagTone, type ChipProps } from './Chips';
export { Segmented, type SegmentedProps, type SegmentedOption } from './Segmented';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { Toggle, type ToggleProps } from './Toggle';
export { GlassMenu, MenuPopover, type GlassMenuProps, type GlassMenuItem, type MenuPopoverProps } from './GlassMenu';
export { Avatar, type AvatarProps } from './Avatar';
export { LockOverlay, MutedPreview, type LockOverlayProps, type MutedPreviewProps } from './LockOverlay';
export { FadeBottom, type FadeBottomProps } from './FadeBottom';
