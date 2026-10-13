import { Pressable, View } from 'react-native';
import { Avatar, GlassSurface, Icon, ThemedText, useTheme } from '../../design';

type Props = {
  /** Prénom réel de l'enfant suivi. */
  name: string;
  onPress?: () => void;
};

/** `.gbtn.glass` de la barre : pastille de verre « avatar · prénom · chevron » qui ouvre le choix du profil (F). */
export function ChildChip({ name, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, changer de profil`}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <GlassSurface interactive radius={22}>
        <View style={{ minHeight: 44, paddingLeft: 5, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar label={name.slice(0, 1)} size={34} ink={undefined} />
          <ThemedText variant="headline">{name}</ThemedText>
          <Icon name="chevronDown" size={16} color={colors.label} />
        </View>
      </GlassSurface>
    </Pressable>
  );
}
