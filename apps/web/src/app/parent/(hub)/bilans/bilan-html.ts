// Gabarit HTML de la « Carte d'identité » (zone bilan).
// Direction visuelle « Nuit calme » (design Tour 2a, 2026-07-31) : surfaces
// plates var(--surface) sur fond var(--bg), un seul accent (#F9EB50), le sage (#A7C4BC)
// en secondaire. Aucune carte n'a de bordure, d'ombre ni de dégradé ; aucun
// halo flou ; une seule animation à la fois (entrée en cascade, remplissage de
// barre, et l'unique anneau qui respire sur la séance en cours).
// La couche données est inchangée : mêmes props, mêmes `data-info` / `data-doc`
// / `data-href` / `data-action` que la version précédente.
import type { LsssMoment } from '@/lib/bilan';

export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export type CoachInfo = { first_name: string; last_name: string } | null;
type ToolboxItem = { tool: string; context: string };
export type ParentIdentity = {
  sport: string | null;
  position: string | null;
  club: string | null;
  sport_story: string | null;
  strengths: string[] | null;
  season_dream: string | null;
  smart_goal: string | null;
  life_skill_goal: string | null;
  my_actions: string[] | null;
  toolbox: ToolboxItem[] | null;
  focus_word: string | null;
  letter: string | null;
  program_pct_override: number | null;
  certificate_ready: boolean | null;
} | null;

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );

/* CSS du design : polices (Fraunces + Inter, déjà chargées par l'app), keyframes
   d'animation (toutes en CSS pur, aucun runtime JS requis) et grilles responsives. */
export const DESIGN_CSS = `
.bilan-root{font-family:var(--font-inter),'Inter',system-ui,sans-serif;color:var(--text2);--bcard-pad:20px;--bnode:36px;max-width:100%;}
.bilan-root *{min-width:0;}
.bilan-root .disp{font-family:var(--font-display),'Fraunces',Georgia,serif;}
.bilan-root .bx{box-sizing:border-box;}
/* Surface unique de la direction : un aplat, rien d'autre. */
.bilan-root .b-card{background:var(--surface);border-radius:22px;padding:var(--bcard-pad,20px);position:relative;}
/* Étiquette de section — seul niveau de titre secondaire */
.bilan-root .b-eye{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text3);margin:0;}
.bilan-root .b-track{height:6px;border-radius:3px;background:var(--chip);overflow:hidden;}
.bilan-root .b-fill{height:100%;border-radius:3px;transform-origin:left;animation:b-growX 1.1s cubic-bezier(.22,.61,.36,1) both .35s;}
@keyframes b-cardIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes b-drawLine{from{stroke-dashoffset:900;}to{stroke-dashoffset:0;}}
@keyframes b-fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes b-growX{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@keyframes b-breatheC{0%,100%{opacity:.82;transform:scale(1);}50%{opacity:1;transform:scale(1.05);}}
@keyframes b-ring{0%,100%{box-shadow:0 0 0 0 rgba(249,235,80,.34);}50%{box-shadow:0 0 0 7px rgba(249,235,80,0);}}
@keyframes b-spin{to{transform:rotate(360deg);}}
.bilan-root .b-stack{display:flex;flex-direction:column;gap:12px;}
.bilan-root .b-row2{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:16px;}
.bilan-root .b-tools{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;}
.bilan-root .b-nodes{display:grid;grid-template-columns:repeat(7,1fr);gap:14px 4px;}
/* Cartes/rangées cliquables : ce sont des div, on leur applique les
   optimisations tactiles que les navigateurs réservent aux button/a. */
.bilan-root .b-clk,.bilan-root .b-hover{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;cursor:pointer;}
/* Retour au survol/appui : un simple éclaircissement du fond, jamais de lueur. */
.bilan-root .b-card.b-clk{transition:background-color .18s ease,transform .18s ease;}
.bilan-root .b-card.b-clk:hover{background:var(--surface);}
.bilan-root .b-card.b-clk:active{transform:scale(.995);}
.bilan-root .b-hover{transition:opacity .15s ease,background-color .15s ease;}
.bilan-root .b-hover:hover{opacity:.85;}
.bilan-root .b-hover:active{transform:scale(.98);}
/* Chevron d'affordance : les cartes ouvrent une fiche détaillée. */
.bilan-root .b-hint{position:absolute;right:16px;top:18px;z-index:3;color:var(--text4);line-height:0;pointer-events:none;transition:color .18s ease;}
.bilan-root .b-clk:hover .b-hint{color:var(--text3);}
@media(max-width:1100px){
  .bilan-root .b-row2{grid-template-columns:1fr;gap:12px;}
  .bilan-root .b-tools{grid-template-columns:1fr 1fr;gap:12px;}
  .bilan-root .b-tools>div{grid-column:span 2!important;}
  .bilan-root .b-tools>.b-half{grid-column:span 1!important;}
}
@media(max-width:680px){
  .bilan-root{--bcard-pad:18px;--bnode:34px;}
  .bilan-root .b-row2,.bilan-root .b-tools,.bilan-root .b-stack{gap:10px;}
  .bilan-root .b-tools{grid-template-columns:1fr;}
  .bilan-root .b-tools>div,.bilan-root .b-tools>.b-half{grid-column:span 1!important;}
  .bilan-root .b-pct{font-size:76px!important;}
  .bilan-root .b-pctsign{font-size:26px!important;}
  .bilan-root .b-toolstitle{font-size:23px!important;}
  .bilan-root .b-hint{right:14px;top:16px;}
}
@media(max-width:400px){
  .bilan-root{--bnode:32px;}
  .bilan-root .b-nodes{gap:12px 2px;}
}
/* Surbrillance d'arrivée depuis une notification (?focus=<carte>) */
@keyframes b-flash{0%,55%{box-shadow:0 0 0 2px rgba(249,235,80,.85);}100%{box-shadow:0 0 0 2px rgba(249,235,80,0);}}
.bilan-root .b-flash{animation:b-flash 2.4s ease-out 1;}
/* Modales (fiches détaillées et fiches d'explication) — même aplat que les cartes. */
.b-modal-ov{position:fixed;inset:0;z-index:90;background:rgba(3,12,17,.72);display:flex;align-items:center;justify-content:center;padding:18px;animation:b-fadeIn .22s ease both;}
.b-modal{box-sizing:border-box;font-family:var(--font-inter),'Inter',system-ui,sans-serif;color:var(--text2);position:relative;width:100%;max-width:560px;max-height:86vh;overflow-y:auto;overscroll-behavior:contain;border-radius:26px;background:var(--surface);box-shadow:0 40px 90px rgba(0,0,0,.55);padding:26px;animation:b-cardIn .3s cubic-bezier(.22,.61,.36,1) both;}
.b-modal .disp{font-family:var(--font-display),'Fraunces',Georgia,serif;}
@media(max-width:680px){
  .b-modal-ov{padding:0;align-items:flex-end;}
  .b-modal{max-height:90vh;border-radius:24px 24px 0 0;padding:30px 18px calc(24px + env(safe-area-inset-bottom,0px));}
  /* Poignée de feuille (bottom sheet) façon iOS */
  .b-modal::before{content:'';position:absolute;top:9px;left:50%;transform:translateX(-50%);width:40px;height:5px;border-radius:3px;background:var(--chip);}
}
`;

