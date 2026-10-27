import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { HubScreen } from '../components/hub/HubScreen';
import { UpgradeProvider } from '../components/hub/UpgradeSheet';
import { HubStaticProvider, type HubNotif } from '../components/hub/HubProvider';

const DEMO_NOTIFS: HubNotif[] = [
  { id: 'n1', type: 'QUESTIONNAIRE_PENDING', title: 'Questionnaire bien-être à compléter — séance 8', body: 'Léo a un court questionnaire de bien-être (EPOCH) à remplir avec toi.', data: null, is_read: false, created_at: new Date(Date.now() - 12 * 60e3).toISOString() },
  { id: 'n2', type: 'REPORT_READY', title: 'Le bilan de la séance 7 est prêt', body: 'Sophie a partagé ses observations sur Léo.', data: null, is_read: false, created_at: new Date(Date.now() - 5 * 3600e3).toISOString() },
  { id: 'n3', type: 'SESSION_REMINDER', title: 'Séance demain à 15 h', body: 'Demander de l’aide, avec Sophie Gagnon.', data: null, is_read: true, created_at: new Date(Date.now() - 30 * 3600e3).toISOString() },
];
import { HubLocked } from '../components/hub/HubLocked';
import { TabGate } from '../components/motion/TabGate';
import { usePageReadyStore } from '../stores/pageReady.store';
import { MaisonFrame } from '../components/hub/maison/MaisonFrame';
import { MaisonWelcome } from '../components/hub/maison/MaisonHome';
import { Carnet, Catalogue, PageNon, Programme, Sources } from '../components/hub/maison/screens';
import { FicheScreen } from '../components/hub/maison/Fiche';
import { DEV_P3_FIXTURES } from '../hooks/useP3Data';
import { BilanScreen } from '../components/hub/bilan/BilanScreen';
import { DEV_BILAN_FIXTURES } from '../components/hub/bilan/data';
import { useSubscriptionStore } from '../stores/subscription.store';
import { DEV_SEANCES_FIXTURES, SeancesScreen } from '../components/hub/seances/SeancesScreen';
import { P3_ACTIVITIES } from '../lib/p3web';
import { useAuthStore } from '../stores/auth.store';
import { useChildStore } from '../stores/child.store';
import type { GalleryScreen } from './types';

/**
 * Écrans portés du web (espace parent « Nuit calme / Jour clair », Maison « Soir de famille ») rendus avec des données
 * de démonstration (DEV uniquement) : H-* = hub. Léo, 12 ans, semaines 1 à 7 vécues.
 */
const DEMO_CHILD = 'demo-leo';

