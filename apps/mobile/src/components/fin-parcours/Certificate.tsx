import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { BRAND_LOGO, CANVAS, Icon, ThemedText, useTheme, type IconName } from '../../design';
import { AngledGradient } from './AngledGradient';

// Fond du certificat en Nuit calme (`linear-gradient(160deg, #2A2614, #0b0b0b)` du canevas).
const NIGHT_FROM = '#2A2614';
const NIGHT_TO = '#0B0B0B';
const BUTTON_INK = '#141414';

type Props = {
  /** Nom complet de l'enfant. */
  name: string;
  /** Ligne sous « a terminé le parcours des 13 séances » (coach · date). Absente : rien. */
  detail?: string | null;
  onShare?: () => void;
  /** Bouton « PDF » : absent = non affiché. */
  onPdf?: () => void;
};

function CertButton({ label, glyph, onPress, bg, ink }: { label: string; glyph: IconName; onPress: () => void; bg: string; ink: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === 'PDF' ? 'Ouvrir le certificat en PDF' : 'Partager le certificat'}
      style={({ pressed }) => ({
        height: 44, borderRadius: 22, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: bg, opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={glyph} size={18} color={ink} />
      <ThemedText variant="headline" style={{ color: ink }}>{label}</ThemedText>
    </Pressable>
  );
}

/**
 * Certificat THRIVE partageable (Z) : carte de 30 pt de rayon, dégradé bleu (Natif), brun-noir (Nuit calme) ou aplat
 * bleu nuit (Carnet), logo, « Certificat THRIVE » en soleil, nom en Fraunces, boutons Partager / PDF.
 */
export function Certificate({ name, detail, onShare, onPdf }: Props) {
  const { colors, style } = useTheme();
  const white = CANVAS.white;
  const from = style === 'nuit' ? NIGHT_FROM : style === 'carnet' ? colors.navy900 : colors.navy600;
  const to = style === 'nuit' ? NIGHT_TO : colors.navy900;
  return (
    <View
      accessible
      accessibilityLabel={`Certificat THRIVE. ${name} a terminé le parcours des 13 séances. ${detail ?? ''}`.trim()}
      style={{ borderRadius: 30, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden', backgroundColor: to }}
    >
      <AngledGradient from={from} to={to} angle={160} />
      <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: 46, height: 46, borderRadius: 11 }} />
      <ThemedText variant="cap" weight={600} style={{ marginTop: 14, color: colors.sun, letterSpacing: 1.4, textTransform: 'uppercase' }}>
        Certificat THRIVE
      </ThemedText>
      <ThemedText variant="displayLarge" accessibilityRole="header" style={{ marginTop: 8, color: white, fontSize: 34, lineHeight: 38, textAlign: 'center' }}>
        {name}
      </ThemedText>
      <ThemedText variant="sub" style={{ marginTop: 6, color: white, opacity: 0.82, textAlign: 'center', fontSize: 15, lineHeight: 20 }}>
        {`a terminé le parcours des 13 séances${detail ? `\n${detail}` : ''}`}
      </ThemedText>
      {onShare || onPdf ? (
        <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          {onShare ? <CertButton label="Partager" glyph="share" onPress={onShare} bg={colors.sun} ink={BUTTON_INK} /> : null}
          {onPdf ? <CertButton label="PDF" glyph="document" onPress={onPdf} bg="rgba(255,255,255,0.14)" ink={white} /> : null}
        </View>
      ) : null}
    </View>
  );
}
