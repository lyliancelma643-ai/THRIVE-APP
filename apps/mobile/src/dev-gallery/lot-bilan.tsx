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
import { BASELINES, BY_SKILL, LEO, LSSS, NOTIFS, REPORT, SEANCES, THREAD } from './fixtures/bilan';

/** Écrans du lot « bilan » (G H I J S T U V) rendus avec des fixtures (DEV uniquement). */

const noop = () => {};
const actions: BilanActions = {
  onSkills: noop, onPersonalize: noop, onBell: noop, onSelectChild: noop, onQuestionnaire: noop, onRow: noop,
};

const GOpen = () => <BilanView m={LEO} a={actions} />;
const GLocked = () => <LockedScreen kind="bilan" childName="Léo" childInitial="L" onOffers={noop} onWrite={noop} onCall={noop} onBell={noop} />;
/** État de la maquette : V2 montre le verrou, V1 et V3 l'état ouvert. */
const GMaquette = () => (useTheme().style === 'nuit' ? <GLocked /> : <GOpen />);

const Behind = ({ children }: { children: React.ReactNode }) => {
  const { style } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {style === 'nuit' ? <GLocked /> : <GOpen />}
      {children}
    </View>
  );
};
const HScreen = ({ withI }: { withI?: boolean }) => (
  <Behind>
    <LifeSkillsSheet
      visible onClose={noop} lsss={LSSS} gauge={{ global: 67, sample_size: 43, by_skill: BY_SKILL }} baselines={BASELINES} onInfo={noop}
      understandVisible={!!withI} onCloseUnderstand={noop} childName="Léo" onShowStatements={noop}
    />
  </Behind>
);

const JScreen = () => {
  const [nick, setNick] = useState('Flash');
  const [num, setNum] = useState('17');
  const [accent, setAccent] = useState<'sun' | 'amber' | 'teal' | 'sky' | 'coral' | 'violet' | null>(useTheme().style === 'natif' ? 'sky' : useTheme().style === 'nuit' ? 'sun' : 'coral');
  return (
    <PersonalizeView
      name="Léo" initial="L" jersey={num} onJersey={setNum} nickname={nick} onNickname={setNick} accent={accent} onAccent={setAccent}
      position="Ailier gauche" onPickPhoto={noop} onCancel={noop} onSave={noop}
    />
  );
};

const SOpen = () => <SeancesView m={SEANCES} a={{ onOpenReport: noop, onSelectChild: noop }} />;
const SLocked = () => <LockedScreen kind="seances" childName="Léo" onOffers={noop} onWrite={noop} onCall={noop} onCalendar={noop} />;
const SMaquette = () => (useTheme().style === 'nuit' ? <SLocked /> : <SOpen />);

const TScreen = () => <SessionReportView m={REPORT} onBack={noop} onShare={noop} />;

const UOpen = () => (
  <ThreadView title="Coach Lylian" initial="L" messages={THREAD} input="" onInput={noop} onSend={noop} onBack={noop} />
);
const ULocked = () => <LockedScreen kind="messages" onOffers={noop} onCall={noop} onBack={noop} />;
const UMaquette = () => (useTheme().style === 'nuit' ? <ULocked /> : <UOpen />);

const VScreen = () => (
  <NotificationsView items={NOTIFS} unreadCount={2} pushEnabled onTogglePush={noop} onBack={noop} onReadAll={noop} onOpen={noop} onDelete={noop} />
);

export const screens: GalleryScreen[] = [
  { id: 'G', title: 'Bilan (état de la maquette)', tab: 'bilans', render: () => <GMaquette /> },
  { id: 'G-ouvert', title: 'Bilan ouvert', tab: 'bilans', render: () => <GOpen /> },
  { id: 'G-verrou', title: 'Bilan verrouillé', tab: 'bilans', render: () => <GLocked /> },
  { id: 'H', title: 'Compétences de vie', tab: null, render: () => <HScreen /> },
  { id: 'I', title: 'Comprendre l’outil', tab: null, render: () => <HScreen withI /> },
  { id: 'J', title: 'Personnaliser', tab: null, render: () => <JScreen /> },
  { id: 'S', title: 'Mes séances (état de la maquette)', tab: 'seances', render: () => <SMaquette /> },
  { id: 'S-ouvert', title: 'Mes séances ouvert', tab: 'seances', render: () => <SOpen /> },
  { id: 'S-verrou', title: 'Mes séances verrouillé', tab: 'seances', render: () => <SLocked /> },
  { id: 'T', title: 'Bilan du coach', tab: null, render: () => <TScreen /> },
  { id: 'U', title: 'Messages (état de la maquette)', tab: 'messages', render: () => <UMaquette /> },
  { id: 'U-ouvert', title: 'Messages ouvert', tab: 'messages', render: () => <UOpen /> },
  { id: 'U-verrou', title: 'Messages verrouillé', tab: 'messages', render: () => <ULocked /> },
  { id: 'V', title: 'Notifications', tab: null, render: () => <VScreen /> },
];
