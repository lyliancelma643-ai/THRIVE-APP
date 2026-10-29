import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadStages, type Stage } from '@thrive/shared';
import { WebSurfaceProvider, useWeb } from '../../design/web';
import { useAuthStore } from '../../stores/auth.store';
import { useChildStore, useSelectedChild } from '../../stores/child.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { usePageReadyStore, type TabKey } from '../../stores/pageReady.store';
import { DUR } from './anim';
import { MicroTip } from './MicroTip';
import { StairLoader } from './StairLoader';
import { LoadRetry } from '../hub/LoadRetry';

/** Durée minimale de la page de chargement d'un onglet, au premier accès. */
export const TAB_GATE_MIN_MS = 2000;

type GateSpec = { title: string; stages: (name: string | null) => Stage[] };

const SPECS: Record<TabKey, GateSpec> = {
  maison: {
    title: 'Ton espace se prépare',
    stages: (n) => [
      { key: 'session', label: 'Connexion sécurisée' },
      { key: 'profil', label: n ? `Le profil de ${n}` : 'Le profil de ton enfant' },
      { key: 'semaine', label: 'La semaine en cours' },
      { key: 'acces', label: 'Ton accès THRIVE Maison' },
    ],
  },
  bilan: {
    title: 'Le bilan se prépare',
    stages: (n) => [
      { key: 'session', label: 'Connexion sécurisée' },
      { key: 'profil', label: n ? `Le profil de ${n}` : 'Le profil de ton enfant' },
      { key: 'dossier', label: n ? `Le dossier de ${n}` : 'Le dossier de ton enfant' },
      { key: 'affichage', label: 'La carte d’identité' },
    ],
  },
  seances: {
    title: 'Tes séances se préparent',
    stages: (n) => [
      { key: 'session', label: 'Connexion sécurisée' },
      { key: 'profil', label: n ? `Le profil de ${n}` : 'Le profil de ton enfant' },
      { key: 'acces', label: 'Ton forfait' },
      { key: 'seances', label: 'Les 13 séances' },
    ],
  },
};

/** Le voile de chargement : l'escalier s'allume sur les étapes réelles, 2 s au minimum, puis s'efface. */
function GateOverlay({ tab, onGone }: { tab: TabKey; onGone: () => void }) {
  const w = useWeb();
  const insets = useSafeAreaInsets();
  const name = useSelectedChild()?.first_name ?? null;
  const spec = SPECS[tab];
  // Les libellés sont figés au premier affichage : le moteur ne repart pas si le prénom arrive en cours de route.
  const [stages] = useState(() => spec.stages(name));
  const fade = useRef(new Animated.Value(1)).current;
  const gone = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Une seule sortie, quelle que soit la voie (fin du fondu, filet de sécurité, « Réessayer »).
  const leave = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    onGone();
  }, [onGone]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const s = useLoadStages(stages, {
    showAfter: 0,
    minTotal: TAB_GATE_MIN_MS,
    onDone: () => {
      // Un instant pour voir le fanion planté, puis le voile s'efface sur la page déjà prête.
      const dur = w.reduceMotion ? DUR.fast : DUR.slow;
      timers.current.push(
        setTimeout(() => {
          Animated.timing(fade, { toValue: 0, duration: dur, useNativeDriver: true }).start(leave);
        }, 350),
        // Filet de sécurité : le rappel de fin d'une animation native peut ne jamais arriver (onglet détaché par
        // react-native-screens pendant le fondu, app passée en arrière-plan). Le voile part quand même.
        setTimeout(leave, 350 + dur + 250),
      );
    },
    onRetry: () => {
      const uid = useAuthStore.getState().user?.id;
      if (uid) void useChildStore.getState().loadChildren(uid);
      void useSubscriptionStore.getState().loadServerAccess();
    },
  });
  const { markDone } = s;

  // Étapes communes, lues dans les stores.
  const user = useAuthStore((st) => st.user);
  const childReady = useChildStore((st) => st.loaded && !st.isLoading);
  const serverAccess = useSubscriptionStore((st) => st.serverAccess);
  const access = useSubscriptionStore((st) => st.access);
  useEffect(() => { if (user) markDone('session'); }, [user, markDone]);
  useEffect(() => { if (childReady || name) markDone('profil'); }, [childReady, name, markDone]);
  useEffect(() => { if (serverAccess !== null || access) markDone('acces'); }, [serverAccess, access, markDone]);
  // Étapes propres à la page (signalées par la page elle-même, même avant le premier affichage).
  const marks = usePageReadyStore((st) => st.marks[tab]);
  useEffect(() => { marks.forEach((k) => markDone(k)); }, [marks, markDone]);

  // Bloqué au-delà de 20 s : « Réessayer » relance les lectures et laisse la page afficher son propre état.
  const retry = useCallback(() => {
    s.retry();
    leave();
  }, [s, leave]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: w.bg, opacity: fade, zIndex: 50, paddingTop: insets.top + 48, alignItems: 'center' }]}
      accessibilityViewIsModal
    >
      <View style={{ width: '100%', maxWidth: 520, paddingHorizontal: 20 }}>
        <StairLoader
          title={spec.title}
          doneTitle="C’est prêt."
          stages={stages}
          index={s.index}
          total={s.total}
          done={s.done}
          slow={s.slow}
          canRetry={s.canRetry}
          onRetry={retry}
          tip={<MicroTip context="ouverture" childName={name} />}
        />
      </View>
    </Animated.View>
  );
}

