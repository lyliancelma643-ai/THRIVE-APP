import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { ThemeScope } from '../design';
import { AmorceView } from '../components/activite/AmorceView';
import { CarReadView, CarRoadView } from '../components/activite/CarView';
import { CheckinView } from '../components/activite/CheckinView';
import { ClosingView, MinutesView } from '../components/activite/ClosingView';
import { DebriefView } from '../components/activite/DebriefView';
import { DerouleView } from '../components/activite/DerouleView';
import { EndView } from '../components/activite/EndView';
import { KeptSheet } from '../components/activite/KeptSheet';
import { LetterView } from '../components/activite/LetterView';
import { PlayTimer } from '../components/activite/PlayTimer';
import { QuitSheet } from '../components/activite/QuitSheet';
import { RecallView } from '../components/activite/RecallView';
import { SynthesisView } from '../components/activite/SynthesisView';
import { EXT_INITIAL, flattenGuide, type ExtState } from '../components/activite/flow';
import type { Chrome } from '../components/activite/parts';
import { VisualSheet } from '../components/activite/visuals/VisualSheet';
import { vignetteIdFor } from '../lib/vignettes';
import { CHECKIN, PILLAR_PLAIN, PRIDE_LINES, getActivity, recallLine, resolveActivity, type P3Activity, type VisualId } from '../lib/p3';
import { DEMO_CHILD } from './fixtures/parcours';
import type { GalleryScreen } from './types';

/**
 * Écrans du mode activité (M, M1–M17, MV, VI1–VI8) rendus avec les VRAIES fiches (lib/p3) et un prénom de démo
 * (fixtures/parcours), DEV uniquement. Le mode activité est toujours en Veillée, quel que soit le style demandé :
 * chaque écran est posé dans <ThemeScope style="veillee" fill>, comme la route `moment/[activityId]`.
 */
const noop = () => {};

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <ThemeScope style="veillee" fill>
        <View style={{ flex: 1 }}>{children}</View>
      </ThemeScope>
    </SafeAreaInsetsContext.Provider>
  );
}

const need = (id: string): P3Activity => {
  const a = getActivity(id);
  if (!a) throw new Error(`fixture : activité ${id} introuvable`);
  return a;
};

const CABANE = need('ACT-0802');
const BAND = '8-11' as const;
const cabaneView = () => resolveActivity(CABANE, 20, BAND)!;
const chrome = (title: string, timer: Chrome['timer'] = null): Chrome => ({ title, onClose: noop, timer });
const cabaneChrome = (timer: Chrome['timer'] = null) => chrome(CABANE.title, timer);

// ── M1 · Check-in : trois questions, la première et la deuxième répondues, la troisième posée ──
const M1 = () => {
  const [a0, a1, a2] = CHECKIN.axes;
  return (
    <Phone>
      <CheckinView
        chrome={cabaneChrome()}
        answers={{ [a0.id]: a0.options[1].id, [a1.id]: a1.options[1].id, [a2.id]: '' }}
        onAnswer={noop}
        onContinue={noop}
        onSkip={noop}
      />
    </Phone>
  );
};

const M2 = () => (
  <Phone>
    <RecallView chrome={cabaneChrome()} opening={null} recall={recallLine(DEMO_CHILD, 'Quand je respire, ça va mieux.')} onContinue={noop} />
  </Phone>
);

const M3 = () => {
  const v = cabaneView();
  const week = { skill: 'Connexion · soutien' };
  return (
    <Phone>
      <AmorceView
        chrome={cabaneChrome()}
        vignetteId={vignetteIdFor(CABANE)}
        vignetteLabel={CABANE.title}
        worked={{ skill: week.skill, objective: CABANE.objective, tail: `${CABANE.subtitle} · ${PILLAR_PLAIN[CABANE.pillar_main]}` }}
        safety={CABANE.safety}
        opener={v.opener}
        minutes={v.duration}
        onStart={noop}
      />
    </Phone>
  );
};

