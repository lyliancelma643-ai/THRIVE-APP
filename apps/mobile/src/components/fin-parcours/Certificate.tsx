import React from 'react';
import { View } from 'react-native';
import { Arch, Button, Paper, ThemedText } from '../../design';

type Props = {
  /** Nom complet de l'enfant. */
  name: string;
  /** Ligne sous « a terminé le parcours des 13 séances » (coach · date). Absente : rien. */
  detail?: string | null;
  onShare?: () => void;
  /** Bouton « PDF » : absent = non affiché. */
  onPdf?: () => void;
};

/**
 * Certificat THRIVE partageable (Z) : ce qu'on garde, donc du papier (`Paper framed`, double filet sauge), identique
 * en Lin et en Veillée — encre marine sur papier. Arche de lin, « Certificat THRIVE » en sauge, nom en Fraunces,
 * « Partager » en émail (le seul geste soleil de l'écran) et « PDF » en gris.
 */
export function Certificate({ name, detail, onShare, onPdf }: Props) {
  return (
    <Paper
      framed
      radius={30}
      padding={22}
      testID="certificat-papier"
    >
      <View style={{ paddingTop: 4, paddingHorizontal: 0, alignItems: 'center' }}>
        <Arch size="xs" width={70} height={80} accessibilityLabel="La mascotte THRIVE" />
        <ThemedText variant="eyebrow" color="sageText" style={{ marginTop: 14 }}>Certificat THRIVE</ThemedText>
        <ThemedText variant="largetitle" weight={600} accessibilityRole="header" style={{ marginTop: 8, textAlign: 'center', lineHeight: 40 }}>
          {name}
        </ThemedText>
        <ThemedText variant="sub" color="label2" style={{ marginTop: 6, textAlign: 'center' }}>
          {`a terminé le parcours des 13 séances${detail ? `\n${detail}` : ''}`}
        </ThemedText>
        {onShare || onPdf ? (
          <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            {onShare ? <Button label="Partager" glyph="share" size="md" variant="accent" onPress={onShare} accessibilityLabel="Partager le certificat" /> : null}
            {onPdf ? <Button label="PDF" glyph="document" size="md" variant="gray" onPress={onPdf} accessibilityLabel="Ouvrir le certificat en PDF" /> : null}
          </View>
        ) : null}
      </View>
    </Paper>
  );
}
