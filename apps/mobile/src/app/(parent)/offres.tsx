import { router } from 'expo-router';
import { MaisonOfferCard } from '../../components/offres/MaisonOfferCard';
import { OffresView } from '../../components/offres/OffresView';
import { useCurrentPack } from '../../components/offres/useCurrentPack';
import { OFFRES_PROGRAMMES_IN_APP } from '../../lib/offresFlags';
import { useSubscriptionStore } from '../../stores/subscription.store';

// Y — Offres. Maison toujours en tête (achat intégré, prix lus de l'offering).
// Le bloc programmes (Groupe / Individuel / Complet, paiement Stripe, garantie, appel)
// n'est rendu que si EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP est vrai (GO 3, §7-R1).
export default function OffresScreen() {
  const sourceMaison = useSubscriptionStore((s) => s.access?.sourceMaison);
  const currentPack = useCurrentPack();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(parent)/maison'));
  return (
    <OffresView
      maison={<MaisonOfferCard included={sourceMaison === 'pack'} />}
      showPrograms={OFFRES_PROGRAMMES_IN_APP}
      currentPack={currentPack}
      onClose={close}
      onOpenProgram={(pack) => router.push({ pathname: '/(parent)/offres/[pack]', params: { pack } })}
      onBookCall={() => router.push('/(parent)/appel')}
    />
  );
}
