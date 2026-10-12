import { View, ScrollView } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useRouter } from 'expo-router';
import { AccountPrivacySection } from '../../components/AccountPrivacySection';
import { HealthNotice } from '../../components/HealthNotice';
import { SubscriptionSettings } from '../../components/subscription/SubscriptionSettings';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';
import { StylePicker } from '../../components/account/StylePicker';
import { ListGroup, ListRow, SPACING, ThemedText, useTheme } from '../../design';

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText variant="footnote" color="label2" accessibilityRole="header" style={{ paddingHorizontal: SPACING.space4, paddingBottom: SPACING.space1 }}>
      {children}
    </ThemedText>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { colors } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const ROLE_LABELS: Record<string, string> = { PARENT: 'Parent', COACH: 'Coach' };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgGrouped }} contentContainerStyle={{ paddingHorizontal: SPACING.space4, paddingTop: SPACING.space8 * 2, paddingBottom: SPACING.space8 * 2 }}>
      <ThemedText variant="largeTitle" accessibilityRole="header" style={{ marginBottom: SPACING.space5 }}>Compte & famille</ThemedText>

      <View style={{ marginBottom: SPACING.space5 }}>
        <SectionTitle>Mon profil</SectionTitle>
        <ListGroup>
          <ListRow title="Prénom" value={user?.firstName ?? '—'} />
          <ListRow title="Nom" value={user?.lastName ?? '—'} />
          <ListRow title="Email" value={user?.email ?? '—'} />
          <ListRow title="Rôle" value={ROLE_LABELS[user?.role ?? ''] ?? '—'} last />
        </ListGroup>
      </View>

      <View style={{ marginBottom: SPACING.space5 }}>
        <SectionTitle>Style de l’app</SectionTitle>
        <StylePicker />
      </View>

      <BillingIssueBanner />
      <View style={{ marginHorizontal: -SPACING.space4 }}>
        <SubscriptionSettings />
      </View>

      <View style={{ marginBottom: SPACING.space4 }}>
        <ListGroup>
          <ListRow icon="people" iconColor="sysTeal" title="Mes enfants" onPress={() => router.push('/(parent)/children')} />
          <ListRow icon="notifications" iconColor="sysOrange" title="Notifications" onPress={() => router.push('/(parent)/notifications')} last />
        </ListGroup>
      </View>

      <HealthNotice />
      <AccountPrivacySection />

      <ListGroup>
        <ListRow title="Se déconnecter" destructive last onPress={handleSignOut} />
      </ListGroup>
    </ScrollView>
  );
}
