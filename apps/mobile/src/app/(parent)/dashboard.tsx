import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren, useSessions } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';
import {
  Avatar, Card, LargeTitle, List, ListRow, NavBar, Section, SectionHeader, ThemedText, useLargeTitle, useNavBarHeight, useTheme,
} from '../../design';

// Tableau de bord (masqué de la barre, joignable) : mêmes données qu'avant, rhabillé aux primitives du canevas.
export default function ParentDashboard() {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  const { user } = useAuthStore();
  const router = useRouter();
  const { family, error: familyError, refetch: refetchFamily } = useFamily(user?.id);
  const { children, isLoading: childrenLoading, error: childrenError, refetch: refetchChildren } = useChildren(family?.id);

  const upcomingSessions = useSessions({ childId: children[0]?.id });
  const nextSessions = upcomingSessions.sessions.filter((s) => s.status === 'SCHEDULED').slice(0, 3);

  if ((familyError || childrenError) && !family && children.length === 0) {
    return <OfflineState onRetry={() => Promise.all([refetchFamily(), refetchChildren()])} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView onScroll={lt.onScroll} scrollEventThrottle={lt.scrollEventThrottle} contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}>
        <LargeTitle subtitle={family ? `Famille ${family.name}` : undefined}>{user?.firstName ?? 'Parent'}</LargeTitle>
        <Section style={{ marginTop: 14 }}>
          <BillingIssueBanner />
        </Section>

        <SectionHeader title="Mes enfants" action={{ label: 'Voir tout', onPress: () => router.push('/(parent)/children') }} />
        <Section>
          {childrenLoading ? (
            <ActivityIndicator />
          ) : children.length === 0 ? (
            <List>
              <ListRow glyph="plus" iconColor="tint" title="Ajouter un enfant" onPress={() => router.push('/(parent)/children')} />
            </List>
          ) : (
            <List>
              {children.map((child) => (
                <ListRow
                  key={child.id}
                  leading={<Avatar label={(child.first_name ?? '?')[0]} size={44} />}
                  leadingInset={72}
                  title={child.first_name}
                />
              ))}
            </List>
          )}
        </Section>

        <SectionHeader title="Prochaines séances" />
        <Section>
          {nextSessions.length === 0 ? (
            <Card>
              <ThemedText variant="sub" color="label2" style={{ textAlign: 'center' }}>Aucune séance planifiée</ThemedText>
            </Card>
          ) : (
            <List>
              {nextSessions.map((session) => (
                <ListRow
                  key={session.id}
                  glyph="calendar"
                  iconColor="sysBlue"
                  title={session.title}
                  subtitle={`Séance ${session.session_number}${session.scheduled_at ? ` · ${new Date(session.scheduled_at).toLocaleDateString('fr-CA')}` : ''}`}
                />
              ))}
            </List>
          )}
        </Section>

        <Section style={{ marginTop: 22 }}>
          <List>
            <ListRow glyph="home" iconColor="sysOrange" title="Le moment qui compte" subtitle="Votre activité de 10 minutes ce soir" onPress={() => router.push('/(parent)/maison')} />
            <ListRow glyph="medal" iconColor="sysIndigo" title="Programmes THRIVE" subtitle="Découvrir les programmes" onPress={() => router.push('/(parent)/programs')} />
          </List>
        </Section>
      </ScrollView>
      <NavBar title={user?.firstName ?? 'Parent'} titleVisible={lt.titleVisible} edge={lt.edge} />
    </View>
  );
}
