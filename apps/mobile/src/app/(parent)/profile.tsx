import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useChildren, useFamily } from '@thrive/shared';
import { AccountPrivacySection } from '../../components/AccountPrivacySection';
import { HealthNotice } from '../../components/HealthNotice';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';
import { AccountView } from '../../components/account/AccountView';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useStyleChoice } from '../../design';
import { useSubscriptionStore } from '../../stores/subscription.store';

function calculateAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

/** Compte & famille (maquette X). Mêmes données et mêmes actions qu'avant : identité, abonnement, style, enfants, légal, déconnexion. */
export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { styleKey, setStyle } = useStyleChoice();
  const ent = useEntitlement();
  const access = useSubscriptionStore((s) => s.access);
  const { family } = useFamily(user?.id);
  const { children } = useChildren(family?.id);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const fromProgram = access?.sourceMaison === 'pack';
  const days = ent.expirationDate ? Math.max(0, Math.ceil((new Date(ent.expirationDate).getTime() - Date.now()) / 86400000)) : null;
  const maisonValue = ent.isLoading
    ? '…'
    : fromProgram
      ? 'Inclus'
      : ent.isSubscribed
        ? ent.isTrial && days !== null ? `Essai · ${days} j` : 'Actif'
        : ent.hasAccess ? 'Inclus' : 'Aucun';
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  return (
    <AccountView
      name={name}
      email={user?.email ?? ''}
      programValue={fromProgram ? 'Actif' : 'Aucun'}
      maisonValue={ent.isStaff ? undefined : maisonValue}
      styleChoice={styleKey}
      onChangeStyle={setStyle}
      family={children.map((c) => ({ id: c.id, firstName: c.first_name, ageLabel: `${calculateAge(c.date_of_birth)} ans` }))}
      onOpenProgram={() => router.push('/(parent)/offres')}
      onOpenMaison={() => router.push('/(parent)/abonnement')}
      onOpenOffers={() => router.push('/(parent)/offres')}
      onOpenChild={(childId) => router.push({ pathname: '/(parent)/badges', params: { childId } })}
      onOpenChildren={() => router.push('/(parent)/children')}
      onOpenNotifications={() => router.push('/(parent)/notifications')}
      onOpenFavorites={ent.isStaff ? undefined : () => router.push('/(parent)/favoris')}
      onDone={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'))}
      onSignOut={handleSignOut}
      top={<BillingIssueBanner />}
      beforeData={<HealthNotice />}
      data={<AccountPrivacySection />}
    />
  );
}
