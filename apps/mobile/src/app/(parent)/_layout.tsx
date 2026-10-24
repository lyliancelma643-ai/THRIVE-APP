import { Tabs } from 'expo-router';
import {
  FloatingTabBar,
  HIDDEN_FROM_BAR,
  activeTabKey,
  tabLayoutFor,
  useTheme,
  type ParentRoute,
} from '../../design';
import { useTrialReminder } from '../../hooks/useTrialReminder';
import { HubProvider, useHub } from '../../components/hub/HubProvider';
import { UpgradeProvider } from '../../components/hub/UpgradeSheet';

// Espace parent. Les six routes (dashboard, maison, bilans, seances, messages, profile) restent
// déclarées et joignables ; la barre flottante n'en montre que trois + l'onglet Prominent,
// selon le style (Lin : Coach / Veillée : Ce soir — cf. design/tabConfig.ts).
// Les écrans secondaires sont masqués de la barre avec `href: null`.
const HIDDEN = [
  ...HIDDEN_FROM_BAR,
  'children',
  'programs',
  'badges',
  'notifications',
  'abonnement',
  'chat/[conversationId]',
  'activite/[activityId]',
  'moment/[activityId]',
  'parcours',
  'carnet',
  'toutes',
  'programme',
  'sources',
  'videos',
  'fin-de-parcours',
  'offres',
  'offres/[pack]',
  'objet/[rewardId]',
  'quand-il-dit-non',
  'quand-consulter',
  'appel',
  'video/[step]',
  'questionnaire-enfant',
];

// Écrans plein écran du canevas (fiche moment, moment en cours, séance vidéo) : sans barre d'onglets.
const FULL_SCREEN = new Set(['moment/[activityId]', 'video/[step]', 'questionnaire-enfant']);

type BarProps = {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
};

function ParentTabBar({ state, navigation }: BarProps) {
  const { styleKey } = useTheme();
  const { unreadMessages } = useHub();
  const layout = tabLayoutFor(styleKey);
  const { tabs, prominent } = layout;
  const activeRoute = state.routes[state.index]?.name as ParentRoute | undefined;
  if (activeRoute && FULL_SCREEN.has(activeRoute)) return null;
  const go = (route: string) => navigation.navigate(route);
  // Les droits (cadenas « Maison seul ») sont lus par les écrans eux-mêmes via access_state() : la barre ne les recalcule pas.
  return (
    <FloatingTabBar
      tabs={tabs.map((t) => ({ key: t.route, label: t.label, glyph: t.glyph }))}
      activeKey={activeTabKey(layout, activeRoute)}
      onSelect={go}
      prominent={{
        key: 'prominent',
        label: prominent.label,
        glyph: prominent.glyph,
        onPress: () => go(prominent.route),
        badge: prominent.route === 'messages' ? unreadMessages : 0,
      }}
    />
  );
}

export default function ParentLayout() {
  // Rappel local à J-3 de la fin du mois gratuit (Maison), sans lien ni prix.
  useTrialReminder();
  return (
    <HubProvider>
    <UpgradeProvider>
    <Tabs
      // « shift » : la page glisse à l'horizontale vers l'onglet choisi (TabPager du web).
      screenOptions={{ headerShown: false, animation: 'shift' }}
      tabBar={(props) => <ParentTabBar {...(props as unknown as BarProps)} />}
    >
      <Tabs.Screen name="maison" options={{ title: 'Maison' }} />
      <Tabs.Screen name="bilans" options={{ title: 'Bilan' }} />
      <Tabs.Screen name="seances" options={{ title: 'Mes séances' }} />
      {HIDDEN.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
    </UpgradeProvider>
    </HubProvider>
  );
}

export { ErrorBoundary } from '../../components/ErrorBoundary';
