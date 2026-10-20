import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../design';
import type { GalleryScreen } from './types';
import { BilanView, type BilanActions } from '../components/bilan/BilanView';
import { LockedScreen } from '../components/access/LockedSection';
import { LifeSkillsSheet, PersonalizeView } from '../components/bilan/BilanSheets';
import { SeancesView } from '../components/bilan/SeancesView';
import { SessionReportView } from '../components/bilan/SessionReportView';
import { ThreadView } from '../components/bilan/ThreadView';
import { NotificationsView } from '../components/bilan/NotificationsView';
import { DEMO_CHILD, LEO_EXTRAS, LEO_EXTRAS_GROUPE } from './fixtures/bilanPage';
import { CoachDetailSheet, type CoachDetailKind } from '../components/bilan/CoachDetailSheet';
import { InfoSheet } from '../components/bilan/InfoSheet';
import { ObjectView } from '../components/maison/objets/ObjectView';
import { OBJET_CERTIFICAT, OBJET_IDENTITE, OBJET_OUTILS } from './fixtures/objets';
import { BASELINES, BY_SKILL, LEO, LSSS, NOTIFS, REPORT, SEANCES, THREAD } from './fixtures/bilan';

/** Écrans du lot « bilan » (G H I J S T U V) rendus avec des fixtures (DEV uniquement). */

const noop = () => {};
const actions: BilanActions = {
  onSkills: noop, onPersonalize: noop, onBell: noop, onSelectChild: noop, onQuestionnaire: noop, onRow: noop, onInfo: noop, onOpenDoc: noop,
};

const GOpen = () => <BilanView m={LEO} x={LEO_EXTRAS} a={actions} />;
const GGroupe = () => <BilanView m={LEO} x={LEO_EXTRAS_GROUPE} a={actions} />;
const GLocked = () => <LockedScreen kind="bilan" childName={DEMO_CHILD.name} childInitial={DEMO_CHILD.initial} onOffers={noop} onWrite={noop} onCall={noop} onBell={noop} />;
/** État de la maquette : V2 montre le verrou, V1 et V3 l'état ouvert. */
const GMaquette = () => (useTheme().styleKey === 'veillee' ? <GLocked /> : <GOpen />);

const Behind = ({ children }: { children: React.ReactNode }) => {
  const { styleKey } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {styleKey === 'veillee' ? <GLocked /> : <GOpen />}
      {children}
    </View>
  );
};
const HScreen = ({ withI }: { withI?: boolean }) => (
  <Behind>
    <LifeSkillsSheet
      visible onClose={noop} lsss={LSSS} gauge={{ global: 67, sample_size: 43, by_skill: BY_SKILL }} baselines={BASELINES} onInfo={noop}
      understandVisible={!!withI} onCloseUnderstand={noop}
    />
  </Behind>
);

const SheetScreen = ({ kind }: { kind: CoachDetailKind }) => (
  <Behind><CoachDetailSheet kind={kind} onClose={noop} firstName={DEMO_CHILD.name} x={LEO_EXTRAS} onOpenDoc={noop} /></Behind>
);
const DETAILS: [string, string, CoachDetailKind][] = [
  ['G3', 'Fiche Identité Athlète', 'identite'], ['G4', 'Fiche Objectif', 'objectif'], ['G5', 'Focus Word', 'focus'], ['G6', 'Routine pré-tir', 'routine'],
  ['G7', 'Boîte à outils', 'boite'], ['G8', 'Prochaines étapes', 'etapes'], ['G9', 'Lettre à moi-même', 'lettre'], ['G10', 'Certificat', 'certificat'],
];

const JScreen = () => {
  const [nick, setNick] = useState<string>(DEMO_CHILD.nickname);
  const [num, setNum] = useState<string>(DEMO_CHILD.jersey);
  const [accent, setAccent] = useState<'sun' | 'amber' | 'teal' | 'sky' | 'coral' | 'violet' | null>(useTheme().styleKey === 'lin' ? 'sky' : 'sun');
  return (
    <PersonalizeView
      name={DEMO_CHILD.name} initial={DEMO_CHILD.initial} jersey={num} onJersey={setNum} nickname={nick} onNickname={setNick} accent={accent} onAccent={setAccent}
      position={DEMO_CHILD.position} onPickPhoto={noop} onCancel={noop} onSave={noop}
    />
  );
};

