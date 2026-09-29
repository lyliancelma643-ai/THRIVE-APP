// ─────────────────────────────────────────────────────────────────────────────
// Jeu de données de démonstration de l'audit UX — entièrement fictif.
//
// Un univers cohérent (familles, enfants, coachs, admins, séances, bilans,
// Maison, messagerie, facturation, roadmap…) daté par rapport à NOW, l'heure
// figée de l'audit (mardi 29 septembre 2026, 19 h 15 à Montréal) : les
// captures avant / après restent comparables au pixel près.
//
// Six comptes de démonstration (mot de passe commun : Demo1234!) :
//   parent-performance  julie.tremblay@demo.thrive   Performance + abonnement Maison, 2 enfants
//   parent-essentiel    karim.benali@demo.thrive     Essentiel, 1 enfant (teasers verrouillés)
//   parent-preparation  sophie.martin@demo.thrive    compte en préparation (tout verrouillé)
//   coach               marc.lefebvre@demo.thrive
//   admin               claire.dubois@demo.thrive
//   super-admin         alex.pelletier@demo.thrive
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const NOW = new Date('2026-09-29T19:15:00-04:00');
export const PASSWORD = 'Demo1234!';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');

const DAY = 864e5;
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n, h = 18, m = 0) => {
  const d = new Date(NOW.getTime() - n * DAY);
  d.setHours(h, m, 0, 0);
  return iso(d);
};
const daysAhead = (n, h = 18, m = 0) => daysAgo(-n, h, m);
const dateOnly = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Identifiants lisibles et stables.
const id = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;
const U = (n) => id('00000001', n); // profils
const F = (n) => id('00000002', n); // familles
const K = (n) => id('00000003', n); // enfants
const S = (n) => id('00000004', n); // séances 1:1
const V = (n) => id('00000005', n); // séances vidéo
const X = (n) => id('00000006', n); // divers

// ── Comptes ──────────────────────────────────────────────────────────────────
export const PERSONAS = {
  'parent-performance': { id: U(1), email: 'julie.tremblay@demo.thrive', role: 'PARENT', firstName: 'Julie', lastName: 'Tremblay' },
  'parent-essentiel': { id: U(2), email: 'karim.benali@demo.thrive', role: 'PARENT', firstName: 'Karim', lastName: 'Benali' },
  'parent-preparation': { id: U(3), email: 'sophie.martin@demo.thrive', role: 'PARENT', firstName: 'Sophie', lastName: 'Martin' },
  coach: { id: U(20), email: 'marc.lefebvre@demo.thrive', role: 'COACH', firstName: 'Marc', lastName: 'Lefebvre' },
  admin: { id: U(30), email: 'claire.dubois@demo.thrive', role: 'ADMIN', firstName: 'Claire', lastName: 'Dubois' },
  'super-admin': { id: U(31), email: 'alex.pelletier@demo.thrive', role: 'SUPER_ADMIN', firstName: 'Alex', lastName: 'Pelletier' },
};

const extraParents = [
  [4, 'Émilie', 'Gagnon'],
  [5, 'Olivier', 'Roy'],
  [6, 'Nadia', 'Bouchard'],
  [7, 'Thomas', 'Côté'],
  [8, 'Isabelle', 'Lavoie'],
];
const extraCoaches = [
  [21, 'Amélie', 'Fortin', 'Soccer · confiance en soi'],
  [22, 'Sébastien', 'Morin', 'Natation · gestion du stress'],
];

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// ── Séances vidéo : lues depuis la migration de seed (source de vérité) ──────
function videoSessionsFromSeed() {
  const sql = readFileSync(path.join(repo, 'supabase/migrations/20260612_008_seed_video_sessions.sql'), 'utf8');
  const q = "'((?:[^']|'')*)'";
  const re = new RegExp(`\\((\\d+),\\s*'(\\w+)',\\s*${q},\\s*${q},\\s*${q},\\s*${q},\\s*${q},\\s*(true|false),\\s*'([^']*)'\\)`, 'g');
  const base = [];
  for (const m of sql.matchAll(re)) {
    const un = (s) => s.replace(/''/g, "'");
    base.push({
      n: Number(m[1]),
      phase: m[2],
      title: un(m[3]),
      subtitle: un(m[4]),
      theme: un(m[5]),
      life_skill: un(m[6]),
      thrive_action: un(m[7]),
      is_free: m[8] === 'true',
      video_url: m[9],
    });
  }
  const ages = [
    ['8-11', 'Version ludique et concrète (8–11 ans) : jeu, variété et plaisir avant tout.'],
    ['12-14', 'Version adaptée à la phase de spécialisation (12–14 ans).'],
    ['15-17', 'Version adaptée à la phase d’investissement (15–17 ans).'],
  ];
  const rows = [];
  let k = 1;
  for (const [age_group, desc] of ages) {
    for (const b of base) {
      rows.push({
        id: V(k++),
        session_number: b.n,
        phase: b.phase,
        title: b.title,
        subtitle: b.subtitle,
        description: `Séance ${b.n} — ${b.subtitle}. ${desc} À vivre ensemble, parent et enfant, pendant 20 minutes d’exercices interactifs guidés par le coach.`,
        age_group,
        theme: b.theme,
        life_skill: b.life_skill,
        thrive_action: b.thrive_action,
        duration_minutes: 20,
        video_url: b.video_url,
        // Vignette pour les 4 premières séances : les deux rendus (image et
        // trame de repli) sont ainsi audités.
        thumbnail_url: b.n <= 4 ? `MOCK_ORIGIN/storage/v1/object/public/thumbs/s${b.n}.svg` : null,
        lang: 'fr',
        is_free: b.is_free,
        is_active: true,
        sort_order: b.n,
      });
    }
  }
  return rows;
}

const SESSION_TITLES = [
  'Diagnostic de départ / alliance',
  'Mes objectifs, mon plan',
  'Confiance et courage',
  "Identifier l'émotion pendant l'action",
  'Agir : stratégies de recentrage',
  'Relaxation sous pression',
  'Bilan mi-parcours',
  "Demander de l'aide",
  'Concentration : le focus word',
  'Imagerie mentale',
  'Ma boîte à outils complète',
  'Leadership et impact',
  'Bilan final / célébration',
];

