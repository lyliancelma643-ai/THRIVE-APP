import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_LOGO, Icon, ThemedText, useTheme } from '../../design';
import { epochPalette } from './palette';

// W · Questionnaire de l'enfant (EPOCH, boutons 1 à 5). L'enfant n'a ni compte ni mot de passe.
// Écran de présentation seulement : la soumission (verrou 1 test/séance, migrations 047/053) reste
// côté appelant via `onAnswer`. Routé par `app/(parent)/questionnaire-enfant.tsx` (lien à jeton, RPC questionnaire_get / _submit).
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
    heading: 'Prise de pouls',
  },
  en: {
    hello: (n?: string) => (n ? `Hi ${n}!` : 'Hi!'),
    intro: 'There are no right or wrong answers. Answer how you feel these days.',
    shared: 'Your answers are shared with your coach.',
    step: (i: number, n: number) => `${i} of ${n}`,
    heading: 'Pulse check',
  },
} as const;

export type QuestionsScreenProps = {
  firstName?: string;
  lang?: QuestionsLang;
  /** Bascule FR / EN. Absent : le sélecteur reste affiché sans effet. */
  onLangChange?: (lang: QuestionsLang) => void;
  /** Libellé de la dimension (ex. Engagement). */
  dimension?: string;
  /** Énoncé de la question courante, fourni par la source de données. */
  question?: string;
  /** Numéro (1-indexé) de la question courante et total. */
  index?: number;
  total?: number;
  selected?: number | null;
  onAnswer?: (value: number) => void;
  /** Libellés des cinq réponses (l'échelle dépend du questionnaire : EPOCH ou LSSS). Absent : l'échelle EPOCH d'origine. */
  scale?: readonly string[];
  /** Sous la carte : navigation, bouton d'envoi, message d'erreur (fournis par l'appelant). */
  footer?: React.ReactNode;
};

/**
 * W · Questionnaire de l'enfant : interface ambrée (claire en Lin, sombre en Veillée), logo et
 * sélecteur FR/EN, accueil, progression, une question par carte avec cinq gros boutons 1 à 5, note de confidentialité.
 */
export default function QuestionsScreen({
  firstName, lang = 'fr', onLangChange, dimension, question, index = 1, total = 1, selected = null, onAnswer, scale, footer,
}: QuestionsScreenProps) {
  const { styleKey } = useTheme();
  const insets = useSafeAreaInsets();
  const p = epochPalette(styleKey);
  const t = COPY[lang];
  const pct = total > 0 ? Math.min(1, index / total) : 0;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image source={BRAND_LOGO} accessibilityLabel="THRIVE" accessibilityIgnoresInvertColors style={{ width: 34, height: 34, borderRadius: 9 }} />
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Langue"
          style={{ width: 104, height: 32, borderRadius: 16, padding: 2, flexDirection: 'row', backgroundColor: p.segTrack }}
        >
          {(['fr', 'en'] as const).map((l) => {
            const on = l === lang;
            return (
              <Pressable
                key={l}
                onPress={() => onLangChange?.(l)}
                accessibilityRole="tab"
                accessibilityLabel={l === 'fr' ? 'Français' : 'English'}
                accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: on ? p.segOn : 'transparent' }}
              >
                <ThemedText variant="sub" weight={on ? 600 : 500} style={{ fontSize: 13, lineHeight: 18, color: on ? p.segOnInk : p.ink }}>
                  {l.toUpperCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <ThemedText
          variant="largetitle"
          weight={600}
          accessibilityRole="header"
          style={{ color: p.ink, fontSize: 36, lineHeight: 40 }}
        >
          {t.hello(firstName)}
        </ThemedText>
        <ThemedText variant="callout" style={{ marginTop: 6, color: p.ink, opacity: 0.82 }}>{t.intro}</ThemedText>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t.step(index, total)}
        style={{ paddingHorizontal: 16, marginTop: 18 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText variant="foot" weight={600} style={{ color: p.ink }}>{t.heading}</ThemedText>
          <ThemedText variant="foot" weight={600} style={{ color: p.ink }}>{t.step(index, total)}</ThemedText>
        </View>
        <View style={{ height: 8, borderRadius: 4, marginTop: 6, backgroundColor: p.track }}>
          <View style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: p.accent }} />
        </View>
      </View>

      {question ? (
        <View
          style={{
            marginTop: 18, marginHorizontal: 16, borderRadius: 30, padding: 20, backgroundColor: p.card,
            shadowColor: '#783C00', shadowOpacity: p.cardShadow, shadowRadius: 11, shadowOffset: { width: 0, height: 8 }, elevation: p.cardShadow > 0 ? 2 : 0,
          }}
        >
          {dimension ? (
            <ThemedText variant="foot" weight={700} style={{ color: p.accent, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {dimension}
            </ThemedText>
          ) : null}
          <ThemedText variant="title3" style={{ marginTop: 6, color: p.ink }}>{question}</ThemedText>
          <View style={{ marginTop: 16, gap: 8 }}>
            {(scale ?? SCALE[lang]).map((label, i) => {
              const on = selected === i + 1;
              const ink = on ? p.selectedInk : p.ink;
              return (
                <Pressable
                  key={label}
                  onPress={() => onAnswer?.(i + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}, ${label}`}
                  accessibilityState={{ selected: on }}
                  style={{
                    height: 54, borderRadius: 27, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between', backgroundColor: on ? p.accent : p.option,
                  }}
                >
                  <ThemedText variant="headline" style={{ color: ink }}>{label}</ThemedText>
                  <ThemedText variant="headline" weight={800} style={{ color: ink }}>{String(i + 1)}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {footer ? <View style={{ marginTop: 14, paddingHorizontal: 16 }}>{footer}</View> : null}

      <View style={{ marginTop: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: 0.75 }}>
        <Icon name="eye" size={14} color={p.ink} />
        <ThemedText variant="foot" style={{ color: p.ink, textAlign: 'center' }}>{t.shared}</ThemedText>
      </View>
    </ScrollView>
  );
}
