import { useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { AbonnementFrame } from '../components/subscription/AbonnementFrame';
import { AppelView, type CallMode } from '../components/offres/AppelView';
import { MaisonOfferCardView } from '../components/offres/MaisonOfferCard';
import { OffresView } from '../components/offres/OffresView';
import { ProgrammePaiementView } from '../components/offres/ProgrammePaiementView';
import type { ProgramPaymentMode } from '../services/programPayments';
import { PaywallView } from '../components/subscription/PaywallView';
import { SubscriptionView } from '../components/subscription/SubscriptionView';
import { useTheme } from '../design';
import {
  DEMO_COHORT, DEMO_DAYS, DEMO_PROGRAM, DEMO_VISIO_NOTE, demoMaisonOffer, demoPaywallContent, demoSubscriptionModel,
} from './fixtures/offres';
import type { GalleryScreen } from './types';


/** Zone sûre de l'iPhone de la maquette (402 × 874) : barre d'état 54, indicateur d'accueil 34 (le web n'en a pas). */
function Phone({ children }: { children: ReactNode }) {
  return <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>{children}</SafeAreaInsetsContext.Provider>;
}

const noop = () => undefined;

function D2() {
  const [sel, setSel] = useState('$rc_annual');
  return (
    <Phone>
      <PaywallView
        {...demoPaywallContent(sel)}
        onSelect={setSel}
        canSell
        busy={null}
        terms={{ onPress: noop }}
        privacy={{ onPress: noop }}
        onBuy={noop}
        onRestore={noop}
        onRetry={noop}
        onClose={noop}
      />
    </Phone>
  );
}

function Y() {
  const { style } = useTheme();
  // Le style Nuit calme montre un parent abonné (« Ton abonnement ») sans programme ; Carnet : programme Complet.
  const badge = style === 'nuit' ? 'abonnement' : 'inclus';
  const currentPack = style === 'natif' ? 'individuel' : style === 'carnet' ? 'complet' : null;
  return (
    <Phone>
      <OffresView
        maison={<MaisonOfferCardView data={demoMaisonOffer(badge)} />}
        showPrograms
        currentPack={currentPack}
        visioNote={DEMO_VISIO_NOTE}
        onClose={noop}
        onOpenProgram={noop}
        onBookCall={noop}
      />
    </Phone>
  );
}

function Y2() {
  const [mode, setMode] = useState<ProgramPaymentMode>('deux_versements');
  return (
    <Phone>
      <ProgrammePaiementView program={DEMO_PROGRAM} mode={mode} onModeChange={setMode} cohort={DEMO_COHORT} onPay={noop} onBack={noop} onShare={noop} />
    </Phone>
  );
}

function Y3() {
  const [mode, setMode] = useState<CallMode>('video');
  const [day, setDay] = useState('2026-10-14');
  const [slot, setSlot] = useState<string | null>(DEMO_DAYS[1].slots[3].iso);
  const [calendar, setCalendar] = useState(true);
  return (
    <Phone>
      <AppelView
        mode={mode}
        onModeChange={setMode}
        days={DEMO_DAYS}
        selectedDayKey={day}
        onSelectDay={(k) => { setDay(k); setSlot(null); }}
        selectedSlot={slot}
        onSelectSlot={setSlot}
        calendar={calendar}
        onCalendarChange={setCalendar}
        bookLabel={slot && day === '2026-10-14' ? 'Réserver mardi 14 oct. · 18 h 30' : 'Choisis un créneau'}
        canBook={!!slot}
        onBook={noop}
        onClose={noop}
      />
    </Phone>
  );
}

function X2() {
  const { style } = useTheme();
  const state = style === 'nuit' ? 'essai' : 'programme';
  return (
    <Phone>
      <AbonnementFrame onBack={noop}>
        <SubscriptionView
          model={demoSubscriptionModel(state, style === 'carnet' ? 'Complet' : 'Individuel')}
          storeName="l’App Store"
          deviceLabel="Sur cet iPhone"
          onManage={noop}
          onRestore={noop}
          onDiscover={noop}
        />
      </AbonnementFrame>
    </Phone>
  );
}

/** Écrans du lot « offres » rendus avec des fixtures (DEV uniquement). */
export const screens: GalleryScreen[] = [
  { id: 'D2', title: 'Essai gratuit de Maison', tab: null, render: () => <D2 /> },
  { id: 'Y', title: 'Offres', tab: null, render: () => <Y /> },
  { id: 'Y2', title: 'Groupe · paiement', tab: null, render: () => <Y2 /> },
  { id: 'Y3', title: 'Appel de 15 min', tab: null, render: () => <Y3 /> },
  { id: 'X2', title: 'Mon abonnement', tab: null, render: () => <X2 /> },
];