function seed() {
  useAuthStore.setState({
    user: { id: 'demo-parent', email: 'parent@exemple.ca', firstName: 'Camille', lastName: 'Martin', role: 'PARENT' } as never,
    isAuthenticated: true,
  });
  useChildStore.setState({
    loaded: true,
    isLoading: false,
    selectedChildId: DEMO_CHILD,
    children: [
      { id: DEMO_CHILD, family_id: 'f', first_name: 'Léo', last_name: 'Martin', date_of_birth: '2014-03-12', avatar_url: null, nickname: null, jersey_number: 7, accent_color: null },
      { id: 'demo-lea', family_id: 'f', first_name: 'Léa', last_name: 'Martin', date_of_birth: '2016-09-02', avatar_url: null, nickname: null, jersey_number: null, accent_color: null },
    ],
  });
  useSubscriptionStore.setState({
    access: {
      maison: true, bilan: true, seances: true, modes: { bilan: 'complet', seances: 'complet' }, sourceMaison: 'pack',
      unlocked: true, isStaff: false, packEnd: null, trialUsed: false,
    },
  } as never);
  if (!DEV_BILAN_FIXTURES.has(DEMO_CHILD)) {
    const iso = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
    DEV_BILAN_FIXTURES.set(DEMO_CHILD, {
      coach: { first_name: 'Sophie', last_name: 'Gagnon' },
      completed: 7,
      identity: {
        sport: 'Hockey', position: 'Ailier', club: 'Les Aigles', sport_story: 'Léo a chaussé ses premiers patins à 5 ans, sur la patinoire du quartier.',
        strengths: ['Persévérance', 'Esprit d’équipe', 'Curiosité'], season_dream: 'Marquer devant ma grand-mère.',
        smart_goal: 'Tenter 3 tirs au but par match d’ici décembre.', life_skill_goal: 'Demander de l’aide quand je bloque.',
        my_actions: ['Respirer avant chaque présence', 'Encourager un coéquipier par match'],
        toolbox: [{ tool: 'Respiration carrée', context: 'Avant un match' }, { tool: 'Mot-ancre', context: 'Après une erreur' }],
        focus_word: 'Calme', letter: null, program_pct_override: null, certificate_ready: false,
      },
      statusByNum: { 1: 'COMPLETED', 2: 'COMPLETED', 3: 'COMPLETED', 4: 'COMPLETED', 5: 'COMPLETED', 6: 'COMPLETED', 7: 'COMPLETED', 8: 'IN_PROGRESS' },
      gauge: { global: 3.6, sample_size: 2, by_skill: { teamwork: 3.8, goal_setting: 3.4, time_management: 3.1, emotional_skills: 3.9 } },
      lsssPoints: [{ moment: 'BASELINE', value: 3.1 }, { moment: 'MID', value: 3.6 }],
      permaPoints: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ session_number: n, value: 3 + n * 0.12, pillars: {} })),
      nextSteps: [
        { id: 'a', label: 'Préparer sa routine d’avant-match', status: 'doing', due_date: null, sort_order: 1 },
        { id: 'b', label: 'Choisir son mot-ancre', status: 'done', due_date: null, sort_order: 0 },
      ],
      emotions: [{ id: 'e', emotion: 'Fier', created_at: iso(2) }],
      docs: [],
      pendingLsss: null,
      pendingPerma: { token: null, session_number: 8 },
    });
  }
  if (!DEV_SEANCES_FIXTURES.has(DEMO_CHILD)) {
    const day = (d: number) => new Date(Date.now() + d * 864e5).toISOString();
    const sessions = Array.from({ length: 13 }, (_, i) => {
      const n = i + 1;
      const status = n <= 7 ? 'COMPLETED' : n === 8 ? 'IN_PROGRESS' : 'SCHEDULED';
      return { id: `s${n}`, session_number: n, title: null, status, scheduled_at: day((n - 8) * 7), completed_at: n <= 7 ? day((n - 8) * 7) : null, duration_minutes: 60 } as const;
    });
    DEV_SEANCES_FIXTURES.set(DEMO_CHILD, {
      sessions: sessions.map((x) => ({ ...x })),
      coach: { first_name: 'Sophie', last_name: 'Gagnon' },
      bilans: {
        s7: {
          session_id: 's7', session_number: 7, premium: false, message: 'Léo a beaucoup progressé dans sa façon de demander de l’aide. Bravo !',
          has_bilan: true, has_observations: true, bilan: null, observations: null, observation_labels: ['Concentration', 'Engagement', 'Gestion des émotions', 'Esprit d’équipe'],
        },
        s6: {
          session_id: 's6', session_number: 6, premium: true, message: 'Belle séance de relaxation.', has_bilan: true, has_observations: true,
          bilan: { points_forts: 'Respiration maîtrisée', a_travailler: 'Garder le calme en fin de match' }, observations: { Concentration: 4, Engagement: 5 }, observation_labels: null,
        },
      },
    });
  }
  if (!DEV_P3_FIXTURES.has(DEMO_CHILD)) {
    const done = P3_ACTIVITIES.filter((a) => a.week !== null && a.week <= 7 && a.programme === 'coeur');
    const now = Date.now();
    const phrases = ['On a ri comme jamais', 'Je peux demander de l’aide', 'Mon calme, c’est le bleu', null, null];
    DEV_P3_FIXTURES.set(DEMO_CHILD, {
      moments: done
        .map((a, i) => ({
          activity_id: a.id,
          created_at: new Date(now - (done.length - i) * 2.6 * 864e5).toISOString(),
          duration_chosen: (i % 3 === 0 ? 20 : 10) as 10 | 20,
          rating: (i % 4 === 0 ? 5 : 4) as 4 | 5,
          kept_phrase: phrases[i % phrases.length],
          capture: null,
          week: a.week,
          place: 'maison' as const,
          outcome: 'ACCROCHE' as const,
        }))
        .reverse(),
      rewards: [{ reward_id: 'fiche_identite' as const, payload: null, earned_at: new Date(now - 30 * 864e5).toISOString() }],
      saved: [],
      skips: [],
    });
  }
}

