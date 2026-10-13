import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, ThemedText, type IconName } from '../../design';
import { SCENE, whiteAlpha } from './scene';

export type SceneButtonProps = {
  glyph: IconName;
  label?: string;
  /** Obligatoire pour un bouton icône seule. */
  accessibilityLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.gbtn` posé sur une scène vidéo sombre (P, Q) : capsule 44 pt blanche à 14 % (filet 12 %), glyphe et libellé blancs.
 * Sans `onPress`, c'est un indicateur (pastille « En pause »).
 */
export function SceneButton({ glyph, label, accessibilityLabel, onPress, style }: SceneButtonProps) {
  const body = (
    <View
      style={[
        {
          height: 44, minWidth: 44, borderRadius: 22, paddingHorizontal: label ? 12 : 0, flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 6, backgroundColor: whiteAlpha(0.14), borderWidth: 1, borderColor: whiteAlpha(0.12),
        },
        style,
      ]}
    >
      <Icon name={glyph} size={label ? 16 : 21} color={SCENE.white} />
      {label ? (
        <ThemedText variant="body" weight={500} style={{ color: SCENE.white }}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={accessibilityLabel ?? label}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}
