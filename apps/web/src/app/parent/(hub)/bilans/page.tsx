'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';

/* ────────────────────────────────────────────────────────────────────────────
   Page « Carte d'identité » (zone bilan) — portage fidèle du design Claude
   « Carte Identite THRIVE v2 ». Le rendu (UI/UX) reproduit le design ; toute la
   couche données reste inchangée : mêmes requêtes Supabase (sessions terminées,
   coach assigné, athlete_identity) + mise à jour temps réel.
   Les visuels purement analytiques (courbe LSSS, jauge « compétences de vie »,
   roue des émotions) sont reproduits tels quels (illustratifs) tant qu'aucune
   source de données dédiée ne les alimente.
──────────────────────────────────────────────────────────────────────────── */

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

type CoachInfo = { first_name: string; last_name: string } | null;
type ToolboxItem = { tool: string; context: string };
type ParentIdentity = {
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
} | null;

const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );

/* CSS du design : polices (Fraunces + Inter, déjà chargées par l'app), keyframes
   d'animation (toutes en CSS pur, aucun runtime JS requis) et grilles responsives. */
const DESIGN_CSS = `
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
.bilan-root .b-row1{display:grid;grid-template-columns:310px 310px 1fr;gap:16px;margin-bottom:16px;}
.bilan-root .b-row2{display:grid;grid-template-columns:1.62fr 1fr 1fr;gap:16px;}
.bilan-root .b-tools{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;}
.bilan-root .b-hover{transition:transform .15s ease,opacity .15s ease,background .15s ease;cursor:pointer;}
.bilan-root .b-hover:hover{transform:translateY(-2px);opacity:.93;}
.bilan-root .b-nodes{display:grid;grid-template-columns:repeat(7,1fr);gap:14px 10px;}
@media(max-width:1100px){
  .bilan-root .b-row1{grid-template-columns:1fr 1fr;}
  .bilan-root .b-row2{grid-template-columns:1fr;}
  .bilan-root .b-tools{grid-template-columns:1fr;}
  .bilan-root .b-tools>div{grid-column:auto!important;}
}
@media(max-width:680px){
  .bilan-root{--bcard-pad:16px;--bnode:33px;}
  .bilan-root .b-row1{grid-template-columns:1fr;}
  .bilan-root .b-row1,.bilan-root .b-row2,.bilan-root .b-tools{gap:12px;}
  .bilan-root .b-nodes{grid-template-columns:repeat(5,1fr);gap:12px 6px;}
  .bilan-root .b-pad{padding:16px 12px 24px!important;}
  .bilan-root .b-title{font-size:31px!important;}
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
@media(max-width:680px){.b-modal-ov{padding:0;align-items:flex-end;}.b-modal{max-height:90vh;border-radius:24px 24px 0 0;padding:22px 18px calc(24px + env(safe-area-inset-bottom,0px));}}
`;

const CARD =
  'position:relative;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);';
const CHIP =
  'width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);display:grid;place-items:center;font-size:15px;';