type DerouleOpts = { upTo?: number; ext?: ExtState; revealedAll?: boolean; timer?: Chrome['timer']; visual?: VisualId | null; activity?: P3Activity; last?: boolean };
function Deroule({ upTo = 2, ext = EXT_INITIAL, revealedAll = false, timer, activity = CABANE }: DerouleOpts) {
  const v = resolveActivity(activity, 20, BAND)!;
  const flat = flattenGuide(activity.guide);
  const revealed = revealedAll ? flat.length : flat.filter((f) => f.step <= upTo).length;
  return (
    <Phone>
      <DerouleView
        chrome={chrome(activity.title, timer === undefined ? { elapsedS: 400, totalS: 1200, tone: 'sage' } : timer)}
        steps={v.screen_steps}
        guide={activity.guide}
        flat={flat}
        revealed={revealed}
        extensions={activity.extensions}
        ext={ext}
        baseDuration={v.duration}
        noteLabel={activity.capture ? 'Noter' : null}
        onNext={noop}
        onPrev={noop}
        onFinish={noop}
        onNote={noop}
        onOpenExt={noop}
        onLaunchTimer={noop}
        onShowVisual={noop}
      />
    </Phone>
  );
}

const M4 = () => (
  <Phone>
    <PlayTimer timer={CABANE.guide[2].timer!} onClose={noop} />
  </Phone>
);

const M5 = () => (
  <Deroule revealedAll ext={{ open: [0], extraMinutes: 10, boost: 10 }} timer={{ elapsedS: 985, totalS: 1200, tone: 'sage' }} />
);

// ── Voiture : ACT-0103 ────────────────────────────────────────────────────
const CAR = need('ACT-0103');
const carView = () => resolveActivity(CAR, 10, BAND)!;
const M6 = () => {
  const v = carView();
  return (
    <Phone>
      <CarReadView
        chrome={chrome(CAR.title)}
        opener={v.opener}
        steps={v.screen_steps}
        says={CAR.guide.map((g) => g.beats.filter((b) => b.kind === 'dire').map((b) => b.text))}
        onRead={noop}
      />
    </Phone>
  );
};
const M7 = () => (
  <Phone>
    <CarRoadView chrome={chrome(CAR.title)} elapsedS={192} totalS={600} onFinish={noop} />
  </Phone>
);

const M8 = () => {
  const v = cabaneView();
  return (
    <Phone>
      <DebriefView
        chrome={cabaneChrome()}
        questions={v.debrief}
        shown={2}
        answers={{ 0: 'Je voulais y arriver tout seul, mais ça tombait toujours.' }}
        week1={false}
        onAnswer={noop}
        onNext={noop}
      />
    </Phone>
  );
};

const M9 = () => (
  <Phone>
    <ClosingView chrome={cabaneChrome()} closing={cabaneView().closing} onDone={noop} />
  </Phone>
);
const M10 = () => (
  <Phone>
    <MinutesView chrome={cabaneChrome()} minutes={18} firstName={DEMO_CHILD} onElapsed={noop} />
  </Phone>
);
const M11 = () => (
  <Phone>
    <SynthesisView
      chrome={cabaneChrome()}
      rating={4}
      outcome="ACCROCHE"
      kept="« Tu peux tenir ça ? »"
      saving={false}
      onRating={noop}
      onOutcome={noop}
      onKept={noop}
      onSave={noop}
    />
  </Phone>
);

const End = ({ count, stars, reward }: { count: number; stars: number; reward?: boolean }) => (
  <Phone>
    <EndView
      chrome={cabaneChrome()}
      firstName={DEMO_CHILD}
      count={count}
      weekStars={stars}
      pride={PRIDE_LINES.done}
      low={null}
      sealedLine={null}
      rewards={reward ? [{ id: 'boite_a_outils', label: `La Carte Ma Boîte à Outils de ${DEMO_CHILD}` }] : []}
      weekCompleteLabel={reward ? 'Semaine 8 complète.' : null}
      next={{ title: reward ? 'Le chapeau des talents' : 'La demande de la semaine' }}
      onLaterRewards={noop}
      onNext={noop}
      onHome={noop}
    />
  </Phone>
);

/** Les feuilles se posent sur le déroulé (M), comme dans la maquette. */
const OverM = ({ children }: { children: React.ReactNode }) => (
  <>
    <Deroule />
    {children}
  </>
);

const M14 = () => (
  <OverM>
    <Phone>
      <KeptSheet
        visible
        onClose={noop}
        label={CABANE.capture!.label}
        kind={CABANE.capture!.kind}
        items={[]}
        text="Il a dit « Tu peux tenir ça ? » — et il a souri quand le toit a tenu."
        onItems={noop}
        onText={noop}
      />
    </Phone>
  </OverM>
);

