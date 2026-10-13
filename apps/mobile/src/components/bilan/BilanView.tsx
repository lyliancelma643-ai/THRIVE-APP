import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { GlassPair, MenuPopover, NavBar, useLargeTitle, useNavBarHeight, useTheme } from '../../design';
import { ReadOnlyNotice } from '../access/LockedSection';
import { ChildPill } from './Chrome';
import { emptyExtras, type BilanExtras, type CardKey } from './bilanPage';
import type { AccentKey, StepStatus } from './bilanData';
import type { CoachDetailKind } from './CoachDetailSheet';
import {
  CertificatCard, ContratCard, EmotionsCard, FocusCard, IdentityCard, LettreCard, ObjectifCard, ParcoursCard, PassportRow,
  ProgrammeHeader, Reminders, RoutineCard, SkillsCard, StepsCard, ToolboxCard, ToolsTitle, WellbeingCard,
} from './BilanCards';

// G — Bilan : la page complète du passeport (toutes les cartes de la page web, dans l'ordre), en Lin et en Veillée.
// Vue PRÉSENTATIONNELLE : tout vient des props (la route lit access_state(), les RPC et les tables RLS).
// Les fiches (G3 à G10), « Comprendre cette carte » (I) et Personnaliser (J) sont des feuilles ouvertes par les actions.

export type BilanModel = {
  firstName: string;
  displayName: string;
  fullName: string;
  initial: string;
  jersey: number | null;
  photoUri: string | null;
  accent: AccentKey | null;
  sportLine: string;
  club: string | null;
  coachFirst: string | null;
  strength: string | null;
  done: number;
  gaugeGlobal: number | null;
  delta: number | null;
  /** Bien-être par séance, sur 5. */
  wellbeing: number[];
  smart: string | null;
  toolbox: string[];
  steps: { status: StepStatus }[];
  docs: string[];
  quote: { text: string; tag: string } | null;
  focusWord: string | null;
  pendingQuestionnaire: boolean;
  readonly: boolean;
  childOptions: { id: string; label: string }[];
  activeChildId: string | null;
  parentInitial: string;
};

export type BilanActions = {
  onSkills: () => void;
  onPersonalize: () => void;
  onBell: () => void;
  onSelectChild: (id: string) => void;
  onQuestionnaire: () => void;
  /** Ouvre une fiche détaillée (G3 à G10). */
  onRow: (kind: CoachDetailKind) => void;
  /** Ouvre « Comprendre cette carte » (I) pour les cartes sans fiche détaillée. */
  onInfo?: (key: string) => void;
  /** Questionnaire de bien-être à remplir (rappel de la page). */
  onWellbeingQuestionnaire?: () => void;
  /** Télécharge un document (contrat, lettre, certificat) via URL signée. */
  onOpenDoc?: (docId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

type Props = {
  m: BilanModel;
  a: BilanActions;
  /** Données complémentaires de la page ; absentes (galerie, chargement) = cartes à l'état « à venir ». */
  x?: BilanExtras;
  /** Carte visée par une notification (?focus=…) : la page défile instantanément jusqu'à elle. */
  focus?: CardKey | null;
};

export function BilanView({ m, a, x: extras, focus = null }: Props) {
  const { colors } = useTheme();
  const x = extras ?? emptyExtras();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  const [menu, setMenu] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Partial<Record<CardKey, number>>>({});
  const [laidOut, setLaidOut] = useState(0);
  const multiple = m.childOptions.length > 1;

  // Arrivée depuis une notification : défilement INSTANTANÉ (un défilement animé est avorté par les rechargements).
  useEffect(() => {
    const y = focus ? ys.current[focus] : undefined;
    if (focus && y != null) scroll.current?.scrollTo({ y: Math.max(0, y - navH - 8), animated: false });
  }, [focus, laidOut, navH]);

  const at = (key: CardKey) => (e: LayoutChangeEvent) => {
    ys.current[key] = e.nativeEvent.layout.y;
    setLaidOut((n) => n + 1);
  };
  const block = (key: CardKey, node: React.ReactNode, top = 12) => (
    <View key={key} onLayout={at(key)} style={{ paddingHorizontal: 16, marginTop: top }}>{node}</View>
  );
  const reminders = m.pendingQuestionnaire || x.pendingWellbeing;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="bilan-ouvert">
      <ScrollView
        ref={scroll}
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH + 8, paddingBottom: 48 }}
        refreshControl={a.onRefresh ? <RefreshControl refreshing={!!a.refreshing} onRefresh={a.onRefresh} tintColor={colors.label2} /> : undefined}
      >
        {m.readonly ? <View style={{ paddingHorizontal: 16 }}><ReadOnlyNotice /></View> : null}
        {reminders ? block('rappels', <Reminders m={m} x={x} a={a} />, 0) : null}
        {block('programme', <ProgrammeHeader x={x} a={a} />, reminders ? 20 : 8)}
        {block('passeport', <PassportRow m={m} a={a} />, 24)}
        {block('competences', <SkillsCard m={m} x={x} a={a} />, 16)}
        {block('bienetre', <WellbeingCard x={x} a={a} />)}
        {block('parcours', <ParcoursCard x={x} a={a} />)}
        {block('boite', <ToolboxCard x={x} a={a} />)}
        {block('etapes', <StepsCard x={x} a={a} />)}
        <View onLayout={at('outils')} style={{ paddingHorizontal: 16, marginTop: 12 }}><ToolsTitle x={x} /></View>
        {block('identite', <IdentityCard x={x} a={a} />, 4)}
        {block('objectif', <ObjectifCard x={x} a={a} />)}
        {block('focus', <FocusCard x={x} a={a} />)}
        {block('emotions', <EmotionsCard x={x} a={a} />)}
        {block('routine', <RoutineCard x={x} a={a} />)}
        {block('contrat', <ContratCard m={m} x={x} a={a} />)}
        {block('lettre', <LettreCard m={m} x={x} a={a} />)}
        {block('certificat', <CertificatCard x={x} a={a} />)}
      </ScrollView>

      <NavBar
        title="Bilan"
        edge={lt.edge}
        left={<ChildPill name={m.displayName} initial={m.initial} accent={m.accent} photoUri={m.photoUri} multiple={multiple} onPress={() => setMenu(true)} />}
        right={
          <GlassPair
            items={[
              { glyph: 'pencil', accessibilityLabel: 'Personnaliser le passeport', onPress: a.onPersonalize },
              { glyph: 'bell', accessibilityLabel: 'Notifications', onPress: a.onBell },
            ]}
          />
        }
      />

      <MenuPopover
        visible={menu}
        onClose={() => setMenu(false)}
        top={navH}
        left={16}
        items={m.childOptions.map((c) => ({ key: c.id, label: c.label, checked: c.id === m.activeChildId, onPress: () => a.onSelectChild(c.id) }))}
      />
    </View>
  );
}