function buildHtml(d: {
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
}) {
  const {
    firstName,
    fullName,
    initials,
    avatarUrl,
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

  // ── Parcours : 13 nœuds ──
  let nodes = '';
  for (let n = 1; n <= 13; n++) {
    const done = n < cur;
    const isCur = n === cur && cur >= 1 && cur < 13;
    let circle: string;
    let subColor = 'rgba(234,243,241,.4)';
    let subWeight = 400;
    if (done) {
      const y = milestone.has(n);
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#06222a;background:radial-gradient(circle at 40% 35%,${y ? '#fff7c8,#F9EB50' : '#dff0ea,#A7C4BC'} 70%);${y ? 'box-shadow:0 0 18px rgba(249,235,80,.3);' : ''}">${n}</span>`;
    } else if (isCur) {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:15px;color:#06222a;background:radial-gradient(circle at 40% 35%,#fff7c8,#F9EB50 70%);animation:b-pulseRing 2.4s ease-in-out infinite;">${n}</span>`;
      subColor = '#F9EB50';
      subWeight = 600;
    } else {
      circle = `<span class="disp bx" style="width:var(--bnode,46px);height:var(--bnode,46px);border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:rgba(234,243,241,.45);background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.18);">${n}</span>`;
      subColor = 'rgba(234,243,241,.35)';
    }
    const sub = n === 7 ? 'S7 · LSSS' : n === 13 ? 'S13 · bilan' : isCur ? `S${n} · en cours` : `S${n}`;
    const subC = n === 7 && done ? '#A7C4BC' : subColor;
    nodes += `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">${circle}<span style="font-weight:${subWeight};font-size:9px;color:${subC};">${sub}</span></div>`;
  }

  const avatar = avatarUrl
    ? `<img src="${esc(avatarUrl)}" alt="" style="width:52px;height:52px;border-radius:15px;object-fit:cover;box-shadow:0 0 0 2px rgba(249,235,80,.4);">`
    : `<span class="disp bx" style="width:52px;height:52px;border-radius:15px;background:linear-gradient(150deg,#0E6593,#00314C);box-shadow:0 0 0 2px rgba(249,235,80,.4);display:grid;place-items:center;font-weight:700;font-size:18px;color:#fff;">${esc(initials)}</span>`;

  const subLine = [age != null ? `${age} ans` : null, club].filter(Boolean).map(esc).join(' · ') || '—';

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
  <div style="position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px;flex-wrap:wrap;">
    <div>
      <h1 class="disp b-title" style="font-weight:600;font-size:46px;line-height:1;margin:0;letter-spacing:-.02em;">Carte d'identité</h1>
      <p style="font-weight:400;font-size:15px;color:rgba(234,243,241,.55);margin:12px 0 0;">Le passeport THRIVE de ${esc(firstName)} — identité d'athlète &amp; parcours des 13 séances.</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;">
        <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:10px;background:rgba(167,196,188,.08);border:1px solid rgba(167,196,188,.2);font-weight:600;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;animation:b-blink 2.2s ease-in-out infinite;"></span>Labo THRIVE · en direct</span>
        <span style="font-weight:500;font-size:11px;color:rgba(234,243,241,.45);">ⓘ Touche une carte pour découvrir son explication</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:5px;">
      <span class="b-hover" data-href="/parent/my-sessions" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:11px;background:rgba(255,255,255,.06);font-weight:600;font-size:14px;color:#eaf3f1;">⤓ Voir le passeport</span>
      <span class="b-hover" data-href="/parent/progress" style="display:flex;align-items:center;gap:8px;padding:10px 18px;font-weight:500;font-size:14px;color:rgba(234,243,241,.65);">↗ Progrès</span>
    </div>
  </div>

  <!-- ROW 1 -->
  <div class="b-row1">
    <!-- Passeport athlète -->
    <div class="bx b-clk" data-info="passeport" style="${CARD}${ain(0)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◷</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Passeport athlète</span>
      </div>
      <div style="display:flex;align-items:center;gap:13px;margin-bottom:16px;">
        ${avatar}
        <div><div class="disp" style="font-weight:600;font-size:19px;line-height:1.1;">${esc(fullName)}</div><div style="font-weight:400;font-size:12px;color:rgba(234,243,241,.5);margin-top:2px;">${subLine}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px;">
        ${field('Sport', sport)}
        ${field('Poste', poste)}
        ${field('Coach', coachLast)}
        ${field('Forces', force1)}
      </div>
      <div class="b-hover" data-href="/parent/my-sessions" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-weight:600;font-size:13px;color:rgba(234,243,241,.8);">Voir toutes les séances →</div>
    </div>

    <!-- Programme complété -->
    <div class="bx b-clk" data-info="programme" style="${CARD}overflow:hidden;${ain(1)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;position:relative;z-index:2;">
        <span class="bx" style="${CHIP}color:#F9EB50;">★</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Programme complété</span>
      </div>
      <div style="position:relative;z-index:2;display:flex;align-items:baseline;gap:3px;margin-top:18px;">
        <span class="disp" style="font-weight:700;font-size:60px;line-height:.9;">${pct}</span><span class="disp" style="font-weight:600;font-size:24px;color:rgba(234,243,241,.6);">%</span>
      </div>
      <div style="position:relative;z-index:2;display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:9px 15px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);font-weight:600;font-size:13px;color:rgba(234,243,241,.85);"><span style="width:7px;height:7px;border-radius:50%;background:#F9EB50;"></span>${completed}/13 séances${completed < 13 ? ' · en cours' : ' · terminé'}</div>
      <div style="position:absolute;bottom:-46px;left:50%;transform:translateX(-50%);width:230px;height:230px;border-radius:50%;background:radial-gradient(circle at 50% 38%, rgba(249,235,80,.9) 0%, rgba(224,165,40,.55) 26%, rgba(120,90,20,.18) 48%, transparent 66%);filter:blur(2px);animation:b-breathe 4.6s ease-in-out infinite;"></div>
      <div style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 42% 36%, #fff7c8, #F9EB50 42%, #d9a423 78%);animation:b-coreBreathe 4.6s ease-in-out infinite;"></div>
    </div>

    <!-- LSSS chart -->
    <div class="bx b-clk" data-info="lsss" style="${CARD}${ain(2)}">${hint}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:11px;">
          <span class="bx" style="${CHIP}color:#A7C4BC;">⤢</span>
          <span class="disp" style="font-weight:600;font-size:18px;">Progression des compétences de vie</span>
        </div>
        <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:12px;color:rgba(234,243,241,.65);">▦ LSSS · mesuré S1 · S7</span>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 0 26px;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);text-align:right;width:34px;"><span>Élevé</span><span>Moyen</span><span>Bas</span></div>
        <div style="flex:1;min-width:0;position:relative;">
          <div style="position:absolute;top:4px;bottom:28px;left:0;width:2px;border-radius:1px;background:linear-gradient(180deg,transparent,rgba(167,196,188,.7),transparent);animation:b-scanX 8s linear infinite;pointer-events:none;"></div>
          <svg viewBox="0 0 660 190" width="100%" height="186" preserveAspectRatio="none" style="display:block;">
            <defs><linearGradient id="b-areaC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(167,196,188,.32)"></stop><stop offset="100%" stop-color="rgba(167,196,188,0)"></stop></linearGradient></defs>
            <rect x="0" y="64" width="660" height="40" fill="rgba(167,196,188,.07)"></rect>
            <text x="10" y="80" font-family="var(--font-inter)" font-size="11" fill="rgba(167,196,188,.55)">Zone cible</text>
            <line x1="0" y1="40" x2="660" y2="40" stroke="rgba(255,255,255,.05)"></line>
            <line x1="0" y1="104" x2="660" y2="104" stroke="rgba(255,255,255,.05)"></line>
            <line x1="0" y1="150" x2="660" y2="150" stroke="rgba(255,255,255,.05)"></line>
            <path d="M30,128 L135,120 L240,110 L345,92 L450,84 L450,190 L30,190 Z" fill="url(#b-areaC)" style="opacity:0;animation:b-fadeIn .9s ease forwards .55s;"></path>
            <polyline points="30,128 135,120 240,110 345,92 450,84" fill="none" stroke="#A7C4BC" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:640;stroke-dashoffset:640;animation:b-drawLine 1.5s ease forwards .4s;"></polyline>
            <polyline points="450,84 555,76 630,68" fill="none" stroke="rgba(249,235,80,.7)" stroke-width="2.5" stroke-dasharray="5 5" stroke-linecap="round" style="opacity:0;animation:b-fadeIn .6s ease forwards 1.5s;"></polyline>
            <circle cx="30" cy="128" r="4" fill="#A7C4BC" style="opacity:0;animation:b-fadeIn .4s ease forwards .8s;"></circle>
            <circle cx="345" cy="92" r="6" fill="#fff7c8" stroke="#F9EB50" stroke-width="2.5" style="opacity:0;animation:b-fadeIn .4s ease forwards 1.25s;"></circle>
            <circle cx="450" cy="84" r="5" fill="#eafaf7" stroke="#A7C4BC" stroke-width="2.5" style="opacity:0;animation:b-fadeIn .4s ease forwards 1.5s;"></circle>
            <circle cx="630" cy="68" r="5" fill="none" stroke="#F9EB50" stroke-width="2" style="opacity:0;animation:b-fadeIn .5s ease forwards 1.9s;"></circle>
            <g font-family="var(--font-inter)" font-size="11" fill="rgba(234,243,241,.75)" style="opacity:0;animation:b-fadeIn .6s ease forwards 1.7s;">
              <rect x="14" y="134" width="34" height="18" rx="5" fill="rgba(255,255,255,.06)"></rect><text x="20" y="146.5">56</text>
              <rect x="325" y="66" width="40" height="18" rx="5" fill="rgba(249,235,80,.16)"></rect><text x="331" y="78.5" fill="#F9EB50">71</text>
              <rect x="604" y="50" width="50" height="18" rx="5" fill="rgba(255,255,255,.06)"></rect><text x="610" y="62.5">84 cible</text>
            </g>
          </svg>
          <div style="display:flex;justify-content:space-between;margin-top:8px;padding:0 4px;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);"><span>S1</span><span>S3</span><span>S5</span><span>S7</span><span>S9</span><span>S11</span><span>S13</span></div>
        </div>
      </div>
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
        <div style="display:flex;gap:11px;flex-shrink:0;">
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

    <!-- Middle column : gauge + boîte à outils -->
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="bx b-clk" data-info="competences" style="${CARD}${ain(4)}">${hint}
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;">
          <span class="bx" style="${CHIP}color:#A7C4BC;">✓</span>
          <span class="disp" style="font-weight:600;font-size:17px;">Compétences de vie</span>
        </div>
        <div style="position:relative;width:170px;height:96px;margin:6px auto 0;">
          <svg viewBox="0 0 200 110" style="width:100%;height:100%;display:block;">
            <defs><linearGradient id="b-gB" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A7C4BC"></stop><stop offset="100%" stop-color="#F9EB50"></stop></linearGradient></defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="14" stroke-linecap="round"></path>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#b-gB)" stroke-width="14" stroke-linecap="round" stroke-dasharray="181 251" style="animation:b-gaugeSweep 1.4s cubic-bezier(.22,.61,.36,1) both .5s;"></path>
          </svg>
          <div style="position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;"><span class="disp" style="font-weight:700;font-size:30px;line-height:1;">72<span style="font-size:16px;color:rgba(234,243,241,.55);">%</span></span></div>
        </div>
        <p style="text-align:center;font-weight:400;font-size:12px;color:rgba(234,243,241,.55);margin:8px 0 0;">Bon niveau · <span style="color:#A7C4BC;">+16 pts depuis S1</span></p>
      </div>
      <div class="bx b-clk" data-info="boite" style="${CARD}flex:1;${ain(5)}">${hint}
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
    </div>

    <!-- Prochaines étapes -->
    <div class="bx b-clk" data-info="etapes" style="${CARD}display:flex;flex-direction:column;${ain(6)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">⊟</span>
        <span class="disp" style="font-weight:600;font-size:17px;">Prochaines étapes</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;flex:1;">
        <div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;background:rgba(167,196,188,.08);border:1px solid rgba(167,196,188,.18);"><span style="width:34px;height:34px;border-radius:10px;background:rgba(167,196,188,.15);display:grid;place-items:center;color:#A7C4BC;flex-shrink:0;">✓</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.82);line-height:1.4;">LSSS intermédiaire complétée (S7)</span></div>
        <div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:#F9EB50;flex-shrink:0;">◷</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.82);line-height:1.4;">Programmer la séance S${next} avec le coach</span></div>
        <div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:#F9EB50;flex-shrink:0;">▦</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.82);line-height:1.4;">Compléter la Carte Boîte à Outils (S11)</span></div>
        <div style="display:flex;align-items:center;gap:12px;padding:13px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);"><span style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);display:grid;place-items:center;color:#F9EB50;flex-shrink:0;">✉</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.82);line-height:1.4;">Rédiger la Lettre à moi-même (S13)</span></div>
      </div>
      <div class="b-hover" data-href="/parent/progress" style="text-align:center;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07);font-weight:600;font-size:13px;color:#A7C4BC;">Voir le parcours complet →</div>
    </div>
  </div>

  <!-- ROW 3 · MES OUTILS THRIVE -->
  <div style="position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:34px 2px 16px;flex-wrap:wrap;">
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
    <div class="bx b-clk" data-info="focus" style="grid-column:span 2;position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(249,235,80,.07),rgba(255,255,255,.015));border:1px solid rgba(249,235,80,.2);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);display:flex;flex-direction:column;${ain(9)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;position:relative;z-index:2;">
        <span class="bx" style="width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(249,235,80,.25);display:grid;place-items:center;color:#F9EB50;font-size:15px;">✦</span>
        <span class="disp" style="font-weight:600;font-size:17px;">Focus Word</span>
      </div>
      <div style="font-weight:600;font-size:11px;color:#F9EB50;margin:2px 0 0 47px;position:relative;z-index:2;">S9 · ${focusWord ? 'renseigné' : 'à venir'}</div>
      <div style="flex:1;display:grid;place-items:center;position:relative;z-index:2;padding:14px 0 6px;">
        <div style="text-align:center;">
          <div class="disp" style="font-weight:700;font-size:38px;letter-spacing:.04em;color:#fff7c8;text-shadow:0 0 26px rgba(249,235,80,.6);animation:b-breatheC 4.6s ease-in-out infinite;transform-origin:center;">${esc(focus)}</div>
          <div style="font-weight:500;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:rgba(234,243,241,.5);margin-top:10px;">Mot-ancre actif</div>
        </div>
      </div>
      <div style="position:absolute;bottom:-70px;left:50%;transform:translateX(-50%);width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(249,235,80,.32),transparent 65%);filter:blur(6px);pointer-events:none;"></div>
    </div>

    <!-- S4·S5 · ROUE DES ÉMOTIONS -->
    <div class="bx b-clk" data-info="emotions" style="grid-column:span 2;${CARD}${ain(10)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◍</span>
        <span class="disp" style="font-weight:600;font-size:16px;line-height:1.1;">Roue des Émotions</span>
      </div>
      <div style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 6px 47px;">Séances S4 · S5</div>
      <div style="position:relative;width:142px;height:142px;margin:6px auto 14px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -90deg,#F9EB50 0 25%,#A7C4BC 25% 50%,#6FA8B0 50% 75%,#cdbf78 75% 100%);-webkit-mask:radial-gradient(circle at 50% 50%,transparent 44px,#000 45px);mask:radial-gradient(circle at 50% 50%,transparent 44px,#000 45px);animation:b-spin 26s linear infinite;opacity:.92;"></div>
        <div style="position:absolute;top:-3px;left:50%;transform:translateX(-50%);width:11px;height:11px;border-radius:50%;background:#fff7c8;box-shadow:0 0 12px rgba(249,235,80,.8);"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          <span style="font-weight:500;font-size:10px;color:rgba(234,243,241,.45);">Identifiée</span>
          <span class="disp" style="font-weight:600;font-size:18px;color:#F9EB50;">Trac</span>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
        <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(249,235,80,.1);border:1px solid rgba(249,235,80,.22);font-weight:500;font-size:11px;color:#F9EB50;"><span style="width:6px;height:6px;border-radius:50%;background:#F9EB50;"></span>Trac</span>
        <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(167,196,188,.1);border:1px solid rgba(167,196,188,.2);font-weight:500;font-size:11px;color:#A7C4BC;"><span style="width:6px;height:6px;border-radius:50%;background:#A7C4BC;"></span>Confiance</span>
        <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:11px;color:rgba(234,243,241,.7);"><span style="width:6px;height:6px;border-radius:50%;background:#cdbf78;"></span>Détermination</span>
      </div>
    </div>

    <!-- S6 · ROUTINE PRÉ-TIR -->
    <div class="bx b-clk" data-info="routine" style="grid-column:span 2;${CARD}${ain(11)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◷</span>
        <span class="disp" style="font-weight:600;font-size:16px;line-height:1.1;">Routine pré-tir</span>
      </div>
      <div style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 16px 47px;">Séance S6</div>
      <div style="position:relative;display:flex;flex-direction:column;gap:13px;padding-left:4px;">
        <div style="position:absolute;left:18px;top:11px;bottom:11px;width:2px;background:linear-gradient(180deg,#F9EB50,#A7C4BC 60%,rgba(167,196,188,.3));"></div>
        ${[
          ['1', '#fff7c8,#F9EB50', '#06222a', 'Respire · 3 cycles lents', 500],
          ['2', '#dff0ea,#A7C4BC', '#06222a', 'Visualise le geste parfait', 500],
          ['3', '#dff0ea,#A7C4BC', '#06222a', `Mot-ancre · « ${esc(focus)} »`, 500],
        ]
          .map(
            ([n, grad, col, txt, w]) =>
              `<div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx" style="z-index:1;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 40% 35%,${grad} 70%);color:${col};display:grid;place-items:center;font-weight:700;font-size:12px;">${n}</span><span style="font-weight:${w};font-size:13px;color:rgba(234,243,241,.85);">${txt}</span></div>`
          )
          .join('')}
        <div style="position:relative;display:flex;align-items:center;gap:13px;"><span class="disp bx" style="z-index:1;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#eaf3f1;display:grid;place-items:center;font-weight:700;font-size:12px;">4</span><span style="font-weight:600;font-size:13px;color:#eaf3f1;">Action — j'y vais</span></div>
      </div>
    </div>

    <!-- S1 · CONTRAT DE CONFIANCE -->
    <div class="bx b-clk" data-info="contrat" style="grid-column:span 2;${CARD}${ain(12)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:4px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">✎</span>
        <span class="disp" style="font-weight:600;font-size:16px;line-height:1.1;">Contrat de confiance</span>
      </div>
      <div style="font-weight:400;font-size:11px;color:rgba(234,243,241,.45);margin:0 0 14px 47px;">Séance S1</div>
      <div style="display:flex;flex-direction:column;">
        ${[
          ['Athlète', esc(firstName)],
          ['Coach', coachLabel ? esc(coachLabel) : '—'],
          ['Parent', 'Engagé'],
        ]
          .map(
            ([role, val], i, arr) =>
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;${i < arr.length - 1 ? 'border-bottom:1px dashed rgba(255,255,255,.09);' : ''}"><div><div style="font-weight:500;font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:rgba(234,243,241,.4);">${role}</div><div class="disp" style="font-style:italic;font-size:17px;color:#eaf3f1;margin-top:1px;">${val}</div></div><span style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(167,196,188,.16);color:#A7C4BC;display:grid;place-items:center;font-size:12px;">✓</span></div>`
          )
          .join('')}
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);font-weight:500;font-size:11px;color:rgba(234,243,241,.5);">Les 3 parties engagées</div>
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
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-weight:500;font-size:12px;color:rgba(234,243,241,.55);"><span style="width:7px;height:7px;border-radius:50%;background:#F9EB50;"></span>${letter ? 'Scellée — à ouvrir dans 1 an' : 'À écrire lors de la séance bilan (S13)'}</div>
    </div>

    <!-- S13 · CERTIFICAT -->
    <div class="bx b-clk" data-info="certificat" style="grid-column:span 3;position:relative;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px dashed rgba(255,255,255,.17);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 20px 50px rgba(0,0,0,.32);padding:var(--bcard-pad,22px);${ain(14)}">${hint}
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span class="bx" style="width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:grid;place-items:center;color:rgba(234,243,241,.55);font-size:15px;">◈</span>
        <span class="disp" style="font-weight:600;font-size:17px;color:rgba(234,243,241,.85);">Certificat THRIVE</span>
        ${waitBadge('◷ À venir · S13')}
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
          <div style="height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;"><div style="width:${pct}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);transform-origin:left;animation:b-growX 1s cubic-bezier(.22,.61,.36,1) both .7s;"></div></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/* ────────────────────────────────────────────────────────────────────────────
   Fiches d'explication des cartes — contenu vulgarisé pour le parent et
   l'enfant, tiré du document « LA MÉTHODE THRIVE : PROTOCOLE » (v1.0, 2026).
──────────────────────────────────────────────────────────────────────────── */
type InfoSection = { label: string; text?: string; bullets?: string[] };
type CardInfo = {
  icon: string;
  badge: string;
  title: string;
  tagline: string;
  sections: InfoSection[];
  tip?: string;
};

