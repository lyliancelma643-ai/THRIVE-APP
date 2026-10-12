import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassSurface, RADIUS, SPACING, ThemedText, useGlassMode, useTheme } from '../../design';

// Onglet Bilan / Mes séances verrouillé (abonné Maison seul, aucun droit, fermeture
// Super Admin). Le contenu est un SQUELETTE FACTICE flouté : aucune donnée
// réelle n'est chargée (la RLS les refuse de toute façon, migration 080).
//
// Anti-steering Apple 3.1.1 / Google Play (GO 3 §1 règle 3) : AUCUN bouton, AUCUN
// lien, AUCUN prix, AUCUNE mention de paiement ou d'offre. Texte neutre seulement ;
// l'état d'accès vient d'access_state(), jamais recalculé ici.

const COPY = {
  bilan: {
    title: 'Le Bilan de votre enfant',
    body: 'Cette section s’ouvre avec le suivi d’un coach.',
  },
  seances: {
    title: 'Mes séances',
    body: 'Cette section s’ouvre avec le suivi d’un coach.',
  },
} as const;

function Skeleton() {
  const { colors, radius } = useTheme();
  const block = { backgroundColor: colors.bgGrouped2, borderRadius: radius.card } as const;
  return (
    <View style={{ paddingHorizontal: SPACING.space4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[block, { height: 144, marginBottom: SPACING.space3 }]} />
      <View style={{ flexDirection: 'row', marginBottom: SPACING.space3 }}>
        <View style={[block, { flex: 1, height: 96, marginRight: SPACING.space2 }]} />
        <View style={[block, { flex: 1, height: 96, marginLeft: SPACING.space2 }]} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[block, { height: 64, marginBottom: SPACING.space3, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.space4 }]}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill }} />
          <View style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: colors.fill, marginLeft: SPACING.space3 }} />
        </View>
      ))}
    </View>
  );
}

export function LockedSection({ section }: { section: 'bilan' | 'seances' }) {
  const { colors, isDark } = useTheme();
  const mode = useGlassMode();
  const copy = COPY[section];
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID={`locked-${section}`}>
      <View style={{ paddingTop: 72 }}>
        <Skeleton />
      </View>
      {mode === 'opaque' ? (
        <View style={[fill, { backgroundColor: colors.bgGrouped, opacity: 0.88 }]} />
      ) : (
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={fill} />
      )}
      <View style={[fill, { justifyContent: 'center', paddingHorizontal: SPACING.space4 }]}>
        <GlassSurface strong radius={RADIUS.card}>
          <View style={{ padding: SPACING.space6, alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={22} color={colors.accentInk} />
            </View>
            <ThemedText variant="title3" accessibilityRole="header" style={{ marginTop: SPACING.space4, textAlign: 'center' }}>
              {copy.title}
            </ThemedText>
            <ThemedText variant="subheadline" color="label2" style={{ marginTop: SPACING.space2, textAlign: 'center' }}>
              {copy.body}
            </ThemedText>
          </View>
        </GlassSurface>
      </View>
    </View>
  );
}

/** Pack terminé : historique consultable, rien de nouveau. */
export function ReadOnlyNotice() {
  const { colors, radius } = useTheme();
  return (
    <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: radius.card, padding: SPACING.space4, marginBottom: SPACING.space3, flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="lock-closed" size={18} color={colors.label2} />
      <ThemedText variant="subheadline" color="label2" style={{ marginLeft: SPACING.space3, flex: 1 }}>
        Votre programme est terminé. L’historique reste consultable ; rien de nouveau ne s’y ajoute.
      </ThemedText>
    </View>
  );
}