export function buildDb() {
  const profiles = [];
  const addProfile = (n, first, last, role, extra = {}) =>
    profiles.push({
      id: U(n),
      email: `${slug(first)}.${slug(last)}@demo.thrive`,
      first_name: first,
      last_name: last,
      role,
      is_active: true,
      registration_status: 'ACTIVE',
      coach_validated: true,
      phone_number: `514 555-01${String(n).padStart(2, '0')}`,
      speciality: null,
      bio: null,
      created_at: daysAgo(120 - n * 3, 10),
      ...extra,
    });

  addProfile(1, 'Julie', 'Tremblay', 'PARENT');
  addProfile(2, 'Karim', 'Benali', 'PARENT');
  addProfile(3, 'Sophie', 'Martin', 'PARENT', { coach_validated: false, registration_status: 'PENDING', created_at: daysAgo(3, 20) });
  for (const [n, f, l] of extraParents) addProfile(n, f, l, 'PARENT');
  addProfile(20, 'Marc', 'Lefebvre', 'COACH', {
    speciality: 'Hockey · préparation mentale',
    bio: 'Ancien joueur junior, coach certifié THRIVE depuis 2024. Il accompagne les 8–15 ans sur la confiance et la gestion des émotions.',
  });
  for (const [n, f, l, sp] of extraCoaches) addProfile(n, f, l, 'COACH', { speciality: sp });
  addProfile(30, 'Claire', 'Dubois', 'ADMIN');
  addProfile(31, 'Alex', 'Pelletier', 'SUPER_ADMIN');

  const families = [
    { id: F(1), name: 'Famille Tremblay', parent_id: U(1), pack: 'PERFORMANCE', city: 'Laval', province: 'QC', created_at: daysAgo(110, 10) },
    { id: F(2), name: 'Famille Benali', parent_id: U(2), pack: 'ESSENTIEL', city: 'Montréal', province: 'QC', created_at: daysAgo(80, 10) },
    { id: F(3), name: 'Famille Martin', parent_id: U(3), pack: 'ESSENTIEL', city: 'Québec', province: 'QC', created_at: daysAgo(3, 20) },
    { id: F(4), name: 'Famille Gagnon', parent_id: U(4), pack: 'AVANCE', city: 'Longueuil', province: 'QC', created_at: daysAgo(70, 10) },
    { id: F(5), name: 'Famille Roy', parent_id: U(5), pack: 'PERFORMANCE', city: 'Sherbrooke', province: 'QC', created_at: daysAgo(65, 10) },
    { id: F(6), name: 'Famille Bouchard', parent_id: U(6), pack: 'ESSENTIEL', city: 'Gatineau', province: 'QC', created_at: daysAgo(40, 10) },
    { id: F(7), name: 'Famille Côté', parent_id: U(7), pack: 'AVANCE', city: 'Trois-Rivières', province: 'QC', created_at: daysAgo(12, 10) },
    { id: F(8), name: 'Famille Lavoie', parent_id: U(8), pack: 'ESSENTIEL', city: 'Lévis', province: 'QC', created_at: daysAgo(30, 10) },
  ];

  const child = (n, fam, first, last, dob, gender, sport, extra = {}) => ({
    id: K(n),
    family_id: F(fam),
    first_name: first,
    last_name: last,
    date_of_birth: dob,
    gender,
    sport,
    notes: null,
    is_active: true,
    validation_status: 'CONFIRMED',
    avatar_url: null,
    nickname: null,
    jersey_number: null,
    accent_color: null,
    created_at: daysAgo(100 - n, 11),
    ...extra,
  });
  const children = [
    child(1, 1, 'Léo', 'Tremblay', dateOnly(2017, 2, 11), 'MALE', 'Hockey', {
      nickname: 'Le Lynx',
      jersey_number: 17,
      accent_color: 'sky',
      avatar_url: 'avatars/leo.svg',
    }),
    child(2, 1, 'Maya', 'Tremblay', dateOnly(2013, 6, 2), 'FEMALE', 'Soccer', { accent_color: 'coral' }),
    child(3, 2, 'Inès', 'Benali', dateOnly(2015, 3, 18), 'FEMALE', 'Natation'),
    child(4, 3, 'Noah', 'Martin', dateOnly(2016, 7, 9), 'MALE', 'Basketball'),
    child(5, 4, 'Zoé', 'Gagnon', dateOnly(2014, 1, 23), 'FEMALE', 'Tennis'),
    child(6, 5, 'Liam', 'Roy', dateOnly(2011, 4, 30), 'MALE', 'Hockey'),
    child(7, 6, 'Chloé', 'Bouchard', dateOnly(2018, 3, 3), 'FEMALE', 'Gymnastique'),
    child(8, 8, 'Emma', 'Lavoie', dateOnly(2012, 9, 14), 'FEMALE', 'Volleyball'),
    child(9, 7, 'Jade', 'Côté', dateOnly(2010, 11, 5), 'FEMALE', 'Soccer', { validation_status: 'PENDING', created_at: daysAgo(2, 21) }),
  ];

  const assign = (n, coach, kid) => ({
    id: X(100 + n),
    coach_id: U(coach),
    child_id: K(kid),
    is_active: true,
    assigned_by: U(30),
    created_at: daysAgo(90, 9),
  });
  const coach_assignments = [
    assign(1, 20, 1),
    assign(2, 20, 2),
    assign(3, 20, 3),
    assign(4, 20, 4),
    assign(5, 20, 5),
    assign(6, 20, 6),
    assign(7, 21, 7),
    assign(8, 22, 8),
  ];

  const programs = [];
  const program_enrollments = [];
  const sessions = [];
  // [enfant, nb séances validées, statut de la suivante, écart en jours de la suivante]
  const plans = [
    [1, 6, 'IN_PROGRESS', 0],
    [2, 3, 'SCHEDULED', 1],
    [3, 2, 'MISSED', -2],
    [4, 0, 'SCHEDULED', 6],
    [5, 9, 'SCHEDULED', 0],
    [6, 12, 'SCHEDULED', 2],
    [7, 4, 'SCHEDULED', 3],
    [8, 1, 'SCHEDULED', 4],
  ];
  let sn = 1;
  for (const [kid, done, nextStatus, nextIn] of plans) {
    const a = coach_assignments.find((x) => x.child_id === K(kid));
    const pid = X(200 + kid);
    programs.push({
      id: pid,
      title: 'Programme THRIVE 13 séances',
      description: 'Protocole 1:1 méthode THRIVE.',
      age_group: '8-11',
      status: 'ACTIVE',
      total_sessions: 13,
      coach_id: a.coach_id,
      created_at: daysAgo(95, 9),
    });
    program_enrollments.push({ id: X(300 + kid), program_id: pid, child_id: K(kid), created_at: daysAgo(95, 9) });
    for (let n = 1; n <= 13; n++) {
      const weeksFromNext = n - (done + 1);
      let status = 'SCHEDULED';
      let when;
      if (n <= done) {
        status = 'COMPLETED';
        when = daysAgo((done + 1 - n) * 7 - nextIn, 18, 30);
      } else if (n === done + 1) {
        status = nextStatus;
        when = nextIn === 0 ? daysAgo(0, kid === 5 ? 20 : 18, kid === 5 ? 0 : 30) : daysAhead(nextIn, 18, 30);
      } else {
        when = daysAhead(nextIn + weeksFromNext * 7, 18, 30);
      }
      sessions.push({
        id: S(sn++),
        program_id: pid,
        child_id: K(kid),
        session_number: n,
        title: SESSION_TITLES[n - 1],
        status,
        scheduled_at: when,
        completed_at: status === 'COMPLETED' ? when : null,
        coach_notes:
          status === 'COMPLETED'
            ? n % 2
              ? 'Très engagé, a proposé lui-même sa stratégie de respiration.'
              : 'Séance plus difficile en début, bon retour au calme ensuite.'
            : null,
        created_at: daysAgo(95, 9),
      });
    }
  }

  const athlete_identity = [
    {
      child_id: K(1),
      sport: 'Hockey sur glace',
      position: 'Ailier gauche',
      club: 'Les Lynx de Laval — M11',
      sport_story:
        'Léo patine depuis ses 4 ans. Il adore les matchs du samedi matin et les entraînements où l’on joue en petits groupes.',
      strengths: ['Persévérance', 'Esprit d’équipe', 'Curiosité'],
      season_dream: 'Oser prendre le lancer en fin de match, sans avoir peur de rater.',
      smart_goal: 'D’ici décembre, prendre 3 lancers par match en respirant avant chacun.',
      life_skill_goal: 'Rester calme quand l’arbitre siffle contre moi.',
      my_actions: ['Respirer trois fois avant chaque présence', 'Dire « prochaine action » après une erreur', 'Parler au coach après le match'],
      toolbox: [
        { tool: 'La respiration carrée', context: 'Avant les mises en jeu' },
        { tool: 'Mon focus word', context: 'Quand je doute' },
        { tool: 'La routine pré-tir', context: 'Avant chaque lancer' },
      ],
      focus_word: 'Respire',
      letter: null,
      program_pct_override: null,
      certificate_ready: false,
      updated_at: daysAgo(7, 21),
      updated_by: U(20),
    },
    {
      child_id: K(2),
      sport: 'Soccer',
      position: 'Milieu',
      club: 'CS Laval',
      sport_story: 'Maya joue au soccer depuis 5 ans et vient d’intégrer le programme sport-études.',
      strengths: ['Leadership', 'Créativité'],
      season_dream: 'Être capitaine au tournoi de printemps.',
      smart_goal: null,
      life_skill_goal: null,
      my_actions: [],
      toolbox: [],
      focus_word: null,
      letter: null,
      program_pct_override: null,
      certificate_ready: false,
      updated_at: daysAgo(20, 21),
      updated_by: U(20),
    },
    {
      child_id: K(3),
      sport: 'Natation',
      position: '100 m libre',
      club: 'Club aquatique de Montréal',
      sport_story: null,
      strengths: ['Régularité'],
      season_dream: null,
      smart_goal: null,
      life_skill_goal: null,
      my_actions: [],
      toolbox: [],
      focus_word: null,
      letter: null,
      program_pct_override: null,
      certificate_ready: false,
      updated_at: daysAgo(30, 21),
      updated_by: U(20),
    },
  ];

  const athlete_next_steps = [
    { id: X(400), child_id: K(1), label: 'Pratiquer la respiration carrée avant l’entraînement de jeudi', due_date: daysAhead(2).slice(0, 10), status: 'doing', sort_order: 1 },
    { id: X(401), child_id: K(1), label: 'Noter dans le carnet un moment où j’ai gardé mon calme', due_date: daysAhead(6).slice(0, 10), status: 'todo', sort_order: 2 },
    { id: X(402), child_id: K(1), label: 'Choisir mon focus word pour le tournoi', due_date: daysAgo(3).slice(0, 10), status: 'done', sort_order: 3 },
  ];
  const athlete_objectives = [
    { id: X(410), child_id: K(1), kind: 'TECHNIQUE', title: 'Lancer du poignet', description: 'Viser le haut du filet', due_date: daysAhead(60).slice(0, 10), status: 'in_progress', progress: 45, sort_order: 1 },
    { id: X(411), child_id: K(1), kind: 'LIFE_SKILL', title: 'Garder mon calme après une erreur', description: null, due_date: daysAhead(45).slice(0, 10), status: 'in_progress', progress: 60, sort_order: 2 },
  ];
  const emotion_logs = [
    { id: X(420), child_id: K(1), emotion: 'Fierté', intensity: 4, context: 'Premier but de la saison', session_number: 6, created_at: daysAgo(7, 19) },
    { id: X(421), child_id: K(1), emotion: 'Trac', intensity: 3, context: 'Avant le tournoi', session_number: 5, created_at: daysAgo(14, 19) },
    { id: X(422), child_id: K(1), emotion: 'Frustration', intensity: 2, context: 'Pénalité contestée', session_number: 4, created_at: daysAgo(21, 19) },
    { id: X(423), child_id: K(1), emotion: 'Calme', intensity: 3, context: null, session_number: 3, created_at: daysAgo(28, 19) },
  ];
  const focus_word_history = [
    { id: X(430), child_id: K(1), word: 'Respire', note: 'Choisi en séance 5', is_current: true, created_at: daysAgo(14, 19) },
  ];
  const athlete_documents = [
    {
      id: X(440),
      child_id: K(1),
      kind: 'CONTRACT',
      title: 'Contrat de confiance',
      storage_path: `${K(1)}/contrat.pdf`,
      file_name: 'contrat-de-confiance.pdf',
      mime_type: 'application/pdf',
      size_bytes: 184_000,
      parent_visible: true,
      created_at: daysAgo(40, 20),
    },
  ];

  const questionnaires = [
    { id: X(500), child_id: K(1), kind: 'LSSS', moment: 'BASELINE', session_number: 1, status: 'COMPLETED', access_token: 'demo-lsss-leo-s1', title: 'Compétences de vie — départ', coach_id: U(20), created_at: daysAgo(44, 19), completed_at: daysAgo(43, 19) },
    { id: X(501), child_id: K(1), kind: 'PERMA', moment: null, session_number: 6, status: 'COMPLETED', access_token: 'demo-perma-leo-s6', title: 'Bien-être — séance 6', coach_id: U(20), created_at: daysAgo(7, 20), completed_at: daysAgo(6, 19) },
    { id: X(502), child_id: K(1), kind: 'PERMA', moment: null, session_number: 7, status: 'PENDING', access_token: 'demo-perma', title: 'Bien-être — séance 7', coach_id: U(20), created_at: daysAgo(0, 18, 50), completed_at: null },
    { id: X(503), child_id: K(2), kind: 'LSSS', moment: 'BASELINE', session_number: 1, status: 'PENDING', access_token: 'demo-lsss', title: 'Compétences de vie — départ', coach_id: U(20), created_at: daysAgo(1, 19), completed_at: null },
    { id: X(504), child_id: K(3), kind: 'LSSS', moment: 'BASELINE', session_number: 1, status: 'COMPLETED', access_token: 'demo-lsss-ines', title: 'Compétences de vie — départ', coach_id: U(20), created_at: daysAgo(30, 19), completed_at: daysAgo(29, 19) },
  ];

  const video_sessions = videoSessionsFromSeed();
  const video_interaction_points = [];
  for (const vs of video_sessions) {
    video_interaction_points.push(
      {
        id: `${vs.id}-q1`,
        video_session_id: vs.id,
        timecode_seconds: 12,
        question_text: 'Avant un défi difficile, qu’est-ce que tu te dis ?',
        answers: [
          { key: 'A', label: 'Je vais essayer, étape par étape', tag: 'confiance', score: 3 },
          { key: 'B', label: 'Je n’y arriverai jamais', tag: 'doute', score: 0 },
          { key: 'C', label: 'Je le fais seulement si je suis sûr de réussir', tag: 'evitement', score: 1 },
          { key: 'D', label: 'J’y vais sans réfléchir', tag: 'impulsivite', score: 1 },
        ],
      },
      {
        id: `${vs.id}-q2`,
        video_session_id: vs.id,
        timecode_seconds: 38,
        question_text: 'Tu viens de rater ton essai. Que fais-tu ?',
        answers: [
          { key: 'A', label: 'Je réessaie en changeant un petit détail', tag: 'perseverance', score: 3 },
          { key: 'B', label: 'J’abandonne ce défi', tag: 'abandon', score: 0 },
          { key: 'C', label: 'Je demande un conseil', tag: 'aide', score: 3 },
          { key: 'D', label: 'Je me fâche contre moi-même', tag: 'durete', score: 0 },
        ],
      }
    );
  }
  const leoVideos = video_sessions.filter((v) => v.age_group === '8-11' && v.session_number <= 3);
  const video_session_runs = leoVideos.map((v, i) => ({
    id: X(600 + i),
    video_session_id: v.id,
    child_id: K(1),
    parent_id: U(1),
    started_at: daysAgo(20 - i * 5, 19),
    completed_at: daysAgo(20 - i * 5, 19, 25),
    progress_seconds: 1200,
    answers_log: [],
    rpe: 4,
  }));

  const notif = (n, user, type, title, body, data, read, ago) => ({
    id: X(700 + n),
    user_id: U(user),
    type,
    title,
    body,
    data,
    is_read: read,
    read_at: read ? daysAgo(ago - 0.2) : null,
    created_at: daysAgo(ago, 19),
  });
  const notifications = [
    notif(1, 1, 'QUESTIONNAIRE', 'Questionnaire bien-être', 'Léo a un court questionnaire à remplir avec toi.', { token: 'demo-perma', child_id: K(1), kind: 'PERMA' }, false, 0),
    notif(2, 1, 'SESSION_REMINDER', 'Séance 7 ce soir', 'Rendez-vous à 18 h 30 avec Marc.', { path: '/parent/my-sessions', child_id: K(1) }, false, 0.1),
    notif(3, 1, 'MESSAGE', 'Nouveau message de Marc', 'Belle séance hier soir !', { path: '/parent/messages', conversation_id: X(800) }, true, 1),
    notif(4, 1, 'BILAN', 'Bilan de la séance 6 disponible', 'Le message du coach t’attend.', { path: '/parent/bilans', child_id: K(1), focus: 'parcours' }, true, 6),
    notif(5, 2, 'SESSION_REMINDER', 'Séance 4 jeudi', 'Rendez-vous à 18 h 30.', { path: '/parent/my-sessions' }, false, 0.3),
    notif(6, 20, 'MESSAGE', 'Nouveau message de Julie Tremblay', 'Merci pour la séance !', { conversation_id: X(800) }, false, 0.2),
  ];

  // ── Messagerie ─────────────────────────────────────────────────────────────
  const conversations = [
    { id: X(800), kind: 'COACH', status: 'OPEN', parent_id: U(1), coach_id: U(20), child_id: K(1), assigned_admin_id: null, subject: null, created_at: daysAgo(60, 10) },
    { id: X(801), kind: 'SUPPORT', status: 'OPEN', parent_id: U(1), coach_id: null, child_id: null, assigned_admin_id: U(30), subject: 'Question sur l’abonnement', created_at: daysAgo(12, 10) },
    { id: X(802), kind: 'COACH', status: 'OPEN', parent_id: U(5), coach_id: U(20), child_id: K(6), assigned_admin_id: null, subject: null, created_at: daysAgo(40, 10) },
    { id: X(803), kind: 'SUPPORT', status: 'OPEN', parent_id: U(3), coach_id: null, child_id: null, assigned_admin_id: null, subject: 'Activation du compte', created_at: daysAgo(1, 10) },
  ];
  const msg = (n, conv, sender, content, ago, extra = {}) => ({
    id: X(900 + n),
    conversation_id: X(conv),
    sender_id: U(sender),
    content,
    attachment_url: null,
    attachment_name: null,
    attachment_type: null,
    attachment_size: null,
    reply_to_id: null,
    is_system: false,
    edited_at: null,
    deleted_at: null,
    created_at: typeof ago === 'string' ? ago : daysAgo(ago[0], ago[1], ago[2] ?? 0),
    ...extra,
  });
  const messages = [
    msg(1, 800, 20, 'Bonjour Julie ! Léo a vraiment bien travaillé sa respiration aujourd’hui.', [2, 19, 5]),
    msg(2, 800, 1, 'Merci Marc, il en parlait encore au souper 😊', [2, 20, 12]),
    msg(3, 800, 20, 'Pour jeudi, pouvez-vous lui rappeler son focus word avant l’entraînement ?', [1, 9, 40]),
    msg(4, 800, 1, 'Oui, promis. Il l’a même écrit sur sa gourde.', [1, 12, 3]),
    msg(5, 800, 20, 'Parfait ! Belle séance hier soir, on continue sur cette lancée.', [0, 18, 2]),
    msg(6, 801, 1, 'Bonjour, est-ce que l’abonnement Maison couvre mes deux enfants ?', [12, 10, 15]),
    msg(7, 801, 30, 'Bonjour Julie ! Oui, l’abonnement couvre toute la famille et les deux parents.', [12, 14, 30]),
    msg(8, 802, 5, 'Liam a hâte à la dernière séance !', [3, 20, 0]),
    msg(9, 803, 3, 'Bonjour, mon compte est en préparation, combien de temps faut-il compter ?', [1, 21, 0]),
  ];
  const conversation_reads = [
    { conversation_id: X(800), user_id: U(1), last_read_at: daysAgo(1, 12, 4) },
    { conversation_id: X(800), user_id: U(20), last_read_at: daysAgo(0, 18, 3) },
    { conversation_id: X(801), user_id: U(1), last_read_at: daysAgo(12, 15) },
  ];

  // ── Maison (P3) ────────────────────────────────────────────────────────────
  const p3m = (activity_id, week, ago, rating, kept_phrase, extra = {}) => ({
    child_id: K(1),
    activity_id,
    week,
    created_at: daysAgo(ago, 19, 20),
    duration_chosen: 10,
    duration_real_s: 720,
    rating,
    kept_phrase,
    capture: null,
    place: 'maison',
    outcome: 'ACCROCHE',
    ...extra,
  });
  const p3_moments = [
    p3m('ACT-0101', 1, 16, 5, 'Je suis fier quand je n’abandonne pas.'),
    p3m('ACT-0102', 1, 14, 4, null, { capture: { kind: 'list', items: ['courir', 'rire', 'mon équipe'] } }),
    p3m('ACT-0103', 1, 12, 4, 'Mon super-pouvoir, c’est la patience.'),
    p3m('ACT-0104', 1, 9, 3, null),
    p3m('ACT-0201', 2, 5, 5, 'Un bon objectif dépend de moi.'),
    p3m('ACT-0202', 2, 2, 4, null),
  ];
  const p3_rewards = [{ child_id: K(1), reward_id: 'fiche_identite', payload: { prenom: 'Léo' }, earned_at: daysAgo(9, 19, 40) }];
  const p3_saved = [{ child_id: K(1), activity_id: 'ACT-0302', kind: 'FAVORI' }];
  const p3_skips = [];
  const p3_letters = [];

  const app_settings = [
    { key: 'p3_enabled', enabled: true, note: 'Programme Maison (P3) ouvert aux familles', updated_at: daysAgo(10, 10), updated_by: U(31) },
    { key: 'fitness_enabled', enabled: true, note: 'Séances vidéo interactives', updated_at: daysAgo(40, 10), updated_by: U(31) },
    { key: 'waitlist_enabled', enabled: false, note: 'Formulaire de liste d’attente du site', updated_at: daysAgo(80, 10), updated_by: U(31) },
  ];

  const billing_subscriptions = [
    {
      user_id: U(1),
      active: true,
      store: 'stripe',
      product_id: 'thrive_maison_annuel',
      period_type: 'normal',
      will_renew: true,
      expires_at: daysAhead(220, 12),
      billing_issue_at: null,
      ever_subscribed: true,
      stripe_customer_id: 'cus_demo',
    },
  ];

  // ── Admin ──────────────────────────────────────────────────────────────────
  const waitlist = [
    ['Mélanie', 'qr', 'nouveau', 'Hockey', 10, '8-11', 'Confiance avant les matchs', 'Soir', 0.4],
    ['Patrick', 'insta', 'appelé', 'Soccer', 13, '12-14', 'Gestion du stress', 'Midi', 2],
    ['Sarah', 'site', 'sans réponse', 'Natation', 9, '8-11', 'Motivation', 'Soir', 4],
    ['Vincent', 'direct', 'converti', 'Hockey', 15, '15-17', 'Concentration', 'Matin', 9],
    ['Lucie', 'site', 'perdu', 'Tennis', 11, '8-11', null, null, 20],
    ['Hugo', 'insta', 'nouveau', 'Basketball', 12, '12-14', 'Estime de soi', 'Soir', 0.1],
  ].map(([first, source, status, sport, age, group, need, pref, ago], i) => ({
    id: X(1000 + i),
    created_at: daysAgo(ago, 12),
    updated_at: daysAgo(ago, 12),
    first_name: first,
    email: `${slug(first)}@exemple.ca`,
    phone: `438 555-02${String(i).padStart(2, '0')}`,
    source,
    consent: true,
    status,
    pack: i % 2 ? 'AVANCE' : null,
    destination: null,
    notes: i === 1 ? 'Rappeler après 18 h.' : null,
    called_at: status === 'appelé' ? daysAgo(ago - 1, 18) : null,
    child_first_name: `${sport === 'Hockey' ? 'Félix' : 'Rose'}`,
    child_age: age,
    age_group: group,
    main_need: need,
    call_preference: pref,
    appointment_at: status === 'appelé' ? daysAhead(3, 17) : null,
  }));

  const task = (n, title, status, horizon, category, priority, deadlineIn, extra = {}) => ({
    id: X(1100 + n),
    title,
    description: n === 1 ? 'Relire les 13 fiches de la semaine 4 avant publication.' : null,
    horizon,
    status,
    deadline: deadlineIn === null ? null : daysAhead(deadlineIn).slice(0, 10),
    assignee: n % 2 ? U(30) : U(31),
    category,
    priority,
    recurrence: 'NONE',
    is_private: false,
    problem: null,
    problem_by: null,
    problem_at: null,
    completed_by: status === 'DONE' ? U(30) : null,
    completed_at: status === 'DONE' ? daysAgo(2) : null,
    created_by: U(31),
    created_at: daysAgo(20 - n, 10),
    updated_at: daysAgo(1, 10),
    ...extra,
  });
  const admin_tasks = [
    task(1, 'Valider les fiches Maison de la semaine 4', 'IN_PROGRESS', 'WEEK', 'CONTENU', 'HIGH', 2),
    task(2, 'Préparer la formation des nouveaux coachs', 'TODO', 'MONTH', 'COACHING', 'MEDIUM', 14),
    task(3, 'Relancer les prospects sans réponse', 'TODO', 'WEEK', 'MARKETING', 'MEDIUM', 1),
    task(4, 'Corriger le lien du certificat', 'BLOCKED', 'WEEK', 'DEVELOPPEMENT', 'HIGH', -1, { problem: 'En attente du gabarit PDF', problem_by: U(30), problem_at: daysAgo(1) }),
    task(5, 'Bilan trimestriel des familles', 'TODO', 'QUARTER', 'ADMINISTRATIF', 'LOW', 60),
    task(6, 'Mettre à jour la politique de confidentialité', 'DONE', 'MONTH', 'ADMINISTRATIF', 'MEDIUM', -3),
  ];
  const admin_task_history = admin_tasks.slice(0, 5).map((t, i) => ({
    id: X(1200 + i),
    task_id: t.id,
    actor: i % 2 ? U(30) : U(31),
    action: ['CREATED', 'STATUS_CHANGED', 'COMMENTED', 'PROBLEM', 'ASSIGNED'][i],
    from_value: null,
    to_value: t.status,
    created_at: daysAgo(i, 11),
  }));
  const admin_task_comments = [
    { id: X(1300), task_id: X(1101), author: U(30), body: 'Semaines 1 à 3 relues, il reste la 4.', mentions: [], created_at: daysAgo(1, 15) },
  ];
  const admin_task_attachments = [];
  const admin_chat_messages = [
    { id: X(1310), channel: 'general', author: U(31), body: 'Bravo pour la mise en ligne des vignettes !', mentions: [], created_at: daysAgo(1, 9) },
    { id: X(1311), channel: 'general', author: U(30), body: 'Merci ! Je m’occupe des relances cette semaine.', mentions: [], created_at: daysAgo(1, 9, 20) },
  ];
  const admin_activity_seen = [];
  const admin_activity_dismissed = [];

  const badges = [
    ['Premier pas', 'Première séance complétée', '🏁', '#F9EB50', 'PROGRESSION', 'SESSIONS_COMPLETED', 1],
    ['Mi-parcours', '7 séances complétées', '⭐', '#A7C4BC', 'PROGRESSION', 'SESSIONS_COMPLETED', 7],
    ['Parcours complet', 'Les 13 séances', '🏆', '#004E7A', 'PROGRESSION', 'SESSIONS_COMPLETED', 13],
    ['Calme olympien', 'Stratégie de recentrage utilisée 3 fois', '🌊', '#6EC1E4', 'EMOTIONS', 'CUSTOM', 3],
    ['Esprit d’équipe', 'A aidé un coéquipier', '🤝', '#F6B45A', 'SOCIAL', 'CUSTOM', 1],
    ['Focus', 'Focus word choisi', '🎯', '#B79CE4', 'MENTAL', 'CUSTOM', 1],
  ].map(([name, description, icon, color, category, condition_type, condition_value], i) => ({
    id: X(1400 + i),
    name,
    description,
    icon,
    color,
    category,
    condition_type,
    condition_value,
    is_active: i !== 5,
    created_at: daysAgo(100, 10),
  }));
  const child_badges = [
    { id: X(1450), child_id: K(1), badge_id: X(1400), awarded_at: daysAgo(40) },
    { id: X(1451), child_id: K(5), badge_id: X(1400), awarded_at: daysAgo(60) },
    { id: X(1452), child_id: K(5), badge_id: X(1401), awarded_at: daysAgo(15) },
    { id: X(1453), child_id: K(6), badge_id: X(1401), awarded_at: daysAgo(30) },
    { id: X(1454), child_id: K(1), badge_id: X(1403), awarded_at: daysAgo(10) },
  ];
  const content_items = [
    ['La respiration carrée', 'Technique en 4 temps pour retrouver son calme.', 'EXERCISE', '8-11', ['respiration', 'calme'], true],
    ['Parler de l’échec à table', 'Trois questions pour transformer une défaite en apprentissage.', 'ARTICLE', null, ['parents'], true],
    ['Visualisation avant un match', 'Script audio de 5 minutes.', 'AUDIO', '12-14', ['imagerie'], false],
    ['Le focus word', 'Choisir un mot-ancre qui ramène au moment présent.', 'EXERCISE', '15-17', ['concentration'], true],
  ].map(([title, body, type, age_group, tags, is_published], i) => ({
    id: X(1500 + i),
    title,
    body,
    type,
    age_group,
    tags,
    is_published,
    created_by: U(31),
    created_at: daysAgo(30 - i * 5, 10),
  }));
  const admin_coach_supervision = [
    { id: X(1600), admin_id: U(30), coach_id: U(20), is_active: true, assigned_by: U(31), created_at: daysAgo(60) },
    { id: X(1601), admin_id: U(30), coach_id: U(21), is_active: true, assigned_by: U(31), created_at: daysAgo(60) },
  ];
  const coachProfiles = profiles.filter((p) => p.role === 'COACH');
  const admin_coaches_view = coachProfiles.map((p) => ({
    id: p.id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    phone: p.phone_number,
    speciality: p.speciality,
    bio: p.bio,
    is_active: p.is_active,
    created_at: p.created_at,
    program_count: programs.filter((x) => x.coach_id === p.id).length,
    session_count: sessions.filter((s) => programs.find((x) => x.id === s.program_id)?.coach_id === p.id).length,
    children_count: coach_assignments.filter((a) => a.coach_id === p.id).length,
  }));
  const analytics_global_kpis = [
    {
      total_coaches: coachProfiles.length,
      total_parents: profiles.filter((p) => p.role === 'PARENT').length,
      total_families: families.length,
      total_children: children.length,
      total_programs: programs.length,
      active_programs: programs.length,
      total_sessions: sessions.length,
      completed_sessions: sessions.filter((s) => s.status === 'COMPLETED').length,
      sessions_this_month: 18,
      total_messages: messages.length,
      messages_this_month: 7,
      total_badges_awarded: child_badges.length,
    },
  ];
  const analytics_monthly_activity = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].map((month, i) => ({
    month,
    sessions: [6, 9, 12, 10, 15, 18][i],
    messages: [3, 5, 9, 7, 11, 14][i],
    badges: [1, 2, 2, 3, 4, 5][i],
    new_programs: [1, 1, 2, 1, 2, 1][i],
  }));
  const analytics_coach_performance = coachProfiles.map((p, i) => ({
    coach_id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    total_programs: [6, 1, 1][i],
    total_sessions: [78, 13, 13][i],
    completed_sessions: [33, 4, 1][i],
    cancelled_sessions: [1, 0, 0][i],
    completion_rate: [42.3, 30.8, 7.7][i],
    total_messages: [12, 2, 0][i],
    badges_awarded: [5, 0, 0][i],
  }));
  const analytics_child_progress = children.map((c) => {
    const s = sessions.filter((x) => x.child_id === c.id);
    return {
      child_id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      age: NOW.getFullYear() - Number(c.date_of_birth.slice(0, 4)),
      family_id: c.family_id,
      family_name: families.find((f) => f.id === c.family_id)?.name ?? '',
      total_sessions: s.length,
      completed_sessions: s.filter((x) => x.status === 'COMPLETED').length,
      badges_count: child_badges.filter((b) => b.child_id === c.id).length,
      last_session_at: s.filter((x) => x.completed_at).map((x) => x.completed_at).sort().pop() ?? null,
    };
  });
  const analytics_badge_distribution = badges.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    category: b.category,
    awarded_count: child_badges.filter((x) => x.badge_id === b.id).length,
    unique_children: new Set(child_badges.filter((x) => x.badge_id === b.id).map((x) => x.child_id)).size,
  }));

  const web_push_subscriptions = [];
  const reports = [];
  const coach_reports = [];
  const questions = [];

  return {
    profiles,
    families,
    family_members: families.map((f, i) => ({ id: X(1700 + i), family_id: f.id, user_id: f.parent_id, role: 'PARENT', created_at: f.created_at })),
    children,
    coach_assignments,
    programs,
    program_enrollments,
    sessions,
    athlete_identity,
    athlete_next_steps,
    athlete_objectives,
    emotion_logs,
    focus_word_history,
    athlete_documents,
    questionnaires,
    questions,
    video_sessions,
    video_interaction_points,
    video_session_runs,
    notifications,
    conversations,
    messages,
    conversation_reads,
    p3_moments,
    p3_rewards,
    p3_saved,
    p3_skips,
    p3_letters,
    app_settings,
    billing_subscriptions,
    waitlist,
    admin_tasks,
    admin_task_history,
    admin_task_comments,
    admin_task_attachments,
    admin_chat_messages,
    admin_activity_seen,
    admin_activity_dismissed,
    badges,
    child_badges,
    content_items,
    admin_coach_supervision,
    admin_coaches_view,
    analytics_global_kpis,
    analytics_monthly_activity,
    analytics_coach_performance,
    analytics_child_progress,
    analytics_badge_distribution,
    web_push_subscriptions,
    reports,
    coach_reports,
  };
}