const CARD_INFO: Record<string, CardInfo> = {
  passeport: {
    icon: '◷',
    badge: 'Séance 1',
    title: 'Passeport athlète',
    tagline: "La carte d'identité sportive de ton enfant, construite dès la première rencontre.",
    sections: [
      {
        label: "C'est quoi ?",
        text: "Le résumé de qui est ton enfant en tant qu'athlète : son sport, son poste, son club, son coach et sa force n°1. Il est rempli avec le coach lors de la séance 1, puis mis à jour tout au long du parcours.",
      },
      {
        label: 'Pourquoi c’est important ?',
        text: "THRIVE commence par apprendre à connaître le jeune — pas à l'évaluer. À la première séance : aucun chrono, aucun score, aucune note. Le coach observe, écoute et découvre. C'est cette relation de confiance qui rend tout le reste possible.",
      },
      {
        label: 'Ce que le coach y note',
        bullets: [
          'Son histoire sportive : comment le sport est entré dans sa vie',
          '2 à 3 forces observées pendant qu’il joue — vues en action, pas déclarées',
          'Son rêve de saison, en une seule phrase',
        ],
      },
    ],
    tip: 'Demande à ton enfant : « C’est quoi ta plus grande force sur la glace ? » Sa réponse vient directement de ce travail avec le coach.',
  },
  programme: {
    icon: '★',
    badge: 'S1 → S13',
    title: 'Programme complété',
    tagline: 'Le chemin parcouru sur les 13 séances de la méthode THRIVE.',
    sections: [
      {
        label: "C'est quoi ?",
        text: "Cette jauge montre combien de séances sont terminées sur les 13 du programme. Chaque séance combine un exercice sur la glace, un moment d'apprentissage de 10 à 15 minutes et une discussion pour relier le tout à la vraie vie.",
      },
      {
        label: 'Les 3 phases du parcours',
        bullets: [
          'ANCRER (S1–S2) : créer la confiance, mesurer le point de départ, fixer le cap ensemble',
          'DÉVELOPPER (S3–S10) : apprendre les outils un par un — confiance, émotions, respiration, concentration, imagerie mentale',
          'INTÉGRER (S11–S13) : rassembler ses outils, devenir autonome, célébrer',
        ],
      },
      {
        label: 'Pourquoi 13 séances ?',
        text: "Assez long pour créer de vrais changements durables, assez court pour garder la motivation intacte. Chaque séance s'appuie sur la précédente, comme les marches d'un escalier.",
      },
    ],
    tip: 'La régularité compte plus que la vitesse : mieux vaut une séance par semaine bien ancrée que trois séances pressées.',
  },
  lsss: {
    icon: '⤢',
    badge: 'Mesuré S1 · S7 · S13',
    title: 'Progression des compétences de vie',
    tagline: 'La courbe scientifique qui montre ce que le sport apprend… pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'LSSS veut dire « Life Skills Scale for Sport » : une échelle scientifique validée par des chercheurs (Cronin & Allen, 2017). Ton enfant répond à des phrases qui commencent toutes par : « Ce sport m’a appris à… ».',
      },
      {
        label: 'Ce qu’elle mesure',
        bullets: [
          'Se fixer des objectifs et les atteindre',
          'Reconnaître et gérer ses émotions',
          'Travailler en équipe et communiquer',
          'Résoudre des problèmes et s’organiser',
        ],
      },
      {
        label: 'Comment ça marche ?',
        text: "La mesure est prise 3 fois : au départ (S1), à mi-parcours (S7) et à la fin (S13). Si la courbe monte, les compétences grandissent — pas seulement au hockey, partout. Le questionnaire est adapté à l'âge : pour les 8–11 ans, c'est le coach qui observe avec une grille.",
      },
    ],
    tip: 'La « zone cible » sur le graphique montre le niveau qu’on veut atteindre ensemble d’ici la fin du programme.',
  },
  parcours: {
    icon: '▦',
    badge: '13 étapes',
    title: 'Parcours des 13 séances',
    tagline: 'La carte du voyage THRIVE, pastille par pastille.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Chaque pastille représente une séance. Les dorées sont des étapes clés : S1 (le grand départ et la première mesure), S4 (le travail sur les émotions commence), S7 (le bilan de mi-parcours, où le parent est rencontré).',
      },
      {
        label: 'À quoi ressemble une séance ?',
        bullets: [
          'Un exercice sportif concret : tirs, slalom, défis chronométrés',
          'Un moment d’apprentissage de 10 à 15 minutes sur une compétence de vie',
          'Une question de transfert : « Où pourrais-tu utiliser ça à l’école ? »',
        ],
      },
      {
        label: 'La règle d’or',
        text: "La difficulté vient toujours de l'exercice, jamais du coach. Un coach THRIVE ne critique pas pour « endurcir » : la recherche montre que ça produit l'effet inverse chez les jeunes.",
      },
    ],
    tip: 'Après chaque séance, demande plutôt « Qu’est-ce que tu as appris ? » que « As-tu gagné ? ».',
  },
  competences: {
    icon: '✓',
    badge: 'Score global',
    title: 'Compétences de vie',
    tagline: 'Le niveau global des habiletés utiles partout — pas juste sur la glace.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un score qui résume où en est ton enfant dans ses « life skills » : les compétences qu’on apprend par le sport mais qu’on utilise dans toute la vie — à l’école, à la maison, avec les amis.',
      },
      {
        label: 'Les 8 familles mesurées',
        bullets: [
          'Fixer des objectifs',
          'Gérer ses émotions',
          'Travailler en équipe',
          'Communiquer',
          'Créer des liens (habiletés sociales)',
          'Prendre le leadership',
          'Résoudre des problèmes',
          'Gérer son temps',
        ],
      },
      {
        label: 'Pourquoi c’est le vrai but ?',
        text: "THRIVE n'est pas un programme pour former un meilleur joueur de hockey — c'est un programme pour former un jeune plus solide, qui utilise le hockey comme terrain d'entraînement. Le score qui monte, c'est ça, la victoire.",
      },
    ],
    tip: 'Cette jauge suit les mesures LSSS (S1 · S7 · S13) : elle avance au rythme des vraies évaluations, pas des impressions.',
  },
  boite: {
    icon: '◎',
    badge: 'Séance 11',
    title: 'Boîte à outils',
    tagline: 'Les outils mentaux collectés séance après séance — et gardés pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Au fil du programme, ton enfant construit des outils concrets : la respiration qui calme, le focus word, la routine pré-tir, l’auto-encouragement… À la séance 11, il remplit sa « Carte Ma Boîte à Outils » : c’est lui qui nomme ses 6 outils et explique quand il les utilise en dehors du sport.',
      },
      {
        label: 'Pourquoi c’est puissant ?',
        text: 'Le but est qu’il puisse se dire : « Je suis quelqu’un qui a des outils ». Un outil qu’on sait nommer soi-même est un outil qu’on réutilise seul — même quand le coach n’est plus là. C’est ce que les chercheurs appellent le transfert conscient.',
      },
      {
        label: 'Le focus word',
        text: 'Le mot-ancre affiché sur cette carte est l’outil le plus personnel de la boîte : un mot choisi par ton enfant pour ramener sa concentration au bon endroit.',
      },
    ],
    tip: 'La carte des 6 outils lui appartient : il la garde après le programme. Affichez-la quelque part à la maison !',
  },
  etapes: {
    icon: '⊟',
    badge: 'À venir',
    title: 'Prochaines étapes',
    tagline: 'Ce qui s’en vient dans le parcours — pour ne rien manquer.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le radar des prochaines actions : la séance à programmer, les prochains outils à débloquer et les grandes étapes du parcours (bilan LSSS, boîte à outils, lettre finale).',
      },
      {
        label: 'Pourquoi un ordre précis ?',
        text: 'Chaque outil s’appuie sur le précédent : on apprend d’abord à reconnaître ses émotions (S4) avant de les calmer (S5), à respirer (S6) avant de se concentrer (S9). Sauter des étapes, c’est construire sur du sable.',
      },
      {
        label: 'Le rôle du parent',
        bullets: [
          'Assurer la régularité des séances',
          'Poser des questions curieuses — sans corriger',
          'Célébrer les progrès d’effort, pas seulement les résultats',
        ],
      },
    ],
    tip: 'Ta présence est attendue à deux moments clés : le bilan de mi-parcours (S7) et la célébration finale (S13).',
  },
  identite: {
    icon: '◈',
    badge: 'Séance 1',
    title: 'Fiche Identité Athlète',
    tagline: 'Le portrait de départ : forces, histoire et rêve de saison.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le tout premier document du parcours, rempli pendant la séance 1. Il contient l’histoire sportive de ton enfant, ses forces de caractère et son rêve de saison en une phrase.',
      },
      {
        label: 'Les forces (VIA)',
        text: 'Les forces sont repérées avec un outil scientifique reconnu — l’inventaire VIA : persévérance, courage, curiosité, humour… La particularité THRIVE : le coach les observe pendant que l’enfant patine. Ce sont des forces vues en action, pas cochées sur un papier.',
      },
      {
        label: 'Le rêve de saison',
        text: 'Une phrase, choisie par l’enfant, qui dit où il veut aller. C’est le moteur émotionnel de tout le programme : chaque objectif fixé ensuite se rattache à ce rêve.',
      },
      {
        label: 'Pourquoi commencer par là ?',
        text: 'Commencer par les forces — et non les faiblesses à corriger — construit la confiance dès le premier jour. Un jeune qui se sent vu et valorisé apprend mieux : c’est démontré.',
      },
    ],
    tip: 'Relisez le rêve de saison ensemble de temps en temps : « On en est où, par rapport à ton rêve ? »',
  },
  objectif: {
    icon: '◎',
    badge: 'Séance 2',
    title: 'Fiche Objectif THRIVE',
    tagline: 'Deux objectifs choisis par ton enfant — un pour le sport, un pour la vie.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'À la séance 2, ton enfant formule lui-même — pas le coach, pas le parent ! — deux objectifs pour la saison : un objectif sportif technique et un objectif de compétence de vie.',
      },
      {
        label: 'SMART, expliqué simplement',
        bullets: [
          'Spécifique — précis, pas vague',
          'Mesurable — on peut vérifier si c’est atteint',
          'Atteignable — un défi, mais possible',
          'Réaliste — adapté à sa situation',
          'Temporel — avec une échéance claire',
        ],
      },
      {
        label: 'Le secret : viser le processus',
        text: 'THRIVE apprend à viser ce qu’on contrôle : « réussir 7 tirs sur 10 à l’entraînement » plutôt que « gagner le match ». On ne contrôle pas le résultat d’un match — mais on contrôle son effort, sa préparation, son attitude. C’est la liste « Ce qui dépend de moi ».',
      },
    ],
    tip: 'Cette méthode marche aussi à l’école : propose-lui de formuler un objectif SMART avant son prochain examen.',
  },
  focus: {
    icon: '✦',
    badge: 'Séance 9',
    title: 'Focus Word',
    tagline: 'Un seul mot, choisi par ton enfant, pour ramener sa tête au bon endroit.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un mot court — 1 à 3 syllabes — que ton enfant a choisi lui-même : « glisse », « calme », « bâton »… Il se le dit juste avant un moment difficile pour concentrer son attention sur le geste, pas sur la peur de rater.',
      },
      {
        label: 'L’idée derrière',
        text: 'Se concentrer, ce n’est pas « ne penser à rien » — c’est impossible ! C’est choisir à quoi on pense. Le coach l’explique ainsi : « Ta tête, c’est comme un projecteur. T’as le contrôle de ce que tu éclaires. »',
      },
      {
        label: 'Et quand une pensée parasite arrive ?',
        text: 'On la laisse passer comme un nuage, et on revient à son mot. La vraie concentration, ce n’est pas ne jamais partir — c’est revenir vite. Cette approche enlève la culpabilité des distractions et fait de la concentration une compétence qui s’entraîne.',
      },
    ],
    tip: 'Ton enfant a une petite carte avec son mot (format billet de métro). Elle marche aussi avant un exposé ou un devoir — glisse-la dans son agenda.',
  },
  emotions: {
    icon: '◍',
    badge: 'Séances 4 · 5',
    title: 'Roue des Émotions',
    tagline: 'D’abord reconnaître ce qu’on ressent, ensuite savoir quoi en faire.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Un outil visuel avec 6 émotions fréquentes dans le sport : frustration, peur, colère, joie, fierté, nervosité. En S4, ton enfant apprend à reconnaître et nommer l’émotion pendant l’action. En S5, il apprend à agir dessus.',
      },
      {
        label: 'Pourquoi nommer d’abord ?',
        text: 'Une émotion qu’on sait nommer précisément est une émotion qu’on gère mieux — c’est un des résultats les plus solides de la recherche. Mettre un mot dessus, c’est déjà reprendre le contrôle.',
      },
      {
        label: 'Les 2 stratégies apprises',
        bullets: [
          'La respiration 4-7-8 : inspirer 4 secondes, retenir 7, souffler 8 — ça calme réellement le corps (le cœur ralentit)',
          'La phrase de recentrage, choisie par l’enfant : « Je recommence — c’est juste un tir »',
        ],
      },
      {
        label: 'La règle éthique',
        text: 'Le coach ne provoque jamais d’émotion par des critiques. La difficulté vient de l’exercice lui-même — jamais de la pression d’un adulte. C’est une frontière non négociable de la méthode.',
      },
    ],
    tip: 'Après un match ou une grosse journée : « T’étais où sur la roue, aujourd’hui ? » — une question simple qui ouvre de vraies conversations.',
  },
  routine: {
    icon: '◷',
    badge: 'Séance 6',
    title: 'Routine pré-tir',
    tagline: '3 étapes, toujours les mêmes, pour rester calme sous pression.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Une mini-séquence que ton enfant exécute toujours de la même façon avant une action sous pression : ① respirer (expirer lentement, sentir le ventre), ② sentir ses appuis (« Sens tes pieds sur la glace, tes mains sur le bâton — ici, maintenant »), ③ dire son mot-ancre et y aller.',
      },
      {
        label: 'Pourquoi ça marche vraiment ?',
        text: 'L’expiration lente active le système qui calme le corps : le cœur ralentit, les muscles se relâchent. Ce n’est pas de la magie, c’est de la physiologie. Et réussir à se calmer soi-même donne une confiance d’un nouveau genre : « Je peux contrôler ma réaction au stress ».',
      },
      {
        label: 'Apprise sous vraie pression',
        text: 'La routine est entraînée pendant des tirs chronométrés avec score visible — une pression réelle mais bienveillante. Une technique apprise seulement au calme ne fonctionne pas le jour du match : c’est pour ça que THRIVE l’entraîne en situation.',
      },
    ],
    tip: 'Ton enfant a une carte plastifiée des 3 étapes dans son sac de hockey. La même routine marche avant un contrôle ou un exposé.',
  },
  contrat: {
    icon: '✎',
    badge: 'Séance 1',
    title: 'Contrat de confiance',
    tagline: 'Un engagement signé à trois : l’athlète, le coach… et toi.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Dès la première séance, les trois parties signent un engagement mutuel : l’enfant s’engage à essayer, le coach à accompagner sans juger, le parent à soutenir le parcours.',
      },
      {
        label: 'Pourquoi c’est fondamental ?',
        text: 'La recherche est formelle : ce qui fait le plus progresser un jeune, c’est la qualité du lien de confiance avec la personne qui l’accompagne — ce qu’on appelle l’« alliance ». Toute la séance 1 y est consacrée : zéro évaluation, zéro chrono, zéro score.',
      },
      {
        label: 'L’engagement du parent',
        bullets: [
          'Assurer la régularité des séances',
          'Encourager les efforts plus que les résultats',
          'Laisser le coach coacher — et rester le parent',
        ],
      },
    ],
    tip: 'Le mot d’ordre du coach en S1 : « Mon seul travail aujourd’hui, c’est d’apprendre qui tu es. »',
  },
  lettre: {
    icon: '✉',
    badge: 'Séance 13',
    title: 'Lettre à moi-même dans 1 an',
    tagline: 'Une capsule temporelle écrite par ton enfant, pour ton enfant.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'À la dernière séance, ton enfant écrit (ou dicte) une lettre à la personne qu’il sera dans un an : ce qu’il a appris, ce qu’il veut continuer, ce qu’il veut devenir. La lettre est scellée dans une enveloppe — interdiction de l’ouvrir avant 12 mois !',
      },
      {
        label: 'Pourquoi écrire ?',
        text: 'Mettre ses apprentissages en mots les fixe dans la mémoire. Et s’écrire à soi-même transforme les outils du programme en promesses personnelles — bien plus fort qu’un conseil venu d’un adulte.',
      },
      {
        label: 'Un an plus tard',
        text: 'En ouvrant la lettre, ton enfant mesure le chemin parcouru avec ses propres mots. C’est souvent un moment fort — pour lui comme pour toute la famille.',
      },
    ],
    tip: 'Notez ensemble la date d’ouverture au calendrier et faites-en un petit événement familial.',
  },
  certificat: {
    icon: '◈',
    badge: 'Séance 13',
    title: 'Certificat THRIVE',
    tagline: 'La reconnaissance officielle d’un parcours accompli — et personnalisée.',
    sections: [
      {
        label: "C'est quoi ?",
        text: 'Le certificat est remis à la 13e et dernière séance, lors d’une célébration à laquelle le parent est invité pour les 10 dernières minutes. Il est personnalisé : il mentionne les 3 forces signatures identifiées dès la première séance.',
      },
      {
        label: 'Juste avant, la séance 12',
        text: 'Ton enfant dirige lui-même un exercice et l’explique à quelqu’un d’autre (un parent, un ami). Il passe du rôle d’élève à celui de guide — la meilleure preuve qu’il maîtrise ce qu’il a appris.',
      },
      {
        label: 'Le message du certificat',
        text: '« Tu as des forces, tu as des outils, et tu sais t’en servir. » Ce n’est pas un trophée de performance : c’est la reconnaissance d’une identité — celle d’un jeune qui a grandi.',
      },
    ],
    tip: 'Encadrez-le ! Les 3 forces qui y figurent sont de vrais repères que ton enfant pourra relire dans les moments de doute.',
  },
};