const Letter = ({ step }: { step: 'write' | 'confirm' | 'sealed' | 'paper' }) => (
  <Phone>
    <LetterView
      visible
      step={step}
      onClose={noop}
      label="Une lettre à ouvrir le 13 octobre 2027"
      text={
        'Cher moi de l’an prochain,\n\nAujourd’hui, j’ai fini THRIVE. Je sais maintenant que demander de l’aide, ce n’est pas un aveu. J’espère que tu joues toujours au hockey, et que tu ne lâches plus après une erreur'
      }
      onChange={noop}
      onReview={noop}
      openDate="13 octobre 2027"
      onSeal={noop}
      onBack={noop}
    />
  </Phone>
);

const M17 = () => (
  <OverM>
    <Phone>
      <QuitSheet visible subtitle={`18 minutes avec ${DEMO_CHILD}, jusqu’ici.`} onYes={noop} onNo={noop} onCancel={noop} />
    </Phone>
  </OverM>
);

// ── MV / VI1–VI8 ──────────────────────────────────────────────────────────
const EMO = need('ACT-0401');
/** Montre l'étape qui porte le visuel « Montrer : … » (étape 2 de ACT-0401). */
const MV = () => <Deroule activity={EMO} upTo={0} />;
const VI = ({ id }: { id: VisualId }) => (
  <>
    <Deroule activity={EMO} upTo={1} />
    <Phone>
      <VisualSheet id={id} notes={id === 'outils' ? { 'ACT-0701': 'Je respire par le ventre.' } : {}} onClose={noop} />
    </Phone>
  </>
);

export const screens: GalleryScreen[] = [
  { id: 'M', title: 'Moment en cours', tab: null, render: () => <Deroule /> },
  { id: 'M1', title: 'Check-in', tab: null, render: () => <M1 /> },
  { id: 'M2', title: 'La fois d’avant', tab: null, render: () => <M2 /> },
  { id: 'M3', title: 'Amorce', tab: null, render: () => <M3 /> },
  { id: 'M4', title: 'Minuteur de jeu', tab: null, render: () => <M4 /> },
  { id: 'M5', title: 'Approfondir', tab: null, render: () => <M5 /> },
  { id: 'M6', title: 'En voiture · lire', tab: null, render: () => <M6 /> },
  { id: 'M7', title: 'En voiture · la route', tab: null, render: () => <M7 /> },
  { id: 'M8', title: 'Débrief', tab: null, render: () => <M8 /> },
  { id: 'M9', title: 'Pour finir', tab: null, render: () => <M9 /> },
  { id: 'M10', title: 'Minutes avec l’enfant', tab: null, render: () => <M10 /> },
  { id: 'M11', title: 'Synthèse', tab: null, render: () => <M11 /> },
  { id: 'M12', title: 'Fin', tab: null, render: () => <End count={12} stars={2} /> },
  { id: 'M13', title: 'Fin · objet débloqué', tab: null, render: () => <End count={13} stars={3} reward /> },
  { id: 'M14', title: 'Noter', tab: null, render: () => <M14 /> },
  { id: 'M15', title: 'Lettre à moi-même', tab: null, render: () => <Letter step="write" /> },
  { id: 'M16', title: 'Sceller la lettre', tab: null, render: () => <Letter step="confirm" /> },
  { id: 'M17', title: 'Quitter', tab: null, render: () => <M17 /> },
  { id: 'M16b', title: 'Lettre scellée', tab: null, render: () => <Letter step="sealed" /> },
  { id: 'M16c', title: 'Lettre sur papier', tab: null, render: () => <Letter step="paper" /> },
  { id: 'MV', title: 'Une étape avec son visuel', tab: null, render: () => <MV /> },
  { id: 'VI1', title: 'Visuel · Les six émotions', tab: null, render: () => <VI id="emotions" /> },
  { id: 'VI2', title: 'Visuel · Le thermomètre', tab: null, render: () => <VI id="thermometre" /> },
  { id: 'VI3', title: 'Visuel · Les deux colonnes', tab: null, render: () => <VI id="colonnes" /> },
  { id: 'VI4', title: 'Visuel · L’escalier', tab: null, render: () => <VI id="escalier" /> },
  { id: 'VI5', title: 'Visuel · La carte de ses personnes', tab: null, render: () => <VI id="carte" /> },
  { id: 'VI6', title: 'Visuel · Les trois sens', tab: null, render: () => <VI id="sens" /> },
  { id: 'VI7', title: 'Visuel · Trois endroits', tab: null, render: () => <VI id="endroits" /> },
  { id: 'VI8', title: 'Visuel · Ses outils', tab: null, render: () => <VI id="outils" /> },
];