function Phone({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seed();
    AsyncStorage.setItem('thrive.p3.welcomeSeen', 'true').finally(() => setReady(true));
  }, []);
  return (
    <SafeAreaInsetsContext.Provider value={{ top: 54, bottom: 34, left: 0, right: 0 }}>
      <View style={{ flex: 1 }}>{ready ? <HubStaticProvider notifications={DEMO_NOTIFS}><UpgradeProvider>{children}</UpgradeProvider></HubStaticProvider> : null}</View>
    </SafeAreaInsetsContext.Provider>
  );
}

const maison = (node: (ctx: Parameters<Parameters<typeof MaisonFrame>[0]['children']>[0]) => ReactNode) => () => (
  <Phone>
    <HubScreen surface="maison">
      <MaisonFrame>{node}</MaisonFrame>
    </HubScreen>
  </Phone>
);

// Banc : la session de démo est effacée par l'écouteur d'auth du layout ; on signale l'étape « session » à la main.
let gateBenchDone = false;
function gateBench(tab: 'maison' | 'seances') {
  if (gateBenchDone) return;
  gateBenchDone = true;
  usePageReadyStore.getState().reset();
  usePageReadyStore.getState().mark(tab, 'session');
}

export const screens: GalleryScreen[] = [
  // Page de chargement du premier accès (TabGate) : on repart de zéro à chaque affichage du banc.
  { id: 'HK-gate', title: 'Maison + page de chargement', tab: 'maison', render: () => { gateBench('maison'); return <Phone><TabGate tab="maison"><HubScreen surface="maison"><MaisonFrame>{(ctx) => <MaisonWelcome ctx={ctx} />}</MaisonFrame></HubScreen></TabGate></Phone>; } },
  { id: 'HS-gate', title: 'Mes séances + page de chargement', tab: 'seances', render: () => { gateBench('seances'); return <Phone><TabGate tab="seances"><SeancesScreen /></TabGate></Phone>; } },
  { id: 'HK', title: 'Maison (web)', tab: 'maison', render: maison((ctx) => <MaisonWelcome ctx={ctx} />) },
  { id: 'HT', title: 'Toutes les activités (web)', tab: 'maison', render: maison((ctx) => <Catalogue ctx={ctx} />) },
  { id: 'HP', title: 'Le programme (web)', tab: 'maison', render: maison((ctx) => <Programme ctx={ctx} />) },
  { id: 'HC', title: 'Le carnet (web)', tab: 'maison', render: maison((ctx) => <Carnet ctx={ctx} />) },
  { id: 'HN', title: 'Quand il dit non (web)', tab: 'maison', render: maison((ctx) => <PageNon ctx={ctx} />) },
  { id: 'HSO', title: 'Les sources (web)', tab: 'maison', render: maison((ctx) => <Sources ctx={ctx} />) },
  {
    id: 'HB',
    title: 'Bilan (web)',
    tab: 'bilans',
    render: () => (
      <Phone>
        <BilanScreen />
      </Phone>
    ),
  },
  {
    id: 'HS',
    title: 'Mes séances (web)',
    tab: 'seances',
    render: () => (
      <Phone>
        <SeancesScreen />
      </Phone>
    ),
  },
  {
    id: 'HL',
    title: 'Bilan verrouillé — abonné Maison seul (web)',
    tab: 'bilans',
    render: () => (
      <Phone>
        <HubScreen>
          <HubLocked section="bilan" />
        </HubScreen>
      </Phone>
    ),
  },
  {
    id: 'HF',
    title: 'Fiche (web)',
    tab: 'maison',
    render: () => (
      <Phone>
        <FicheScreen params={{ activityId: 'ACT-0802', duree: '20' }} />
      </Phone>
    ),
  },
];
