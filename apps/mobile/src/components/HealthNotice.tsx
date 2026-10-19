import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, RADIUS, SPACING, ThemedText, useTheme } from '../design';
import { LinkedText } from './aide/LinkedText';
import { consultPage } from './aide/logic';
import { useAuthStore } from '../stores/auth.store';

// Avertissement santé (Apple 1.4.1), affiché dans l'app. Pour un parent, la carte est un lien vers la page « Quand consulter »
// (K5, avec « Sans attendre » et les lignes d'aide du Québec). Cette page vit dans l'espace parent : un coach (autre groupe
// de routes) garde les lignes d'aide dans la carte, lues dans le même texte partagé. Habillé aux tokens du style courant.
export function HealthNotice() {
  const { colors } = useTheme();
  const router = useRouter();
  const isCoach = useAuthStore((s) => s.user?.role) === 'COACH';
  const page = consultPage();

  const body = (
    <View
      style={{
        backgroundColor: colors.bgGrouped2,
        borderRadius: RADIUS.card,
        padding: SPACING.space4,
        marginBottom: SPACING.space4,
        gap: SPACING.space1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.space2 }}>
        <ThemedText variant="headline">{page.title}</ThemedText>
        {isCoach ? null : <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.4} />}
      </View>
      <ThemedText variant="foot" color="label2" style={{ marginBottom: isCoach ? SPACING.space2 : 0 }}>
        THRIVE est un programme éducatif. Il ne remplace pas un avis médical, psychologique ou
        psychosocial. Arrêtez toute activité en cas de douleur ou de malaise.
      </ThemedText>
      {isCoach
        ? [page.urgent.text, ...page.whoToCall.items].map((line) => (
            <LinkedText key={line} text={line} variant="sub" color="label2" style={{ paddingVertical: SPACING.space1 }} />
          ))
        : null}
    </View>
  );

  if (isCoach) return body;
  return (
    <Pressable
      onPress={() => router.push('/(parent)/quand-consulter')}
      accessibilityRole="link"
      accessibilityLabel={page.title}
      accessibilityHint="Ouvre la page avec les numéros d’aide"
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {body}
    </Pressable>
  );
}