// ── RPC ──────────────────────────────────────────────────────────────────────
const PACK_PREMIUM = { PERFORMANCE: () => true, AVANCE: (n) => [3, 7, 13].includes(n), ESSENTIEL: () => false };
const OBSERVATIONS = ['Engagement', 'Gestion des émotions', 'Coopération', 'Concentration', 'Persévérance', 'Confiance'];

function familyOfChild(db, childId) {
  const c = db.children.find((x) => x.id === childId);
  return db.families.find((f) => f.id === c?.family_id) ?? null;
}

function conversationSummary(db, conv, me) {
  const msgs = db.messages.filter((m) => m.conversation_id === conv.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = msgs[msgs.length - 1] ?? null;
  const read = db.conversation_reads.find((r) => r.conversation_id === conv.id && r.user_id === me.id);
  const unread = msgs.filter((m) => m.sender_id !== me.id && (!read || m.created_at > read.last_read_at)).length;
  const name = (uid) => {
    const p = db.profiles.find((x) => x.id === uid);
    return p ? `${p.first_name} ${p.last_name}` : null;
  };
  const child = db.children.find((c) => c.id === conv.child_id);
  const isParent = me.id === conv.parent_id;
  return {
    ...conv,
    last_message_at: last?.created_at ?? null,
    last_message_preview: last?.content ?? null,
    last_sender_id: last?.sender_id ?? null,
    unread_count: unread,
    counterpart_name: isParent ? (conv.kind === 'COACH' ? name(conv.coach_id) : 'Support THRIVE') : name(conv.parent_id),
    counterpart_role: isParent ? (conv.kind === 'COACH' ? 'COACH' : 'SUPPORT') : 'PARENT',
    child_name: child?.first_name ?? null,
    parent_name: name(conv.parent_id),
    coach_name: name(conv.coach_id),
  };
}

function completenessOf(db, childId) {
  const identity = db.athlete_identity.find((x) => x.child_id === childId);
  const done = db.sessions.filter((s) => s.child_id === childId && s.status === 'COMPLETED').length;
  const items = [
    { key: 'identity', label: 'Fiche identité', ok: Boolean(identity?.sport_story) },
    { key: 'strengths', label: 'Forces (VIA)', ok: (identity?.strengths?.length ?? 0) > 0 },
    { key: 'smart_goal', label: 'Objectif SMART', ok: Boolean(identity?.smart_goal) },
    { key: 'toolbox', label: 'Boîte à outils', ok: (identity?.toolbox?.length ?? 0) > 0 },
    { key: 'focus_word', label: 'Focus word', ok: Boolean(identity?.focus_word) },
    { key: 'lsss', label: 'LSSS de départ', ok: db.questionnaires.some((q) => q.child_id === childId && q.kind === 'LSSS' && q.status === 'COMPLETED') },
    { key: 'contract', label: 'Contrat de confiance', ok: db.athlete_documents.some((d) => d.child_id === childId && d.kind === 'CONTRACT') },
  ];
  const ok = items.filter((i) => i.ok).length;
  return {
    pct: Math.round((ok / items.length) * 100),
    done: ok,
    total: items.length,
    sessions_completed: done,
    total_sessions: 13,
    missing: items.filter((i) => !i.ok).map((i) => i.label),
    items,
  };
}

const LSSS_ITEMS = [
  ['teamwork', 'Travail d’équipe', 'J’aide mes coéquipiers quand ils en ont besoin.'],
  ['teamwork', 'Travail d’équipe', 'J’écoute les idées des autres.'],
  ['goals', 'Objectifs', 'Je me fixe des objectifs pour progresser.'],
  ['goals', 'Objectifs', 'Je sais ce que je dois faire pour atteindre mon objectif.'],
  ['emotions', 'Émotions', 'Je sais me calmer quand je suis fâché.'],
  ['emotions', 'Émotions', 'Je reconnais ce que je ressens pendant un match.'],
  ['leadership', 'Leadership', 'J’encourage les autres.'],
  ['leadership', 'Leadership', 'Je donne l’exemple à l’entraînement.'],
];
const EPOCH_ITEMS = [
  ['engagement', 'Engagement', 'Quand je fais une activité, j’oublie tout le reste.'],
  ['engagement', 'Engagement', 'Je me concentre à fond sur ce que je fais.'],
  ['perseverance', 'Persévérance', 'Je termine ce que je commence.'],
  ['perseverance', 'Persévérance', 'Je continue même quand c’est difficile.'],
  ['optimism', 'Optimisme', 'Je pense qu’il va m’arriver de bonnes choses.'],
  ['optimism', 'Optimisme', 'Je vois le bon côté des choses.'],
  ['connectedness', 'Connexion aux autres', 'Il y a des gens dans ma vie qui m’écoutent vraiment.'],
  ['connectedness', 'Connexion aux autres', 'Quand j’ai un problème, quelqu’un est là pour moi.'],
  ['happiness', 'Bonheur', 'Je me sens heureux.'],
  ['happiness', 'Bonheur', 'J’ai beaucoup de plaisir dans ma vie.'],
];

export function makeRpc(db) {
  const accessOf = (me) => {
    if (!me) return null;
    if (me.role !== 'PARENT') {
      return { role: me.role, unlocked: true, has_child: true, has_confirmed_child: true, coach_validated: true, fitness_enabled: true, p3_subscribed: false, p3_access: true };
    }
    const profile = db.profiles.find((p) => p.id === me.id);
    const fams = db.families.filter((f) => f.parent_id === me.id).map((f) => f.id);
    const kids = db.children.filter((c) => fams.includes(c.family_id));
    const sub = db.billing_subscriptions.find((s) => s.user_id === me.id && s.active);
    const unlocked = Boolean(profile?.coach_validated) && kids.some((k) => k.validation_status === 'CONFIRMED');
    const flag = (key) => db.app_settings.find((s) => s.key === key)?.enabled === true;
    return {
      role: 'PARENT',
      unlocked,
      has_child: kids.length > 0,
      has_confirmed_child: kids.some((k) => k.validation_status === 'CONFIRMED'),
      coach_validated: Boolean(profile?.coach_validated),
      fitness_enabled: flag('fitness_enabled'),
      p3_subscribed: Boolean(sub),
      p3_access: unlocked || Boolean(sub),
    };
  };

  return {
    access_state: (_a, me) => accessOf(me),
    session_report: ({ p_session }) => {
      const s = db.sessions.find((x) => x.id === p_session);
      if (!s) return null;
      const fam = familyOfChild(db, s.child_id);
      const premium = (PACK_PREMIUM[fam?.pack ?? 'ESSENTIEL'] ?? (() => false))(s.session_number);
      const obs = Object.fromEntries(OBSERVATIONS.map((o, i) => [o, ((s.session_number + i) % 5) + 1]));
      return {
        session_id: s.id,
        session_number: s.session_number,
        premium,
        message:
          s.session_number % 2
            ? 'Belle séance ! Léo a mis en pratique la respiration carrée dès l’échauffement. Encouragez-le à la refaire avant jeudi.'
            : 'Séance exigeante mais très riche : il a su nommer son trac et proposer lui-même une stratégie. Bravo à toute la famille.',
        has_bilan: true,
        has_observations: true,
        bilan: premium
          ? {
              points_forts: 'Engagement constant, belle écoute des consignes.',
              axe_de_travail: 'Rester dans le présent après une erreur.',
              a_la_maison: 'Rejouer la routine pré-tir au souper, en deux minutes.',
            }
          : null,
        observations: premium ? obs : null,
        observation_labels: OBSERVATIONS,
      };
    },
    gauge_summary: ({ p_child_id }) =>
      p_child_id === K(1)
        ? { global: 68, sample_size: 2, by_skill: { travail_d_equipe: 74, objectifs: 66, emotions: 61, leadership: 71 } }
        : p_child_id === K(3)
          ? { global: 55, sample_size: 1, by_skill: { travail_d_equipe: 60, objectifs: 52 } }
          : { global: 0, sample_size: 0, by_skill: {} },
    lsss_progression: ({ p_child }) =>
      p_child === K(1)
        ? [
            { moment: 'BASELINE', value: 58, created_at: daysAgo(43) },
            { moment: 'MID', value: 68, created_at: daysAgo(1) },
          ]
        : p_child === K(3)
          ? [{ moment: 'BASELINE', value: 55, created_at: daysAgo(29) }]
          : [],
    perma_progression: ({ p_child }) =>
      p_child === K(1)
        ? [1, 2, 3, 4, 5, 6].map((n) => ({
            session_number: n,
            created_at: daysAgo((7 - n) * 7),
            value: [58, 61, 60, 66, 70, 74][n - 1],
            pillars: { engagement: 72 + n, perseverance: 60 + n * 2, optimism: 64 + n, connectedness: 70, happiness: 66 + n * 2 },
          }))
        : [],
    dossier_completeness: ({ p_child }) => completenessOf(db, p_child),
    list_dossiers: (_a, me) => {
      const visible =
        me?.role === 'COACH'
          ? db.coach_assignments.filter((a) => a.coach_id === me.id).map((a) => a.child_id)
          : db.children.map((c) => c.id);
      return db.children
        .filter((c) => visible.includes(c.id))
        .map((c) => {
          const a = db.coach_assignments.find((x) => x.child_id === c.id && x.is_active);
          const coach = db.profiles.find((p) => p.id === a?.coach_id);
          const comp = completenessOf(db, c.id);
          const sup = db.admin_coach_supervision.find((s) => s.coach_id === a?.coach_id);
          const admin = db.profiles.find((p) => p.id === sup?.admin_id);
          return {
            child_id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            coach_id: coach?.id ?? null,
            coach_name: coach ? `${coach.first_name} ${coach.last_name}` : null,
            admin_id: admin?.id ?? null,
            admin_name: admin ? `${admin.first_name} ${admin.last_name}` : null,
            pct: comp.pct,
            missing_count: comp.missing.length,
            sessions_completed: comp.sessions_completed,
            total_sessions: 13,
            pending_lsss: db.questionnaires.some((q) => q.child_id === c.id && q.kind === 'LSSS' && q.status === 'PENDING'),
            updated_at: db.athlete_identity.find((x) => x.child_id === c.id)?.updated_at ?? null,
          };
        });
    },
    list_my_conversations: ({ p_scope }, me) => {
      if (!me) return [];
      let convs = db.conversations;
      if (p_scope === 'mine' || !p_scope) convs = convs.filter((c) => c.parent_id === me.id || c.coach_id === me.id || c.assigned_admin_id === me.id);
      else if (p_scope === 'support') convs = convs.filter((c) => c.kind === 'SUPPORT');
      else if (p_scope === 'supervision') convs = convs.filter((c) => c.kind === 'COACH');
      return convs.map((c) => conversationSummary(db, c, me)).sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
    },
    my_unread_messages: (_a, me) =>
      me
        ? db.conversations
            .filter((c) => c.parent_id === me.id || c.coach_id === me.id || c.assigned_admin_id === me.id)
            .reduce((n, c) => n + conversationSummary(db, c, me).unread_count, 0)
        : 0,
    get_or_create_coach_conversation: ({ p_child_id }, me) => {
      const fam = familyOfChild(db, p_child_id);
      if (fam?.pack !== 'PERFORMANCE') return { __error: 'FEATURE_LOCKED' };
      const a = db.coach_assignments.find((x) => x.child_id === p_child_id && x.is_active);
      if (!a) return null;
      let conv = db.conversations.find((c) => c.kind === 'COACH' && c.child_id === p_child_id && c.parent_id === me?.id);
      if (!conv) {
        conv = { id: `conv-${p_child_id}`, kind: 'COACH', status: 'OPEN', parent_id: me?.id, coach_id: a.coach_id, child_id: p_child_id, assigned_admin_id: null, subject: null, created_at: iso(NOW) };
        db.conversations.push(conv);
      }
      return conv.id;
    },
    get_or_create_support_conversation: (_a, me) => {
      let conv = db.conversations.find((c) => c.kind === 'SUPPORT' && c.parent_id === me?.id);
      if (!conv) {
        conv = { id: `support-${me?.id}`, kind: 'SUPPORT', status: 'OPEN', parent_id: me?.id, coach_id: null, child_id: null, assigned_admin_id: null, subject: null, created_at: iso(NOW) };
        db.conversations.push(conv);
      }
      return conv.id;
    },
    // Consultation seule : l'audit ne laisse aucune trace de lecture.
    mark_conversation_read: () => null,
    set_support_conversation_state: () => null,
    questionnaire_get: ({ p_token }) => {
      const q = db.questionnaires.find((x) => x.access_token === p_token);
      if (!q) return { error: 'not_found' };
      const child = db.children.find((c) => c.id === q.child_id);
      const src = q.kind === 'PERMA' ? EPOCH_ITEMS : LSSS_ITEMS;
      return {
        questionnaire_id: q.id,
        kind: q.kind,
        lang: 'fr',
        session_number: q.session_number,
        moment: q.moment,
        child_first_name: child?.first_name ?? '',
        title: q.kind === 'PERMA' ? 'Comment tu te sens en ce moment' : 'Mes compétences de vie',
        description:
          q.kind === 'PERMA'
            ? 'Il n’y a pas de bonne ou de mauvaise réponse. Réponds comme tu te sens ces jours-ci.'
            : 'Lis chaque phrase et choisis ce qui te ressemble le plus.',
        status: q.status,
        completed: q.status === 'COMPLETED',
        items: src.map(([group_key, group_label, prompt], i) => ({ id: `${q.id}-i${i}`, group_key, group_label, prompt, sort_order: i + 1 })),
      };
    },
    questionnaire_submit: () => ({ ok: true }),
    lsss_send: () => ({ ok: true }),
    perma_send: () => ({ ok: true }),
    confirm_child: () => null,
    validate_parent_access: () => null,
    notify_incomplete_dossiers: () => null,
    notify_admin_task_deadlines: () => null,
    vapid_public_key: () => null,
    export_sessions_csv: () => 'session_id,child,status\n',
    lsss_get: () => null,
    lsss_submit: () => null,
  };
}

// ── Fonctions Edge ───────────────────────────────────────────────────────────
export function makeFunctions(db) {
  return {
    'billing-plans': () => ({
      plans: [
        { plan: 'mensuel', amount: 1499, currency: 'CAD', interval: 'month', interval_count: 1, name: 'Mensuel' },
        { plan: 'annuel', amount: 11999, currency: 'CAD', interval: 'year', interval_count: 1, name: 'Annuel' },
      ],
      trial_days: 30,
      trial_eligible: true,
    }),
    'billing-sync': (_b, me) => ({ active: db.billing_subscriptions.some((s) => s.user_id === me?.id && s.active) }),
    // Aucune redirection réelle pendant l'audit.
    'create-checkout-session': () => ({ url: '/parent/abonnement?checkout=cancel' }),
    'create-portal-session': () => ({ url: '/parent/abonnement?portal=return' }),
  };
}
