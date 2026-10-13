import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Avatar, CANVAS, GlassSurface, Icon, ThemedText, contrastRatio, useTheme,
} from '../../design';
import { PASSPORT_PALETTE, inkOn, type AccentKey } from './bilanData';

/** Couleur de l'enfant : couleur de passeport choisie (J) ou `kid` du style ; encre au meilleur contraste. */
export function useKidColor(accent: AccentKey | null | undefined): { bg: string; ink: string } {
  const { colors } = useTheme();
  const bg = accent ? PASSPORT_PALETTE[accent] : colors.kid;
  return { bg, ink: inkOn(bg, CANVAS.white, colors.accentInk, contrastRatio) };
}

type PillProps = {
  name: string;
  initial: string;
  accent?: AccentKey | null;
  photoUri?: string | null;
  /** Plusieurs enfants : chevron + menu. */
  multiple?: boolean;
  onPress?: () => void;
};

/** Bouton de verre « (L) Léo ⌄ » de la barre (V2 / V3) : sélecteur d'enfant. */
export function ChildPill({ name, initial, accent, photoUri, multiple, onPress }: PillProps) {
  const { colors } = useTheme();
  const kid = useKidColor(accent);
  return (
    <Pressable
      onPress={onPress}
      disabled={!multiple}
      accessibilityRole="button"
      accessibilityLabel={multiple ? `Enfant : ${name}. Changer d’enfant` : `Enfant : ${name}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <GlassSurface interactive radius={22}>
        <View style={{ height: 44, paddingLeft: 5, paddingRight: multiple ? 12 : 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar label={initial} size={34} background={kid.bg} ink={kid.ink} uri={photoUri} accessibilityLabel={name} />
          <ThemedText variant="headline" numberOfLines={1} style={{ maxWidth: 150 }}>{name}</ThemedText>
          {multiple ? <Icon name="chevronDown" size={14} color={colors.label} strokeWidth={2.4} /> : null}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

/** Avatar du parent à droite de la barre (V1) : disque `fill`, initiale `label`. */
export function ParentAvatar({ initial }: { initial: string }) {
  const { colors } = useTheme();
  return <Avatar label={initial} size={40} background={colors.fill} ink={colors.label} accessibilityLabel="Mon compte" style={{ marginLeft: 2 }} />;
}

type JerseyProps = { size: number; bg: string; ink: string; label: string; photoUri?: string | null; accessibilityLabel?: string };

/** `.avatar.round` du passeport : le numéro de maillot en 800 (ou la photo, ou l'initiale). */
export function JerseyDisc({ size, bg, ink, label, photoUri, accessibilityLabel }: JerseyProps) {
  if (photoUri) return <Avatar label={label} size={size} background={bg} ink={ink} uri={photoUri} accessibilityLabel={accessibilityLabel} />;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <ThemedText
        variant="headline"
        weight={800}
        style={{ color: ink, fontSize: Math.round(size * 0.43), lineHeight: Math.round(size * 0.43) + 2, letterSpacing: -1 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}