function InfoModal({ info, onClose }: { info: CardInfo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="b-modal-ov" role="dialog" aria-modal="true" aria-label={info.title} onClick={onClose}>
      <div className="b-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.12)',
            color: 'rgba(234,243,241,.75)',
            fontSize: 14,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          ✕
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14, paddingRight: 40 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(249,235,80,.1)',
              border: '1px solid rgba(249,235,80,.25)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 17,
              color: '#F9EB50',
              flexShrink: 0,
            }}
          >
            {info.icon}
          </span>
          <span
            style={{
              padding: '5px 11px',
              borderRadius: 9,
              background: 'rgba(249,235,80,.12)',
              border: '1px solid rgba(249,235,80,.28)',
              fontWeight: 600,
              fontSize: 11,
              color: '#F9EB50',
            }}
          >
            {info.badge}
          </span>
        </div>
        <h2 className="disp" style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 26, lineHeight: 1.1 }}>
          {info.title}
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.5, color: 'rgba(234,243,241,.6)' }}>
          {info.tagline}
        </p>
        {info.sections.map((s) => (
          <div
            key={s.label}
            style={{
              marginBottom: 12,
              padding: '14px 16px',
              borderRadius: 14,
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 10.5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: '#A7C4BC',
                marginBottom: 7,
              }}
            >
              {s.label}
            </div>
            {s.text && (
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(234,243,241,.85)' }}>{s.text}</p>
            )}
            {s.bullets && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: s.text ? 8 : 0 }}>
                {s.bullets.map((b) => (
                  <div key={b} style={{ display: 'flex', gap: 9, alignItems: 'baseline' }}>
                    <span style={{ color: '#F9EB50', fontSize: 11, flexShrink: 0 }}>✦</span>
                    <span style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(234,243,241,.85)' }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {info.tip && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '13px 15px',
              borderRadius: 14,
              background: 'rgba(249,235,80,.08)',
              border: '1px solid rgba(249,235,80,.22)',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 15, flexShrink: 0, color: '#F9EB50', lineHeight: 1.3 }}>⌂</span>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 10.5,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: '#F9EB50',
                  marginBottom: 4,
                }}
              >
                À la maison
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'rgba(234,243,241,.88)' }}>{info.tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AthleteIdentityPage() {
  const router = useRouter();
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [coach, setCoach] = useState<CoachInfo>(null);
  const [completed, setCompleted] = useState(0);
  const [identity, setIdentity] = useState<ParentIdentity>(null);
  const [, setLoading] = useState(true);
  const [infoKey, setInfoKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setCoach(null);
      setCompleted(0);
      setIdentity(null);
      setLoading(false);
      return;
    }
    const [sessionsRes, assignmentRes, identityRes] = await Promise.all([
      supabase.from('sessions').select('status').eq('child_id', selectedChildId),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
      supabase
        .from('athlete_identity')
        .select(
          'sport, position, club, sport_story, strengths, season_dream, smart_goal, life_skill_goal, my_actions, toolbox, focus_word, letter'
        )
        .eq('child_id', selectedChildId)
        .maybeSingle(),
    ]);
    setCompleted((sessionsRes.data ?? []).filter((s: any) => s.status === 'COMPLETED').length);
    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
    setIdentity((identityRes.data as ParentIdentity) ?? null);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Mise à jour en direct quand le coach/admin modifie la carte
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`identity-${selectedChildId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_identity',
          filter: `child_id=eq.${selectedChildId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  // Clics délégués : les boutons [data-href] naviguent, les cartes [data-info]
  // ouvrent leur fiche d'explication.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const nav = target.closest('[data-href]');
    const href = nav?.getAttribute('data-href');
    if (href) {
      router.push(href);
      return;
    }
    const key = target.closest('[data-info]')?.getAttribute('data-info');
    if (key && CARD_INFO[key]) setInfoKey(key);
  };

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
          ◈
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">
          Ajoute un enfant pour découvrir sa carte d&apos;identité d&apos;athlète THRIVE.
        </p>
      </div>
    );
  }

  const age = ageFromDob(selectedChild.date_of_birth);
  const initials =
    `${selectedChild.first_name?.[0] ?? ''}${selectedChild.last_name?.[0] ?? ''}`.toUpperCase() ||
    '★';
  const html = buildHtml({
    firstName: selectedChild.first_name ?? '',
    fullName: `${selectedChild.first_name ?? ''}${selectedChild.last_name ? ' ' + selectedChild.last_name : ''}`.trim(),
    initials,
    avatarUrl: selectedChild.avatar_url ?? null,
    age,
    sport: identity?.sport || 'Hockey sur glace',
    poste: identity?.position || '—',
    club: identity?.club ?? null,
    coachLast: coach?.last_name || '—',
    coachLabel: coach ? `${coach.first_name?.[0] ? coach.first_name[0] + '. ' : ''}${coach.last_name}` : null,
    force1: identity?.strengths?.[0] || '—',
    completed,
    pct: Math.round((completed / 13) * 100),
    smartGoal: identity?.smart_goal ?? null,
    focusWord: identity?.focus_word ?? null,
    toolboxCount: identity?.toolbox?.length ?? 0,
    toolbox: identity?.toolbox ?? [],
    letter: identity?.letter ?? null,
    sportStory: identity?.sport_story ?? null,
    strengths: identity?.strengths ?? [],
    seasonDream: identity?.season_dream ?? null,
    lifeSkillGoal: identity?.life_skill_goal ?? null,
    myActions: identity?.my_actions ?? [],
  });

  return (
    <div className="-mx-4 md:-mx-6 -my-6 md:-my-8">
      <style dangerouslySetInnerHTML={{ __html: DESIGN_CSS }} />
      <div onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {infoKey && CARD_INFO[infoKey] && (
        <InfoModal info={CARD_INFO[infoKey]} onClose={() => setInfoKey(null)} />
      )}
    </div>
  );
}
