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
.bilan-root{font-family:var(--font-inter),'Inter',system-ui,sans-serif;color:#eaf3f1;}
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
  .bilan-root .b-row1{grid-template-columns:1fr;}
  .bilan-root .b-nodes{grid-template-columns:repeat(5,1fr);}
  .bilan-root .b-pad{padding:18px 14px 26px!important;}
  .bilan-root .b-title{font-size:34px!important;}
}
`;

const CARD =
  'position:relative;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:22px;';
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
  letter: string | null;
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
    letter,
  } = d;

  const cur = Math.min(Math.max(completed, 0), 13);
  const next = Math.min(completed + 1, 13);
  const remaining = Math.max(13 - completed, 0);
  const milestone = new Set([1, 4, 7]);

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
      circle = `<span class="disp bx" style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:#06222a;background:radial-gradient(circle at 40% 35%,${y ? '#fff7c8,#F9EB50' : '#dff0ea,#A7C4BC'} 70%);${y ? 'box-shadow:0 0 18px rgba(249,235,80,.3);' : ''}">${n}</span>`;
    } else if (isCur) {
      circle = `<span class="disp bx" style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:15px;color:#06222a;background:radial-gradient(circle at 40% 35%,#fff7c8,#F9EB50 70%);animation:b-pulseRing 2.4s ease-in-out infinite;">${n}</span>`;
      subColor = '#F9EB50';
      subWeight = 600;
    } else {
      circle = `<span class="disp bx" style="width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;color:rgba(234,243,241,.45);background:rgba(255,255,255,.03);border:1.5px dashed rgba(255,255,255,.18);">${n}</span>`;
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

  const renseignes = [smartGoal, focusWord, letter, toolboxCount > 0].filter(Boolean).length + 1; // +1 = contrat (coach)

  const objText = smartGoal || 'Objectif SMART à co-construire avec le coach.';
  const focus = focusWord || '—';

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
    </div>
    <div style="display:flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:5px;">
      <span class="b-hover" data-href="/parent/my-sessions" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:11px;background:rgba(255,255,255,.06);font-weight:600;font-size:14px;color:#eaf3f1;">⤓ Voir le passeport</span>
      <span class="b-hover" data-href="/parent/progress" style="display:flex;align-items:center;gap:8px;padding:10px 18px;font-weight:500;font-size:14px;color:rgba(234,243,241,.65);">↗ Progrès</span>
    </div>
  </div>

  <!-- ROW 1 -->
  <div class="b-row1">
    <!-- Passeport athlète -->
    <div class="bx" style="${CARD}">
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
    <div class="bx b-hover" data-href="/parent/my-sessions" style="${CARD}overflow:hidden;">
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
    <div class="bx" style="${CARD}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:11px;">
          <span class="bx" style="${CHIP}color:#A7C4BC;">⤢</span>
          <span class="disp" style="font-weight:600;font-size:18px;">Progression des compétences de vie</span>
        </div>
        <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-weight:500;font-size:12px;color:rgba(234,243,241,.65);">▦ LSSS · mesuré S1 · S7</span>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="display:flex;flex-direction:column;justify-content:space-between;padding:14px 0 26px;font-weight:400;font-size:11px;color:rgba(234,243,241,.4);text-align:right;width:34px;"><span>Élevé</span><span>Moyen</span><span>Bas</span></div>
        <div style="flex:1;min-width:0;">
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
    <div class="bx" style="${CARD}overflow:hidden;background:linear-gradient(180deg,rgba(8,40,46,.6),rgba(4,24,30,.6));">
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
      <div class="bx" style="${CARD}">
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
      <div class="bx" style="${CARD}flex:1;">
        <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
          <span class="bx" style="${CHIP}color:#F9EB50;">◎</span>
          <span class="disp" style="font-weight:600;font-size:17px;">Boîte à outils</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:6px;"><span class="disp" style="font-weight:700;font-size:30px;line-height:1;">${toolboxCount}</span><span style="font-weight:500;font-size:13px;color:rgba(234,243,241,.45);">/6 outils collectés</span></div>
        <div style="height:9px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;margin:14px 0 16px;"><div style="width:${Math.round((Math.min(toolboxCount, 6) / 6) * 100)}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#A7C4BC,#F9EB50);transform-origin:left;animation:b-growX 1s cubic-bezier(.22,.61,.36,1) both .6s;"></div></div>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:rgba(249,235,80,.08);border:1px solid rgba(249,235,80,.2);">
          <span style="font-weight:500;font-size:11px;color:rgba(234,243,241,.55);">Focus word</span>
          <span class="disp" style="font-weight:600;font-size:18px;color:#F9EB50;letter-spacing:.02em;margin-left:auto;">${esc(focus)}</span>
        </div>
      </div>
    </div>

    <!-- Prochaines étapes -->
    <div class="bx" style="${CARD}display:flex;flex-direction:column;">
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
    <span class="bx" style="display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:11px;background:rgba(249,235,80,.1);border:1px solid rgba(249,235,80,.22);font-weight:600;font-size:12px;color:#F9EB50;">7 ateliers · ${renseignes} renseignés</span>
  </div>

  <div class="b-tools">
    <!-- S2 · FICHE OBJECTIF -->
    <div class="bx" style="grid-column:span 4;${CARD}">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:16px;">
        <span class="bx" style="${CHIP}color:#A7C4BC;">◎</span>
        <span class="disp" style="font-weight:600;font-size:18px;">Fiche Objectif THRIVE</span>
        ${smartGoal ? okBadge('S2 · ✓ Renseigné') : waitBadge('S2 · À venir')}
      </div>
      <div style="position:relative;padding:16px 18px 16px 40px;border-radius:15px;background:rgba(167,196,188,.06);border:1px solid rgba(167,196,188,.16);margin-bottom:16px;">
        <span class="disp" style="position:absolute;left:14px;top:8px;font-size:34px;color:rgba(249,235,80,.45);line-height:1;">“</span>
        <p class="disp" style="margin:0;font-weight:500;font-size:19px;line-height:1.35;color:#eaf3f1;">${esc(objText)}</p>
      </div>
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
    <div class="bx" style="grid-column:span 2;position:relative;overflow:hidden;background:linear-gradient(180deg,rgba(249,235,80,.07),rgba(255,255,255,.015));border:1px solid rgba(249,235,80,.2);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 50px rgba(0,0,0,.32);padding:22px;display:flex;flex-direction:column;">
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
    <div class="bx" style="grid-column:span 2;${CARD}">
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
    <div class="bx" style="grid-column:span 2;${CARD}">
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
    <div class="bx" style="grid-column:span 2;${CARD}">
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
    <div class="bx" style="grid-column:span 3;${CARD}">
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
    <div class="bx" style="grid-column:span 3;position:relative;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));border:1px dashed rgba(255,255,255,.17);border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 20px 50px rgba(0,0,0,.32);padding:22px;">
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

export default function AthleteIdentityPage() {
  const router = useRouter();
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [coach, setCoach] = useState<CoachInfo>(null);
  const [completed, setCompleted] = useState(0);
  const [identity, setIdentity] = useState<ParentIdentity>(null);
  const [, setLoading] = useState(true);

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

  // Navigation déléguée pour les éléments [data-href] du design
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest('[data-href]');
    const href = el?.getAttribute('data-href');
    if (href) router.push(href);
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
    letter: identity?.letter ?? null,
  });

  return (
    <div className="-mx-4 md:-mx-6 -my-6 md:-my-8">
      <style dangerouslySetInnerHTML={{ __html: DESIGN_CSS }} />
      <div onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
