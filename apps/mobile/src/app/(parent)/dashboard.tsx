import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren, useSessions } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';
import { ListGroup, ListRow, SPACING, ThemedText, useTheme } from '../../design';

// Tableau de bord (masqué de la barre, joignable) : rhabillage aux tokens uniquement.
export default function ParentDashboard() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const router = useRouter();
  const { family, error: familyError, refetch: refetchFamily } = useFamily(user?.id);
  const { children, isLoading: childrenLoading, error: childrenError, refetch: refetchChildren } = useChildren(family?.id);

  const upcomingSessions = useSessions({ childId: children[0]?.id });
  const nextSessions = upcomingSessions.sessions.filter((s) => s.status === 'SCHEDULED').slice(0, 3);

  if ((familyError || childrenError) && !family && children.length === 0) {
    return <OfflineState onRetry={() => Promise.all([refetchFamily(), refetchChildren()])} />;
  }

  const card = { backgroundColor: colors.bgGrouped2, borderRadius: radius.card, padding: SPACING.space4, marginBottom: SPACING.space3 } as const;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ paddingTop: insets.top + SPACING.space4, paddingHorizontal: SPACING.space4, paddingBottom: SPACING.space8 }}
    >
      <ThemedText variant="footnote" color="label2">Bonjour</ThemedText>
      <ThemedText variant="largeTitle" accessibilityRole="header">{user?.firstName ?? 'Parent'}</ThemedText>
      {family && <ThemedText variant="subheadline" color="label2">Famille {family.name}</ThemedText>}

      <View style={{ marginTop: SPACING.space4 }}>
        <BillingIssueBanner />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.space3 }}>
          <ThemedText variant="title3" accessibilityRole="header">Mes enfants</ThemedText>
          <Pressable onPress={() => router.push('/(parent)/children')} accessibilityRole="button" accessibilityLabel="Voir tous mes enfants" style={{ minHeight: SPACING.touchMin, justifyContent: 'center' }}>
            <ThemedText variant="subheadline" color="label2">Voir tout</ThemedText>
          </Pressable>
        </View>

        {childrenLoading ? (
          <ActivityIndicator />
        ) : children.length === 0 ? (
          <Pressable onPress={() => router.push('/(parent)/children')} accessibilityRole="button" accessibilityLabel="Ajouter un enfant" style={[card, { alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, minHeight: SPACING.touchMin }]}>
            <ThemedText variant="subheadline" color="label2">Ajouter un enfant</ThemedText>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.space3, flexGrow: 0 }}>
            {children.map((child) => (
              <View key={child.id} style={[card, { width: 144, marginRight: SPACING.space3, marginBottom: 0 }]}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.kid, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.space2 }}>
                  <ThemedText variant="headline" style={{ color: colors.tintInk }}>{(child.first_name ?? '?')[0]}</ThemedText>
                </View>
                <ThemedText variant="headline">{child.first_name}</ThemedText>
              </View>
            ))}
          </ScrollView>
        )}

        <ThemedText variant="title3" accessibilityRole="header" style={{ marginTop: SPACING.space3, marginBottom: SPACING.space3 }}>Prochaines séances</ThemedText>
        {nextSessions.length === 0 ? (
          <View style={[card, { alignItems: 'center' }]}>
            <ThemedText variant="subheadline" color="label2">Aucune séance planifiée</ThemedText>
          </View>
        ) : (
          nextSessions.map((session) => (
            <View key={session.id} style={card}>
              <ThemedText variant="headline">{session.title}</ThemedText>
              <ThemedText variant="footnote" color="label2">
                Séance {session.session_number}
                {session.scheduled_at ? ` · ${new Date(session.scheduled_at).toLocaleDateString('fr-CA')}` : ''}
              </ThemedText>
            </View>
          ))
        )}

        <View style={{ marginTop: SPACING.space3 }}>
          <ListGroup>
            <ListRow icon="home" iconColor="sysOrange" title="Le moment qui compte" subtitle="Votre activité de 10 minutes ce soir" onPress={() => router.push('/(parent)/maison')} />
            <ListRow icon="trophy" iconColor="sysIndigo" title="Programmes THRIVE" subtitle="Découvrir les programmes" onPress={() => router.push('/(parent)/programs')} last />
          </ListGroup>
        </View>
      </View>
    </ScrollView>
  );
}
