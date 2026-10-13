import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { FinDeParcoursView } from '../components/fin-parcours/FinDeParcoursView';
import { ComingSoonView } from '../components/video/ComingSoonView';
import { VideoDoneView } from '../components/video/VideoDoneView';
import { VideoQuestionView } from '../components/video/VideoQuestionView';
import { VideoReadyView } from '../components/video/VideoReadyView';
import QuestionsScreen, { type QuestionsLang } from '../screens/child/QuestionsScreen';
import { CERTIFICATE, DEMO_CHILD, EPOCH_QUESTION, HOME_TASK, LSSS, QUESTION, READY_ROWS, UPCOMING, WELLBEING } from './fixtures/parcours';
import type { GalleryScreen } from './types';

/**
 * Écrans du lot « vidéo, questionnaire, fin de parcours » rendus avec des fixtures (DEV uniquement).
 * Barre d'état (54) et indicateur d'accueil (34) du canevas simulés, comme pour les autres lots.
 */
function Phone({ children }: { children: ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const noop = () => {};

function ComingSoon() {
  const [notify, setNotify] = useState(true);
  return <ComingSoonView childName={DEMO_CHILD} notify={notify} onNotifyChange={setNotify} onBackToHome={noop} onBack={noop} onMore={noop} upcoming={UPCOMING} />;
}

function Question() {
  const [selected, setSelected] = useState<number | null>(QUESTION.selected);
  return (
    <VideoQuestionView
      childName={DEMO_CHILD}
      sceneVignetteId="ACT-0801"
      portraitVignetteId="ACT-0603"
      index={QUESTION.index}
      total={QUESTION.total}
      question={QUESTION.text}
      choices={QUESTION.choices}
      selected={selected}
      onSelect={setSelected}
      progress={QUESTION.progress}
      markers={QUESTION.markers}
      elapsedLabel={QUESTION.elapsed}
      durationLabel={QUESTION.duration}
      onClose={noop}
    />
  );
}

function Done() {
  const [effort, setEffort] = useState(6);
  return (
    <VideoDoneView sessionNumber={8} childName={DEMO_CHILD} durationMinutes={20} effort={effort} onEffortChange={setEffort} homeTask={HOME_TASK} onFinish={noop} />
  );
}

function Epoch() {
  const [lang, setLang] = useState<QuestionsLang>('fr');
  const [selected, setSelected] = useState<number | null>(EPOCH_QUESTION.selected);
  return (
    <QuestionsScreen
      firstName={DEMO_CHILD}
      lang={lang}
      onLangChange={setLang}
      dimension={lang === 'fr' ? 'Engagement' : 'Engagement'}
      question={lang === 'fr' ? EPOCH_QUESTION.fr : EPOCH_QUESTION.en}
      index={EPOCH_QUESTION.index}
      total={EPOCH_QUESTION.total}
      selected={selected}
      onAnswer={setSelected}
    />
  );
}

export const screens: GalleryScreen[] = [
  { id: 'O', title: 'Bientôt disponible', tab: null, render: () => <Phone><ComingSoon /></Phone> },
  {
    id: 'P',
    title: 'Prêt avec Léo ?',
    tab: null,
    render: () => (
      <Phone>
        <VideoReadyView
          childName={DEMO_CHILD}
          partnerInitial="C"
          vignetteId="ACT-0801"
          questionCount={3}
          rows={READY_ROWS}
          onStart={noop}
          onLater={noop}
          onClose={noop}
        />
      </Phone>
    ),
  },
  { id: 'Q', title: 'Question en pause', tab: null, render: () => <Phone><Question /></Phone> },
  { id: 'R', title: 'Après la séance', tab: null, render: () => <Phone><Done /></Phone> },
  { id: 'W', title: 'Questionnaire de Léo', tab: null, render: () => <Phone><Epoch /></Phone> },
  {
    id: 'Z',
    title: 'Fin de parcours',
    tab: null,
    render: () => (
      <Phone>
        <FinDeParcoursView
          certificate={CERTIFICATE}
          lsss={LSSS}
          wellbeing={WELLBEING}
          onBack={noop}
          onShare={noop}
          onPdf={noop}
          documents={[
            { key: 'contrat', title: 'Contrat de confiance', glyph: 'document', color: 'sysIndigo', onPress: noop },
            { key: 'lettre', title: 'Lettre à moi-même', glyph: 'mail', color: 'sysPink', onPress: noop },
            { key: 'book', title: 'Le Book THRIVE', subtitle: 'Le récapitulatif du programme', glyph: 'book', color: 'tint', onPress: noop },
            { key: 'certificat', title: 'Certificat THRIVE', glyph: 'medal', color: 'sysOrange', onPress: noop },
          ]}
        />
      </Phone>
    ),
  },
];