const ObjetScreen = ({ model }: { model: typeof OBJET_IDENTITE }) => (
  <ObjectView model={model} cardRef={{ current: null }} onBack={noop} onHome={noop} onPrint={noop} onSaveImage={noop} onShare={noop} />
);

const SOpen = () => <SeancesView m={SEANCES} a={{ onOpenReport: noop, onSelectChild: noop }} />;
const SLocked = () => <LockedScreen kind="seances" childName={DEMO_CHILD.name} onOffers={noop} onWrite={noop} onCall={noop} onCalendar={noop} />;
/** V4 (Lin) et V5 (Veillée) montrent S ouvert ; le verrou est l'écran S2. */
const SMaquette = () => <SOpen />;

const TScreen = () => <SessionReportView m={REPORT} onBack={noop} onShare={noop} />;

const UOpen = () => (
  <ThreadView title="Coach Lylian" initial="L" messages={THREAD} input="" onInput={noop} onSend={noop} onBack={noop} />
);
const ULocked = () => <LockedScreen kind="messages" onOffers={noop} onCall={noop} onBack={noop} />;
/** V4 et V5 montrent U ouvert ; le verrou est l'écran U2. */
const UMaquette = () => <UOpen />;

const VScreen = () => (
  <NotificationsView items={NOTIFS} unreadCount={2} pushEnabled onTogglePush={noop} onBack={noop} onReadAll={noop} onOpen={noop} onDelete={noop} />
);

export const screens: GalleryScreen[] = [
  { id: 'G', title: 'Bilan (état de la maquette)', tab: 'bilans', render: () => <GMaquette /> },
  { id: 'G-ouvert', title: 'Bilan ouvert', tab: 'bilans', render: () => <GOpen /> },
  { id: 'G-verrou', title: 'Bilan verrouillé (G2)', tab: 'bilans', render: () => <GLocked /> },
  { id: 'G2', title: 'Bilan verrouillé (G2)', tab: 'bilans', render: () => <GLocked /> },
  { id: 'G11', title: 'Bilan forfait Groupe', tab: 'bilans', render: () => <GGroupe /> },
  ...DETAILS.map(([id, title, kind]): GalleryScreen => ({ id, title, tab: null, render: () => <SheetScreen kind={kind} /> })),
  { id: 'H', title: 'Compétences de vie', tab: null, render: () => <HScreen /> },
  { id: 'I', title: 'Comprendre cette carte', tab: null, render: () => <Behind><InfoSheet visible onClose={noop} cardKey="competences" /></Behind> },
  { id: 'J', title: 'Personnaliser', tab: null, render: () => <JScreen /> },
  { id: 'N2', title: 'Objet · Fiche Identité', tab: null, render: () => <ObjetScreen model={OBJET_IDENTITE} /> },
  { id: 'N3', title: 'Objet · Boîte à Outils', tab: null, render: () => <ObjetScreen model={OBJET_OUTILS} /> },
  { id: 'N4', title: 'Objet · Certificat', tab: null, render: () => <ObjetScreen model={OBJET_CERTIFICAT} /> },
  { id: 'S', title: 'Mes séances (état de la maquette)', tab: 'seances', render: () => <SMaquette /> },
  { id: 'S-ouvert', title: 'Mes séances ouvert', tab: 'seances', render: () => <SOpen /> },
  { id: 'S-verrou', title: 'Mes séances verrouillé', tab: 'seances', render: () => <SLocked /> },
  { id: 'S2', title: 'Mes séances verrouillé (S2)', tab: 'seances', render: () => <SLocked /> },
  { id: 'T', title: 'Bilan du coach', tab: null, render: () => <TScreen /> },
  { id: 'U', title: 'Messages (état de la maquette)', tab: 'messages', render: () => <UMaquette /> },
  { id: 'U-ouvert', title: 'Messages ouvert', tab: 'messages', render: () => <UOpen /> },
  { id: 'U-verrou', title: 'Messages verrouillé', tab: 'messages', render: () => <ULocked /> },
  { id: 'U2', title: 'Messages verrouillé (U2)', tab: 'messages', render: () => <ULocked /> },
  { id: 'V', title: 'Notifications', tab: null, render: () => <VScreen /> },
];