// Chevron d'affordance (les cartes ouvrent une fiche détaillée)
const HINT =
  '<span class="b-hint bx"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg></span>';

// Graphe de progression du BIEN-ÊTRE (PERMA), une mesure par séance (jusqu'à 13
// points). 0 point → message d'attente ; sinon courbe sage + dernier point accentué.
function permaGraphHtml(points: { session_number: number; value: number }[]): string {
  const xOf = (s: number) => 30 + ((Math.max(1, Math.min(13, s)) - 1) / 12) * 600;
  const yOf = (v: number) => 20 + ((100 - Math.max(0, Math.min(100, v))) / 100) * 150;
  const pts = [...points].sort((a, b) => a.session_number - b.session_number);

  if (pts.length === 0) {
    return `<div style="height:150px;display:flex;align-items:center;justify-content:center;text-align:center;">
      <p style="margin:0;max-width:300px;font-size:14px;line-height:1.5;color:var(--text3);">En attente du premier questionnaire de bien-être. Le coach en envoie un court après chaque séance.</p>
    </div>`;
  }

  const coords = pts.map((p) => ({ x: xOf(p.session_number), y: yOf(p.value), v: p.value, s: p.session_number }));
  const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const line =
    coords.length >= 2
      ? `<polyline points="${poly}" fill="none" stroke="#A7C4BC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:900;stroke-dashoffset:900;animation:b-drawLine 1.6s ease forwards .5s;"></polyline>`
      : '';
  // Un seul point marqué : la dernière mesure, en accent.
  const last = coords[coords.length - 1];
  const dot = `<circle cx="${last.x}" cy="${last.y}" r="6" fill="#F9EB50" style="opacity:0;animation:b-fadeIn .5s ease forwards 1.6s;"></circle>`;
  // L'étiquette passe SOUS le point quand celui-ci frôle le haut du graphe,
  // sinon elle serait rognée (cas d'une mesure à 100).
  const near = last.y < 55;
  // Idem à droite : la dernière mesure est souvent en bout de courbe.
  const nearRight = last.x > 560;
  const label = `<span class="bx" style="position:absolute;left:${((last.x / 660) * 100).toFixed(1)}%;top:${((last.y / 190) * 100).toFixed(1)}%;transform:translate(${nearRight ? '-88%' : '-50%'},${near ? '70%' : '-160%'});font-size:12px;font-weight:600;color:var(--accent-ink);white-space:nowrap;pointer-events:none;">S${last.s} · ${last.v}</span>`;

  return `<div style="position:relative;">
    <svg viewBox="0 0 660 190" width="100%" height="150" preserveAspectRatio="none" style="display:block;">
      <line x1="0" y1="40" x2="660" y2="40" stroke="var(--line)"></line>
      <line x1="0" y1="104" x2="660" y2="104" stroke="var(--line)"></line>
      <line x1="0" y1="150" x2="660" y2="150" stroke="var(--line)"></line>
      ${line}
      ${dot}
    </svg>
    ${label}
  </div>`;
}

// Mini-profil des 5 piliers PERMA (dernière mesure) — barres horizontales.
function permaPillarsHtml(pillars: Record<string, number>): string {
  const ORDER: [string, string][] = [
    ['engagement', 'Engagement'],
    ['perseverance', 'Persévérance'],
    ['optimism', 'Optimisme'],
    ['connectedness', 'Connexion aux autres'],
    ['happiness', 'Bonheur'],
  ];
  const rows = ORDER.map(([k, label]) => {
    const v = Math.max(0, Math.min(100, Math.round(pillars?.[k] ?? 0)));
    const has = pillars?.[k] != null;
    return `<div style="display:flex;align-items:center;gap:12px;">
      <span style="width:132px;flex-shrink:0;font-size:13px;font-weight:500;color:var(--text3);">${label}</span>
      <span class="b-track" style="flex:1;display:block;"><span class="b-fill" style="display:block;width:${has ? v : 0}%;background:#A7C4BC;animation-delay:.6s;"></span></span>
      <span class="disp" style="width:26px;text-align:right;font-size:13px;font-weight:600;color:${has ? 'var(--text)' : 'var(--text4)'};">${has ? v : '—'}</span>
    </div>`;
  }).join('');
  return `<div style="display:flex;flex-direction:column;gap:11px;margin-top:18px;">${rows}</div>`;
}


