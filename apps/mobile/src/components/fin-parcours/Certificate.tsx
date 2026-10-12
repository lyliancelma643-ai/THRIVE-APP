import React from 'react';
import { Share, View } from 'react-native';
import { BRAND_LOGO, GlassButton, RADIUS, SPACING, ThemedText, useTheme } from '../../design';
import { Image } from 'react-native';
import { shareMessage } from './logic';

type Props = { firstName: string; coachName?: string | null; dateLabel?: string | null };

/** Certificat THRIVE partageable (Share API native). */
export function Certificate({ firstName, coachName, dateLabel }: Props) {
  const { colors } = useTheme();
  const detail = [coachName ? `avec ${coachName}` : null, dateLabel].filter(Boolean).join(' · ');
  const onShare = () => {
    Share.share({ message: shareMessage(firstName) }).catch(() => {});
  };
  return (
    <View
      accessible
      accessibilityLabel={`Certificat THRIVE. ${firstName} a terminé le parcours des 13 séances. ${detail}`}
      style={{
        backgroundColor: colors.navy900,
        borderRadius: RADIUS.card,
        padding: SPACING.space5,
        alignItems: 'center',
        gap: SPACING.space2,
      }}
    >
      <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: 46, height: 46, borderRadius: 11 }} />
      <ThemedText variant="caption1" style={{ color: colors.sun, fontWeight: '600', marginTop: SPACING.space2 }}>
        Certificat THRIVE
      </ThemedText>
      <ThemedText variant="title1" style={{ color: colors.cream, textAlign: 'center' }}>{firstName}</ThemedText>
      <ThemedText variant="subheadline" style={{ color: colors.cream, textAlign: 'center' }}>
        a terminé le parcours des 13 séances{detail ? `\n${detail}` : ''}
      </ThemedText>
      <GlassButton
        label="Partager"
        icon="share-outline"
        tinted
        onPress={onShare}
        accessibilityLabel="Partager le certificat"
        style={{ marginTop: SPACING.space3 }}
      />
    </View>
  );
}
