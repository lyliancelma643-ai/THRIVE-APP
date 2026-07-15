// Gabarit HTML de la « Carte d'identité » (zone bilan) — extrait de page.tsx
// (chantier découpage 2026-07-11). Contenu déplacé à l'identique : CSS du
// design, générateurs SVG PERMA et buildHtml (template complet).
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
.bilan-root{font-family:var(--font-inter),'Inter',system-ui,sans-serif;color:#eaf3f1;--bcard-pad:22px;--bnode:46px;max-width:100%;overflow-x:hidden;}
.bilan-root *{min-width:0;}
.bilan-root .disp{font-family:var(--font-display),'Fraunces',Georgia,serif;}
.bilan-root .bx{box-sizing:border-box;}
@keyframes b-pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(249,235,80,.35),0 0 26px rgba(249,235,80,.35);}50%{box-shadow:0 0 0 6px rgba(249,235,80,0),0 0 34px rgba(249,235,80,.55);}}
@keyframes b-drawLine{from{stroke-dashoffset:640;}to{stroke-dashoffset:0;}}
@keyframes b-fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes b-gaugeSweep{from{stroke-dasharray:0 251;}to{stroke-dasharray:181 251;}}
@keyframes b-growX{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@keyframes b-breathe{0%,100%{opacity:.78;transform:translateX(-50%) scale(1);}50%{opacity:1;transform:translateX(-50%) scale(1.07);}}
@keyframes b-coreBreathe{0%,100%{transform:translateX(-50%) scale(1);box-shadow:0 0 30px rgba(249,235,80,.5);}50%{transform:translateX(-50%) scale(1.06);box-shadow:0 0 48px rgba(249,235,80,.78);}}
@keyframes b-breatheC{0%,100%{opacity:.82;transform:scale(1);}50%{opacity:1;transform:scale(1.05);}}
@keyframes b-spin{to{transform:rotate(360deg);}}
@keyframes b-floaty{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
.bilan-root .b-row1{display:grid;grid-template-columns:340px 1fr;gap:16px;margin-bottom:16px;}
.bilan-root .b-duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;min-width:0;}
.bilan-root .b-lsss{margin-bottom:16px;}
.bilan-root .b-row2{display:grid;grid-template-columns:1.62fr 1fr 1fr;gap:16px;}
.bilan-root .b-tools{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;}
.bilan-root .b-hover{transition:transform .15s ease,opacity .15s ease,background .15s ease;cursor:pointer;}
.bilan-root .b-hover:hover{transform:translateY(-2px);opacity:.93;}
.bilan-root .b-hover:active{transform:translateY(0) scale(.97);}
/* Les cartes/boutons sont des div : on leur applique les optimisations tactiles
   que les navigateurs réservent aux button/a (pas de flash gris, pas de délai
   double-tap, pas de sélection de texte au tap long) */
.bilan-root .b-clk,.bilan-root .b-hover{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
.bilan-root .b-nodes{display:grid;grid-template-columns:repeat(7,1fr);gap:14px 10px;}
@media(max-width:1100px){
  .bilan-root .b-row1{grid-template-columns:1fr;}
  .bilan-root .b-row2{grid-template-columns:1fr;}
  .bilan-root .b-tools{grid-template-columns:1fr 1fr;}
  .bilan-root .b-tools>div{grid-column:span 2!important;}
  .bilan-root .b-tools>.b-half{grid-column:span 1!important;}
}
@media(max-width:680px){
  .bilan-root{--bcard-pad:13px;--bnode:33px;}
  .bilan-root .b-row1{grid-template-columns:1fr;margin-bottom:10px;}
  .bilan-root .b-lsss{margin-bottom:10px;}
  .bilan-root .b-row1,.bilan-root .b-row2,.bilan-root .b-tools,.bilan-root .b-duo{gap:10px;}
  .bilan-root .b-nodes{grid-template-columns:repeat(5,1fr);gap:10px 4px;}
  .bilan-root .b-pad{padding:14px 10px 22px!important;}
  .bilan-root .b-title{font-size:29px!important;}
  .bilan-root .b-sub{font-size:12.5px!important;margin-top:8px!important;}
  .bilan-root .b-head{margin-bottom:16px!important;gap:12px!important;}
  .bilan-root .b-seg{width:100%;}
  .bilan-root .b-seg>span{flex:1;justify-content:center;padding:12px 8px!important;font-size:13px!important;min-height:44px;box-sizing:border-box;}
  .bilan-root .b-clk{border-radius:18px!important;}
  .bilan-root .b-hint{width:18px;height:18px;font-size:10px;right:8px;bottom:7px;}
  .bilan-root .b-legend{display:none!important;}
  .bilan-root .b-ct{font-size:13.5px!important;}
  .bilan-root .b-chip{width:28px!important;height:28px!important;font-size:12px!important;border-radius:9px!important;}
  .bilan-root .b-subl{margin-left:39px!important;}
  .bilan-root .b-pct{font-size:40px!important;}
  .bilan-root .b-pctchip{font-size:10.5px!important;padding:6px 9px!important;margin-top:10px!important;background:rgba(4,28,36,.6)!important;border-color:rgba(255,255,255,.15)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
  .bilan-root .b-sun1{width:150px!important;height:150px!important;bottom:-58px!important;}
  .bilan-root .b-sun2{width:40px!important;height:40px!important;bottom:-14px!important;}
  .bilan-root .b-lsss .b-clk{padding-bottom:26px!important;}
  .bilan-root .b-certbar{margin-right:24px!important;}
  .bilan-root .b-gaugenum{font-size:23px!important;}
  .bilan-root .b-gaugecap{font-size:10.5px!important;}
  .bilan-root .b-lsvg{height:150px!important;}
  .bilan-root .b-lchip{font-size:9.5px!important;padding:2px 6px!important;}
  .bilan-root .b-focusword{font-size:26px!important;}
  .bilan-root .b-wheel{width:118px!important;height:118px!important;}
  .bilan-root .b-wheelring{-webkit-mask:radial-gradient(circle at 50% 50%,transparent 36px,#000 37px)!important;mask:radial-gradient(circle at 50% 50%,transparent 36px,#000 37px)!important;}
  .bilan-root .b-emochip{font-size:10px!important;padding:4px 8px!important;}
  .bilan-root .b-rn{width:24px!important;height:24px!important;font-size:11px!important;}
  .bilan-root .b-rline{left:15px!important;}
  .bilan-root .b-rt{font-size:11.5px!important;}
  .bilan-root .b-cname{font-size:15px!important;}
  .bilan-root .b-toolshead{margin:22px 2px 12px!important;}
}
@keyframes b-cardIn{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes b-scanX{0%{left:0;opacity:0;}8%{opacity:.5;}92%{opacity:.5;}100%{left:calc(100% - 2px);opacity:0;}}
@keyframes b-blink{0%,100%{opacity:1;}50%{opacity:.2;}}
@keyframes b-overlayIn{from{opacity:0;}to{opacity:1;}}
@keyframes b-modalIn{from{opacity:0;transform:translateY(28px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}
.bilan-root .b-clk{cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;}
.bilan-root .b-clk:hover{transform:translateY(-3px);box-shadow:0 26px 60px rgba(0,0,0,.45),0 0 0 1px rgba(249,235,80,.22),inset 0 1px 0 rgba(255,255,255,.05);}
.bilan-root .b-clk:active{transform:translateY(-1px) scale(.995);}
.bilan-root .b-hint{position:absolute;right:11px;bottom:9px;z-index:3;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;font-size:11px;color:rgba(249,235,80,.75);background:rgba(249,235,80,.08);border:1px solid rgba(249,235,80,.22);opacity:.5;transition:opacity .2s ease,transform .2s ease;pointer-events:none;}
.bilan-root .b-clk:hover .b-hint{opacity:1;transform:scale(1.08);}
.b-modal-ov{position:fixed;inset:0;z-index:90;background:rgba(2,15,19,.68);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px;animation:b-overlayIn .22s ease both;}
.b-modal{box-sizing:border-box;font-family:var(--font-inter),'Inter',system-ui,sans-serif;color:#eaf3f1;position:relative;width:100%;max-width:560px;max-height:86vh;overflow-y:auto;overscroll-behavior:contain;border-radius:26px;background:radial-gradient(120% 90% at 50% -10%,#0a3a44 0%,#053039 40%,#03161b 100%);border:1px solid rgba(255,255,255,.13);box-shadow:0 40px 90px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.07);padding:26px;animation:b-modalIn .3s cubic-bezier(.22,.61,.36,1) both;}
.b-modal .disp{font-family:var(--font-display),'Fraunces',Georgia,serif;}
@media(max-width:680px){
  .b-modal-ov{padding:0;align-items:flex-end;}
  .b-modal{max-height:90vh;border-radius:24px 24px 0 0;padding:30px 18px calc(24px + env(safe-area-inset-bottom,0px));}
  /* Poignée de feuille (bottom sheet) façon iOS */
  .b-modal::before{content:'';position:absolute;top:9px;left:50%;transform:translateX(-50%);width:40px;height:5px;border-radius:3px;background:rgba(255,255,255,.22);}
}
`;

const CARD =
  'position:relative;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);';
const CHIP =
  'width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);display:grid;place-items:center;font-size:15px;';

// Graphe de progression du BIEN-ÊTRE (PERMA), une mesure par séance (jusqu'à 13
// points). 0 point → message d'attente ; sinon courbe chaude + points par séance.
function permaGraphHtml(points: { session_number: number; value: number }[]): string {
  const xOf = (s: number) => 30 + ((Math.max(1, Math.min(13, s)) - 1) / 12) * 600;
  const yOf = (v: number) => 20 + ((100 - Math.max(0, Math.min(100, v))) / 100) * 150;
  const pts = [...points].sort((a, b) => a.session_number - b.session_number);

  if (pts.length === 0) {
    return `<div style="position:relative;height:186px;display:flex;align-items:center;justify-content:center;text-align:center;">
      <div style="max-width:300px;">
        <div style="font-size:26px;opacity:.4;">☀️</div>
        <p style="margin:8px 0 0;font-weight:500;font-size:13px;color:rgba(234,243,241,.55);">En attente du premier questionnaire de bien-être. Le coach envoie un court questionnaire EPOCH après chaque séance.</p>
      </div>
    </div>`;
  }

  const coords = pts.map((p) => ({ x: xOf(p.session_number), y: yOf(p.value), v: p.value, s: p.session_number }));
  const poly = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const line =
    coords.length >= 2
      ? `<polyline points="${poly}" fill="none" stroke="#F6B45A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:900;stroke-dashoffset:900;animation:b-drawLine 1.6s ease forwards .4s;"></polyline>`
      : '';
  const dots = coords
    .map(
      (c) =>
        `<circle cx="${c.x}" cy="${c.y}" r="5" fill="#ffe6b8" stroke="#F6B45A" stroke-width="2.5" style="opacity:0;animation:b-fadeIn .4s ease forwards .9s;"></circle>`
    )
    .join('');
  // N'étiqueter que la première et la dernière mesure pour éviter la surcharge (jusqu'à 13 points).
  const labelIdx = coords.length <= 1 ? [0] : [0, coords.length - 1];
  const labels = labelIdx
    .map((i) => {
      const c = coords[i];
      return `<span class="b-lchip bx" style="position:absolute;left:${((c.x / 660) * 100).toFixed(1)}%;top:${((c.y / 190) * 100).toFixed(1)}%;transform:translate(-50%,-150%);padding:3px 8px;border-radius:6px;background:rgba(246,180,90,.18);font-weight:700;font-size:11px;color:#F6B45A;white-space:nowrap;pointer-events:none;">S${c.s} · ${c.v}</span>`;
    })
    .join('');

  return `<div style="position:relative;">
    <div style="position:absolute;top:4px;bottom:4px;left:0;width:2px;border-radius:1px;background:linear-gradient(180deg,transparent,rgba(246,180,90,.7),transparent);animation:b-scanX 8s linear infinite;pointer-events:none;"></div>
    <svg class="b-lsvg" viewBox="0 0 660 190" width="100%" height="186" preserveAspectRatio="none" style="display:block;">
      <rect x="0" y="20" width="660" height="60" fill="rgba(246,180,90,.07)"></rect>
      <line x1="0" y1="40" x2="660" y2="40" stroke="rgba(255,255,255,.05)"></line>
      <line x1="0" y1="104" x2="660" y2="104" stroke="rgba(255,255,255,.05)"></line>
      <line x1="0" y1="150" x2="660" y2="150" stroke="rgba(255,255,255,.05)"></line>
      ${line}
      ${dots}
    </svg>
    <span class="b-lchip bx" style="position:absolute;left:8px;top:14%;padding:3px 8px;border-radius:6px;background:rgba(246,180,90,.12);font-weight:600;font-size:11px;color:rgba(246,180,90,.85);white-space:nowrap;pointer-events:none;">Zone cible</span>
    ${labels}
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
    return `<div style="display:flex;align-items:center;gap:10px;">
      <span style="width:118px;flex-shrink:0;font-weight:500;font-size:11px;color:rgba(234,243,241,.6);">${label}</span>
      <span style="flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.06);overflow:hidden;"><span style="display:block;height:100%;width:${has ? v : 0}%;border-radius:4px;background:linear-gradient(90deg,#F6B45A,#F9EB50);"></span></span>
      <span style="width:26px;text-align:right;font-weight:700;font-size:11px;color:${has ? '#F6B45A' : 'rgba(234,243,241,.3)'};">${has ? v : '—'}</span>
    </div>`;
  }).join('');
  return `<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;">${rows}</div>`;
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
    sport,
    poste,
    club,
    coachLast,
    coachLabel,
    force1,
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
    lsssPoints,
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
  const milestone = new Set([1, 4, 7]);

  // Entrée en cascade des cartes (fill "backwards" : l'état final reste le style
  // naturel, pour ne pas bloquer le transform du survol .b-clk).
  const ain = (i: number) =>
    `animation:b-cardIn .6s cubic-bezier(.22,.61,.36,1) ${(0.05 + i * 0.06).toFixed(2)}s backwards;`;
  const hint = '<span class="b-hint bx">ⓘ</span>';

  // ── Teasers de la matrice de droits (mêmes codes visuels que PackGate) ──
  // Note d'upgrade : cadenas + accent sun, navigation via data-href (délégué).
  const lockNote = (txt: string) =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 13px;border-radius:11px;background:rgba(249,235,80,.08);border:1px solid rgba(249,235,80,.3);">
      <svg viewBox="0 0 24 24" fill="none" style="width:15px;height:15px;flex-shrink:0;margin-top:1px;color:#F9EB50;" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>
      <span style="font-weight:500;font-size:12px;line-height:1.5;color:rgba(234,243,241,.85);"><b style="color:#F9EB50;">Contenu réservé.</b> ${txt} <span class="b-hover" data-href="/parent/upgrade" style="color:#F9EB50;font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer;">Voir les forfaits</span></span>
    </div>`;

  // Barres décoratives floutées (aucune donnée réelle) pour les visuels verrouillés
  const lockedBars = `<div aria-hidden="true" style="filter:blur(5px);pointer-events:none;user-select:none;display:flex;align-items:flex-end;gap:8px;height:110px;padding:14px 4px 0;">${[35, 55, 45, 70, 60, 85, 78]
    .map(
      (h) =>
        `<div style="flex:1;height:${h}%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,rgba(167,196,188,.5),rgba(167,196,188,.12));"></div>`
    )
    .join('')}</div>`;

  // ── Jauge par compétence + delta (skillBreakdown, Avancé+) ──
  // Débloqué : moyennes réelles par famille de compétence (gauge_summary.by_skill).
  // Verrouillé : lignes décoratives floutées + note d'upgrade. Sans donnée : rien.
  const skillLabel = (k: string) => {
    const t = k.replace(/[_-]/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const skillRow = (label: string, v: number) =>
    `<div style="display:flex;align-items:center;gap:9px;margin-top:8px;">
      <span style="flex:1;min-width:0;font-weight:500;font-size:11px;color:rgba(234,243,241,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label)}</span>
      <div style="width:64px;height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;flex-shrink:0;"><div style="width:${Math.max(0, Math.min(100, Math.round(v)))}%;height:100%;border-radius:4px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);"></div></div>
      <span class="disp" style="font-weight:600;font-size:11px;color:#eaf3f1;width:24px;text-align:right;flex-shrink:0;">${Math.round(v)}</span>
    </div>`;
  const skillEntries = Object.entries(bySkill);
  const skillBreakdownHtml = ent.skillBreakdown
    ? skillEntries.length
      ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);">${skillEntries
          .slice(0, 4)
          .map(([k, v]) => skillRow(skillLabel(k), Number(v)))
          .join('')}</div>`
      : ''
    : `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);">
        <div aria-hidden="true" style="filter:blur(5px);pointer-events:none;user-select:none;">${[68, 44, 81]
          .map((v) => skillRow('Compétence', v))
          .join('')}</div>
        <div style="margin-top:10px;">${lockNote('Le détail par compétence et son évolution sont inclus dès le pack Avancé.')}</div>
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
    let circle: string;
    let subColor = 'rgba(234,243,241,.4)';
    let subWeight = 400;
    let subOverride = '';
    if (done) {
      const y = milestone.has(n);
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#06222a;background:radial-gradient(circle at 40% 35%,${y ? '#fff7c8,#F9EB50' : '#dff0ea,#A7C4BC'} 70%);${y ? 'box-shadow:0 0 18px rgba(249,235,80,.3);' : ''}">${n}</span>`;
    } else if (missed) {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#ffb4b4;background:rgba(220,80,80,.12);border:1.5px solid rgba(220,80,80,.5);">${n}</span>`;
      subColor = '#e78a8a';
      subWeight = 600;
      subOverride = `S${n} · manquée`;
    } else if (postponed) {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#f2d18a;background:rgba(230,170,40,.12);border:1.5px solid rgba(230,170,40,.5);">${n}</span>`;
      subColor = '#e0b45a';
      subWeight = 600;
      subOverride = `S${n} · reportée`;
    } else if (isCur) {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:15px;color:#06222a;background:radial-gradient(circle at 40% 35%,#fff7c8,#F9EB50 70%);animation:b-pulseRing 2.4s ease-in-out infinite;">${n}</span>`;
      subColor = '#F9EB50';
      subWeight = 600;
    } else {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:rgba(234,243,241,.45);background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.18);">${n}</span>`;
      subColor = 'rgba(234,243,241,.35)';
    }
    const sub = subOverride
      ? subOverride
      : n === 7 ? 'S7 · LSSS' : n === 13 ? 'S13 · bilan' : isCur ? `S${n} · en cours` : `S${n}`;
    const subC = n === 7 && done ? '#A7C4BC' : subColor;
    nodes += `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">${circle}<span style="font-weight:${subWeight};font-size:9px;color:${subC};">${sub}</span></div>`;
  }

  const ring = `box-shadow:0 0 0 2px ${esc(accentColor)}66;`;
  const avatarInner = avatarUrl
    ? `<img src="${esc(avatarUrl)}" alt="" style="width:52px;height:52px;border-radius:15px;object-fit:cover;${ring}">`
    : `<span class="disp bx" style="width:52px;height:52px;border-radius:15px;background:linear-gradient(150deg,#0E6593,#00314C);${ring}display:grid;place-items:center;font-weight:700;font-size:18px;color:#fff;">${esc(initials)}</span>`;
  // Badge numéro de maillot ancré sur la photo (personnalisation parent).
  const avatar = `<span style="position:relative;display:inline-flex;flex-shrink:0;">${avatarInner}${
    jerseyNumber != null
      ? `<span class="bx" style="position:absolute;right:-7px;bottom:-7px;min-width:22px;height:22px;padding:0 5px;border-radius:8px;background:${esc(accentColor)};color:#06222a;font-weight:800;font-size:11px;display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.45);">${jerseyNumber}</span>`
      : ''
  }</span>`;

  const subLine = [age != null ? `${age} ans` : null, club].filter(Boolean).map(esc).join(' · ') || '—';
  const nicknameHtml = nickname
    ? `<div class="disp" style="font-style:italic;font-weight:500;font-size:13px;color:${esc(accentColor)};margin-top:1px;">« ${esc(nickname)} »</div>`
    : '';

  const field = (label: string, value: string) =>
    `<div class="bx" style="padding:11px 13px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);"><div style="font-weight:500;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:rgba(234,243,241,.42);">${label}</div><div style="font-weight:600;font-size:14px;margin-top:3px;">${esc(value)}</div></div>`;

  // ── Badges « renseigné / à venir » des outils ──
  const okBadge = (txt: string) =>
    `<span class="bx" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:rgba(249,235,80,.12);border:1px solid rgba(249,235,80,.28);font-weight:600;font-size:11px;color:#F9EB50;">${txt}</span>`;
  const waitBadge = (txt: string) =>
    `<span class="bx" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.12);font-weight:600;font-size:11px;color:rgba(234,243,241,.45);">${txt}</span>`;

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
    ? `<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${toolbox
        .map(
          (t) =>
            `<div style="display:flex;gap:8px;align-items:baseline;"><span style="width:5px;height:5px;border-radius:50%;background:#A7C4BC;margin-top:6px;flex-shrink:0;"></span><span style="font-weight:500;font-size:12px;color:rgba(234,243,241,.85);">${esc(t.tool)}${t.context ? `<span style="color:rgba(234,243,241,.5);"> — ${esc(t.context)}</span>` : ''}</span></div>`
        )
        .join('')}</div>`
    : '';
  const lifeSkillHtml = lifeSkillGoal
    ? `<div style="margin-bottom:14px;"><div style="font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:rgba(234,243,241,.42);margin-bottom:5px;">Objectif life skill</div><p style="margin:0;font-weight:500;font-size:14px;line-height:1.4;color:rgba(234,243,241,.85);">${esc(lifeSkillGoal)}</p></div>`
    : '';
  const actionsHtml = myActions.length
    ? `<div style="margin-bottom:16px;"><div style="font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:rgba(234,243,241,.42);margin-bottom:7px;">Ce qui dépend de moi</div><div style="display:flex;flex-direction:column;gap:6px;">${myActions
        .map(
          (a) =>
            `<div style="display:flex;gap:8px;align-items:baseline;"><span style="color:#F9EB50;font-size:12px;flex-shrink:0;">✓</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.85);">${esc(a)}</span></div>`
        )
        .join('')}</div></div>`
    : '';
  const identiteCard = `
    <!-- S1 · FICHE IDENTITÉ ATHLÈTE -->
    <div class="bx b-clk" data-info="identite" style="grid-column:span 6;${CARD}${ain(7)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;flex-wrap:wrap;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◈</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Fiche Identité Athlète</span>
        ${idFilled ? okBadge('S1 · ✓ Renseigné') : waitBadge('S1 · À venir')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;align-items:start;">
        <div>
          <div style="font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:rgba(234,243,241,.42);margin-bottom:7px;">Histoire sportive</div>
          <p style="margin:0 0 16px;font-weight:400;font-size:14px;line-height:1.55;color:rgba(234,243,241,.85);white-space:pre-line;">${sportStory ? esc(sportStory) : '<span style="color:rgba(234,243,241,.4);">À renseigner avec le coach.</span>'}</p>
          ${seasonDream ? `<div style="position:relative;padding:14px 16px 14px 38px;border-radius:14px;background:rgba(249,235,80,.06);border:1px solid rgba(249,235,80,.16);"><span class="disp" style="position:absolute;left:13px;top:6px;font-size:30px;color:rgba(249,235,80,.45);line-height:1;">“</span><div style="font-weight:500;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(249,235,80,.7);margin-bottom:3px;">Rêve de saison</div><p class="disp" style="margin:0;font-style:italic;font-size:15px;line-height:1.4;color:#eaf3f1;">${esc(seasonDream)}</p></div>` : ''}
        </div>
        <div>
          <div style="font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:rgba(234,243,241,.42);margin-bottom:9px;">Forces (VIA)</div>
          ${strengthChips.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;">${strengthChips.map((s) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:11px;background:rgba(167,196,188,.14);border:1px solid rgba(167,196,188,.25);font-weight:600;font-size:13px;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;"></span>${esc(s)}</span>`).join('')}</div>` : '<span style="font-weight:400;font-size:13px;color:rgba(234,243,241,.4);">Forces à identifier ensemble.</span>'}
        </div>
      </div>
    </div>`;

  return `
<div class="bilan-root b-pad bx" style="position:relative;overflow:hidden;border-radius:28px;background:radial-gradient(125% 85% at 50% -12%, #0a3a44 0%, #06303a 24%, #042430 52%, #03161b 100%);padding:22px 28px 34px;">
  <div style="position:absolute;top:-160px;left:8%;width:560px;height:560px;border-radius:50%;background:rgba(20,120,130,.16);filter:blur(90px);pointer-events:none;"></div>
  <div style="position:absolute;top:34%;right:-180px;width:480px;height:480px;border-radius:50%;background:rgba(167,196,188,.1);filter:blur(90px);pointer-events:none;"></div>
  <div style="position:absolute;bottom:-200px;left:38%;width:520px;height:520px;border-radius:50%;background:rgba(249,235,80,.05);filter:blur(90px);pointer-events:none;"></div>

  <!-- TITLE -->
  <div class="b-head" style="position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px;flex-wrap:wrap;">
    <div>
      <h1 class="disp b-title" style="font-weight:600;font-size:46px;line-height:1;margin:0;letter-spacing:-.02em;">Carte d'identité</h1>
      <p class="b-sub" style="font-weight:400;font-size:15px;color:rgba(234,243,241,.55);margin:12px 0 0;">Le passeport THRIVE de ${esc(firstName)} — identité d'athlète &amp; parcours des 13 séances.</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;">
        <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:10px;background:rgba(167,196,188,.08);border:1px solid rgba(167,196,188,.2);font-weight:600;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;animation:b-blink 2.2s ease-in-out infinite;"></span>Labo THRIVE · en direct</span>
        <span style="font-weight:500;font-size:11px;color:rgba(234,243,241,.45);">ⓘ Touche une carte pour découvrir son explication</span>
      </div>
    </div>
    <div class="b-seg bx" style="display:flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:5px;">
      <span class="b-hover" data-href="/parent/my-sessions" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:11px;background:rgba(255,255,255,.06);font-weight:600;font-size:14px;color:#eaf3f1;">⤓ Voir le passeport</span>
      <span class="b-hover" data-href="/parent/fitness" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:11px;font-weight:500;font-size:14px;color:rgba(234,243,241,.65);">▦ Fitness</span>
    </div>
  </div>

  <!-- ROW 1 -->
  <div class="b-row1">
    <!-- Passeport athlète -->
    <div class="bx b-clk" data-info="passeport" style="${CARD}${ain(0)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◷</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Passeport athlète</span>
        <span class="b-hover bx" data-action="edit-passport" role="button" aria-label="Personnaliser le passeport" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:11px;background:${esc(accentColor)}1f;border:1px solid ${esc(accentColor)}45;font-weight:600;font-size:12px;color:${esc(accentColor)};">✎ Personnaliser</span>
      </div>
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:16px;">
        ${avatar}
        <div style="min-width:0;"><div class="disp" style="font-weight:600;font-size:19px;line-height:1.1;">${esc(fullName)}</div>${nicknameHtml}<div style="font-weight:400;font-size:12px;color:rgba(234,243,241,.5);margin-top:2px;">${subLine}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px;">
        ${field('Sport', sport)}
        ${field('Poste', poste)}
        ${field('Coach', coachLast)}
        ${field('Forces', force1)}
      </div>
      <div class="b-hover" data-href="/parent/my-sessions" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-weight:600;font-size:13px;color:rgba(234,243,241,.8);">Voir toutes les séances →</div>
    </div>

    <!-- Duo : Programme complété · Compétences de vie (côte à côte à toutes les tailles) -->
    <div class="b-duo">
      <div class="bx b-clk" data-info="programme" style="${CARD}overflow:hidden;${ain(1)}">${hint}
        <div style="display:flex;align-items:center;gap:11px;position:relative;z-index:2;">
          <span class="bx b-chip" style="${CHIP}color:#F9EB50;">★</span>
          <span class="disp b-ct" style="font-weight:600;font-size:18px;">Programme complété</span>
        </div>
        <div style="position:relative;z-index:2;display:flex;align-items:baseline;gap:3px;margin-top:18px;">
          <span class="disp b-pct" style="font-weight:700;font-size:60px;line-height:.9;">${pct}</span><span class="disp" style="font-weight:600;font-size:24px;color:rgba(234,243,241,.6);">%</span>
        </div>
        <div class="b-pctchip" style="position:relative;z-index:2;display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:9px 15px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);font-weight:600;font-size:13px;color:rgba(234,243,241,.85);"><span style="width:7px;height:7px;border-radius:50%;background:#F9EB50;flex-shrink:0;"></span>${completed}/13 séances${completed < 13 ? ' · en cours' : ' · terminé'}</div>
        <div class="b-sun1" style="position:absolute;bottom:-46px;left:50%;transform:translateX(-50%);width:230px;height:230px;border-radius:50%;background:radial-gradient(circle at 50% 38%, rgba(249,235,80,.9) 0%, rgba(224,165,40,.55) 26%, rgba(120,90,20,.18) 48%, transparent 66%);filter:blur(2px);animation:b-breathe 4.6s ease-in-out infinite;"></div>
        <div class="b-sun2" style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 42% 36%, #fff7c8, #F9EB50 42%, #d9a423 78%);animation:b-coreBreathe 4.6s ease-in-out infinite;"></div>
      </div>

      <div class="bx b-clk" data-info="competences" style="${CARD}display:flex;flex-direction:column;justify-content:space-between;${ain(2)}">${hint}
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;">
          <span class="bx b-chip" style="${CHIP}color:#A7C4BC;">✓</span>
          <span class="disp b-ct" style="font-weight:600;font-size:17px;">Compétences de vie</span>
        </div>
        <div style="position:relative;width:100%;max-width:170px;margin:6px auto 0;">
          <svg viewBox="0 0 200 110" style="width:100%;height:auto;display:block;">
            <defs><linearGradient id="b-gB" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A7C4BC"></stop><stop offset="100%" stop-color="#F9EB50"></stop></linearGradient></defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="14" stroke-linecap="round"></path>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#b-gB)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${gaugeGlobal != null ? Math.round((gaugeGlobal / 100) * 251) : 0} 251" style="transition:stroke-dasharray .8s ease;"></path>
          </svg>
          <div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;"><span class="disp b-gaugenum" style="font-weight:700;font-size:30px;line-height:1;">${gaugeGlobal != null ? gaugeGlobal : '—'}<span style="font-size:16px;color:rgba(234,243,241,.55);">${gaugeGlobal != null ? '%' : ''}</span></span></div>
        </div>
        <p class="b-gaugecap" style="text-align:center;font-weight:400;font-size:12px;color:rgba(234,243,241,.55);margin:8px 0 0;">${
          gaugeGlobal == null
            ? 'En attente de mesure LSSS'
            : gaugeDelta != null
            ? `<span style="color:#A7C4BC;">${gaugeDelta >= 0 ? '+' : ''}${gaugeDelta} pts depuis le départ</span>`
            : 'Basé sur le questionnaire LSSS'
        }</p>
        ${skillBreakdownHtml}
      </div>
    </div>
  </div>

  <!-- PERMA · progression du bien-être · pleine largeur -->
  <div class="b-lsss">
    <div class="bx b-clk" data-info="perma" style="${CARD}${ain(3)}">${hint}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:11px;">
          <span class="bx" style="${CHIP}color:#F6B45A;">☀️</span>
          <span class="disp" style="font-weight:600;font-size:18px;">Progression du bien-être</span>
        </div>
        <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:12px;color:rgba(234,243,241,.65);">☀️ EPOCH · ${
          ent.lsssCurve
            ? permaPoints.length ? `${permaPoints.length} séance${permaPoints.length > 1 ? 's' : ''}` : 'à venir'
            : 'pack Avancé'
        }</span>
      </div>
      ${
        ent.lsssCurve
          ? `<div style="display:flex;gap:12px;">
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 0 26px;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);text-align:right;width:34px;"><span>Élevé</span><span>Moyen</span><span>Bas</span></div>
        <div style="flex:1;min-width:0;">
          ${permaGraphHtml(permaPoints)}
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding:0 4px;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);"><span>S1</span><span>S3</span><span>S5</span><span>S7</span><span>S9</span><span>S11</span><span>S13</span></div>
        </div>
      </div>
      ${permaPoints.length ? permaPillarsHtml(permaPoints[permaPoints.length - 1].pillars) : ''}
      <p style="margin:12px 0 0;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);line-height:1.4;">Bien-être mesuré après chaque séance — échelle EPOCH (engagement, persévérance, optimisme, connexion aux autres, bonheur).</p>`
          : `${lockedBars}
      <div style="margin-top:10px;">${lockNote('La courbe de bien-être EPOCH (mesurée après chaque séance : 5 dimensions scientifiques) est incluse dès le pack Avancé.')}</div>`
      }
    </div>
  </div>

  <!-- ROW 2 -->
  <div class="b-row2">
    <!-- Parcours des 13 séances -->
    <div class="bx b-clk" data-info="parcours" style="${CARD}overflow:hidden;background:linear-gradient(180deg,rgba(8,40,46,.6),rgba(4,24,30,.6));${ain(3)}">${hint}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:10px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:11px;">
          <span class="bx" style="${CHIP}color:#A7C4BC;">▦</span>
          <span class="disp" style="font-weight:600;font-size:18px;">Parcours des 13 séances</span>
        </div>
        <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:11px;background:rgba(249,235,80,.12);border:1px solid rgba(249,235,80,.25);font-weight:600;font-size:12px;color:#F9EB50;">${completed}/13 complétées</span>
      </div>
      <div style="display:flex;gap:20px;">
        <div class="b-legend" style="display:flex;gap:11px;flex-shrink:0;">
          <div style="width:7px;border-radius:4px;background:linear-gradient(180deg,#F9EB50,#A7C4BC 52%,rgba(255,255,255,.12) 60%);"></div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;padding:2px 0;font-weight:500;font-size:11px;color:rgba(234,243,241,.55);"><span>Terminée</span><span style="color:#F9EB50;">En cours</span><span style="color:rgba(234,243,241,.35);">À venir</span></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="b-nodes">${nodes}</div>
          <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.07);flex-wrap:wrap;">
            <div style="flex:1;min-width:160px;display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:7px;height:7px;border-radius:50%;background:#F9EB50;"></span><span style="font-weight:500;font-size:12px;color:rgba(234,243,241,.7);">Séance en cours · <b style="color:#fff;">S${cur < 1 ? 1 : cur}</b></span></div>
            <div style="flex:1;min-width:160px;display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:7px;height:7px;border-radius:50%;background:#A7C4BC;"></span><span style="font-weight:500;font-size:12px;color:rgba(234,243,241,.7);">Prochaine · <b style="color:#fff;">S${next}</b> à programmer</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Boîte à outils -->
    <div class="bx b-clk" data-info="boite" style="${CARD}${ain(5)}">${hint}
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
          <span class="bx" style="${CHIP}color:#F9EB50;">◎</span>
          <span class="disp" style="font-weight:600;font-size:17px;">Boîte à outils</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:6px;"><span class="disp" style="font-weight:700;font-size:30px;line-height:1;">${toolboxCount}</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.45);">/6 outils collectés</span></div>
        <div style="height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;margin:14px 0 16px;"><div style="width:${Math.round((Math.min(toolboxCount, 6) / 6) * 100)}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);transform-origin:left;animation:b-growX 1s cubic-bezier(.22,.61,.36,1) both .6s;"></div></div>
        ${toolboxItemsHtml}
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:rgba(249,235,80,.08);border:1px solid rgba(249,235,80,.2);">
          <span style="font-weight:500;font-size:11px;color:rgba(234,243,241,.55);">Focus word</span>
          <span class="disp" style="font-weight:600;font-size:18px;color:#F9EB50;letter-spacing:.02em;margin-left:auto;">${esc(focus)}</span>
        </div>
    </div>

    <!-- Prochaines étapes -->
    <div class="bx b-clk" data-info="etapes" style="${CARD}display:flex;flex-direction:column;${ain(6)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">⊟</span>
        <span class="disp" style="font-weight:600;font-size:17px;">Prochaines étapes</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;flex:1;">
        ${
          nextSteps.length
            ? nextSteps
                .map((s) => {
                  const done = s.status === 'done';
                  const icon = done ? '✓' : s.status === 'doing' ? '◷' : '□';
                  const iconColor = done ? '#A7C4BC' : '#F9EB50';
                  const bg = done
                    ? 'background:rgba(167,196,188,.08);border:1px solid rgba(167,196,188,.18);'
                    : 'background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);';
                  const dueTxt = s.due_date
                    ? ` <span style="color:rgba(234,243,241,.45);">· ${new Date(s.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</span>`
                    : '';
                  return `<div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;${bg}"><span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:${iconColor};flex-shrink:0;">${icon}</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.82);line-height:1.4;">${esc(s.label)}${dueTxt}</span></div>`;
                })
                .join('')
            : `<div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:#F9EB50;flex-shrink:0;">◷</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.6);line-height:1.4;">Le coach précisera bientôt les prochaines étapes.</span></div>`
        }
      </div>
      <div class="b-hover bx" data-href="/parent/fitness" style="display:flex;align-items:center;justify-content:center;min-height:48px;text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);font-weight:600;font-size:13px;color:#A7C4BC;">Voir le parcours complet →</div>
    </div>
  </div>

  <!-- ROW 3 · MES OUTILS THRIVE -->
  <div class="b-toolshead" style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:34px 2px 16px;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:11px;">
      <span class="bx" style="${CHIP}color:#F9EB50;">⊞</span>
      <div>
        <span class="disp" style="font-weight:600;font-size:22px;">Mes outils THRIVE</span>
        <div style="font-weight:400;font-size:13px;color:rgba(234,243,241,.5);margin-top:2px;">Les livrables construits séance après séance — chacun son atelier.</div>
      </div>
    </div>
    <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:11px;background:rgba(249,235,80,.1);border:1px solid rgba(249,235,80,.22);font-weight:600;font-size:12px;color:#F9EB50;">8 ateliers · ${renseignes} renseignés</span>
  </div>

  <div class="b-tools">
    ${identiteCard}
    <!-- S2 · FICHE OBJECTIF -->
    <div class="bx b-clk" data-info="objectif" style="grid-column:span 4;${CARD}${ain(8)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◎</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Fiche Objectif THRIVE</span>
        ${objFilled ? okBadge('S2 · ✓ Renseigné') : waitBadge('S2 · À venir')}
      </div>
      <div style="position:relative;padding:16px 18px 16px 40px;border-radius:15px;background:rgba(167,196,188,.06);border:1px solid rgba(167,196,188,.16);margin-bottom:16px;">
        <span class="disp" style="position:absolute;left:14px;top:8px;font-size:34px;color:rgba(249,235,80,.45);line-height:1;">“</span>
        <p class="disp" style="margin:0;font-weight:500;font-size:19px;line-height:1.35;color:#eaf3f1;">${esc(objText)}</p>
      </div>
      ${lifeSkillHtml}
      ${actionsHtml}
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px;">
        ${[['S', 'Spécifique'], ['M', 'Mesurable'], ['A', 'Atteignable'], ['R', 'Réaliste'], ['T', 'Temporel']]
          .map(
            ([l, t]) =>
              `<span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:12px;color:rgba(234,243,241,.78);"><b class="disp" style="color:#F9EB50;">${l}</b> ${t}</span>`
          )
          .join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;">
        <span style="font-weight:500;font-size:12px;color:rgba(234,243,241,.55);">Progression du parcours</span>
        <span class="disp" style="font-weight:600;font-size:15px;color:#F9EB50;">${pct}%</span>
      </div>
      <div style="height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;"><div style="width:${pct}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);transform-origin:left;animation:b-growX 1s cubic-bezier(.22,.61,.36,1) both .6s;"></div></div>
    </div>

    <!-- S9 · FOCUS WORD -->
    <div class="bx b-clk b-half" data-info="focus" style="grid-column:span 2;position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(249,235,80,.07),rgba(255,255,255,.015));border:1px solid rgba(249,235,80,.2);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);display:flex;flex-direction:column;${ain(9)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;position:relative;z-index:2;">
        <span class="bx b-chip" style="width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(249,235,80,.25);display:grid;place-items:center;color:#F9EB50;font-size:15px;">✦</span>
        <span class="disp b-ct" style="font-weight:600;font-size:17px;">Focus Word</span>
      </div>
      <div class="b-subl" style="font-weight:600;font-size:11px;color:#F9EB50;margin:2px 0 0 47px;position:relative;z-index:2;">S9 · ${focusWord ? 'renseigné' : 'à venir'}</div>
      <div style="flex:1;display:grid;place-items:center;position:relative;z-index:2;padding:14px 0 6px;">
        <div style="text-align:center;">
          <div class="disp b-focusword" style="font-weight:700;font-size:38px;letter-spacing:.04em;color:#fff7c8;text-shadow:0 0 26px rgba(249,235,80,.6);animation:b-breatheC 4.6s ease-in-out infinite;transform-origin:center;overflow-wrap:anywhere;">${esc(focus)}</div>
          <div style="font-weight:500;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:rgba(234,243,241,.5);margin-top:10px;">Mot-ancre actif</div>
        </div>
      </div>
      <div style="position:absolute;bottom:-70px;left:50%;transform:translateX(-50%);width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(249,235,80,.32),transparent 65%);filter:blur(6px);pointer-events:none;"></div>
    </div>

    <!-- S4·S5 · ROUE DES ÉMOTIONS -->
    <div class="bx b-clk b-half" data-info="emotions" style="grid-column:span 2;${CARD}${ain(10)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;">
        <span class="bx b-chip" style="${CHIP}color:#A7C4BC;">◍</span>
        <span class="disp b-ct" style="font-weight:600;font-size:16px;line-height:1.1;">Roue des Émotions</span>
      </div>
      <div class="b-subl" style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 6px 47px;">Séances S4 · S5</div>
      <div class="b-wheel" style="position:relative;width:142px;height:142px;margin:6px auto 14px;">
        <div class="b-wheelring" style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -90deg,#F9EB50 0 25%,#A7C4BC 25% 50%,#6FA8B0 50% 75%,#cdbf78 75% 100%);-webkit-mask:radial-gradient(circle at 50% 50%,transparent 44px,#000 45px);mask:radial-gradient(circle at 50% 50%,transparent 44px,#000 45px);animation:b-spin 26s linear infinite;opacity:.92;"></div>
        <div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:11px;height:11px;border-radius:50%;background:#fff7c8;box-shadow:0 0 12px rgba(249,235,80,.8);"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          ${
            ent.emotionWheel
              ? `<span style="font-weight:500;font-size:10px;color:rgba(234,243,241,.45);">${latestEmotion ? 'Identifiée' : 'À explorer'}</span>
          <span class="disp" style="font-weight:600;font-size:18px;color:#F9EB50;">${esc(latestEmotion || '—')}</span>`
              : `<span style="font-weight:500;font-size:10px;color:rgba(234,243,241,.45);">Identifiée</span>
          <span class="disp" aria-hidden="true" style="font-weight:600;font-size:18px;color:#F9EB50;filter:blur(6px);user-select:none;">Trac</span>`
          }
        </div>
      </div>
      ${
        ent.emotionWheel
          ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
        <span class="b-emochip" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(249,235,80,.1);border:1px solid rgba(249,235,80,.22);font-weight:500;font-size:11px;color:#F9EB50;"><span style="width:6px;height:6px;border-radius:50%;background:#F9EB50;"></span>Trac</span>
        <span class="b-emochip" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(167,196,188,.1);border:1px solid rgba(167,196,188,.2);font-weight:500;font-size:11px;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;"></span>Confiance</span>
        <span class="b-emochip" style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:11px;color:rgba(234,243,241,.7);"><span style="width:6px;height:6px;border-radius:50%;background:#cdbf78;"></span>Détermination</span>
      </div>`
          : lockNote('La roue des émotions et le suivi de séance en séance sont inclus dès le pack Avancé.')
      }
    </div>

    <!-- S6 · ROUTINE PRÉ-TIR -->
    <div class="bx b-clk b-half" data-info="routine" style="grid-column:span 2;${CARD}${ain(11)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;">
        <span class="bx b-chip" style="${CHIP}color:#A7C4BC;">◷</span>
        <span class="disp b-ct" style="font-weight:600;font-size:16px;line-height:1.1;">Routine pré-tir</span>
      </div>
      <div class="b-subl" style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 16px 47px;">Séance S6</div>
      <div style="position:relative;display:flex;flex-direction:column;gap:13px;padding-left:4px;">
        <div class="b-rline" style="position:absolute;left:18px;top:11px;bottom:11px;width:2px;background:linear-gradient(180deg,#F9EB50,#A7C4BC 60%,rgba(167,196,188,.3));"></div>
        ${[
          ['1', '#fff7c8,#F9EB50', '#06222a', 'Respire · 3 cycles lents', 500],
          ['2', '#dff0ea,#A7C4BC', '#06222a', 'Visualise le geste parfait', 500],
          ['3', '#dff0ea,#A7C4BC', '#06222a', `Mot-ancre · « ${esc(focus)} »`, 500],
        ]
          .map(
            ([n, grad, col, txt, w]) =>
              `<div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx b-rn" style="z-index:1;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 40% 35%,${grad} 70%);color:${col};display:grid;place-items:center;font-weight:700;font-size:12px;">${n}</span><span class="b-rt" style="font-weight:${w};font-size:13px;color:rgba(234,243,241,.85);">${txt}</span></div>`
          )
          .join('')}
        <div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx b-rn" style="z-index:1;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#eaf3f1;display:grid;place-items:center;font-weight:700;font-size:12px;">4</span><span class="b-rt" style="font-weight:600;font-size:13px;color:#eaf3f1;">Action — j'y vais</span></div>
      </div>
    </div>

    <!-- S1 · CONTRAT DE CONFIANCE -->
    <div class="bx b-clk b-half" data-info="contrat" style="grid-column:span 2;${CARD}${ain(12)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;">
        <span class="bx b-chip" style="${CHIP}color:#A7C4BC;">✎</span>
        <span class="disp b-ct" style="font-weight:600;font-size:16px;line-height:1.1;">Contrat de confiance</span>
      </div>
      <div class="b-subl" style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 14px 47px;">Séance S1</div>
      <div style="display:flex;flex-direction:column;">
        ${[
          ['Athlète', esc(firstName)],
          ['Coach', coachLabel ? esc(coachLabel) : '—'],
          ['Parent', 'Engagé'],
        ]
          .map(
            ([role, val], i, arr) =>
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;${i < arr.length - 1 ? 'border-bottom:1px dashed rgba(255,255,255,.09);' : ''}"><div style="min-width:0;"><div style="font-weight:500;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:rgba(234,243,241,.4);">${role}</div><div class="disp b-cname" style="font-style:italic;font-size:17px;color:#eaf3f1;margin-top:1px;overflow-wrap:anywhere;">${val}</div></div><span style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(167,196,188,.16);color:#A7C4BC;display:grid;place-items:center;font-size:12px;">✓</span></div>`
          )
          .join('')}
      </div>
      <div style="margin-top:12px;padding-top:12px;padding-right:26px;border-top:1px solid rgba(255,255,255,.07);font-weight:500;font-size:11px;color:rgba(234,243,241,.5);">${
        docIds.contract
          ? `<span class="b-doc" data-doc="${docIds.contract}" style="display:inline-flex;align-items:center;gap:6px;color:#A7C4BC;cursor:pointer;">⤓ Télécharger le contrat signé</span>`
          : 'Les 3 parties engagées'
      }</div>
    </div>

    <!-- S13 · LETTRE À MOI-MÊME -->
    <div class="bx b-clk" data-info="lettre" style="grid-column:span 3;${CARD}${ain(13)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">✉</span>
        <span class="disp" style="font-weight:600;font-size:17px;">Lettre à moi-même dans 1 an</span>
        ${letter ? okBadge('S13 · ✓ Scellée') : waitBadge('S13 · À venir')}
      </div>
      <div style="position:relative;border-radius:14px;background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);padding:20px 20px 22px;overflow:hidden;">
        <div class="disp" style="font-style:italic;font-size:14px;color:rgba(234,243,241,.6);margin-bottom:14px;">Chère ${esc(firstName)},</div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          <div style="height:7px;width:92%;border-radius:4px;background:rgba(234,243,241,.14);"></div>
          <div style="height:7px;width:100%;border-radius:4px;background:rgba(234,243,241,.1);"></div>
          <div style="height:7px;width:84%;border-radius:4px;background:rgba(234,243,241,.1);"></div>
          <div style="height:7px;width:60%;border-radius:4px;background:rgba(234,243,241,.08);"></div>
        </div>
        <div style="position:absolute;right:16px;bottom:14px;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff7c8,#F9EB50 60%,#d9a423);display:grid;place-items:center;color:#06222a;font-size:17px;box-shadow:0 6px 18px rgba(249,235,80,.4);animation:b-floaty 4.5s ease-in-out infinite;">✦</div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-weight:500;font-size:12px;color:rgba(234,243,241,.55);"><span style="width:7px;height:7px;border-radius:50%;background:#F9EB50;"></span>${
        docIds.letter
          ? `<span class="b-doc" data-doc="${docIds.letter}" style="display:inline-flex;align-items:center;gap:6px;color:#A7C4BC;cursor:pointer;">⤓ Télécharger la lettre (PDF)</span>`
          : letter
          ? 'Scellée — à ouvrir dans 1 an'
          : 'À écrire lors de la séance bilan (S13)'
      }</div>
    </div>

    <!-- S13 · CERTIFICAT -->
    <div class="bx b-clk" data-info="certificat" style="grid-column:span 3;position:relative;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px dashed rgba(255,255,255,.17);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);${ain(14)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span class="bx" style="width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:grid;place-items:center;color:rgba(234,243,241,.55);font-size:15px;">◈</span>
        <span class="disp" style="font-weight:600;font-size:17px;color:rgba(234,243,241,.85);">Certificat THRIVE</span>
        ${docIds.certificate && certificateReady ? okBadge('✓ Disponible') : waitBadge('◷ À venir · S13')}
      </div>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="flex-shrink:0;position:relative;width:92px;height:92px;display:grid;place-items:center;">
          <div style="position:absolute;inset:0;border-radius:50%;border:2px dashed rgba(255,255,255,.22);"></div>
          <div style="width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;color:rgba(234,243,241,.4);font-size:22px;">⌾</div>
        </div>
        <div style="flex:1;min-width:180px;">
          <p style="margin:0 0 14px;font-weight:400;font-size:13px;color:rgba(234,243,241,.62);line-height:1.5;">Reconnaissance officielle de fin de parcours — débloquée à la dernière séance.</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-weight:500;font-size:12px;color:rgba(234,243,241,.55);">${completed}/13 séances</span>
            <span class="disp" style="font-weight:600;font-size:14px;color:rgba(234,243,241,.7);">${remaining} restantes</span>
          </div>
          <div class="b-certbar" style="height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;"><div style="width:${pct}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);transform-origin:left;animation:b-growX 1s cubic-bezier(.22,.61,.36,1) both .7s;"></div></div>
          ${
            docIds.certificate && certificateReady
              ? `<div class="b-doc" data-doc="${docIds.certificate}" style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:12px;background:rgba(249,235,80,.14);border:1px solid rgba(249,235,80,.3);color:#F9EB50;font-weight:700;font-size:13px;cursor:pointer;">⤓ Télécharger le certificat</div>`
              : ''
          }
        </div>
      </div>
    </div>
  </div>
</div>`;
}

