import React from 'react';
import { View } from 'react-native';
import { Icon, Paper, Sheet, Tag, ThemedText, useTheme } from '../../design';
import { CARD_INFO } from './cardInfo';

// I — « Comprendre cette carte » : la fiche d'explication de la carte (textes du produit, page web `card-info.tsx`).
// Feuille en grand détent. Ouverte par-dessus la fiche détaillée (imbriquée dans sa feuille : une seule présentation
// modale à la fois sur iOS) ou seule, depuis une carte sans fiche (programme, bien-être, parcours, roue, contrat).

export type InfoSheetProps = { visible: boolean; onClose: () => void; cardKey: string | null };

export function InfoSheet({ visible, onClose, cardKey }: InfoSheetProps) {
  const { colors } = useTheme();
  const info = cardKey ? CARD_INFO[cardKey] : null;
  return (
    <Sheet visible={visible && !!info} onClose={onClose} title="Comprendre cette carte" detent="large" dim={0.3}>
      {info ? (
        <View style={{ gap: 10, paddingTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.fill, borderWidth: 1, borderColor: colors.separator, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="info" size={22} color={colors.sageText} />
            </View>
            <Tag label={info.badge} />
          </View>
          <ThemedText variant="title1" accessibilityRole="header">{info.title}</ThemedText>
          <ThemedText variant="sub" color="label2" style={{ marginBottom: 4 }}>{info.tagline}</ThemedText>
          {info.sections.map((s) => (
            <View key={s.label} style={{ padding: 15, borderRadius: 15, backgroundColor: colors.fill4 }}>
              <ThemedText variant="eyebrow" color="sageText" style={{ marginBottom: 6 }}>{s.label}</ThemedText>
              {s.text ? <ThemedText variant="sub">{s.text}</ThemedText> : null}
              {s.bullets ? (
                <View style={s.bullets.length >= 6 ? { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 10 } : { gap: 6 }}>
                  {s.bullets.map((b) => (
                    <View key={b} style={[{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }, s.bullets && s.bullets.length >= 6 ? { width: '48%' } : null]}>
                      <View style={{ marginTop: 5 }}><Icon name="sparkles" size={11} color={colors.tintText} /></View>
                      <ThemedText variant="foot" style={{ flex: 1 }}>{b}</ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {info.tip ? (
            <Paper radius={15}>
              <View style={{ flexDirection: 'row', gap: 10, padding: 15 }}>
                <View style={{ marginTop: 1 }}><Icon name="home" size={18} color="#46695F" /></View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="eyebrow" color="sageText" style={{ marginBottom: 4 }}>À la maison</ThemedText>
                  <ThemedText variant="foot">{info.tip}</ThemedText>
                </View>
              </View>
            </Paper>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