export function buildHtml(d: {
  firstName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  age: number | null;
  sport: string;
  poste: string;
  club: string | null;
  coachLast: string;
  coachLabel: string | null;
  force1: string;
  completed: number;
  pct: number;
  smartGoal: string | null;
  focusWord: string | null;
  toolboxCount: number;
  toolbox: { tool: string; context: string }[];
  letter: string | null;
  sportStory: string | null;
  strengths: string[];
  seasonDream: string | null;
  lifeSkillGoal: string | null;
  myActions: string[];
  gaugeGlobal: number | null;
  gaugeDelta: number | null;
  bySkill: Record<string, number>;
  lsssPoints: { moment: LsssMoment; value: number }[];
  permaPoints: { session_number: number; value: number; pillars: Record<string, number> }[];
  nextSteps: { label: string; status: string; due_date: string | null }[];
  docIds: { contract?: string; letter?: string; certificate?: string };
  latestEmotion: string | null;
  statusByNum: Record<number, string>;
  certificateReady: boolean;
  // Personnalisation parent du passeport (photo à part, via avatarUrl signée).
  nickname: string | null;
  jerseyNumber: number | null;
  accentColor: string; // hex issu des préréglages (lib/avatar.ts)
  // Droits du forfait (matrice packs.ts) — pilotent les sections analytiques.
  // Verrouillé = même carte, valeurs floutées + note d'upgrade (jamais de données réelles).
  ent: { skillBreakdown: boolean; lsssCurve: boolean; emotionWheel: boolean };
}) {
  const {
    firstName,
    fullName,
    initials,
    avatarUrl,
    nickname,
    jerseyNumber,
    accentColor,
    age,
    club,
    coachLabel,
    completed,
    pct,
    smartGoal,
    focusWord,
    toolboxCount,
    toolbox,
    letter,
    sportStory,
    strengths,
    seasonDream,
    lifeSkillGoal,
    myActions,
    gaugeGlobal,
    gaugeDelta,
    bySkill,
    permaPoints,
    nextSteps,
    docIds,
    latestEmotion,
    statusByNum,
    certificateReady,
    ent,
  } = d;

  const cur = Math.min(Math.max(completed, 0), 13);
  const next = Math.min(completed + 1, 13);
  const remaining = Math.max(13 - completed, 0);

  // Entrée en cascade des cartes (fill "backwards" : l'état final reste le style
  // naturel, pour ne pas bloquer le transform du survol).
  const ain = (i: number) =>
    `animation:b-cardIn .6s cubic-bezier(.22,.61,.36,1) ${(0.04 + i * 0.06).toFixed(2)}s backwards;`;

  // ── Teasers de la matrice de droits (mêmes codes visuels que PackGate) ──
  // Note d'upgrade : cadenas + accent sun, navigation via data-href (délégué).
  const lockNote = (txt: string) =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(249,235,80,.07);border:1px solid rgba(249,235,80,.28);">
      <svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px;flex-shrink:0;margin-top:2px;color:var(--accent-ink);" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>
      <span style="font-size:14px;line-height:1.5;color:var(--text2);"><b style="color:var(--accent-ink);">Contenu réservé.</b> ${txt} <span class="b-hover" data-href="/parent/upgrade" style="color:var(--accent-ink);font-weight:600;text-decoration:underline;text-underline-offset:2px;">Voir les forfaits</span></span>
    </div>`;

  // Barres décoratives floutées (aucune donnée réelle) pour les visuels verrouillés
  const lockedBars = `<div aria-hidden="true" style="filter:blur(5px);pointer-events:none;user-select:none;display:flex;align-items:flex-end;gap:8px;height:110px;padding:14px 4px 0;">${[35, 55, 45, 70, 60, 85, 78]
    .map((h) => `<div style="flex:1;height:${h}%;border-radius:4px 4px 0 0;background:rgba(167,196,188,.35);"></div>`)
    .join('')}</div>`;

  // ── Jauge par compétence + delta (skillBreakdown, Avancé+) ──
  // Débloqué : moyennes réelles par famille de compétence (gauge_summary.by_skill).
  // Verrouillé : lignes décoratives floutées + note d'upgrade. Sans donnée : rien.
  const skillLabel = (k: string) => {
    const t = k.replace(/[_-]/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const skillRow = (label: string, v: number) =>
    `<div style="display:flex;align-items:center;gap:12px;">
      <span style="flex:1;min-width:0;font-size:14px;font-weight:500;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label)}</span>
      <span class="b-track" style="width:88px;flex-shrink:0;display:block;"><span class="b-fill" style="display:block;width:${Math.max(0, Math.min(100, Math.round(v)))}%;background:#A7C4BC;animation-delay:.5s;"></span></span>
      <span class="disp" style="width:26px;text-align:right;font-size:14px;font-weight:600;color:var(--text);flex-shrink:0;">${Math.round(v)}</span>
    </div>`;
  const skillEntries = Object.entries(bySkill);
  const skillBreakdownHtml = ent.skillBreakdown
    ? skillEntries.length
      ? `<div style="display:flex;flex-direction:column;gap:14px;margin-top:20px;">${skillEntries
          .slice(0, 4)
          .map(([k, v]) => skillRow(skillLabel(k), Number(v)))
          .join('')}</div>`
      : ''
    : `<div style="margin-top:20px;">
        <div aria-hidden="true" style="display:flex;flex-direction:column;gap:14px;filter:blur(5px);pointer-events:none;user-select:none;">${[68, 44, 81]
          .map((v) => skillRow('Compétence', v))
          .join('')}</div>
        <div style="margin-top:16px;">${lockNote('Le détail par compétence et son évolution sont inclus dès le pack Avancé.')}</div>
      </div>`;

  // ── Parcours : 13 nœuds — pilotés par le statut réel de chaque séance ──
  const hasStatus = Object.keys(statusByNum).length > 0;
  let nodes = '';
  for (let n = 1; n <= 13; n++) {
    const st = statusByNum[n];
    const done = hasStatus ? st === 'COMPLETED' : n < cur;
    const missed = st === 'MISSED';
    const postponed = st === 'POSTPONED';
    const isCur = hasStatus ? st === 'IN_PROGRESS' : n === cur && cur >= 1 && cur < 13;
    const node = 'width:var(--bnode,36px);height:var(--bnode,36px);border-radius:999px;display:grid;place-items:center;font-weight:700;font-size:14px;';
    let circle: string;
    let subColor = 'var(--text4)';
    let subOverride = '';
    if (done) {
      circle = `<span class="disp bx" style="${node}background:#A7C4BC;color:#06222A;">${n}</span>`;
      subColor = 'var(--text3)';
    } else if (missed) {
      circle = `<span class="disp bx" style="${node}background:rgba(220,80,80,.14);border:1px solid rgba(220,80,80,.5);color:#ffb4b4;">${n}</span>`;
      subColor = '#e78a8a';
      subOverride = `S${n} · manquée`;
    } else if (postponed) {
      circle = `<span class="disp bx" style="${node}background:rgba(230,170,40,.14);border:1px solid rgba(230,170,40,.5);color:#f2d18a;">${n}</span>`;
      subColor = '#e0b45a';
      subOverride = `S${n} · reportée`;
    } else if (isCur) {
      // Le seul effet permanent de l'écran : l'anneau de la séance en cours.
      circle = `<span class="disp bx" style="${node}background:#F9EB50;color:#06222A;animation:b-ring 2.6s ease-in-out infinite;">${n}</span>`;
      subColor = '#F9EB50';
    } else {
      circle = `<span class="disp bx" style="${node}border:1px solid var(--line2);color:var(--text3);font-weight:600;">${n}</span>`;
    }
    // Libellé tenant sur UNE ligne à 7 colonnes / 375 px : les deux jalons
    // portent leur nom (LSSS, bilan), les autres leur seul numéro de séance.
    const sub = subOverride ? subOverride : n === 7 ? 'LSSS' : n === 13 ? 'Bilan' : `S${n}`;
    nodes += `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">${circle}<span style="font-size:10px;font-weight:600;color:${subColor};white-space:nowrap;">${sub}</span></div>`;
  }

  // Avatar du bouton passeport (34 → 42 px, rayon 13 comme la maquette).
  const avatarInner = avatarUrl
    ? `<img src="${esc(avatarUrl)}" alt="" style="width:42px;height:42px;border-radius:13px;object-fit:cover;">`
    : `<span class="disp bx" style="width:42px;height:42px;border-radius:13px;background:#0E6593;display:grid;place-items:center;font-weight:700;font-size:15px;color:#fff;">${esc(initials)}</span>`;
  const avatar = `<span style="position:relative;display:inline-flex;flex-shrink:0;">${avatarInner}${
    jerseyNumber != null
      ? `<span class="bx" style="position:absolute;right:-5px;bottom:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:7px;background:${esc(accentColor)};color:#06222A;font-weight:800;font-size:10px;display:grid;place-items:center;">${jerseyNumber}</span>`
      : ''
  }</span>`;
  const subLine = [age != null ? `${age} ans` : null, club].filter(Boolean).map(esc).join(' · ') || '—';

  // ── Badges « renseigné / à venir » des ateliers ──
  const okBadge = (txt: string) =>
    `<span style="flex-shrink:0;font-size:13px;font-weight:600;color:var(--accent-ink);white-space:nowrap;">${txt}</span>`;
  const waitBadge = (txt: string) =>
    `<span style="flex-shrink:0;font-size:13px;font-weight:600;color:var(--text3);white-space:nowrap;">${txt}</span>`;
  // En-tête d'atelier : titre Fraunces + statut à droite, sans pastille d'icône.
  // `space-between` + retour à la ligne : sur une ligne le statut se cale à
  // droite, et s'il passe dessous il revient à gauche sous le titre.
  const toolHead = (title: string, badge: string) =>
    `<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:16px;padding-right:26px;">
      <span class="disp" style="font-size:19px;font-weight:600;color:var(--text);">${title}</span>${badge}
    </div>`;

  const strengthChips = strengths.filter(Boolean);
  const idFilled = Boolean(sportStory) || strengthChips.length > 0 || Boolean(seasonDream);
  const objFilled = Boolean(smartGoal) || Boolean(lifeSkillGoal) || myActions.length > 0;
  const renseignes =
    [idFilled, objFilled, Boolean(focusWord), toolbox.length > 0, Boolean(letter)].filter(Boolean)
      .length + 1; // +1 = contrat (coach assigné)

  const objText = smartGoal || 'Objectif SMART à co-construire avec le coach.';
  const focus = focusWord || '—';

  // ── Fragments alimentés par ce que le coach a rempli ──
  const toolboxItemsHtml = toolbox.length
    ? `<div style="display:flex;flex-direction:column;gap:10px;">${toolbox
        .map(
          (t) =>
            `<div style="display:flex;gap:10px;align-items:baseline;"><span style="width:5px;height:5px;border-radius:50%;background:#A7C4BC;margin-top:7px;flex-shrink:0;"></span><span style="font-size:15px;line-height:1.45;color:var(--text2);">${esc(t.tool)}${t.context ? `<span style="color:var(--text3);"> — ${esc(t.context)}</span>` : ''}</span></div>`
        )
        .join('')}</div>`
    : '';
  const lifeSkillHtml = lifeSkillGoal
    ? `<p class="b-eye" style="margin-bottom:6px;">Objectif life skill</p><p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:var(--text2);">${esc(lifeSkillGoal)}</p>`
    : '';
  const actionsHtml = myActions.length
    ? `<p class="b-eye" style="margin-bottom:10px;">Ce qui dépend de moi</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">${myActions
        .map(
          (a) =>
            `<div style="display:flex;gap:10px;align-items:baseline;"><span style="color:var(--accent-ink);flex-shrink:0;line-height:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg></span><span style="font-size:15px;color:var(--text2);">${esc(a)}</span></div>`
        )
        .join('')}</div>`
    : '';

  const identiteCard = `
    <!-- S1 · FICHE IDENTITÉ ATHLÈTE -->
    <div class="bx b-clk b-card" data-info="identite" style="grid-column:span 6;${ain(7)}">${HINT}
      ${toolHead('Fiche Identité Athlète', idFilled ? okBadge('S1 · renseigné') : waitBadge('S1 · à venir'))}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;align-items:start;">
        <div>
          <p class="b-eye" style="margin-bottom:6px;">Histoire sportive</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:var(--text2);white-space:pre-line;">${sportStory ? esc(sportStory) : '<span style="color:var(--text4);">À renseigner avec le coach.</span>'}</p>
          ${seasonDream ? `<div style="padding:16px 18px;border-radius:16px;background:rgba(249,235,80,.06);"><p class="b-eye" style="margin-bottom:4px;color:rgba(249,235,80,.8);">Rêve de saison</p><p class="disp" style="margin:0;font-style:italic;font-size:17px;line-height:1.4;color:var(--text);">${esc(seasonDream)}</p></div>` : ''}
        </div>
        <div>
          <p class="b-eye" style="margin-bottom:10px;">Forces (VIA)</p>
          ${strengthChips.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">${strengthChips.map((s) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:11px;background:rgba(167,196,188,.12);font-size:13px;font-weight:500;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;"></span>${esc(s)}</span>`).join('')}</div>` : '<span style="font-size:15px;color:var(--text4);">Forces à identifier ensemble.</span>'}
        </div>
      </div>
    </div>`;

  return `