/**
 * Garde d'erreur propre à l'onglet : une erreur d'affichage dans Maison, Bilan ou Mes séances ne laisse ni page
 * blanche ni voile de chargement figé — l'onglet affiche « Réessayer », les deux autres continuent de vivre.
 */
class TabErrorBoundary extends Component<{ tab: TabKey; children: ReactNode }, { error: Error | null; round: number }> {
  state = { error: null as Error | null, round: 0 };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Le voile ne doit pas cacher l'erreur : l'onglet est considéré comme montré.
    usePageReadyStore.getState().reveal(this.props.tab);
    if (__DEV__) console.warn(`[TabGate:${this.props.tab}]`, error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <LoadRetry
          label="Cette page n’a pas pu s’afficher. Vérifie ta connexion, puis réessaie."
          onRetry={() => this.setState((st) => ({ error: null, round: st.round + 1 }))}
        />
      );
    }
    // `round` remonte entièrement l'arbre de l'onglet : aucun état cassé n'est conservé.
    return <View key={this.state.round} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}

function Cover() {
  const w = useWeb();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: w.bg, zIndex: 50 }]} />;
}

/**
 * Premier accès à un onglet (Maison, Bilan, Mes séances) : une page de chargement de 2 s minimum, qui ne s'efface
 * qu'une fois la page ENTIÈREMENT prête dessous (données lues, carte affichée). La page se charge pendant ce temps,
 * cachée sous le voile. Ensuite, l'onglet reste monté : plus jamais de page de chargement dans la session.
 */
export function TabGate({ tab, children }: { tab: TabKey; children: ReactNode }) {
  const w = useWeb();
  const revealed = usePageReadyStore((st) => st.revealed[tab]);
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
    }, []),
  );
  const onGone = useMemo(() => () => usePageReadyStore.getState().reveal(tab), [tab]);
  return (
    <View style={{ flex: 1, backgroundColor: w.bg }}>
      <TabErrorBoundary tab={tab}>{children}</TabErrorBoundary>
      {revealed ? null : (
        <WebSurfaceProvider surface={tab === 'maison' ? 'maison' : 'base'}>
          {focused ? <GateOverlay tab={tab} onGone={onGone} /> : <Cover />}
        </WebSurfaceProvider>
      )}
    </View>
  );
}
