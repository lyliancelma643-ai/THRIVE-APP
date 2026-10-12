import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, useTheme } from '../../design';

// W · Questionnaire de l'enfant (EPOCH, boutons 1 à 5). L'enfant n'a ni compte ni mot de passe.
// Écran de présentation seulement : la soumission (verrou 1 test/séance, migrations 047/053) reste
// côté appelant via `onAnswer`. [À COMPLÉTER] brancher sur la route/lien à jeton existante.
export type QuestionsLang = 'fr' | 'en';

const SCALE: Record<QuestionsLang, string[]> = {
  fr: ['Presque jamais', 'Rarement', 'Parfois', 'Souvent', 'Presque toujours'],
  en: ['Almost never', 'Rarely', 'Sometimes', 'Often', 'Almost always'],
};

const COPY = {
  fr: {
    hello: (n?: string) => (n ? `Salut ${n} !` : 'Salut !'),
    intro: 'Il n’y a pas de bonne ou de mauvaise réponse. Réponds comme tu te sens ces jours-ci.',
    shared: 'Tes réponses sont partagées avec ton coach.',
    step: (i: number, n: number) => `${i} sur ${n}`,
  },
  en: {
    hello: (n?: string) => (n ? `Hi ${n}!` : 'Hi!'),
    intro: 'There are no right or wrong answers. Answer how you feel these days.',
    shared: 'Your answers are shared with your coach.',
    step: (i: number, n: number) => `${i} of ${n}`,
  },
} as const;

export type QuestionsScreenProps = {
  firstName?: string;
  lang?: QuestionsLang;
  /** Libellé de la dimension (ex. Engagement). */
  dimension?: string;
  /** Énoncé de la question courante, fourni par la source de données. */
  question?: string;
  /** Numéro (1-indexé) de la question courante et total. */
  index?: number;
  total?: number;
  selected?: number | null;
  onAnswer?: (value: number) => void;
};

export default function QuestionsScreen({
  firstName, lang = 'fr', dimension, question, index = 1, total = 1, selected = null, onAnswer,
}: QuestionsScreenProps) {
  const { colors } = useTheme();
  const t = COPY[lang];
  const pct = total > 0 ? Math.min(1, index / total) : 0;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ padding: SPACING.space4, paddingTop: 62, gap: SPACING.space4 }}
    >
      <View style={{ gap: SPACING.space2 }}>
        <ThemedText variant="largeTitle" style={{ color: colors.label }} accessibilityRole="header">{t.hello(firstName)}</ThemedText>
        <ThemedText variant="callout" style={{ color: colors.label2 }}>{t.intro}</ThemedText>
      </View>

      <View accessible accessibilityRole="progressbar" accessibilityLabel={t.step(index, total)} style={{ gap: SPACING.space1 + 2 }}>
        <ThemedText variant="footnote" style={{ color: colors.label2 }}>{t.step(index, total)}</ThemedText>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.fill3 }}>
          <View style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: colors.kid }} />
        </View>
      </View>

      {question ? (
        <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space5, gap: SPACING.space2 }}>
          {dimension ? <ThemedText variant="caption1" style={{ color: colors.label2, fontWeight: '700' }}>{dimension}</ThemedText> : null}
          <ThemedText variant="title3" style={{ color: colors.label }}>{question}</ThemedText>
          <View style={{ gap: SPACING.space2, marginTop: SPACING.space3 }}>
            {SCALE[lang].map((label, i) => {
              const on = selected === i + 1;
              return (
                <Pressable
                  key={label}
                  onPress={() => onAnswer?.(i + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}, ${label}`}
                  accessibilityState={{ selected: on }}
                  style={{
                    minHeight: 54,
                    borderRadius: RADIUS.tile,
                    paddingHorizontal: SPACING.space4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: on ? colors.kid : colors.fill3,
                  }}
                >
                  <ThemedText variant="body" style={{ color: on ? colors.tintInk : colors.label }}>{label}</ThemedText>
                  <ThemedText variant="headline" style={{ color: on ? colors.tintInk : colors.label, fontVariant: ['tabular-nums'] }}>{i + 1}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <ThemedText variant="footnote" style={{ color: colors.label2, textAlign: 'center' }}>{t.shared}</ThemedText>
    </ScrollView>
  );
}