<div class="bilan-root bx" style="padding-bottom:8px;">

  <!-- EN-TÊTE — « Programme complété » posé à même le fond : pas de carte, pas
       de soleil, pas de halo. Le pourcentage porte l'écran à lui seul. -->
  <div class="b-clk" data-info="programme" style="display:block;padding:4px 2px 0;${ain(0)}">
    <p class="b-eye">Programme complété</p>
    <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px;">
      <span class="disp b-pct" style="font-size:104px;line-height:.86;font-weight:600;color:var(--text);">${pct}</span><span class="disp b-pctsign" style="font-size:32px;font-weight:500;color:var(--text3);">%</span>
    </div>
    <p style="margin:12px 0 0;font-size:15px;font-weight:500;color:var(--text3);">${completed} séance${completed > 1 ? 's' : ''} sur 13 · ${completed < 13 ? 'en cours' : 'terminé'}</p>
    <div class="b-track" style="margin-top:14px;"><div class="b-fill" style="width:${pct}%;background:#F9EB50;"></div></div>
  </div>

  <!-- Passeport athlète réduit à une rangée : le bouton ouvre la fiche détaillée,
       le crayon la personnalisation. -->
  <div style="margin-top:26px;display:flex;align-items:center;gap:10px;${ain(1)}">
    <div class="b-hover b-clk bx" data-info="identite" role="button" style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:var(--surface);">
      ${avatar}
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
        <span class="disp" style="font-size:17px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;">${esc(fullName)}</span>
        <span style="font-size:13px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;">${
          nickname ? `<span style="font-style:italic;color:${esc(accentColor)};">« ${esc(nickname)} »</span> · ` : ''
        }${subLine}</span>
      </span>
      <span style="flex-shrink:0;color:var(--text4);line-height:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg></span>
    </div>
    <span class="b-hover bx" data-action="edit-passport" role="button" aria-label="Personnaliser le passeport" style="width:48px;height:48px;flex-shrink:0;border-radius:16px;background:rgba(249,235,80,.1);display:grid;place-items:center;color:var(--accent-ink);line-height:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16z"></path></svg></span>
  </div>

  <div class="b-stack" style="margin-top:16px;">

    <!-- Compétences de vie (LSSS) -->
    <div class="bx b-clk b-card" data-info="competences" style="${ain(2)}">${HINT}
      <p class="b-eye">Compétences de vie</p>
      ${
        // Sans mesure LSSS, on n'affiche pas un « — » en 52 px (qui se lit comme
        // un filet) : juste la phrase d'attente.
        gaugeGlobal == null
          ? `<p style="margin:12px 0 0;font-size:15px;font-weight:500;color:var(--text3);">En attente de la première mesure LSSS.</p>`
          : `<div style="display:flex;align-items:baseline;gap:10px;margin-top:10px;">
        <span class="disp" style="font-size:52px;line-height:1;font-weight:600;color:var(--text);">${gaugeGlobal}</span>
        <span style="font-size:15px;font-weight:600;color:#A7C4BC;">${
          gaugeDelta != null
            ? `${gaugeDelta >= 0 ? '+' : ''}${gaugeDelta} pts depuis le départ`
            : 'Première mesure'
        }</span>
      </div>`
      }
      ${skillBreakdownHtml}
      <p style="margin:18px 0 0;font-size:13px;color:var(--text3);">Basé sur le questionnaire LSSS · mesuré aux séances 1, 7 et 13.</p>
    </div>

    <!-- PERMA · progression du bien-être -->
    <div class="bx b-clk b-card" data-info="perma" style="${ain(3)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px;padding-right:26px;">
        <p class="b-eye">Progression du bien-être</p>
        <span style="font-size:13px;font-weight:600;color:var(--text3);white-space:nowrap;flex-shrink:0;">EPOCH · ${
          ent.lsssCurve
            ? permaPoints.length ? `${permaPoints.length} séance${permaPoints.length > 1 ? 's' : ''}` : 'à venir'
            : 'pack Avancé'
        }</span>
      </div>
      ${
        ent.lsssCurve
          ? `<div style="display:flex;gap:10px;margin-top:16px;">
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:2px 0 22px;font-size:12px;color:var(--text3);text-align:right;width:40px;flex-shrink:0;"><span>Élevé</span><span>Moyen</span><span>Bas</span></div>
        <div style="flex:1;min-width:0;">
          ${permaGraphHtml(permaPoints)}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--text4);"><span>S1</span><span>S3</span><span>S5</span><span>S7</span><span>S9</span><span>S11</span><span>S13</span></div>
        </div>
      </div>
      ${permaPoints.length ? permaPillarsHtml(permaPoints[permaPoints.length - 1].pillars) : ''}
      <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:var(--text3);">Bien-être mesuré après chaque séance — échelle EPOCH (engagement, persévérance, optimisme, connexion aux autres, bonheur).</p>`
          : `${lockedBars}
      <div style="margin-top:12px;">${lockNote('La courbe de bien-être EPOCH (mesurée après chaque séance : 5 dimensions scientifiques) est incluse dès le pack Avancé.')}</div>`
      }
    </div>
  </div>

  <!-- ROW 2 -->
  <div class="b-row2" style="margin-top:12px;">
    <!-- Parcours des 13 séances -->
    <div class="bx b-clk b-card" data-info="parcours" style="${ain(4)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px;padding-right:26px;">
        <p class="b-eye">Parcours des 13 séances</p>
        <span class="disp" style="font-size:15px;font-weight:600;color:var(--accent-ink);">${completed}/13</span>
      </div>
      <div class="b-nodes" style="margin-top:18px;">${nodes}</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line);">
        <span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--text3);"><span style="width:8px;height:8px;border-radius:50%;background:#A7C4BC;"></span>Terminée</span>
        <span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--text3);"><span style="width:8px;height:8px;border-radius:50%;background:#F9EB50;"></span>En cours</span>
        <span style="display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--text3);"><span style="width:8px;height:8px;border-radius:50%;border:1px solid var(--line2);"></span>À venir</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px;">
        <p style="margin:0;font-size:15px;font-weight:500;color:var(--text3);">Séance en cours · <b style="color:var(--text);">S${cur < 1 ? 1 : cur}</b></p>
        <p style="margin:0;font-size:15px;font-weight:500;color:var(--text3);">Prochaine · <b style="color:var(--text);">S${next}</b> à programmer</p>
      </div>
    </div>

    <!-- Boîte à outils -->
    <div class="bx b-clk b-card" data-info="boite" style="${ain(5)}">${HINT}
      <p class="b-eye">Boîte à outils</p>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:10px;">
        <span class="disp" style="font-size:44px;line-height:1;font-weight:600;color:var(--text);">${toolboxCount}</span>
        <span style="font-size:15px;font-weight:500;color:var(--text3);">/ 6 outils collectés</span>
      </div>
      <div class="b-track" style="margin:16px 0 18px;"><div class="b-fill" style="width:${Math.round((Math.min(toolboxCount, 6) / 6) * 100)}%;background:#A7C4BC;animation-delay:.5s;"></div></div>
      ${toolboxItemsHtml}
      <div style="display:flex;align-items:center;gap:12px;margin-top:18px;padding:14px 16px;border-radius:16px;background:rgba(249,235,80,.07);">
        <span style="font-size:13px;font-weight:500;color:var(--text3);">Focus word</span>
        <span class="disp" style="margin-left:auto;font-size:19px;font-weight:600;letter-spacing:.04em;color:var(--accent-ink);overflow-wrap:anywhere;">${esc(focus)}</span>
      </div>
    </div>

    <!-- Prochaines étapes -->
    <div class="bx b-clk b-card" data-info="etapes" style="display:flex;flex-direction:column;${ain(6)}">${HINT}
      <p class="b-eye" style="margin-bottom:16px;">Prochaines étapes</p>
      <div style="display:flex;flex-direction:column;gap:10px;flex:1;">
        ${
          nextSteps.length
            ? nextSteps
                .map((s) => {
                  const done = s.status === 'done';
                  const icon = done
                    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>'
                    : s.status === 'doing'
                    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>'
                    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"></rect></svg>';
                  const iconColor = done ? '#A7C4BC' : '#F9EB50';
                  const bg = done ? 'rgba(167,196,188,.08)' : 'var(--surface-sub)';
                  const dueTxt = s.due_date
                    ? ` <span style="color:var(--text3);">· ${new Date(s.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>`
                    : '';
                  return `<div style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;background:${bg};"><span style="width:30px;height:30px;border-radius:10px;background:var(--chip);display:grid;place-items:center;color:${iconColor};flex-shrink:0;line-height:0;">${icon}</span><span style="font-size:15px;line-height:1.4;color:var(--text2);">${esc(s.label)}${dueTxt}</span></div>`;
                })
                .join('')
            : `<div style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;background:var(--surface-sub);"><span style="width:30px;height:30px;border-radius:10px;background:var(--chip);display:grid;place-items:center;color:var(--accent-ink);flex-shrink:0;line-height:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></span><span style="font-size:15px;line-height:1.4;color:var(--text3);">Le coach précisera bientôt les prochaines étapes.</span></div>`
        }
      </div>
      <div class="b-hover bx" data-href="/parent/fitness" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line);font-size:15px;font-weight:600;color:#A7C4BC;">Voir le parcours complet <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"></path></svg></div>
    </div>
  </div>

  <!-- ROW 3 · MES OUTILS THRIVE -->
  <div style="margin:38px 2px 18px;${ain(7)}">
    <h2 class="disp b-toolstitle" style="margin:0 0 4px;font-size:26px;font-weight:600;color:var(--text);">Mes outils THRIVE</h2>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:var(--text3);">Les livrables construits séance après séance — chacun son atelier.</p>
    <p style="margin:0;font-size:13px;font-weight:600;color:var(--accent-ink);">8 ateliers · ${renseignes} renseignés</p>
  </div>

  <div class="b-tools">
    ${identiteCard}
    <!-- S2 · FICHE OBJECTIF -->
    <div class="bx b-clk b-card" data-info="objectif" style="grid-column:span 4;${ain(8)}">${HINT}
      ${toolHead('Fiche Objectif THRIVE', objFilled ? okBadge('S2 · renseigné') : waitBadge('S2 · à venir'))}
      <div style="padding:16px 18px;border-radius:16px;background:rgba(167,196,188,.07);margin-bottom:18px;">
        <p class="disp" style="margin:0;font-size:19px;line-height:1.4;font-weight:500;color:var(--text);">${esc(objText)}</p>
      </div>
      ${lifeSkillHtml}
      ${actionsHtml}
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px;">
        ${[['S', 'Spécifique'], ['M', 'Mesurable'], ['A', 'Atteignable'], ['R', 'Réaliste'], ['T', 'Temporel']]
          .map(
            ([l, t]) =>
              `<span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;background:var(--surface-sub);font-size:13px;font-weight:500;color:var(--text3);"><b class="disp" style="color:var(--accent-ink);">${l}</b> ${t}</span>`
          )
          .join('')}
      </div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:14px;font-weight:500;color:var(--text3);">Progression du parcours</span>
        <span class="disp" style="font-size:16px;font-weight:600;color:var(--accent-ink);">${pct} %</span>
      </div>
      <div class="b-track"><div class="b-fill" style="width:${pct}%;background:#F9EB50;animation-delay:.6s;"></div></div>
    </div>

    <!-- S9 · FOCUS WORD -->
    <div class="bx b-clk b-card b-half" data-info="focus" style="grid-column:span 2;border:1px solid rgba(249,235,80,.22);padding:24px 20px;text-align:center;${ain(9)}">${HINT}
      <p class="b-eye" style="margin-bottom:14px;">Focus Word · S9</p>
      <p class="disp" style="margin:0;font-size:40px;line-height:1.05;font-weight:700;letter-spacing:.05em;color:var(--accent-ink);overflow-wrap:anywhere;animation:b-breatheC 4.6s ease-in-out infinite;">${esc(focus)}</p>
      <p style="margin:12px 0 0;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);">${focusWord ? 'Mot-ancre actif' : 'À définir en séance 9'}</p>
    </div>

    <!-- S4·S5 · ROUE DES ÉMOTIONS -->
    <div class="bx b-clk b-card b-half" data-info="emotions" style="grid-column:span 2;${ain(10)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:6px;padding-right:26px;">
        <span class="disp" style="font-size:19px;font-weight:600;color:var(--text);">Roue des Émotions</span>
        <span style="font-size:13px;font-weight:600;color:var(--text3);white-space:nowrap;flex-shrink:0;">Séances S4 · S5</span>
      </div>
      <div style="position:relative;width:150px;height:150px;margin:18px auto;">
        <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -90deg,#F9EB50 0 25%,#A7C4BC 25% 50%,#6FA8B0 50% 75%,#cdbf78 75% 100%);-webkit-mask:radial-gradient(circle at 50% 50%,transparent 47px,#000 48px);mask:radial-gradient(circle at 50% 50%,transparent 47px,#000 48px);animation:b-spin 40s linear infinite;opacity:.9;"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:2px;">
          ${
            ent.emotionWheel
              ? `<span style="font-size:12px;font-weight:600;color:var(--text3);">${latestEmotion ? 'Identifiée' : 'À explorer'}</span>
          <span class="disp" style="font-size:22px;font-weight:600;color:var(--accent-ink);">${esc(latestEmotion || '—')}</span>`
              : `<span style="font-size:12px;font-weight:600;color:var(--text3);">Identifiée</span>
          <span class="disp" aria-hidden="true" style="font-size:22px;font-weight:600;color:var(--accent-ink);filter:blur(6px);user-select:none;">Trac</span>`
          }
        </div>
      </div>
      ${
        ent.emotionWheel
          ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:7px;">
        <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:11px;background:rgba(249,235,80,.1);font-size:13px;font-weight:500;color:var(--accent-ink);"><span style="width:6px;height:6px;border-radius:50%;background:#F9EB50;"></span>Trac</span>
        <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:11px;background:rgba(167,196,188,.12);font-size:13px;font-weight:500;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;"></span>Confiance</span>
        <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:11px;background:var(--surface-sub);font-size:13px;font-weight:500;color:var(--text3);"><span style="width:6px;height:6px;border-radius:50%;background:var(--text3);"></span>Détermination</span>
      </div>`
          : lockNote('La roue des émotions et le suivi de séance en séance sont inclus dès le pack Avancé.')
      }
    </div>

    <!-- S6 · ROUTINE PRÉ-TIR -->
    <div class="bx b-clk b-card b-half" data-info="routine" style="grid-column:span 2;${ain(11)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:18px;padding-right:26px;">
        <span class="disp" style="font-size:19px;font-weight:600;color:var(--text);">Routine pré-tir</span>
        <span style="font-size:13px;font-weight:600;color:var(--text3);white-space:nowrap;flex-shrink:0;">Séance S6</span>
      </div>
      <div style="position:relative;display:flex;flex-direction:column;gap:14px;">
        <div style="position:absolute;left:14px;top:14px;bottom:14px;width:2px;background:linear-gradient(180deg,#F9EB50,#A7C4BC 60%,rgba(167,196,188,.3));"></div>
        ${[
          ['1', '#F9EB50', 'Respire · 3 cycles lents'],
          ['2', '#A7C4BC', 'Visualise le geste parfait'],
          ['3', '#A7C4BC', `Mot-ancre · « ${esc(focus)} »`],
        ]
          .map(
            ([n, bg, txt]) =>
              `<div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx" style="z-index:1;flex-shrink:0;width:30px;height:30px;border-radius:999px;background:${bg};color:#06222A;display:grid;place-items:center;font-weight:700;font-size:13px;">${n}</span><span style="font-size:15px;font-weight:500;color:var(--text2);">${txt}</span></div>`
          )
          .join('')}
        <div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx" style="z-index:1;flex-shrink:0;width:30px;height:30px;border-radius:999px;background:var(--chip);border:1px solid var(--line2);color:var(--text);display:grid;place-items:center;font-weight:700;font-size:13px;">4</span><span style="font-size:15px;font-weight:600;color:var(--text);">Action — j'y vais</span></div>
      </div>
    </div>

    <!-- S1 · CONTRAT DE CONFIANCE -->
    <div class="bx b-clk b-card b-half" data-info="contrat" style="grid-column:span 2;${ain(12)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:10px;padding-right:26px;">
        <span class="disp" style="font-size:19px;font-weight:600;color:var(--text);">Contrat de confiance</span>
        <span style="font-size:13px;font-weight:600;color:var(--text3);white-space:nowrap;flex-shrink:0;">Séance S1</span>
      </div>
      ${[
        ['Athlète', esc(firstName)],
        ['Coach', coachLabel ? esc(coachLabel) : '—'],
        ['Parent', 'Engagé'],
      ]
        .map(
          ([role, val], i, arr) =>
            `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;${i < arr.length - 1 ? 'border-bottom:1px solid var(--line);' : ''}"><span style="min-width:0;display:flex;flex-direction:column;gap:2px;"><span class="b-eye" style="font-size:11px;">${role}</span><span class="disp" style="font-style:italic;font-size:18px;color:var(--text);overflow-wrap:anywhere;">${val}</span></span><span style="flex-shrink:0;width:26px;height:26px;border-radius:999px;background:rgba(167,196,188,.16);color:#A7C4BC;display:grid;place-items:center;line-height:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg></span></div>`
        )
        .join('')}
      <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);font-size:15px;font-weight:600;color:${docIds.contract ? '#A7C4BC' : 'var(--text4)'};">${
        docIds.contract
          ? `<span class="b-doc b-hover" data-doc="${docIds.contract}" style="display:inline-flex;align-items:center;gap:8px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"></path></svg>Télécharger le contrat signé</span>`
          : 'Les 3 parties engagées'
      }</div>
    </div>

    <!-- S13 · LETTRE À MOI-MÊME -->
    <div class="bx b-clk b-card" data-info="lettre" style="grid-column:span 3;${ain(13)}">${HINT}
      ${toolHead('Lettre à moi-même dans 1 an', letter ? okBadge('S13 · scellée') : waitBadge('S13 · à venir'))}
      <div style="border-radius:16px;background:var(--surface-sub);padding:20px;">
        <p class="disp" style="margin:0 0 16px;font-style:italic;font-size:16px;color:var(--text3);">Chère ${esc(firstName)},</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="height:7px;width:92%;border-radius:4px;background:var(--text4);"></div>
          <div style="height:7px;width:100%;border-radius:4px;background:var(--text4);"></div>
          <div style="height:7px;width:84%;border-radius:4px;background:var(--text4);"></div>
          <div style="height:7px;width:60%;border-radius:4px;background:var(--text4);"></div>
        </div>
      </div>
      <p style="margin:14px 0 0;font-size:14px;font-weight:500;color:${docIds.letter ? '#A7C4BC' : 'var(--text3)'};">${
        docIds.letter
          ? `<span class="b-doc b-hover" data-doc="${docIds.letter}" style="display:inline-flex;align-items:center;gap:8px;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"></path></svg>Télécharger la lettre (PDF)</span>`
          : letter
          ? 'Scellée — à ouvrir dans 1 an'
          : 'À écrire lors de la séance bilan (S13).'
      }</p>
    </div>

    <!-- S13 · CERTIFICAT -->
    <div class="bx b-clk" data-info="certificat" style="grid-column:span 3;position:relative;border:1px dashed var(--line2);border-radius:22px;padding:var(--bcard-pad,20px);${ain(14)}">${HINT}
      <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:14px;padding-right:26px;">
        <span class="disp" style="font-size:19px;font-weight:600;color:var(--text2);">Certificat THRIVE</span>
        ${docIds.certificate && certificateReady ? okBadge('✓ disponible') : waitBadge('à venir · S13')}
      </div>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:var(--text3);">Reconnaissance officielle de fin de parcours — débloquée à la dernière séance.</p>
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:14px;font-weight:500;color:var(--text3);">${completed}/13 séances</span>
        <span class="disp" style="font-size:16px;font-weight:600;color:var(--text3);">${remaining} restantes</span>
      </div>
      <div class="b-track"><div class="b-fill" style="width:${pct}%;background:#A7C4BC;animation-delay:.7s;"></div></div>
      ${
        docIds.certificate && certificateReady
          ? `<div class="b-doc b-hover" data-doc="${docIds.certificate}" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;margin-top:16px;border-radius:14px;background:rgba(249,235,80,.12);color:var(--accent-ink);font-size:15px;font-weight:700;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"></path></svg>Télécharger le certificat</div>`
          : `<div style="display:flex;align-items:center;gap:10px;margin-top:16px;padding:12px 14px;border-radius:14px;background:rgba(249,235,80,.06);">
        <span style="color:var(--accent-ink);flex-shrink:0;line-height:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4"></rect><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"></path></svg></span>
        <span style="font-size:14px;line-height:1.45;color:var(--text3);">Disponible en téléchargement dès la validation de la séance 13.</span>
      </div>`
      }
    </div>
  </div>
</div>`;
}
