// ─────────────────────────────────────────────────────────────────────────
// THRIVE — section client de A à Z, trois versions, grammaire iOS 27.
// Une seule source d'écrans ; la version (data-v sur <html>) change le thème
// ET la structure (onglets, accueil, hiérarchie). Maquettes statiques.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  const V = document.documentElement.dataset.v || 'v1';
  const v1 = V === 'v1', v2 = V === 'v2', v3 = V === 'v3';
  const sel = (a, b, c) => (v1 ? a : v2 ? b : c);

  // ── Données de démonstration (cohérentes avec le protocole réel) ─────────
  const K = { prenom: 'Léo', nom: 'Tremblay', surnom: 'Flash', num: 17, age: 11, sport: 'Hockey', poste: 'Ailier gauche', club: 'Les Faucons de Rosemont', coach: 'Coach Lylian', coachP: 'Lylian', force: 'Persévérance', focus: 'Calme', tranche: '8-11 ans' };
  const PARENT = { prenom: 'Camille', nom: 'Tremblay', email: 'camille.tremblay@exemple.ca' };
  // Personas : V1 = programme Individuel · V2 = abonnement Maison seul (essai) · V3 = programme Complet
  const PROG = sel('Individuel', null, 'Complet');
  const TAX = 1.14975; // TPS 5 % + TVQ 9,975 %
  const money = (n) => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
  const SKILLS = [
    ['Travail d’équipe', 62, 74], ['Fixation d’objectifs', 55, 71], ['Habiletés sociales', 60, 69], ['Résolution de problèmes', 52, 63],
    ['Habiletés émotionnelles', 48, 66], ['Leadership', 54, 61], ['Gestion du temps', 50, 58], ['Communication', 63, 72],
  ];
  const EPOCH = [3.4, 3.6, 3.5, 3.8, 3.7, 4.0, 4.1];
  const SESS = [
    [1, 'ANCRER', 'Reconnaître ses forces', 'Identité'], [2, 'ANCRER', 'Objectif de résultat, objectif d’effort', 'Objectifs'],
    [3, 'DÉVELOPPER', 'Les preuves', 'Confiance'], [4, 'DÉVELOPPER', 'Les six émotions', 'Émotions'], [5, 'DÉVELOPPER', 'La respiration et la phrase', 'Gestion du stress'],
    [6, 'DÉVELOPPER', 'Le corps qui se pose', 'Gestion du stress'], [7, 'DÉVELOPPER', 'Se mesurer à soi', 'Confiance'], [8, 'DÉVELOPPER', 'Sur qui je compte', 'Connexion'],
    [9, 'DÉVELOPPER', 'Choisir où on regarde', 'Concentration'], [10, 'DÉVELOPPER', 'Revivre de l’intérieur', 'Préparation mentale'],
    [11, 'INTÉGRER', 'Nommer ses outils', 'Transfert'], [12, 'INTÉGRER', 'Contribuer', 'Leadership'], [13, 'INTÉGRER', 'Le regard du parent', 'Bilan'],
  ];
  const DONE = 7, NEXT = 8;
  const DATES = ['3 sept.', '10 sept.', '17 sept.', '24 sept.', '1 oct.', '3 oct.', '8 oct.'];
  const WEEK8 = [
    { id: 'ACT-0801', t: 'Mes trois personnes', s: 'Sur qui je compte', d: [10, 20, 30], m: 'Assis · papier, crayon', done: true },
    { id: 'ACT-0802', t: 'La cabane impossible', s: 'Demander pour réussir', d: [10, 20, 30], m: 'Actif · coussins, boîtes, couverture' },
    { id: 'ACT-0803', t: 'La demande de la semaine', s: 'Oser demander', d: [10], m: 'Assis · possible en voiture' },
  ];

  // ── Vignettes des activités (mascotte THRIVE, une par activité) ───────────
  const ACTS = window.ACTS || {};
  const VSET = new Set(window.VIGN || []);
  const vsrc = (id) => (VSET.has(id) ? (window.VIGN_BASE || 'assets/vignettes/') + id + '.webp' : null);
  // Vignette carrée ; une activité sans image garde un aplat neutre avec son numéro.
  function vimg(id, size = 64, { r = 18, done = false, dim = false, label = '' } = {}) {
    const src = vsrc(id);
    const inner = src ? `<img src="${src}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:cover;display:block${dim ? ';filter:grayscale(1);opacity:.55' : ''}">`
      : `<span style="width:${size}px;height:${size}px;display:grid;place-items:center;background:var(--fill3);color:var(--label2);font:600 ${Math.round(size * .3)}px/1 var(--sf)">${label || '·'}</span>`;
    return `<span style="position:relative;width:${size}px;height:${size}px;border-radius:${r}px;overflow:hidden;flex:none;display:block;background:#F1EEE8">${inner}${done ? `<span style="position:absolute;right:4px;bottom:4px;width:22px;height:22px;border-radius:11px;background:var(--sys-green);color:#fff;display:grid;place-items:center;box-shadow:0 0 0 2px #fff">${ic('check', 13, { sw: 3 })}</span>` : ''}</span>`;
  }

  // Mascotte de base, incrustée : disque crème, halo, bords fondus (pas de carré visible).
  const MASCOT = 'ACT-0603';
  function mascotHero(size = 240, { glow = 'rgba(249,235,80,.28)', ring = true, id = MASCOT, pos = '50% 40%' } = {}) {
    return `<div style="position:relative;width:${size}px;height:${size}px;flex:none">
      <div style="position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(circle, ${glow} 0%, rgba(0,0,0,0) 68%)"></div>
      <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 38%, #F6F2EA 0%, #EEE8DD 62%, #E4DCCD 100%);${ring ? 'box-shadow:0 0 0 1px rgba(255,255,255,.55), 0 0 0 7px rgba(255,255,255,.10), inset 0 -10px 30px rgba(120,100,70,.10)' : ''}"></div>
      <img src="${vsrc(id)}" alt="La mascotte THRIVE" style="position:absolute;inset:4%;width:92%;height:92%;object-fit:cover;object-position:${pos};border-radius:50%;-webkit-mask-image:radial-gradient(circle at 50% 46%, #000 56%, rgba(0,0,0,0) 71%);mask-image:radial-gradient(circle at 50% 46%, #000 56%, rgba(0,0,0,0) 71%)">
    </div>`;
  }
  // Bandeau « bientôt » posé sur les écrans vidéo mis de côté
  const soonPill = (dark = true, top = 60) => `<div style="position:absolute;left:50%;top:${top}px;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:16px;font:600 13px/1 var(--sf);white-space:nowrap;background:${dark ? 'rgba(255,179,64,.95)' : '#FFE7B8'};color:#3D2600;box-shadow:0 2px 10px rgba(0,0,0,.18)">${ic('timer', 15, { sw: 2.2 })}Aperçu · pas disponible pour l’instant</div>`;

  // Carte « s'ouvre avec un programme » posée sur un aperçu flouté (abonné Maison seul)
  const programLock = (title, text) => `<div class="sheet float glassy" style="bottom:110px;padding:22px 20px 20px">
      <div class="flex items-c gap12">${mascotHero(76, { glow: 'rgba(0,0,0,0)', ring: false })}<div class="f1"><div class="flex items-c gap4 t-foot c2">${ic('lock', 13, { sw: 2.4 })}Avec un programme THRIVE</div><div class="t-title3" style="margin-top:2px">${title}</div></div></div>
      <div class="t-sub c2" style="margin-top:10px">${text}</div>
      <div class="flex items-c gap8 t-foot" style="margin-top:12px;color:var(--ok)">${ic('shield', 16)}Les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.</div>
      <div class="flex gap8" style="margin-top:14px"><span class="btn md gray f1">Voir les offres</span><span class="btn md prom f1">Appel de 15 min</span></div></div>`;

  // ── Petits composants ───────────────────────────────────────────────────
  const statusbar = (light) => `<div class="statusbar${light ? ' light' : ''}"><span class="num">9:41</span><span class="si">
    <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor"><rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="5.2" y="5.5" width="3.2" height="6.5" rx="1"/><rect x="10.4" y="3" width="3.2" height="9" rx="1"/><rect x="15.6" y="0" width="3.2" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.6c2.3 0 4.4.9 6 2.4l1.2-1.2A10 10 0 0 0 8.5.9 10 10 0 0 0 1.3 3.8L2.5 5a8.4 8.4 0 0 1 6-2.4zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2a6.8 6.8 0 0 0-9.6 0l1.2 1.2c1-.9 2.2-1.4 3.6-1.4zm0 3.4c.5 0 1 .2 1.3.5L8.5 11.2 7.2 9.9c.3-.3.8-.5 1.3-.5z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2.5" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg></span></div>`;

  const gb = (name, o = {}) => `<span class="gbtn ic glass${o.tinted ? ' tinted' : ''}" aria-label="${o.label || name}">${ic(name, o.size || 21)}</span>`;
  const gbt = (txt, o = {}) => `<span class="gbtn glass${o.tinted ? ' tinted' : ''}">${o.icon ? ic(o.icon, 19) : ''}${txt}</span>`;
  const gpair = (a, b) => `<span class="gbtn pair glass"><span>${ic(a, 20)}</span><span>${ic(b, 20)}</span></span>`;

  function navbar({ title = '', left = '', right = '', edge = false } = {}) {
    return `<div class="navbar${edge ? ' edge' : ''}"><div class="bar"><div class="grp">${left}</div>${title ? `<div class="ttl">${title}</div>` : ''}<div class="grp">${right}</div></div></div>`;
  }

  const TABS = {
    v1: { tabs: [['Maison', 'house'], ['Bilan', 'sparkle'], ['Mes séances', 'calendar']], prom: ['Coach', 'bubble'] },
    v2: { tabs: [['Maison', 'house'], ['Bilan', 'sparkle'], ['Mes séances', 'calendar']], prom: ['Ce soir', 'play'] },
    v3: { tabs: [['Ce soir', 'moon'], ['Bilan', 'idcard'], ['Mes séances', 'calendar']], prom: ['Rechercher', 'search'] },
  }[V];
  function tabbar(active, promActive = false) {
    const tabs = TABS.tabs.map(([l, i], n) => `<span class="tab${n === active ? ' on' : ''}">${ic(i, 24)}<span>${l}</span></span>`).join('');
    const pc = promActive || v2 ? 'glass tinted' : 'glass plainglass';
    return `<div class="fade-bottom"></div><div class="tabbar"><div class="tabs glass">${tabs}</div><span class="prom ${pc}" aria-label="${TABS.prom[0]}">${ic(TABS.prom[1], 25)}</span></div>`;
  }

  function ring(p, { size = 64, sw = 8, color = 'var(--tint)', track = 'var(--fill)', cap = 'round', label = '' } = {}) {
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
      ${p > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}${label}</svg>`;
  }

  function spark(vals, { w = 140, h = 44, min = 3, max = 4.4, color = 'var(--tint)', dots = true, fill = true } = {}) {
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - 8) + 4, h - 4 - ((v - min) / (max - min)) * (h - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${fill ? `<path d="${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h}Z" fill="${color}" opacity=".12"/>` : ''}
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots ? pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 4 : 2.4}" fill="${i === pts.length - 1 ? color : 'var(--bg2)'}" stroke="${color}" stroke-width="2"/>`).join('') : ''}</svg>`;
  }

  function lsssCurve(points, { w = 338, h = 150, final = false } = {}) {
    const labels = ['Départ', 'Mi-parcours', 'Final'];
    const xs = [24, w / 2, w - 24], y = (v) => h - 30 - ((v - 40) / 50) * (h - 50);
    let s = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    [50, 70, 90].forEach((g) => (s += `<line x1="0" x2="${w}" y1="${y(g)}" y2="${y(g)}" stroke="var(--sep)" stroke-dasharray="2 4"/><text x="${w}" y="${y(g) - 4}" text-anchor="end" font-size="11" fill="var(--label3)" font-family="var(--sf)">${g}</text>`));
    const known = points.filter((p) => p != null);
    s += `<path d="${known.map((v, i) => (i ? 'L' : 'M') + xs[i] + ' ' + y(v)).join(' ')}" fill="none" stroke="var(--tint)" stroke-width="3" stroke-linecap="round"/>`;
    if (!final && known.length < 3) s += `<path d="M${xs[known.length - 1]} ${y(known[known.length - 1])} L${xs[2]} ${y(known[known.length - 1] + 6)}" stroke="var(--label3)" stroke-width="2" stroke-dasharray="3 5" fill="none"/>`;
    labels.forEach((l, i) => {
      const v = points[i];
      s += v != null ? `<circle cx="${xs[i]}" cy="${y(v)}" r="6" fill="var(--tint)" stroke="var(--bg2)" stroke-width="2.5"/><text x="${xs[i]}" y="${y(v) - 13}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--label)" font-family="var(--sf)">${v}</text>`
        : `<circle cx="${xs[i]}" cy="${y(points[1] + 6)}" r="5.5" fill="none" stroke="var(--label3)" stroke-width="2" stroke-dasharray="2 2.5"/>`;
      s += `<text x="${xs[i]}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}" font-size="12" fill="var(--label2)" font-family="var(--sf)">${l}</text>`;
    });
    return s + '</svg>';
  }

  const avatar = (size = 44, txt = K.prenom[0], bg = 'var(--kid)', fg = v2 ? '#141414' : '#fff') =>
    `<span class="avatar" style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${Math.round(size * 0.42)}px">${txt}</span>`;
  const jersey = (size = 56) => `<span class="avatar round" style="width:${size}px;height:${size}px;background:var(--kid);color:${v2 ? '#141414' : '#fff'};font-size:${Math.round(size * .44)}px;font-weight:800;letter-spacing:-1px">${K.num}</span>`;
  const rowi = ({ icon, ibg, t, d, val, chev = true, cls = '', right = '' }) => `<div class="rowi ${icon ? 'ico' : ''} ${cls}">${icon ? `<span class="ibadge" style="background:${ibg || 'var(--tint)'}">${ic(icon, 18, { sw: 2 })}</span>` : ''}<div class="main"><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${val ? `<span class="val">${val}</span>` : ''}${right}${chev ? `<span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span>` : ''}</div>`;
  const childPill = () => `<span class="gbtn glass" style="padding:0 12px 0 5px;gap:8px">${avatar(34)}<span class="t-headline">${K.prenom}</span>${ic('chevD', 14, { sw: 2.6 })}</span>`;

  // Deux slogans qui se relaient en fondu (accueil) : le programme, puis Maison
  const sloganDuo = (st, { br = ' ', dots = 'currentColor', align = 'left' } = {}) => `<style>
    @keyframes thrSlA{0%,44%{opacity:1;transform:none;filter:blur(0)}50%,94%{opacity:0;transform:translateY(-10px);filter:blur(8px)}100%{opacity:1;transform:none;filter:blur(0)}}
    @keyframes thrSlB{0%,44%{opacity:0;transform:translateY(10px);filter:blur(8px)}50%,94%{opacity:1;transform:none;filter:blur(0)}100%{opacity:0;transform:translateY(10px);filter:blur(8px)}}
    @keyframes thrDtA{0%,44%{width:22px;opacity:1}50%,94%{width:6px;opacity:.35}100%{width:22px;opacity:1}}
    @keyframes thrDtB{0%,44%{width:6px;opacity:.35}50%,94%{width:22px;opacity:1}100%{width:6px;opacity:.35}}
    .thr-sl{display:grid}.thr-sl>div{grid-area:1/1;will-change:opacity,transform,filter}.thr-sl .b{opacity:0}
    .thr-sl .a{animation:thrSlA 9s cubic-bezier(.45,0,.2,1) infinite}.thr-sl .b{animation:thrSlB 9s cubic-bezier(.45,0,.2,1) infinite}
    .thr-dt{display:flex;gap:6px;margin-top:14px}.thr-dt i{height:6px;border-radius:3px;background:${dots}}
    .thr-dt i:first-child{animation:thrDtA 9s cubic-bezier(.45,0,.2,1) infinite}.thr-dt i:last-child{animation:thrDtB 9s cubic-bezier(.45,0,.2,1) infinite}
    @media (prefers-reduced-motion: reduce){.thr-sl .a,.thr-sl .b,.thr-dt i{animation:none}.thr-sl .b{opacity:0}}
  </style><div class="thr-sl" style="${st}"><div class="a">Grandir par le sport,${br}réussir pour la vie.</div><div class="b">Moins de temps,${br}plus de bons moments.</div></div><div class="thr-dt" style="justify-content:${align === 'center' ? 'center' : 'flex-start'}"><i></i><i></i></div>`;

  // ── Les 26 écrans ───────────────────────────────────────────────────────
  const S = {};

  // A — Bienvenue
  S.A = () => {
    if (v2) return { html: `<div class="scroll" style="background:#000">
      <div style="position:absolute;left:50%;top:110px;transform:translateX(-50%)">${ring(0.82, { size: 300, sw: 26, color: '#F9EB50', track: 'rgba(249,235,80,.14)' })}</div>
      <div style="position:absolute;left:50%;top:154px;transform:translateX(-50%)">${ring(0.58, { size: 212, sw: 26, color: '#A7C4BC', track: 'rgba(167,196,188,.14)' })}</div>
      <div style="position:absolute;left:50%;top:190px;transform:translateX(-50%)">${mascotHero(140, { glow: 'rgba(0,0,0,0)', ring: false })}</div>
      <div style="position:absolute;left:24px;right:24px;bottom:178px"><img src="assets/logo.png" width="52" height="52" style="border-radius:12px;margin-bottom:18px" alt="THRIVE">${sloganDuo('font:700 34px/40px var(--sf);letter-spacing:-.4px', { br: '<br>', dots: '#F9EB50' })}<div class="t-body c2" style="margin-top:10px">Un moment par soir avec ton enfant. Un coach quand tu veux aller plus loin.</div></div>
      <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn prom">Essayer 1 mois gratuitement</span><span class="btn plain">J’ai déjà un compte</span></div></div>` };
    if (v3) return { html: `<div class="scroll" style="background:#F7F5F2">
      <div style="position:absolute;inset:0 0 auto 0;height:520px;background:#004E7A;border-radius:0 0 44px 44px;overflow:hidden">
        <div style="position:absolute;right:-40px;top:58px;font:800 300px/1 var(--sf-round);color:rgba(247,245,242,.06);letter-spacing:-12px">17</div>
        <div style="position:absolute;right:22px;top:92px">${mascotHero(232, { glow: 'rgba(249,235,80,.30)' })}</div>
        <div style="position:absolute;left:24px;top:96px"><img src="assets/logo.png" width="60" height="60" style="border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.2)" alt="THRIVE"></div>
        <div style="position:absolute;left:24px;right:24px;bottom:40px;color:#F7F5F2"><div style="font:600 13px/18px var(--sf);letter-spacing:1.2px;text-transform:uppercase;opacity:.75">THRIVE Sport Positive</div>${sloganDuo('font:600 42px/46px Fraunces,Georgia,serif;margin-top:10px;letter-spacing:-.6px', { dots: '#F9EB50' })}</div>
      </div>
      <div style="position:absolute;left:24px;right:24px;top:548px" class="t-body c2">Chaque soir, un moment de 10 minutes avec ton enfant, rien à préparer. Et quand tu veux aller plus loin, un coach.</div>
      <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn prom">Essayer 1 mois gratuitement</span><span class="btn plain">J’ai déjà un compte</span></div></div>` };
    return { html: `<div class="scroll" style="background:#fff">
      <div class="flex col items-c" style="padding-top:92px"><div style="position:relative">${mascotHero(220, { glow: 'rgba(0,78,122,.16)' })}<img src="assets/logo.png" width="52" height="52" style="position:absolute;right:6px;bottom:6px;border-radius:12px;box-shadow:0 0 0 3px #fff, 0 6px 16px rgba(0,0,0,.18)" alt="THRIVE"></div><div class="t-title1 center" style="margin-top:22px;font-size:34px;line-height:41px">Bienvenue dans<br>THRIVE</div><div style="margin-top:8px;color:var(--tint)">${sloganDuo('font:600 17px/22px var(--sf);text-align:center;letter-spacing:-.2px', { align: 'center', dots: 'var(--tint)' })}</div></div>
      <div class="flex col gap12" style="margin:20px 36px 0">
        ${[['house', 'Un moment par soir avec ton enfant', '10 à 30 minutes, rien à préparer.'], ['gift', 'Le carnet de vos moments', 'Ce que vous gardez, et des objets à gagner.'], ['bubble', 'Un coach, si tu veux aller plus loin', 'Groupe, 1:1 ou les deux, près de chez toi.']].map(([i, t, d]) => `<div class="flex gap16 items-c"><span style="color:var(--tint);flex:none">${ic(i, 34, { sw: 1.6 })}</span><div><div class="t-headline">${t}</div><div class="t-sub c2">${d}</div></div></div>`).join('')}
      </div>
      <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn prom">Essayer 1 mois gratuitement</span><span class="btn plain">J’ai déjà un compte</span></div></div>` };
  };

  // B — Connexion
  S.B = () => ({ html: `${navbar({ left: gb('chevL', { label: 'Retour' }) })}<div class="scroll"><div style="padding-top:120px">
    <div class="pad flex items-c gap12"><div class="f1"><div class="t-title1" style="${v3 ? 'font-family:var(--display)' : ''}">Content de te revoir</div><div class="t-body c2" style="margin-top:6px">Connecte-toi à l’espace de ta famille.</div></div>${mascotHero(112, { glow: v2 ? 'rgba(249,235,80,.18)' : 'rgba(0,78,122,.12)' })}</div>
    <div class="sec" style="margin-top:18px"><div class="list"><div class="field"><label>Courriel</label><span class="in">${PARENT.email}</span></div><div class="field"><label>Mot de passe</label><span class="in">••••••••••<span class="caret"></span></span></div></div>
    <div class="sec-f">Mot de passe oublié ? <span class="ctint">Recevoir un lien</span></div></div>
    <div class="sec" style="margin-top:28px"><span class="btn prom">Se connecter</span></div>
    <div class="sec" style="margin-top:14px"><div class="list">${rowi({ icon: 'shield', ibg: 'var(--sys-green)', t: 'Double authentification', d: 'Code à 6 chiffres demandé si activée', chev: false })}</div></div>
    </div></div>
    <div style="position:absolute;left:0;right:0;bottom:290px;height:0"></div>
    <div class="glass" style="position:absolute;left:8px;right:8px;bottom:8px;height:268px;border-radius:40px;padding:10px 6px 0">
      <div class="flex gap4" style="padding:0 6px">${['courriel', 'camille@', '@gmail.com'].map((s) => `<span class="f1 center t-sub" style="padding:9px 0">${s}</span>`).join('<span style="width:1px;background:var(--sep);margin:8px 0"></span>')}</div>
      ${['azertyuiop', 'qsdfghjklm', 'wxcvbn'].map((r, ri) => `<div class="flex" style="gap:6px;padding:6px ${ri === 2 ? 48 : 4}px;justify-content:center">${r.split('').map((k) => `<span style="flex:1;max-width:33px;height:44px;border-radius:9px;background:var(--bg2);display:grid;place-items:center;font:400 22px/1 var(--sf);box-shadow:0 1px 0 rgba(0,0,0,.18)">${k}</span>`).join('')}</div>`).join('')}
    </div>` });

  // C — Inscription · le parent
  S.C = () => ({ html: `${navbar({ title: 'Créer le compte', left: gb('x', { label: 'Fermer' }), right: `<span class="t-sub c2 num">1 sur 2</span>` })}<div class="scroll"><div style="padding-top:116px">
    <div class="sec"><div class="bar-p"><i style="width:50%"></i></div></div>
    <div class="pad" style="margin-top:22px"><div class="t-title2">D’abord, toi</div><div class="t-sub c2" style="margin-top:4px">Deux minutes. Pas de courriel de confirmation à aller chercher : tu entres tout de suite.</div></div>
    <div class="sec-h small"><h4>Parent</h4></div>
    <div class="sec"><div class="list"><div class="field"><label>Prénom</label><span class="in">Camille</span></div><div class="field"><label>Nom</label><span class="in">Tremblay</span></div></div></div>
    <div class="sec-h small"><h4>Connexion</h4></div>
    <div class="sec"><div class="list"><div class="field"><label>Courriel</label><span class="in">${PARENT.email}</span></div><div class="field"><label>Mot de passe</label><span class="in">••••••<span class="caret"></span></span></div></div>
    <div class="sec-f flex items-c gap4"><span style="color:var(--warn)">${ic('info', 15)}</span>8 caractères minimum — encore 2.</div></div>
    <div class="sec" style="margin-top:20px"><div class="list"><div class="rowi"><div class="main"><div class="t">Recevoir les nouveautés</div><div class="d">Une fois par mois, au plus.</div></div><span class="tgl"></span></div></div></div>
    </div></div>
    <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px"><span class="btn prom" style="opacity:.45">Continuer</span></div>` });

  // D — Inscription · les enfants
  S.D = () => {
    const kid = (n, prenom, age, sport, open) => `<div class="sec-h small"><h4>Enfant ${n}</h4>${n > 1 ? '<span class="t-foot" style="color:var(--sys-red)">Retirer</span>' : ''}</div>
      <div class="sec"><div class="list"><div class="field"><label>Prénom</label><span class="in${prenom ? '' : ' ph'}">${prenom || 'Prénom'}</span></div>
      <div class="field"><label>Âge</label><span class="in num">${age} ans</span><span class="gbtn pair" style="background:var(--fill3);height:34px;border-radius:17px"><span style="height:34px;font-size:20px">−</span><span style="height:34px;font-size:20px">+</span></span></div>
      <div class="field"><label>Sport</label><span class="in">${sport}</span><span class="c3">${ic('chevUD', 16, { sw: 2.2 })}</span></div></div></div>`;
    return { html: `${navbar({ title: 'Créer le compte', left: gb('chevL', { label: 'Retour' }), right: `<span class="t-sub c2 num">2 sur 2</span>` })}<div class="scroll"><div style="padding-top:116px">
      <div class="sec"><div class="bar-p"><i style="width:100%"></i></div></div>
      <div class="pad" style="margin-top:22px"><div class="t-title2">Tes enfants</div><div class="t-sub c2" style="margin-top:4px">De 8 à 17 ans. Le parcours s’adapte à sa tranche d’âge.</div></div>
      ${kid(1, 'Léo', 11, 'Hockey')}${kid(2, 'Inès', 14, 'Natation')}
      <div class="sec" style="margin-top:14px"><span class="btn gray">${ic('plus', 20, { sw: 2.2 })}Ajouter un enfant</span></div>
      </div></div>
      <div class="menu glass strong" style="right:30px;top:300px;min-width:210px">${['Hockey', 'Soccer', 'Natation', 'Basketball', 'Gymnastique', 'Tennis', 'Autre sport'].map((s, i) => `<div class="mi${i ? ' sep' : ''}${s === 'Natation' ? ' on' : ''}"><span>${s}</span>${s === 'Natation' ? ic('check', 18, { sw: 2.4 }) : ''}</div>`).join('')}</div>
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px"><span class="btn prom">Continuer</span></div>` };
  };

  // E — Activation : l'espace se prépare
  S.E = () => {
    const steps = [['Fiche de Léo reçue', 'Aujourd’hui, 18 h 02', 1], ['Confirmée par l’équipe THRIVE', 'Aujourd’hui, 18 h 40', 1], [`Ouverte par ${K.coach}`, 'Il lit le dossier de Léo', 0]];
    const preview = `<div class="muted-preview" style="padding-top:108px"><div class="largetitle">${K.prenom}</div><div class="sec" style="margin-top:14px"><div class="card" style="height:150px"></div></div><div class="sec" style="margin-top:12px"><div class="grid2"><div class="card" style="height:150px"></div><div class="card" style="height:150px"></div></div></div><div class="sec" style="margin-top:12px"><div class="card" style="height:120px"></div></div></div>`;
    return { html: `${navbar({ left: childPill(), right: gb('bell') })}<div class="scroll">${preview}</div>
      <div class="sheet float glassy" style="bottom:110px;padding:22px 20px 20px">
        <div class="flex items-c gap12"><img src="assets/logo.png" width="44" height="44" style="border-radius:11px" alt=""><div><div class="t-title3">Ton espace se prépare</div><div class="t-sub c2">Ouvert par un humain, pas par un algorithme.</div></div></div>
        <div style="margin-top:18px" class="flex col">${steps.map(([t, d, ok], i) => `<div class="flex gap12" style="min-height:58px"><div class="flex col items-c" style="width:28px"><span style="width:28px;height:28px;border-radius:14px;display:grid;place-items:center;background:${ok ? 'var(--sys-green)' : 'var(--fill)'};color:#fff">${ok ? ic('check', 16, { sw: 2.8 }) : `<span style="width:10px;height:10px;border-radius:5px;background:var(--tint)"></span>`}</span>${i < 2 ? `<span style="flex:1;width:2px;background:${ok ? 'var(--sys-green)' : 'var(--fill)'};margin:3px 0"></span>` : ''}</div><div><div class="t-headline">${t}</div><div class="t-sub c2">${d}</div></div></div>`).join('')}</div>
        <div class="t-foot c2" style="margin-top:6px">Ton programme ${PROG || 'Individuel'} démarre 1 à 2 semaines après l’appel. En attendant, Maison est déjà ouvert.</div>
      </div>${tabbar(1)}` };
  };

  // F — Choisir le profil
  S.F = () => {
    const kids = [['Léo', '11 ans · Hockey', 'var(--kid)', 'Séance 8 sur 13'], ['Inès', '14 ans · Natation', v2 ? '#A7C4BC' : '#46695F', 'Séance 3 sur 13']];
    if (v2) return { html: `<div class="scroll"><div style="padding-top:150px" class="center"><div class="t-title1">Qui regarde-t-on ?</div>
      <div class="flex" style="justify-content:center;gap:34px;margin-top:56px">${kids.map(([n, d, c], i) => `<div class="flex col items-c gap8">${avatar(116, n[0], c)}<div class="t-headline" style="margin-top:6px">${n}</div><div class="t-foot c2">${d}</div></div>`).join('')}</div>
      <div class="flex col items-c gap8" style="margin-top:46px"><span style="width:76px;height:76px;border-radius:38px;display:grid;place-items:center;border:2px dashed var(--label3);color:var(--label2)">${ic('plus', 30)}</span><div class="t-sub c2">Ajouter un enfant</div></div>
      </div></div>${navbar({ right: gbt('Modifier') })}` };
    if (v3) return { html: `<div class="scroll"><div style="padding-top:116px"><div class="largetitle">Ce soir, on suit…</div><div class="subtitle-nav">Tout l’espace suit le profil choisi.</div>
      <div class="sec flex col gap12" style="margin-top:22px">${kids.map(([n, d, c, p], i) => `<div class="card" style="padding:0;display:flex;min-height:132px"><div style="width:112px;background:${c};display:grid;place-items:center;color:#fff;font:800 54px/1 var(--sf-round)">${i ? 4 : 17}</div><div style="padding:18px 16px" class="f1"><div style="font:600 26px/30px Fraunces,Georgia,serif">${n}</div><div class="t-sub c2">${d}</div><div class="tag" style="margin-top:12px">${p}</div></div><span class="c3" style="align-self:center;padding-right:14px">${ic('chevR', 18, { sw: 2.4 })}</span></div>`).join('')}
      <div class="card flex items-c gap12" style="background:transparent;border:1.5px dashed var(--label4);box-shadow:none"><span class="ctint">${ic('plus', 24)}</span><span class="t-headline ctint">Ajouter un enfant</span></div></div></div></div>${navbar({ left: gb('x') })}` };
    return { html: `${navbar({ title: 'Profils', left: gbt('Annuler'), right: gbt('OK', { tinted: true }) })}<div class="scroll"><div style="padding-top:120px">
      <div class="sec-h small"><h4>Enfants suivis</h4></div>
      <div class="sec"><div class="list">${kids.map(([n, d, c, p], i) => `<div class="rowi ico-lg">${avatar(44, n[0], c)}<div class="main"><div class="t">${n}</div><div class="d">${d} · ${p}</div></div>${i === 0 ? `<span class="ctint">${ic('check', 20, { sw: 2.6 })}</span>` : ''}</div>`).join('')}</div>
      <div class="sec-f">Tout l’espace suit le profil choisi : passeport, séances, bilans et messages. Le choix est mémorisé.</div></div>
      <div class="sec" style="margin-top:22px"><div class="list">${rowi({ icon: 'plus', ibg: 'var(--sys-blue)', t: 'Ajouter un enfant', d: 'La fiche part en confirmation chez l’équipe' })}${rowi({ icon: 'people', ibg: 'var(--sys-indigo)', t: 'Inviter un co-parent', d: 'Il reçoit son propre accès par courriel' })}</div>
      <div class="sec-f">L’abonnement Maison est partagé avec ton co-parent : un seul paiement pour vous deux.</div></div>
      </div></div>` };
  };

  // G — Passeport (accueil)
  S.G = () => {
    const progress = DONE / 13;
    const gauge = `<div class="card" style="padding:16px"><div class="kick">${ic('sparkle', 15)}Compétences de vie</div><div class="flex items-c gap12" style="margin-top:8px"><div style="position:relative">${ring(.67, { size: 78, sw: 9 })}<div style="position:absolute;inset:0;display:grid;place-items:center" class="t-title3 num">67</div></div><div><div class="t-headline" style="color:var(--ok)">+11</div><div class="t-foot c2">depuis le départ</div></div></div></div>`;
    const epoch = `<div class="card" style="padding:16px"><div class="kick">${ic('wave', 15)}Bien-être</div><div class="flex items-c between" style="margin-top:6px"><span class="t-title2 num">4,1<span class="t-foot c2"> /5</span></span></div><div style="margin-top:4px">${spark(EPOCH, { w: 140, h: 40 })}</div></div>`;
    if (v2) {
      // Abonné Maison seul : l'onglet Bilan reste visible, avec cadenas (décision du 29 sept.)
      return { html: `<div class="scroll"><div style="padding-top:108px;filter:blur(7px);opacity:.5" aria-hidden="true">
        <div class="largetitle">Bilan</div>
        <div class="sec" style="margin-top:14px"><div class="card flex items-c gap12">${jersey(60)}<div class="f1"><div class="t-headline">Passeport d’athlète</div><div class="t-sub c2">Hockey · 11 ans</div></div></div></div>
        <div class="sec" style="margin-top:12px"><div class="grid2">${gauge}${epoch}</div></div>
        <div class="sec" style="margin-top:12px"><div class="card" style="height:150px"></div></div></div></div>
        ${navbar({ left: childPill(), right: gb('bell') })}
        ${programLock('Le Bilan s’ouvre avec un coach', `Ton coach y construit le passeport de ${K.prenom} : ses forces, ses objectifs, ses jauges, et un bilan après chaque séance.`)}${tabbar(1)}` };
    }
    if (v3) {
      return { html: `<div class="scroll"><div style="padding-top:108px">
        <div class="sec"><div style="border-radius:30px;background:var(--kid);color:#fff;padding:20px;position:relative;overflow:hidden;min-height:250px">
          <div style="position:absolute;right:-8px;bottom:-40px;font:800 210px/1 var(--sf-round);color:rgba(255,255,255,.16);letter-spacing:-10px">${K.num}</div>
          <div class="flex between items-c"><span style="font:600 12px/16px var(--sf);letter-spacing:1.2px;text-transform:uppercase;opacity:.9">Passeport d’athlète</span><img src="assets/logo.png" width="28" height="28" style="border-radius:7px" alt=""></div>
          <div class="flex items-c gap12" style="margin-top:18px">${avatar(64, 'L', 'rgba(255,255,255,.25)', '#fff')}<div><div style="font:600 32px/34px Fraunces,Georgia,serif">${K.prenom}</div><div style="font:500 15px/20px var(--sf);opacity:.92">« ${K.surnom} » · ${K.sport}, ${K.poste.toLowerCase()}</div></div></div>
          <div class="flex gap16" style="margin-top:22px;font:500 13px/17px var(--sf)">${[['Club', 'Les Faucons'], ['Coach', K.coachP], ['Force n° 1', K.force]].map(([a, b]) => `<div><div style="opacity:.8">${a}</div><div style="font-weight:700;font-size:15px">${b}</div></div>`).join('')}</div>
          <div style="margin-top:18px" class="flex items-c gap12"><div class="f1" style="height:6px;border-radius:3px;background:rgba(255,255,255,.3)"><div style="width:${progress * 100}%;height:100%;border-radius:3px;background:#fff"></div></div><span class="num" style="font:700 14px/1 var(--sf)">7/13</span></div>
        </div></div>
        <div class="sec-h"><h4>Ce qui grandit</h4><a>Tout voir</a></div>
        <div class="sec grid2">${gauge}${epoch}</div>
        <div class="sec" style="margin-top:12px"><div class="card"><div class="kick">${ic('target', 15)}Objectif de saison</div><div style="font:500 20px/26px Fraunces,Georgia,serif;margin-top:8px">« Revenir au calme en moins de 30 secondes après une erreur. »</div><div class="flex gap8" style="margin-top:12px"><span class="tag">Compétence de vie</span><span class="tag gray">Mot-focus : ${K.focus}</span></div></div></div>
        <div style="height:120px"></div></div></div>${navbar({ edge: true, title: 'Bilan', left: childPill(), right: gpair('pencil', 'bell') })}${tabbar(1)}` };
    }
    // v1 — Natif
    return { html: `<div class="scroll"><div style="padding-top:108px">
      <div class="flex items-c between" style="padding:0 16px 0 0"><div class="largetitle flex items-c gap8">${K.prenom}<span class="c3" style="margin-top:6px">${ic('chevD', 20, { sw: 2.6 })}</span></div></div>
      <div class="subtitle-nav">Passeport d’athlète · Séance 8 sur 13</div>
      <div class="sec" style="margin-top:14px"><div class="card"><div class="flex items-c gap12">${jersey(60)}<div class="f1"><div class="t-headline">${K.prenom} « ${K.surnom} » ${K.nom}</div><div class="t-sub c2">${K.sport} · ${K.poste} · ${K.age} ans</div><div class="t-sub c2">${K.club}</div></div></div>
        <div style="height:.5px;background:var(--sep);margin:14px 0"></div>
        <div class="flex between items-c"><span class="t-sub">Parcours</span><span class="t-sub c2 num">7 sur 13 séances</span></div>
        <div class="flex gap4" style="margin-top:8px">${Array.from({ length: 13 }, (_, i) => `<span style="flex:1;height:8px;border-radius:4px;background:${i < DONE ? 'var(--tint)' : i === DONE ? 'var(--accent)' : 'var(--fill)'}"></span>`).join('')}</div></div></div>
      <div class="sec" style="margin-top:12px"><div class="grid2">${gauge}${epoch}</div></div>
      <div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'target', ibg: 'var(--sys-orange)', t: 'Objectif SMART', d: '3 rondelles récupérées par match d’ici le 15 nov.' })}${rowi({ icon: 'toolbox', ibg: 'var(--sys-teal)', t: 'Boîte à outils', d: 'Respiration 4-4, ma phrase, le spaghetti cuit', val: '4' })}${rowi({ icon: 'check', ibg: 'var(--sys-green)', t: 'Prochaines étapes', d: '1 à faire · 1 en cours · 1 faite' })}${rowi({ icon: 'doc', ibg: 'var(--sys-indigo)', t: 'Documents', d: 'Contrat de confiance, lettre à moi-même', val: '2' })}</div></div>
      <div style="height:120px"></div></div></div>${navbar({ right: gpair('pencil', 'bell') + `<span style="margin-left:2px">${avatar(40, 'C', 'var(--fill)', 'var(--label)')}</span>` })}${tabbar(1)}` };
  };

  // H — Compétences de vie (détail)
  S.H = () => {
    const bars = SKILLS.map(([n, a, b]) => `<div class="rowi" style="min-height:58px"><div class="main"><div class="flex between"><span class="t-sub">${n}</span><span class="t-sub num"><b>${b}</b> <span style="color:var(--ok)">+${b - a}</span></span></div><div style="position:relative;height:8px;border-radius:4px;background:var(--fill);margin-top:7px"><span style="position:absolute;left:0;top:0;height:8px;width:${b}%;border-radius:4px;background:var(--tint)"></span><span style="position:absolute;top:-3px;left:calc(${a}% - 1px);width:2px;height:14px;border-radius:1px;background:var(--label2)"></span></div></div></div>`).join('');
    return { html: `<div class="scroll muted-preview" style="filter:none;opacity:1">${S.G().html}</div><div class="dim"></div>
      <div class="sheet" style="top:62px"><div class="grabber"></div><div class="sbar">${gb('x')}<span class="ttl">Compétences de vie</span>${gb('info')}</div>
        <div class="pad"><div class="seg"><span class="on">Global</span><span>Par compétence</span></div></div>
        <div class="flex items-c gap16" style="padding:18px 20px 0"><div class="t-title1 num" style="font-size:56px;line-height:60px">67</div><div><div class="t-headline" style="color:var(--ok)">+11 depuis le départ</div><div class="t-sub c2">LSSS · mi-parcours, séance 7</div></div></div>
        <div class="sec" style="margin-top:6px"><div class="card" style="padding:10px 12px 6px">${lsssCurve([56, 67, null])}</div></div>
        <div class="sec-h small"><h4>8 compétences · trait = départ</h4></div>
        <div class="sec"><div class="list">${bars}</div></div>
      </div>` };
  };

  // I — Comprendre l'outil (explication pédagogique)
  S.I = () => ({ html: `<div class="scroll">${S.H().html}</div><div class="dim" style="background:rgba(0,0,0,.18)"></div>
    <div class="sheet float glassy" style="padding:0 0 20px"><div class="grabber"></div><div class="sbar"><span style="width:44px"></span><span class="ttl">Comprendre l’outil</span>${gb('x')}</div>
      <div style="padding:0 22px" class="flex col gap16">
        <div class="flex items-c gap12"><span class="ibadge lg" style="background:var(--tint);color:var(--tint-ink)">${ic('sparkle', 24)}</span><div><div class="t-title3">L’échelle LSSS</div><div class="t-foot c2">Life Skills Scale for Sport · Cronin & Allen, 2017</div></div></div>
        ${[['Ce qu’elle mesure', '8 compétences de vie que le sport peut faire grandir — travail d’équipe, émotions, leadership… — à partir de 43 affirmations officielles.'], ['Pourquoi ça compte', 'Ce sont ces compétences, plus que le score du match, qui suivront Léo à l’école et ailleurs.'], ['Comment la lire', 'Léo répond 3 fois : au départ, à la séance 7 et à la séance 13. Regarde l’écart avec le départ, pas la note absolue.']].map(([t, d]) => `<div><div class="t-headline">${t}</div><div class="t-sub c2" style="margin-top:3px">${d}</div></div>`).join('')}
        <span class="btn gray" style="margin-top:2px">Voir les 43 affirmations</span>
      </div></div>` });

  // J — Personnaliser le passeport
  S.J = () => {
    const sw = [['Soleil', '#E8C700'], ['Ambre', '#E08A00'], ['Sauge', '#5E8C7E'], ['Ciel', '#32ADE6'], ['Corail', '#E8735A'], ['Violet', '#8E6CD8']];
    const cur = v3 ? 'Corail' : v2 ? 'Soleil' : 'Ciel';
    return { html: `<div class="scroll"><div style="padding-top:108px">
      <div class="flex col items-c" style="margin-top:8px"><div style="position:relative">${jersey(118)}<span class="glass" style="position:absolute;right:-4px;bottom:-2px;width:44px;height:44px;border-radius:22px;display:grid;place-items:center">${ic('camera', 21)}</span></div><div class="t-sub ctint" style="margin-top:12px">Choisir une photo</div></div>
      <div class="sec-h small"><h4>Identité</h4></div>
      <div class="sec"><div class="list"><div class="field"><label>Surnom</label><span class="in">${K.surnom}<span class="caret"></span></span></div><div class="field"><label>Numéro</label><span class="in num">${K.num}</span></div><div class="field"><label>Poste</label><span class="in">${K.poste}</span></div></div></div>
      <div class="sec-h small"><h4>Couleur du passeport</h4></div>
      <div class="sec"><div class="list" style="padding:16px 12px"><div class="flex between">${sw.map(([n, c]) => `<div class="flex col items-c gap4" style="width:52px"><span style="width:44px;height:44px;border-radius:22px;background:${c};${n === cur ? 'box-shadow:0 0 0 3px var(--bg2),0 0 0 5.5px ' + c : ''}"></span><span class="t-cap ${n === cur ? 'b' : 'c2'}">${n}</span></div>`).join('')}</div></div>
      <div class="sec-f">Léo verra sa couleur partout dans son passeport.</div></div>
      </div></div>${navbar({ title: 'Passeport', left: gbt('Annuler'), right: gb('check', { tinted: true, label: 'OK' }), edge: true })}` };
  };

  // K — Maison, page d'accueil, dans la présentation d'origine de l'app (« Soir de famille ») :
  // la lampe, l'affiche du soir dans son arche de lin, Lancer, les quatre portes,
  // la semaine en velours et ses trois étoiles, les rangées d'affiches, le carnet en papier.
  S.K = () => {
    const night = v2;
    const M = night
      ? { bg: '#022539', surface: '#00314c', text: '#F7F5F2', text2: 'rgba(247,245,242,.84)', text3: 'rgba(247,245,242,.68)', line: 'rgba(247,245,242,.10)', line2: 'rgba(247,245,242,.18)', chip: 'rgba(247,245,242,.07)', sage: '#A7C4BC', lamp: 'rgba(249,235,80,.17)', shadow: '0 18px 34px -20px rgba(0,0,0,.55)' }
      : { bg: '#F7F5F2', surface: '#FFFEFB', text: '#022539', text2: '#33454F', text3: '#56626B', line: 'rgba(0,49,76,.12)', line2: 'rgba(0,49,76,.20)', chip: 'rgba(0,49,76,.06)', sage: '#46695F', lamp: 'rgba(249,235,80,.34)', shadow: '0 16px 30px -18px rgba(0,49,76,.35)' };
    const H = v2 ? 3230 : 3120;
    const disp = 'Fraunces, Georgia, serif';
    const card = `background:${M.surface};border:1px solid ${M.line};border-radius:26px;box-shadow:${M.shadow}, inset 0 1px 0 rgba(255,255,255,.07)`;
    const launch = 'background:radial-gradient(120% 90% at 30% 10%, #FDF7A0 0%, #F9EB50 45%, #E9D93C 100%);color:#022539;box-shadow:0 14px 30px -10px rgba(249,235,80,.55), inset 0 1.5px 0 rgba(255,255,255,.8), inset 0 -3px 6px rgba(140,120,0,.28)';
    const pill = (t, on) => `<span style="flex:none;height:40px;padding:0 16px;border-radius:999px;display:inline-flex;align-items:center;font:600 14px/1 var(--sf);white-space:nowrap;${on ? `background:${M.text};color:${M.bg}` : `background:${M.chip};color:${M.text};border:1px solid ${M.line}`}">${t}</span>`;
    const poster = (id, done = false) => { const a = ACTS[id]; return `<div style="width:148px;flex:none"><div style="position:relative;width:148px;height:148px;border-radius:20px;overflow:hidden;background:#F3EFE6;box-shadow:${M.shadow}"><img src="${vsrc(id)}" alt="" style="width:100%;height:100%;object-fit:cover">${done ? `<span style="position:absolute;top:9px;right:9px;width:24px;height:24px;border-radius:12px;background:#A7C4BC;color:#022539;display:grid;place-items:center">${ic('check', 14, { sw: 3 })}</span>` : ''}</div><div style="margin-top:8px;font:600 15px/19px var(--sf);color:${M.text}">${a.t}</div><div style="margin-top:2px;font:400 13px/17px var(--sf);color:${M.text3}">${a.d.join(' · ')} min</div></div>`; };
    const rowHead = (t, more) => `<div class="flex between items-c" style="margin:0 20px"><div style="margin:0;font:600 21px/26px ${disp};color:${M.text}">${t}</div><span class="flex items-c gap4" style="font:600 14px/1 var(--sf);color:${M.sage}">${more}${ic('chevR', 14, { sw: 2.4 })}</span></div>`;
    const rail = (ids, doneIds = []) => `<div class="flex gap12" style="padding:0 20px;margin-top:14px;overflow:hidden">${ids.map((id) => poster(id, doneIds.includes(id))).join('')}</div>`;
    const doors = [['grid', 'Toutes les activités'], ['compass', 'Le programme'], ['book', 'Le carnet'], ['bubble', 'Quand il dit non']];
    const doorIcon = { grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>' };
    const dIc = (n) => (doorIcon[n] ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${doorIcon[n]}</svg>` : ic(n, 20));
    const star = (on) => on
      ? `<span style="width:64px;height:64px;border-radius:32px;display:grid;place-items:center;color:#022539;background:radial-gradient(circle at 34% 26%, #FFFBD0, #F9EB50 50%, #D8C72E);box-shadow:0 12px 26px -8px rgba(249,235,80,.6), inset 0 -5px 8px rgba(0,0,0,.12), inset 0 2px 3px rgba(255,255,255,.75)"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/></svg></span>`
      : `<span style="width:64px;height:64px;border-radius:32px;display:grid;place-items:center;color:rgba(247,245,242,.4);background:rgba(0,0,0,.14);box-shadow:inset 0 2px 5px rgba(0,0,0,.45), inset 0 -1px 0 rgba(255,255,255,.08)">${ic('star', 28, { sw: 1.6 })}</span>`;
    const papers = [['jeudi 8 octobre', 'Mes trois personnes', '« Maman, Coach Lylian, Noah. Noah, c’est pour quand j’ai peur au hockey. »'], ['dimanche 4 octobre', 'Le podium des progrès', '« Avant, je lâchais après une erreur. Là, je reviens au jeu. »'], ['mercredi 30 septembre', 'Spaghetti cru, spaghetti cuit', 'Son corps qui se pose : épaules basses, trois respirations.']];
    return { h: H, html: `<div class="scroll" style="background:${M.bg};color:${M.text}">
      <div style="position:relative">
        <section aria-label="Le moment recommandé ce soir" style="position:relative;height:676px;overflow:hidden">
          <img src="${vsrc('ACT-0802')}" alt="" style="position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(34px) saturate(1.15);opacity:${night ? '.55' : '.9'}">
          <img src="${vsrc('ACT-0802')}" alt="La cabane impossible" style="position:absolute;left:0;top:52px;width:402px;height:396px;object-fit:cover;object-position:50% 45%;-webkit-mask-image:linear-gradient(to bottom, #000 62%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,0) 0%, #000 12%, #000 88%, rgba(0,0,0,0) 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to bottom, #000 62%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,0) 0%, #000 12%, #000 88%, rgba(0,0,0,0) 100%);mask-composite:intersect">
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom, ${night ? 'rgba(2,37,57,.55)' : 'rgba(247,245,242,.35)'} 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 44%, ${M.bg} 72%, ${M.bg} 100%)"></div>
          <div class="flex" style="position:absolute;top:110px;left:0;right:0;justify-content:center">${v2 ? `<span class="glass flex items-c gap8" style="height:32px;padding:0 13px;border-radius:16px;background:rgba(2,37,57,.55);color:#F9EB50;border-color:rgba(255,255,255,.18);font:600 13px/1 var(--sf)">${ic('gift', 15)}Essai gratuit · encore 24 jours</span>` : `<span class="glass flex items-c gap4" style="height:30px;padding:0 12px;border-radius:15px;background:rgba(255,255,255,.66);color:#46695F;font:600 12px/1 var(--sf)">${ic('check', 12, { sw: 3 })}Inclus avec ton programme ${PROG}</span>`}</div>
          <div style="position:absolute;left:20px;right:20px;bottom:6px">
            <span class="glass flex items-c gap8" style="display:inline-flex;height:32px;padding:0 13px;border-radius:16px;background:${night ? 'rgba(247,245,242,.12)' : 'rgba(255,255,255,.7)'};border-color:${night ? 'rgba(255,255,255,.2)' : 'rgba(2,37,57,.10)'};color:${M.sage};font:700 12px/1 var(--sf);letter-spacing:.08em;text-transform:uppercase">${ic('sparkle', 14)}Recommandé pour ${K.prenom} ce soir</span>
            <div style="margin-top:12px;font:500 40px/42px ${disp};color:${M.text}">La cabane impossible</div>
            <p style="margin:10px 0 0;font:500 16px/22px var(--sf);color:${M.text2}">Le cœur de la semaine 8 : ${K.prenom} découvre qu’il réussit mieux en demandant.</p>
            <div class="flex gap8" style="margin-top:14px">${[['timer', '20 min'], ['figure', 'Actif'], ['gift', 'Coussins, couverture']].map(([i, t]) => `<span class="flex items-c gap4" style="height:30px;padding:0 11px;border-radius:15px;background:${M.chip};border:1px solid ${M.line};color:${M.text2};font:600 13px/1 var(--sf);white-space:nowrap">${ic(i, 14, { sw: 2.2 })}${t}</span>`).join('')}</div>
            <div class="flex items-c gap8" style="margin-top:18px">
              <span class="flex items-c" style="flex:1.4;height:56px;border-radius:28px;justify-content:center;gap:10px;font:700 17px/1 var(--sf);${launch}">${ic('play', 18)}Lancer · 20 min</span>
              <span class="glass flex items-c" style="flex:1;height:56px;border-radius:28px;justify-content:center;font:600 16px/1 var(--sf);background:${night ? 'rgba(247,245,242,.10)' : 'rgba(255,255,255,.7)'};border-color:${M.line2};color:${M.text}">Voir la fiche</span>
              <span class="glass" aria-label="Plus d’options" style="width:56px;height:56px;border-radius:28px;flex:none;display:grid;place-items:center;background:${night ? 'rgba(247,245,242,.10)' : 'rgba(255,255,255,.7)'};border-color:${M.line2};color:${M.text}">${ic('ellipsis', 22)}</span>
            </div>
          </div>
        </section>

        <div class="flex" style="justify-content:center;margin-top:22px"><span class="flex items-c gap8" style="height:44px;padding:0 18px;border-radius:22px;background:${M.chip};border:1px solid ${M.line2};font:600 15px/1 var(--sf);color:${M.text}">${ic('timer', 17)}20 min<span style="color:${M.text3}">·</span>${ic('house', 17)}À la maison${ic('chevD', 14, { sw: 2.4 })}</span></div>

        <nav style="margin:30px 20px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${doors.map(([i, t]) => `<div class="flex items-c gap12" style="min-height:76px;padding:12px 14px;${card};border-radius:22px"><span style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:rgba(167,196,188,.15);color:${M.sage}">${dIc(i)}</span><span style="font:600 15px/19px var(--sf);color:${M.text}">${t}</span></div>`).join('')}
          <div class="flex items-c gap12" style="grid-column:span 2;min-height:64px;padding:10px 14px;${card};border-radius:22px;opacity:.75"><span style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:rgba(167,196,188,.15);color:${M.sage}">${ic('playRect', 20)}</span><span class="f1" style="font:600 15px/19px var(--sf);color:${M.text}">Les séances vidéo de 20 min</span><span style="height:24px;padding:0 10px;border-radius:12px;display:inline-flex;align-items:center;font:600 12px/1 var(--sf);background:#FFE7B8;color:#5A3A00">Bientôt</span></div></nav>

        <section style="margin:30px 20px 0;padding:24px 20px;border-radius:26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;background:repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 2px, rgba(0,0,0,0) 2px 7px), #00314C;color:#F7F5F2;box-shadow:inset 0 1px 0 rgba(255,255,255,.1), inset 0 -10px 24px rgba(0,0,0,.25), 0 20px 36px -22px rgba(0,0,0,.7)">
          <p style="margin:0;font:500 30px/34px ${disp}">14 moments ensemble</p>
          <div class="flex gap16">${star(true)}${star(false)}${star(false)}</div>
          <p style="margin:0;font:600 14px/1 var(--sf);color:rgba(247,245,242,.84)">1 sur 3 cette semaine</p>
          <p style="margin:-6px 0 0;font:400 13.5px/1 var(--sf);color:rgba(247,245,242,.68)">3 semaines complètes d’affilée</p></section>

        <div style="margin-top:34px">${rowHead('Cette semaine', 'Le programme')}<p style="margin:6px 20px 0;font:400 14px/19px var(--sf);color:${M.text3}">Semaine 8 · Sur qui je compte. Les trois premières suffisent.</p>${rail(['ACT-0801', 'ACT-0802', 'ACT-0803', 'ACT-0804'], ['ACT-0801'])}</div>

        <div style="margin-top:34px">${rowHead('Selon ton moment', 'Tout voir')}
          <div class="flex gap8" style="padding:0 20px;margin-top:12px;overflow:hidden">${['Rien à préparer', 'Soir à plat', 'Il dit non', 'En voiture', 'Bouger', '30 minutes', 'Week-end'].map((t, i) => pill(t, i === 0)).join('')}</div>
          <p style="margin:10px 20px 0;font:400 14px/19px var(--sf);color:${M.text3}">Tu peux commencer dans la minute.</p>${rail(['ACT-0101', 'ACT-0403', 'ACT-0903', 'ACT-1103'], ['ACT-0101', 'ACT-0403'])}</div>

        <div style="margin-top:34px">${rowHead('Tout le parcours', 'Le programme')}
          <div class="flex gap8" style="padding:0 20px;margin-top:12px">${['Ancrer', 'Développer', 'Intégrer'].map((t, i) => pill(t, i === 1)).join('')}</div>
          <p style="margin:10px 20px 0;font:400 14px/19px var(--sf);color:${M.text3}">Semaines 3 à 10 : le cœur du travail.</p>${rail(['ACT-0301', 'ACT-0401', 'ACT-0501', 'ACT-0601'], ['ACT-0301', 'ACT-0401', 'ACT-0501', 'ACT-0601'])}</div>

        <div class="flex items-c" style="margin:30px 20px 0;height:56px;border-radius:28px;justify-content:center;gap:8px;border:1px solid ${M.line2};font:600 16px/1 var(--sf);color:${M.text}">${dIc('grid')}Voir les 53 activités, triées par âge</div>

        ${v2 ? `<div class="flex items-c gap12" style="margin:24px 20px 0;padding:14px;${card}">${vimg('BON-01', 56, { r: 16 })}<div class="f1"><div style="font:600 16px/20px var(--sf);color:${M.text}">Envie d’aller plus loin ?</div><div style="font:400 14px/19px var(--sf);color:${M.text3}">Un coach, en groupe ou seul, près de chez toi.</div></div><span style="color:${M.text3}">${ic('chevR', 16, { sw: 2.4 })}</span></div>` : ''}

        <section style="margin:34px 20px 0"><div style="margin:0 0 12px;font:600 21px/26px ${disp};color:${M.text}">Le carnet</div>
          <div class="flex col gap12">${papers.map(([d, t, p], i) => `<div style="border-radius:20px;padding:16px;background:${night ? '#F7F5F2' : '#FFFEFB'};color:#022539;transform:rotate(${[-0.6, 0.5, -0.3][i]}deg);background-image:repeating-linear-gradient(0deg, rgba(2,37,57,.04) 0 1px, rgba(0,0,0,0) 1px 4px);box-shadow:0 18px 34px -20px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.55)"><p style="margin:0;font:italic 400 13px/17px ${disp};color:#46695F">${d}</p><p style="margin:4px 0 0;font:700 15px/19px var(--sf)">${t}</p><p style="margin:6px 0 0;font:400 16px/22px ${disp}">${p}</p></div>`).join('')}</div>
          <span class="flex items-c gap4" style="margin-top:12px;font:600 15px/1 var(--sf);color:${M.sage}">Tout le carnet${ic('arrowR', 16)}</span></section>

        <footer style="margin:40px 20px 0;padding-top:20px;border-top:1px solid ${M.line};font:400 14px/1 var(--sf);color:${M.text3}">Les sources de la méthode</footer>
        <div style="height:140px"></div>
      </div></div>${navbar({ left: childPill(), right: gpair('bell', 'person') })}${tabbar(0)}` };
  };

  // K2 — Tout le parcours : les 13 semaines et toutes leurs activités (écran long, défilé)
  S.K2 = () => {
    const H = 5920;
    const ids = Object.keys(ACTS);
    const card = (id) => {
      const a = ACTS[id], w = a.w || 0, done = w && w < 8, cur = w === 8;
      return `<div style="display:flex;flex-direction:column;gap:6px;min-width:0">${vimg(id, 114, { r: 20, done: done && a.prog === 'coeur', dim: w > 8 })}<div class="t-foot b" style="line-height:16px">${a.t}</div><div class="t-cap c2">${a.d.join(' · ')} min${a.prog === 'complement' ? ' · bonus' : ''}</div></div>`;
    };
    let body = '';
    for (let w = 1; w <= 13; w++) {
      const list = ids.filter((id) => ACTS[id].w === w).sort((a, b) => ACTS[a].r - ACTS[b].r);
      const sess = SESS[w - 1];
      body += `<div class="sec-h" style="padding-top:26px"><h4 style="font-size:20px">Semaine ${w} · ${sess[2]}</h4>${w < 8 ? `<span class="tag ok">${ic('check', 12, { sw: 3 })}Faite</span>` : w === 8 ? '<span class="tag">En cours</span>' : `<span class="c3">${ic('lock', 16)}</span>`}</div>
        <div class="sec" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 12px">${list.map(card).join('')}</div>`;
    }
    body += `<div class="sec-h" style="padding-top:26px"><h4 style="font-size:20px">Bonus · en famille</h4></div><div class="sec" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${card('BON-01')}</div>`;
    return { h: H, html: `<div class="scroll"><div style="padding-top:108px">
      <div class="largetitle">Tout le parcours</div><div class="subtitle-nav">13 semaines · ${ids.length} activités. Les trois premières de chaque semaine suffisent ; les autres vont plus loin.</div>
      ${body}<div style="height:60px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('search'), edge: true })}` };
  };

  // L — Fiche moment
  S.L = () => ({ html: `<div class="scroll"><div style="padding-top:0">
    <div style="height:340px;background:#F1EEE8;position:relative;overflow:hidden;color:#fff">
      <img src="${vsrc('ACT-0802')}" alt="La cabane impossible" style="position:absolute;left:50%;top:44px;transform:translateX(-50%);width:300px;height:296px;object-fit:cover">
      <div style="position:absolute;inset:auto 0 0 0;height:150px;background:linear-gradient(to bottom, rgba(2,37,57,0), rgba(2,37,57,.88))"></div>
      <div style="position:absolute;left:20px;bottom:18px"><div style="font:600 12px/16px var(--sf);letter-spacing:1px;text-transform:uppercase;opacity:.85">Semaine 8 · Moment 2</div><div style="font:${v3 ? '600 30px/34px Fraunces,Georgia,serif' : '700 28px/34px var(--sf-display)'}">La cabane impossible</div></div></div>
    <div class="pad" style="margin-top:16px"><div class="t-callout c2">Objectif : votre enfant découvre par lui-même qu’il réussit mieux en demandant.</div></div>
    <div class="sec" style="margin-top:14px"><div class="seg"><span class="num">10 min</span><span class="on num">20 min</span><span class="num">30 min</span></div></div>
    <div class="sec" style="margin-top:14px"><div class="card"><div class="kick">${ic('quote', 15)}Ce que tu dis pour commencer</div><div class="t-title3" style="margin-top:8px;font-weight:500;${v3 ? 'font-family:Fraunces,Georgia,serif' : ''}">« Défi : une cabane avec les coussins et la couverture. Je suis là si t’as besoin. »</div><div class="flex gap8" style="margin-top:12px"><span class="btn sm gray">${ic('copy', 16)}Copier la phrase</span></div></div></div>
    <div class="sec-h small"><h4>Ce que tu vas faire</h4></div>
    <div class="sec"><div class="list">${['Il construit seul.', 'Vous êtes là. Vous ne faites rien.', 'Ça coince ? Attendez sa demande.', 'Il demande : aidez tout de suite.', '« T’as demandé. C’est ça qu’il fallait. »'].map((t, i) => `<div class="rowi ico"><span class="ibadge" style="background:var(--fill3);color:var(--label)"><b class="num" style="font-size:15px">${i + 1}</b></span><div class="main"><div class="t">${t}</div></div></div>`).join('')}</div></div>
    <div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'leaf', ibg: 'var(--sys-green)', t: 'Pourquoi ça marche', val: 'Niveau A' })}${rowi({ icon: 'hand', ibg: 'var(--sys-pink)', t: 'S’il dit non' })}</div></div>
    <div style="height:130px"></div></div></div>
    ${navbar({ left: gb('chevL'), right: gpair('star', 'ellipsis') })}
    <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px;display:flex;gap:6px"><span class="btn gray" style="width:auto;padding:0 18px;background:transparent">Pas ce soir</span><span class="btn prom f1">${ic('play', 18)}Commencer · 20 min</span></div>` });

  // M — Moment en cours (minuteur)
  S.M = () => {
    const dark = true;
    return { dark, html: `<div class="scroll" style="background:${v3 ? '#022539' : v1 ? '#0B2233' : '#000'};color:#fff">
      <div style="padding-top:108px" class="center"><span style="display:inline-block;margin-bottom:10px">${vimg('ACT-0802', 64, { r: 32 })}</span><div style="font:600 13px/18px var(--sf);letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.7)">Étape 2 sur 5</div><div class="t-title2" style="margin-top:8px;padding:0 32px">Vous êtes là.<br>Vous ne faites rien.</div></div>
      <div style="position:relative;width:270px;height:270px;margin:26px auto 0">${ring(.38, { size: 270, sw: 16, color: '#F9EB50', track: 'rgba(255,255,255,.12)' })}<div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center"><div class="num round" style="font:600 64px/1 var(--sf-round)">12:24</div><div class="t-sub" style="color:rgba(255,255,255,.65);margin-top:6px">sur 20 min</div></div></div>
      <div class="flex" style="justify-content:center;gap:8px;margin-top:30px">${[1, 2, 3, 4, 5].map((n) => `<span style="width:${n === 2 ? 26 : 8}px;height:8px;border-radius:4px;background:${n <= 2 ? '#F9EB50' : 'rgba(255,255,255,.25)'}"></span>`).join('')}</div>
      <div class="flex items-c" style="justify-content:center;gap:22px;position:absolute;left:0;right:0;bottom:120px">
        <span class="glass" style="width:64px;height:64px;border-radius:32px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('chevL', 26)}</span>
        <span class="glass tinted" style="width:86px;height:86px;border-radius:43px;display:grid;place-items:center;background:#F9EB50;color:#141414">${ic('pause', 34)}</span>
        <span class="glass" style="width:64px;height:64px;border-radius:32px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('chevR', 26)}</span></div>
      <div class="center" style="position:absolute;left:0;right:0;bottom:56px;color:rgba(255,255,255,.75)" class="t-sub">${ic('hand', 16, { style: 'display:inline;vertical-align:-3px' })} Il ne veut plus ? <u>On arrête là, c’est compté.</u></div>
      </div>${navbar({ left: `<span class="gbtn ic glass" style="color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('x', 21)}</span>`, title: '<span style="color:#fff">La cabane impossible</span>' })}` };
  };

  // N — Le carnet
  S.N = () => {
    const items = [['Ses trois forces', 'Les trois choses · « Il n’abandonne pas, il aide Noah, il rit fort »', 'ACT-0101'], ['Ce qui dépend de lui', 'Ce qui dépend de toi · 4 choses notées', 'ACT-0201'], ['Sa phrase', 'Deux outils, tu choisis · « Je reviens au jeu »', 'ACT-0501'], ['Ses trois personnes', 'Mes trois personnes · Maman, Coach Lylian, Noah', 'ACT-0801']];
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Le carnet</div><div class="subtitle-nav">Il se remplit tout seul, moment après moment.</div>
      <div class="sec-h"><h4>Gagné · à ouvrir</h4></div>
      <div class="sec"><div class="card flex items-c gap16" style="background:${v2 ? '#2A2614' : 'color-mix(in srgb, var(--accent) 28%, var(--bg2))'}"><span style="width:64px;height:64px;border-radius:20px;background:var(--accent);color:#141414;display:grid;place-items:center;flex:none">${ic('gift', 32)}</span><div class="f1"><div class="t-headline">La clé du vestiaire</div><div class="t-sub c2">Semaine 7 complète. À ouvrir avec Léo.</div></div><span class="btn sm prom">Ouvrir</span></div></div>
      <div class="sec-h"><h4>Ce qu’on garde</h4></div>
      <div class="sec"><div class="list">${items.map(([t, d, id]) => `<div class="rowi ico-lg">${vimg(id, 48, { r: 14 })}<div class="main"><div class="t">${t}</div><div class="d">${d}</div></div><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div>`).join('')}</div></div>
      <div class="sec-h"><h4>Objets</h4><a class="num">3 sur 13</a></div>
      <div class="sec"><div class="grid2" style="grid-template-columns:repeat(4,1fr);gap:10px">${Array.from({ length: 8 }, (_, i) => `<div style="aspect-ratio:1;border-radius:20px;display:grid;place-items:center;background:${i < 3 ? 'var(--tint-soft)' : 'var(--fill4)'};color:${i < 3 ? 'var(--tint-text)' : 'var(--label4)'}">${ic(['medal', 'star', 'key', 'lock', 'lock', 'lock', 'lock', 'lock'][i], 28)}</div>`).join('')}</div></div>
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('share') })}` };
  };

  // O — Séances vidéo · bibliothèque
  S.O = () => {
    const tile = (n, t, w = 150, done = false, cur = false) => `<div style="width:${w}px;flex:none"><div style="height:${Math.round(w * .62)}px;border-radius:18px;position:relative;overflow:hidden;background:#F1EEE8;${cur ? 'box-shadow:inset 0 0 0 3px var(--accent)' : ''}"><img src="${vsrc('ACT-' + String(n).padStart(2, '0') + '01')}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%"><span class="num round" style="position:absolute;right:8px;top:6px;font:800 15px/1 var(--sf-round);color:#022539;background:rgba(255,255,255,.8);padding:4px 7px;border-radius:9px">${String(n).padStart(2, '0')}</span>${done ? `<span style="position:absolute;left:8px;top:8px;width:24px;height:24px;border-radius:12px;background:var(--sys-green);color:#fff;display:grid;place-items:center">${ic('check', 14, { sw: 3 })}</span>` : ''}<span class="tag gray" style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.45);color:#fff">20 min</span></div><div class="t-sub b" style="margin-top:6px">${n}. ${t}</div></div>`;
    const hero = `<div class="sec"><div style="border-radius:30px;height:${v2 ? 300 : 240}px;position:relative;overflow:hidden;background:${v2 ? 'linear-gradient(160deg,#2C2C2E,#0A0A0A)' : v3 ? '#004E7A' : 'linear-gradient(150deg,#004E7A,#0B6E99)'};color:#fff;padding:20px">
      <span style="position:absolute;right:14px;top:${v2 ? 96 : 70}px">${vimg('ACT-0801', 128, { r: 28 })}</span>
      <div style="font:600 12px/16px var(--sf);letter-spacing:1px;text-transform:uppercase;color:#F9EB50">Prochaine séance · ${K.tranche}</div>
      <div style="font:${v3 ? '600 28px/32px Fraunces,Georgia,serif' : '700 28px/34px var(--sf-display)'};margin-top:8px">Sur qui je compte</div>
      <div style="font:400 15px/20px var(--sf);opacity:.85;margin-top:6px">Connexion · 20 min<br>3 moments interactifs</div>
      <span class="btn md" style="position:absolute;left:20px;bottom:20px;background:#F9EB50;color:#141414">${ic('play', 18)}Lancer la séance</span></div></div>`;
    const seg = v1 ? `<div class="sec" style="margin-bottom:14px"><div class="seg"><span>Avec le coach</span><span class="on">Vidéo 20 min</span></div></div>` : '';
    const soonTile = (n, t) => `<div style="width:150px;flex:none;opacity:.6"><div style="height:93px;border-radius:18px;position:relative;overflow:hidden;background:#F1EEE8"><img src="${vsrc('ACT-' + String(n).padStart(2, '0') + '01')}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%;filter:grayscale(.6)"><span class="tag gray" style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.55);color:#fff">${ic('lock', 11, { sw: 2.4 })}Bientôt</span></div><div class="t-sub b" style="margin-top:6px">${n}. ${t}</div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">${v2 ? 'Parcours' : 'Séances'}</div><div style="height:12px"></div>${v2 ? `<div class="sec" style="margin-bottom:14px"><div class="seg"><span>Mes séances</span><span class="on">Vidéo · bientôt</span></div></div>` : v1 ? `<div class="sec" style="margin-bottom:14px"><div class="seg"><span>Avec le coach</span><span class="on">Vidéo · bientôt</span></div></div>` : ''}
      <div class="sec"><div class="card center" style="padding:26px 20px 20px">
        <div class="flex" style="justify-content:center">${mascotHero(168, { id: 'ACT-1001', glow: v2 ? 'rgba(249,235,80,.22)' : 'rgba(0,78,122,.14)', pos: '50% 45%' })}</div>
        <span class="tag" style="margin-top:16px;background:#FFE7B8;color:#5A3A00">${ic('timer', 12, { sw: 2.4 })}En construction</span>
        <div class="t-title2" style="margin-top:10px">Les séances vidéo arrivent bientôt</div>
        <div class="t-sub c2" style="margin-top:6px">On prépare les 13 séances de 20 minutes à vivre avec ${K.prenom}. En attendant, les moments Maison sont là pour ce soir.</div>
        <div class="list" style="margin-top:16px;text-align:left;background:var(--bg3)"><div class="rowi"><div class="main"><div class="t">Me prévenir à l’ouverture</div></div><span class="tgl on"></span></div></div>
        <span class="btn gray" style="margin-top:12px">${ic('house', 18)}Voir les moments de ce soir</span>
      </div></div>
      <div class="sec-h"><h4>Ce qui viendra</h4><a class="num">13 séances</a></div>
      <div class="flex gap12" style="padding:0 16px;overflow:hidden">${soonTile(1, 'Reconnaître ses forces')}${soonTile(2, 'Objectif d’effort')}${soonTile(3, 'Les preuves')}</div>
      <div style="height:130px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('ellipsis') })}` };
  };

  // P — Prêt avec Léo ?
  S.P = () => ({ dark: true, html: `<div class="scroll" style="background:${v3 ? '#022539' : '#000'};color:#fff">
    <div style="position:absolute;inset:0 0 auto 0;height:430px;background:${v2 ? 'radial-gradient(120% 90% at 50% 0%, rgba(249,235,80,.28), transparent 70%)' : 'radial-gradient(120% 90% at 50% 0%, rgba(50,173,230,.42), transparent 70%)'}"></div>
    <div class="center" style="position:relative;padding-top:120px"><div class="flex items-c" style="justify-content:center">${vimg('ACT-0801', 132, { r: 34 })}</div><div class="flex" style="justify-content:center;margin-top:-22px;position:relative">${avatar(44, 'L', 'var(--kid)')}<span style="margin-left:-10px">${avatar(44, 'C', '#3A3A3C', '#fff')}</span></div>
      <div style="font:${v3 ? '600 36px/40px Fraunces,Georgia,serif' : '700 34px/41px var(--sf-display)'};margin-top:26px">Prêt avec ${K.prenom} ?</div>
      <div class="t-body" style="color:rgba(255,255,255,.72);margin:10px 36px 0">Cette séance se vit à deux. La vidéo s’arrêtera 3 fois pour poser une question à ${K.prenom}.</div></div>
    <div style="position:relative;margin:30px 16px 0;border-radius:26px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.18);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)"><div>${[['Thème', 'Connexion'], ['Compétence', 'Demander de l’aide'], ['Durée', '20 min']].map(([a, b], i) => `<div class="flex between" style="padding:14px 18px;${i ? 'border-top:.5px solid rgba(255,255,255,.14)' : ''}"><span style="color:rgba(255,255,255,.66)">${a}</span><span class="b">${b}</span></div>`).join('')}</div></div>
    <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn" style="background:#F9EB50;color:#141414">${ic('play', 18)}On y va</span><span class="btn" style="color:#fff">Plus tard</span></div>
    </div>${navbar({ left: `<span class="gbtn ic glass" style="color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('x', 21)}</span>` })}${soonPill()}` });

  // Q — Question en pause (vidéo interactive)
  S.Q = () => ({ dark: true, html: `<div class="scroll" style="background:#000;color:#fff">
    <img src="${vsrc('ACT-0801')}" alt="" style="position:absolute;left:0;top:0;width:402px;height:560px;object-fit:cover;object-position:50% 35%">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.45) 40%,#000 78%)"></div>
    <div style="position:absolute;left:16px;right:16px;top:300px;border-radius:34px;padding:22px 18px" class="glass strong">
      <div class="flex items-c gap8"><span style="width:40px;height:40px;border-radius:20px;overflow:hidden;flex:none;background:#F1EEE8"><img src="${vsrc('ACT-0603')}" alt="" style="width:40px;height:40px;object-fit:cover;object-position:50% 25%"></span><div style="font:600 12px/16px var(--sf);letter-spacing:1px;text-transform:uppercase;color:var(--tint-text)">Question pour ${K.prenom} · 2 sur 3</div></div>
      <div class="t-title3" style="margin-top:8px;color:var(--label)">Ton bâton casse en plein match. Tu vas voir qui en premier ?</div>
      <div class="flex col gap8" style="margin-top:16px">${['Personne, je me débrouille', 'Mon coach, sur le banc', 'Un coéquipier à côté de moi', 'Je ne sais pas encore'].map((t, i) => `<span class="btn" style="justify-content:flex-start;padding:0 18px;background:${i === 1 ? 'var(--tint)' : 'var(--fill3)'};color:${i === 1 ? 'var(--tint-ink)' : 'var(--label)'};font-weight:${i === 1 ? 600 : 500}">${i === 1 ? ic('check', 18, { sw: 2.6 }) : ''}${t}</span>`).join('')}</div>
    </div>
    <div style="position:absolute;left:16px;right:16px;bottom:44px"><div style="position:relative;height:5px;border-radius:3px;background:rgba(255,255,255,.25)"><span style="position:absolute;left:0;top:0;height:5px;width:46%;border-radius:3px;background:#fff"></span>${[22, 46, 78].map((p) => `<span style="position:absolute;top:-3.5px;left:${p}%;width:12px;height:12px;border-radius:6px;background:#F9EB50;border:2px solid #000;transform:translateX(-50%)"></span>`).join('')}</div>
      <div class="flex between t-foot num" style="margin-top:6px;color:rgba(255,255,255,.7)"><span>9:12</span><span>La vidéo reprend après la réponse</span><span>20:00</span></div></div>
    </div>${navbar({ left: `<span class="gbtn ic glass" style="color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('x', 21)}</span>`, right: `<span class="gbtn glass" style="color:#fff;background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.12)">${ic('pause', 16)}En pause</span>` })}${soonPill(true, 116)}` });

  // R — Après la séance (RPE + transfert)
  S.R = () => ({ html: `<div class="scroll"><div style="padding-top:120px" class="center">
    <div class="flex" style="justify-content:center">${mascotHero(120, { id: 'ACT-1303', glow: 'rgba(249,235,80,.35)', pos: '50% 40%' })}</div>
    <div class="t-title1" style="margin-top:18px;${v3 ? 'font-family:Fraunces,Georgia,serif;font-weight:600' : ''}">Séance 8, c’est fait</div><div class="t-body c2" style="margin-top:6px">20 minutes à deux. Bravo à vous deux.</div></div>
    <div class="sec" style="margin-top:26px"><div class="card"><div class="t-headline">C’était difficile aujourd’hui ?</div><div class="t-sub c2">Demande à ${K.prenom}. De 0 (facile) à 10 (très dur).</div>
      <div class="flex items-c gap12" style="margin-top:16px"><span class="t-foot c2 num">0</span><div class="slider f1"><div class="trk"></div><div class="fil" style="width:60%"></div><div class="thumb glass" style="left:60%"></div></div><span class="t-foot c2 num">10</span></div>
      <div class="center t-title2 num" style="margin-top:4px">6</div></div></div>
    <div class="sec" style="margin-top:12px"><div class="card flex gap12" style="background:var(--tint);color:var(--tint-ink)">${vimg('ACT-0803', 72, { r: 18 })}<div class="f1"><div class="kick" style="color:inherit;opacity:.85">${ic('house', 15)}À la maison cette semaine</div><div class="t-headline" style="margin-top:4px">La demande de la semaine</div><div class="t-sub" style="opacity:.86;margin-top:2px">Une fois d’ici dimanche, ${K.prenom} demande de l’aide à quelqu’un.</div></div></div></div>
    <div style="position:absolute;left:16px;right:16px;bottom:34px" class="flex col gap8"><span class="btn prom">Terminer</span></div>
    </div>${soonPill(!v1 && !v3)}` });

  // S — Mes séances (13)
  S.S = () => {
    if (v2) return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Mes séances</div>
      <div style="filter:blur(6px);opacity:.45" aria-hidden="true"><div class="sec" style="margin-top:14px"><div class="list">${SESS.slice(0, 8).map(([n, , t]) => `<div class="rowi ico-lg" style="--sep-inset:76px">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 48, { r: 14, dim: true })}<div class="main"><div class="t">${n}. ${t}</div><div class="d">60 à 70 min avec ton coach</div></div></div>`).join('')}</div></div></div></div></div>
      ${navbar({ right: gb('calendar') })}
      ${programLock('13 séances avec un coach', 'Une séance par semaine, 60 à 70 minutes, seul avec un coach ou en petit groupe. Elles s’afficheront ici, avec leur bilan.')}${tabbar(2)}` };
    const phase = (name, sub, from, to) => `<div class="sec-h small"><h4>${name} · ${sub}</h4></div><div class="sec"><div class="list">${SESS.slice(from - 1, to).map(([n, , t]) => {
      const done = n <= DONE, next = n === NEXT;
      return `<div class="rowi ico-lg" style="--sep-inset:76px;${!done && !next ? 'opacity:.7' : ''}">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 48, { r: 14, done, dim: !done && !next })}<div class="main"><div class="t">${n}. ${t}</div><div class="d">${done ? `Validée par le coach · ${DATES[n - 1]}` : next ? 'Jeudi 15 oct. · 17 h 30' : 'À venir'}</div></div>${done || next ? `<span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span>` : `<span class="c3">${ic('lock', 16)}</span>`}</div>`;
    }).join('')}</div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">${v2 ? 'Parcours' : v3 ? 'Avec le coach' : 'Séances'}</div><div style="height:12px"></div>
      ${v3 ? '' : `<div class="sec" style="margin-bottom:6px"><div class="seg"><span class="on">${v2 ? 'Mes séances' : 'Avec le coach'}</span><span>Vidéo · bientôt</span></div></div>`}
      <div class="sec" style="margin-top:8px"><div class="card flex items-c gap16"><div style="position:relative">${ring(DONE / 13, { size: 64, sw: 8 })}<div style="position:absolute;inset:0;display:grid;place-items:center" class="t-headline num">7</div></div><div class="f1"><div class="t-headline">7 séances sur 13</div><div class="t-sub c2">Prochaine : jeudi avec ${K.coach}</div></div></div></div>
      ${phase('Phase 1', 'Ancrer', 1, 2)}${phase('Phase 2', 'Développer', 3, 10)}
      <div style="height:120px"></div></div></div>${navbar({ right: gb('calendar') })}${tabbar(2)}` };
  };

  // T — Bilan du coach
  S.T = () => {
    const locked = false; // anciens niveaux de bilan retirés de la vente : un client programme voit tout
    const n = locked ? 6 : 7, title = SESS[n - 1][2];
    const obs = [['Nomme ses progrès', 4.5], ['Se compare à lui-même', 4], ['Accepte le compliment', 3], ['Fixe un prochain pas', 4]];
    const ob = obs.map(([t, v]) => `<div class="flex col items-c gap4" style="width:76px"><div style="position:relative">${ring(locked ? 0 : v / 5, { size: 58, sw: 7, color: v >= 4 ? 'var(--sys-green)' : 'var(--sys-orange)' })}<div style="position:absolute;inset:0;display:grid;place-items:center" class="t-sub b num">${locked ? '–' : String(v).replace('.', ',')}</div></div><div class="t-cap center c2" style="line-height:14px">${t}</div></div>`).join('');
    const detail = `<div class="t-sub"><b>Travaillé.</b> Comparer ses performances à celles d’il y a six semaines, pas à celles des autres.</div><div class="t-sub" style="margin-top:8px"><b>Observé.</b> Léo a nommé trois progrès sans aide, dont un en dehors du hockey.</div><div class="t-sub" style="margin-top:8px"><b>Ensuite.</b> Séance 8 : construire sa carte des personnes ressources.</div>`;
    return { html: `<div class="scroll"><div style="padding-top:116px">
      <div class="pad"><div class="flex gap8 items-c"><span class="tag ok">${ic('check', 12, { sw: 3 })}Validée par le coach</span><span class="t-foot c2">${DATES[n - 1]}</span></div><div class="flex items-c gap12" style="margin-top:10px">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 64, { r: 18 })}<div class="f1"><div class="t-title1" style="${v3 ? 'font-family:Fraunces,Georgia,serif;font-weight:600' : ''}">${title}</div><div class="t-sub c2">Séance ${n} · ${SESS[n - 1][3]}</div></div></div></div>
      <div class="sec-h small"><h4>1 · Le message du coach</h4></div>
      <div class="sec"><div class="card"><div class="flex items-c gap8">${avatar(32, 'L', 'var(--sys-indigo)', '#fff')}<span class="t-headline">${K.coach}</span></div><div class="t-body" style="margin-top:10px">${locked ? 'Léo a trouvé seul sa façon de se poser avant le match : trois respirations, épaules basses. Demandez-lui de vous la montrer.' : 'Léo a été fier de lui aujourd’hui — et il a su dire pourquoi. Ce soir, demandez-lui son progrès préféré.'}</div></div></div>
      <div class="sec-h small"><h4>2 · Le bilan détaillé</h4></div>
      <div class="sec"><div class="card" style="min-height:130px">${locked ? `<div style="filter:blur(5px);opacity:.6" aria-hidden="true"><div class="t-sub">Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.</div><div class="t-sub" style="margin-top:8px">Ut enim ad minim veniam, quis nostrud exercitation.</div><div class="t-sub" style="margin-top:8px">Duis aute irure dolor in reprehenderit.</div></div><div class="lock-ov"><div class="center"><span class="ctint">${ic('lock', 26, { style: 'margin:0 auto' })}</span><div class="t-headline" style="margin-top:6px">Inclus dans Performance</div><div class="t-foot c2">Ton forfait Avancé l’ouvre aux séances 3, 7 et 13.</div></div></div>` : detail}</div></div>
      <div class="sec-h small"><h4>3 · Observations du coach · sur 5</h4></div>
      <div class="sec"><div class="card flex between">${ob}</div>${locked ? '<div class="sec-f">Les libellés sont visibles ; les notes ne sont pas transmises à ton appareil.</div>' : ''}</div>
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('share'), edge: true, title: 'Bilan' })}` };
  };

  // U — Messages avec le coach
  S.U = () => {
    const paywall = v2; // Forfait Avancé : aperçu factice + invitation
    const msgs = [['in', 'Bonjour Camille ! Séance 7 validée. Léo a été super aujourd’hui.', '17:52'], ['out', 'Merci ! Il en parle depuis le souper.', '18:20'], ['in', 'Pour jeudi, il peut apporter son bâton cassé ? On s’en sert dans un exercice.', '18:24'], ['out', 'Parfait, c’est noté.', '18:31']];
    return { html: `<div class="scroll"><div style="padding:118px 16px 0" class="flex col gap8 ${paywall ? '' : ''}">
      <div class="center t-foot c2" style="margin:4px 0 6px">Jeudi 8 oct.</div>
      ${msgs.map(([d, t, h]) => `<div class="bub ${d}"${paywall ? ' style="filter:blur(4px)"' : ''}>${paywall ? 'Message d’exemple' : t}</div>`).join('')}
      <div class="t-cap c2" style="align-self:flex-end;margin-top:-2px">${paywall ? '' : 'Lu'}</div></div></div>
      ${paywall ? `<div class="sheet float glassy" style="bottom:110px;padding:20px"><div class="flex items-c gap12"><span class="ibadge lg" style="background:var(--tint);color:var(--tint-ink)">${ic('bubble', 24)}</span><div><div class="t-title3">Écrire à un coach</div><div class="t-sub c2">La messagerie est incluse dans les programmes Groupe, Individuel et Complet.</div></div></div><div class="t-foot c2" style="margin-top:12px">Ceci est un aperçu : aucun message réel n’est affiché.</div><div class="flex gap8" style="margin-top:14px"><span class="btn md gray f1">Voir les offres</span><span class="btn md prom f1">Appel de 15 min</span></div></div>` : ''}
      <div style="position:absolute;left:16px;right:16px;bottom:${v1 ? 100 : 34}px;display:flex;gap:8px;align-items:center${paywall ? ';opacity:.4' : ''}"><span class="gbtn ic glass">${ic('plus', 22)}</span><span class="glass f1" style="height:44px;border-radius:22px;display:flex;align-items:center;padding:0 6px 0 16px;justify-content:space-between"><span class="c3">Message</span><span style="width:34px;height:34px;border-radius:17px;background:var(--tint);color:var(--tint-ink);display:grid;place-items:center">${ic('arrowUp', 18, { sw: 2.6 })}</span></span></div>
      ${navbar({ edge: true, left: v1 ? '' : gb('chevL'), title: `<span class="flex items-c gap8">${avatar(28, 'L', 'var(--sys-indigo)', '#fff')}${K.coach}</span>`, right: gb('info') })}${v1 ? tabbar(-1, true) : ''}` };
  };

  // V — Notifications
  S.V = () => {
    const n = [['Aujourd’hui', [['bubble', 'var(--sys-indigo)', 'Nouveau message de Lylian', 'Pour jeudi, il peut apporter son bâton cassé ?', '18 h 24', 1], ['doc', 'var(--sys-green)', 'Bilan de la séance 7', 'Se mesurer à soi · validée par le coach', '17 h 52', 1]]], ['Cette semaine', [['wave', 'var(--sys-orange)', 'Questionnaire à faire remplir', 'Prise de pouls de Léo · 3 min', 'mer.', 0], ['doc', 'var(--sys-teal)', 'Nouveau document', 'Lettre à moi-même · disponible', 'lun.', 0], ['gift', 'var(--sys-pink)', 'Semaine 7 complète', 'Un objet attend dans le carnet', 'dim.', 0]]]];
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Notifications</div>
      ${n.map(([h, items]) => `<div class="sec-h small"><h4>${h}</h4></div><div class="sec"><div class="list">${items.map(([i, c, t, d, w, un]) => `<div class="rowi ico-lg">${un ? `<span style="position:absolute;left:6px;width:8px;height:8px;border-radius:4px;background:var(--sys-blue)"></span>` : ''}<span class="ibadge lg" style="background:${c}">${ic(i, 22)}</span><div class="main"><div class="flex between"><span class="t ${un ? 'b' : ''}">${t}</span><span class="t-foot c2">${w}</span></div><div class="d">${d}</div></div></div>`).join('')}</div></div>`).join('')}
      <div class="sec" style="margin-top:22px"><div class="list"><div class="rowi"><div class="main"><div class="t">Notifications push</div><div class="d">Sur cet iPhone</div></div><span class="tgl on"></span></div></div></div>
      </div></div>${navbar({ left: gb('chevL'), right: gbt('Tout lire') })}` };
  };

  // W — Questionnaire de l'enfant (lien unique, sans compte)
  S.W = () => {
    const scale = ['Presque jamais', 'Rarement', 'Parfois', 'Souvent', 'Presque toujours'];
    const bg = v2 ? '#2A1A05' : '#FFF4E2', ink = v2 ? '#FFE3B3' : '#4A2A00', acc = v2 ? '#FFB340' : '#C46A00';
    return { html: `<div class="scroll" style="background:${bg};color:${ink}"><div style="padding-top:62px">
      <div class="flex between items-c" style="padding:8px 16px"><img src="assets/logo.png" width="34" height="34" style="border-radius:9px" alt="THRIVE"><span class="seg" style="width:104px;height:32px;background:rgba(0,0,0,.07)"><span class="on" style="font-size:13px;background:${v2 ? '#5a4220' : '#fff'};color:${ink}">FR</span><span style="font-size:13px;color:${ink}">EN</span></span></div>
      <div class="pad" style="margin-top:14px"><div style="font:${v3 ? '600 34px/38px Fraunces,Georgia,serif' : '800 34px/40px var(--sf-round)'}">Salut ${K.prenom} !</div><div class="t-callout" style="margin-top:6px;opacity:.82">Il n’y a pas de bonne ou de mauvaise réponse. Réponds comme tu te sens ces jours-ci.</div></div>
      <div class="pad" style="margin-top:18px"><div class="flex between t-foot num" style="font-weight:600"><span>Prise de pouls</span><span>7 sur 20</span></div><div style="height:8px;border-radius:4px;background:rgba(0,0,0,.08);margin-top:6px"><div style="width:35%;height:100%;border-radius:4px;background:${acc}"></div></div></div>
      <div style="margin:18px 16px 0;border-radius:30px;padding:20px;background:${v2 ? 'rgba(255,255,255,.06)' : '#fff'}"><div class="t-foot" style="font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${acc}">Engagement</div><div class="t-title3" style="margin-top:6px">Quand je fais une activité, j’y prends tellement de plaisir que je perds la notion du temps.</div>
        <div class="flex col gap8" style="margin-top:16px">${scale.map((s, i) => `<span class="btn" style="height:54px;justify-content:space-between;padding:0 18px;background:${i === 3 ? acc : v2 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)'};color:${i === 3 ? '#fff' : ink}"><span>${s}</span><span class="round num" style="font-weight:800">${i + 1}</span></span>`).join('')}</div></div>
      <div class="center t-foot" style="margin-top:14px;opacity:.75">${ic('eye', 14, { style: 'display:inline;vertical-align:-2px' })} Tes réponses sont partagées avec ton coach.</div>
      </div></div>` };
  };

  // Sélecteur de style de l'app (Natif · Nuit calme · Carnet de saison), réglable dans Compte & famille
  const styleTile = (key, name, d, on) => {
    const m = {
      v1: { bg: '#FFFFFF', ink: '#000', sub: 'rgba(60,60,67,.35)', card: '#F2F2F7', acc: '#1A7FBF', head: '#FFFFFF', font: '700 15px/1 var(--sf)' },
      v2: { bg: '#000000', ink: '#fff', sub: 'rgba(235,235,245,.3)', card: '#1C1C1E', acc: '#F9EB50', head: '#000000', font: '700 15px/1 var(--sf)' },
      v3: { bg: '#F7F5F2', ink: '#022539', sub: 'rgba(2,37,57,.25)', card: '#FFFFFF', acc: '#F9EB50', head: '#004E7A', font: '600 16px/1 Fraunces,Georgia,serif' },
    }[key];
    const phone = `<div style="position:relative;width:100%;aspect-ratio:9/15;border-radius:18px;overflow:hidden;background:${m.bg};box-shadow:0 0 0 ${on ? '2.5px var(--tint)' : '.5px var(--sep)'}${on ? ', 0 8px 22px rgba(0,0,0,.14)' : ''}">
      <div style="height:42%;background:${m.head};${key === 'v3' ? 'border-radius:0 0 16px 16px;' : ''}position:relative">
        <div style="position:absolute;left:10px;bottom:10px;font:${m.font};color:${key === 'v3' ? '#F7F5F2' : m.ink}">Aa</div>
        <div style="position:absolute;right:10px;bottom:10px;width:22px;height:22px;border-radius:11px;background:${m.acc}"></div></div>
      <div style="padding:8px 9px;display:flex;flex-direction:column;gap:5px"><i style="display:block;height:5px;width:70%;border-radius:3px;background:${m.sub}"></i><i style="display:block;height:5px;width:46%;border-radius:3px;background:${m.sub}"></i>
        <div style="margin-top:3px;height:26px;border-radius:9px;background:${m.card};${key === 'v1' ? '' : 'box-shadow:0 0 0 .5px rgba(127,127,127,.18)'}"></div></div>
      <div style="position:absolute;left:12px;right:12px;bottom:7px;height:11px;border-radius:6px;background:${key === 'v2' ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)'}"></div>
    </div>`;
    return `<div class="flex col items-c" style="gap:8px;min-width:0">${phone}<div class="center"><div class="t-sub" style="font-weight:600">${name}</div><div class="t-foot c2">${d}</div></div><span style="width:24px;height:24px;border-radius:12px;display:grid;place-items:center;${on ? 'background:var(--tint);color:var(--tint-ink)' : 'box-shadow:inset 0 0 0 1.5px var(--label4)'}">${on ? ic('check', 14, { sw: 3 }) : ''}</span></div>`;
  };
  const stylePicker = () => `<div class="sec-h small"><h4>Style de l’app</h4></div>
    <div class="sec"><div class="card" style="padding:16px 14px 14px"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
      ${styleTile('v1', 'Natif', 'Clair, iOS', v1)}${styleTile('v2', 'Nuit calme', 'Sombre', v2)}${styleTile('v3', 'Carnet', 'Crème, éditorial', v3)}</div></div>
    <div class="sec-f">Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.</div></div>`;

  // X — Compte & famille
  S.X = () => ({ html: `<div class="scroll"><div style="padding-top:108px">
    <div class="flex col items-c" style="margin-top:4px">${avatar(84, 'C', v2 ? '#3A3A3C' : 'var(--fill)', v2 ? '#fff' : 'var(--label)')}<div class="t-title2" style="margin-top:10px">${PARENT.prenom} ${PARENT.nom}</div><div class="t-sub c2">${PARENT.email}</div></div>
    <div class="sec" style="margin-top:18px"><div class="list">${rowi({ icon: 'star', ibg: 'var(--sys-orange)', t: 'Mon programme', val: PROG || 'Aucun' })}${rowi({ icon: 'house', ibg: 'var(--sys-green)', t: 'Abonnement Maison', val: v2 ? 'Essai · 24 j' : 'Inclus' })}${rowi({ icon: 'sparkle', ibg: 'var(--tint)', t: 'Offres THRIVE' })}</div></div>
    ${stylePicker()}
    <div class="sec-h small"><h4>Famille</h4></div>
    <div class="sec"><div class="list"><div class="rowi ico">${avatar(30, 'L', 'var(--kid)')}<div class="main"><div class="t">Léo</div></div><span class="val">11 ans</span><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div><div class="rowi ico">${avatar(30, 'I', v2 ? '#A7C4BC' : '#46695F')}<div class="main"><div class="t">Inès</div></div><span class="val">14 ans</span><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div>${rowi({ icon: 'people', ibg: 'var(--sys-indigo)', t: 'Co-parent', val: 'Invité' })}</div></div>
    <div class="sec-h small"><h4>Préférences</h4></div>
    <div class="sec"><div class="list"><div class="rowi ico"><span class="ibadge" style="background:var(--sys-red)">${ic('bell', 18, { sw: 2 })}</span><div class="main"><div class="t">Notifications push</div></div><span class="tgl on"></span></div>${rowi({ icon: 'shield', ibg: 'var(--sys-green)', t: 'Double authentification', val: 'Activée' })}</div></div>
    <div class="sec-h small"><h4>Données · hébergées au Canada</h4></div>
    <div class="sec"><div class="list">${rowi({ icon: 'tray', ibg: 'var(--sys-blue)', t: 'Exporter mes données' })}${rowi({ icon: 'doc', ibg: 'var(--sys-teal)', t: 'Confidentialité · Loi 25' })}</div>
    <div class="sec-f">Le courriel et le mot de passe se changent avec ton coach ou l’équipe THRIVE.</div></div>
    <div class="sec" style="margin-top:22px"><div class="list"><div class="rowi danger" style="justify-content:center"><div class="main center"><div class="t">Se déconnecter</div></div></div></div></div>
    <div style="height:40px"></div></div></div>${navbar({ title: 'Compte', right: gb('check', { tinted: true, label: 'OK' }), edge: true })}` });

  // Y — Offres THRIVE (gamme V3 : Maison · Groupe · Individuel · Complet)
  S.Y = () => {
    const progs = [
      ['Groupe', 600, 'Notre programme phare', '13 séances en petit groupe (4 à 6 enfants), ateliers sportifs', 'BON-01', true],
      ['Individuel', 1500, 'Seul avec un coach', '13 séances 1:1 de 60 à 70 min, et le Book THRIVE à la fin', 'ACT-0101', false],
      ['Complet', 2000, 'Le parcours le plus complet', '13 séances 1:1, puis l’intégration progressive au groupe', 'ACT-0801', false],
    ];
    const card = ([n, p, k, d, img, star]) => {
      const on = n === PROG;
      return `<div class="card" style="${on ? 'box-shadow:0 0 0 2.5px var(--tint)' : ''}"><div class="flex gap12">${vimg(img, 64, { r: 18 })}<div class="f1"><div class="flex between items-c"><span class="t-title3">THRIVE ${n}</span><span class="t-headline num">${money(p).replace(',00', '')}<span class="t-foot c2"> + tx</span></span></div><div class="t-foot c2">${k}</div></div></div>
        <div class="t-sub" style="margin-top:10px">${d}.</div>
        <div class="flex wrap gap4" style="margin-top:10px">${star ? '<span class="tag" style="background:#FFE7B8;color:#5A3A00">Phare</span>' : ''}${on ? '<span class="tag">Ton programme</span>' : ''}<span class="tag gray">En 2 versements</span><span class="tag gray">Maison inclus</span><span class="tag gray">Bilan + Mes séances</span></div></div>`;
    };
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Offres</div><div class="subtitle-nav">Pour ta famille. Prix en dollars canadiens.</div>
      <div class="sec-h"><h4>Chaque soir</h4></div>
      <div class="sec"><div class="card"><div class="flex gap12">${vimg('ACT-0603', 64, { r: 18 })}<div class="f1"><div class="flex between items-c"><span class="t-title3">THRIVE Maison</span>${v2 ? '<span class="tag">Ton abonnement</span>' : '<span class="tag ok">Inclus</span>'}</div><div class="t-foot c2">Le moment qui compte, 10 minutes par jour</div></div></div>
        <div class="flex gap8" style="margin-top:12px"><div class="f1" style="border-radius:16px;padding:10px 12px;background:var(--fill4)"><div class="t-headline num">32,50 $</div><div class="t-foot c2">par mois</div></div><div class="f1" style="border-radius:16px;padding:10px 12px;background:var(--tint-soft)"><div class="t-headline num">299 $</div><div class="t-foot c2">par an · −23 %</div></div></div>
        <div class="t-foot c2" style="margin-top:8px">1 mois d’essai gratuit · partagé avec ton co-parent</div>
        <div class="flex items-c gap4 t-foot c2" style="margin-top:6px">${ic('phone', 13, { sw: 2.2 })}Abonnement géré par l’App Store</div></div></div>
      <div class="sec-h"><h4>Avec un coach</h4></div>
      <div class="sec flex col gap12">${progs.map(card).join('')}</div>
      <div class="sec" style="margin-top:12px"><div class="card flex gap12 items-c"><span style="width:36px;height:36px;border-radius:10px;background:#635BFF;color:#fff;display:grid;place-items:center;flex:none;font:800 18px/1 var(--sf)">S</span><div class="t-sub"><b>Paiement des programmes par Stripe.</b> 1<sup>er</sup> versement à l’inscription, dans l’app ou par lien courriel ; le 2<sup>e</sup> à la séance 7.</div></div></div>
      <div class="sec" style="margin-top:12px"><div class="card flex gap12 items-c" style="background:color-mix(in srgb, var(--sys-green) 12%, var(--bg2))"><span style="color:var(--ok)">${ic('shield', 26)}</span><div class="t-sub"><b>Garantie :</b> les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.</div></div></div>
      <div class="sec-f" style="margin:8px 16px 0">Hors de l’île de Montréal ? Individuel aussi en visio, à [prix visio à confirmer].</div>
      <div style="height:120px"></div></div></div>
      ${navbar({ left: gb('x'), edge: true })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px"><span class="btn prom">${ic('calendar', 18)}Réserver un appel de 15 min</span></div>` };
  };

  // Y2 — Programme Groupe : paiement en 2 versements
  S.Y2 = () => {
    const half = 300, halfTx = half * TAX;
    return { html: `<div class="scroll"><div style="padding-top:0">
      <div style="height:280px;background:#F1EEE8;position:relative;overflow:hidden"><img src="${vsrc('BON-01')}" alt="" style="position:absolute;left:50%;top:40px;transform:translateX(-50%);width:250px;height:246px;object-fit:cover"></div>
      <div class="pad" style="margin-top:16px"><span class="tag" style="background:#FFE7B8;color:#5A3A00">Programme phare</span><div class="t-title1" style="margin-top:8px;${v3 ? 'font-family:Fraunces,Georgia,serif;font-weight:600' : ''}">THRIVE Groupe</div><div class="t-sub c2">13 séances en petit groupe · ateliers sportifs · 4 à 6 enfants</div></div>
      <div class="sec" style="margin-top:14px"><div class="list">${rowi({ icon: 'people', ibg: 'var(--sys-indigo)', t: 'Vague d’automne · 8–11 ans', d: '2 inscrits · le groupe démarre dès 2', chev: false })}${rowi({ icon: 'house', ibg: 'var(--sys-green)', t: 'Maison inclus', d: 'Pendant tout le programme', chev: false })}${rowi({ icon: 'sparkle', ibg: 'var(--tint)', t: 'Bilan et Mes séances', d: 'Questionnaires avant / après', chev: false })}</div></div>
      <div class="sec-h small"><h4>Paiement</h4></div>
      <div class="sec"><div class="seg"><span class="on">En 2 versements</span><span>En une fois</span></div></div>
      <div class="sec" style="margin-top:10px"><div class="list"><div class="rowi"><div class="main"><div class="t">Aujourd’hui</div><div class="d">Remboursable pendant la garantie</div></div><span class="val num" style="color:var(--label)">${money(half)} + tx</span></div><div class="rowi"><div class="main"><div class="t">À la séance 7</div><div class="d">Prélevé automatiquement</div></div><span class="val num">${money(half)} + tx</span></div></div>
      <div class="sec-f">Aujourd’hui : ${money(halfTx)} taxes incluses (TPS + TVQ).</div></div>
      <div class="sec-h small"><h4>Moyen de paiement</h4></div>
      <div class="sec"><div class="list">${[['Apple Pay', 'Traité par Stripe', 'phone', true], ['Carte de crédit ou de débit', 'Visa, Mastercard, Amex · traité par Stripe', 'tray', false], ['Recevoir un lien de paiement', 'Payer depuis ton ordinateur, par courriel', 'envelope', false]].map(([t, d, i, on]) => `<div class="rowi ico"><span class="ibadge" style="background:${on ? '#000' : 'var(--fill)'};color:${on ? '#fff' : 'var(--label)'}">${ic(i, 18, { sw: 2 })}</span><div class="main"><div class="t">${t}</div><div class="d">${d}</div></div>${on ? `<span class="ctint">${ic('check', 20, { sw: 2.6 })}</span>` : ''}</div>`).join('')}</div>
      <div class="sec-f flex items-c gap4"><span style="width:18px;height:18px;border-radius:5px;background:#635BFF;color:#fff;display:inline-grid;place-items:center;font:800 11px/1 var(--sf);flex:none">S</span>Paiement sécurisé par Stripe. Le 2<sup>e</sup> versement est prélevé sur le même moyen à la séance 7 ; reçu par courriel.</div></div>
      <div style="height:140px"></div></div></div>
      ${navbar({ left: gb('chevL'), right: gb('share') })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px"><span class="btn" style="background:#000;color:#fff">${ic('phone', 18)}Payer ${money(halfTx)} · Apple Pay</span></div>` };
  };

  // Y3 — Appel de 15 min avec un coach
  S.Y3 = () => {
    const days = [['lun.', 13], ['mar.', 14], ['mer.', 15], ['jeu.', 16], ['ven.', 17]];
    const slots = ['17 h 00', '17 h 30', '18 h 00', '18 h 30', '19 h 00', '19 h 30'];
    return { html: `<div class="scroll"><div style="padding-top:108px">
      <div class="pad flex items-c gap12"><div class="f1"><div class="t-title1" style="${v3 ? 'font-family:Fraunces,Georgia,serif;font-weight:600' : ''}">Rencontrer un coach</div><div class="t-sub c2" style="margin-top:4px">15 minutes, sans engagement. On parle de ${K.prenom} et du programme qui lui va.</div></div>${mascotHero(92, { id: 'ACT-1301', glow: 'rgba(0,0,0,0)', ring: false })}</div>
      <div class="sec" style="margin-top:16px"><div class="seg"><span class="on">${ic('playRect', 15, { style: 'display:inline;vertical-align:-3px' })} Vidéo</span><span>Téléphone</span></div></div>
      <div class="sec-h small"><h4>Octobre 2026</h4></div>
      <div class="sec flex between">${days.map(([d, n], i) => `<div class="flex col items-c" style="width:62px;height:72px;border-radius:20px;justify-content:center;gap:2px;background:${i === 1 ? 'var(--tint)' : 'var(--bg2)'};color:${i === 1 ? 'var(--tint-ink)' : 'var(--label)'}"><span class="t-foot" style="opacity:.75">${d}</span><span class="t-title3 num">${n}</span></div>`).join('')}</div>
      <div class="sec-h small"><h4>Mardi 14 octobre</h4></div>
      <div class="sec" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${slots.map((t, i) => `<span class="chip num" style="justify-content:center;height:44px;border-radius:14px;${i === 3 ? 'background:var(--tint);color:var(--tint-ink);font-weight:600' : i === 1 ? 'opacity:.35;text-decoration:line-through' : 'background:var(--bg2)'}">${t}</span>`).join('')}</div>
      <div class="sec" style="margin-top:16px"><div class="list">${rowi({ icon: 'calendar', ibg: 'var(--sys-red)', t: 'Ajouter au calendrier', chev: false, right: '<span class="tgl on"></span>' })}</div>
      <div class="sec-f">Rien n’est payé avant l’appel. Ensuite, tu règles le 1<sup>er</sup> versement par Stripe, dans l’app ou par le lien reçu par courriel, et le programme démarre 1 à 2 semaines plus tard.</div></div>
      <div style="height:120px"></div></div></div>
      ${navbar({ left: gb('x'), edge: true })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:30px;padding:6px"><span class="btn prom">Réserver mardi 14 oct. · 18 h 30</span></div>` };
  };

  // X2 — Mon abonnement Maison
  S.X2 = () => {
    const trial = v2;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Mon abonnement</div>
      <div class="sec" style="margin-top:14px"><div class="card"><div class="flex items-c gap12">${vimg('ACT-0603', 56, { r: 16 })}<div class="f1"><div class="t-headline">THRIVE Maison</div><div class="t-sub c2">${trial ? 'Annuel · 299 $ CA par an' : `Inclus avec ton programme ${PROG}`}</div></div><span class="tag ${trial ? '' : 'ok'}">${trial ? 'Essai gratuit' : 'Actif'}</span></div>
        <div style="height:.5px;background:var(--sep);margin:14px 0"></div>
        ${trial ? `<div class="flex between t-sub"><span class="c2">Fin de l’essai</span><span class="b num">9 novembre 2026</span></div><div class="bar-p" style="margin-top:8px"><i style="width:20%"></i></div><div class="t-foot c2" style="margin-top:8px">Puis 299 $ CA par an, renouvelé automatiquement. Annule au moins 24 h avant pour ne rien payer.</div>`
          : `<div class="flex between t-sub"><span class="c2">Accès ouvert jusqu’à</span><span class="b">la fin du programme</span></div><div class="t-foot c2" style="margin-top:8px">Ensuite, tu pourras continuer à 32,50 $ par mois ou 299 $ par an, via l’App Store.</div>`}</div></div>
      <div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'people', ibg: 'var(--sys-indigo)', t: 'Partagé avec ton co-parent', d: 'Alex Tremblay a aussi accès à Maison', chev: false })}${rowi({ icon: trial ? 'phone' : 'tray', ibg: trial ? '#000' : '#635BFF', t: trial ? 'Payé via l’App Store' : 'Payé avec ton programme', d: trial ? 'Sur cet iPhone' : 'Programme réglé par Stripe · aucun abonnement séparé', chev: false })}</div></div>
      ${trial ? `<div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'gear', ibg: 'var(--fill)', t: 'Gérer dans l’App Store', d: 'Changer de formule ou annuler' })}${rowi({ icon: 'rotate', ibg: 'var(--fill)', t: 'Restaurer les achats', chev: false })}</div>
        <div class="sec-f">Déjà abonné ailleurs (autre appareil, ou sur le site THRIVE) ? Connecte-toi avec la même adresse : ton accès est reconnu partout.</div></div>` : ''}
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), edge: true })}` };
  };

  // D2 — Essai gratuit THRIVE Maison (paywall App Store, règles 3.1.2) : le mois gratuit d'abord
  S.D2 = () => {
    const plan = (on, name, perMonth, billed, badge) => `<div class="card flex items-c gap12" style="padding:14px 16px;${on ? 'box-shadow:0 0 0 2.5px var(--tint)' : ''}">
        ${on ? `<span style="width:24px;height:24px;border-radius:12px;flex:none;background:var(--tint);color:var(--tint-ink);display:grid;place-items:center">${ic('check', 14, { sw: 3 })}</span>` : '<span style="width:24px;height:24px;border-radius:12px;flex:none;box-shadow:inset 0 0 0 2px var(--label3)"></span>'}
        <div class="f1"><div class="flex items-c gap8"><span class="t-headline">${name}</span>${badge ? `<span class="tag">${badge}</span>` : ''}</div><div class="t-foot c2" style="margin-top:2px">${billed}</div></div>
        <div style="text-align:right"><div class="num" style="font:700 20px/24px var(--sf)">${perMonth}</div><div class="t-cap c2">par mois</div></div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:110px">
      <div class="flex items-c gap12" style="padding:0 24px">${mascotHero(76, { glow: 'rgba(0,0,0,0)', ring: false })}<div><div class="t-foot c2" style="text-transform:uppercase;letter-spacing:1px;font-weight:700">THRIVE Maison</div><div class="t-headline">Le moment qui compte, 10 min par soir</div></div></div>
      <div class="center" style="margin-top:14px">
        <div class="flex" style="justify-content:center;align-items:baseline;gap:10px"><span style="font:400 58px/1 Fraunces, 'Times New Roman', Times, serif;letter-spacing:-.5px;color:var(--label)">0 $</span><span style="font:italic 400 19px/1 Fraunces, 'Times New Roman', Times, serif;color:var(--label2)">par mois, pendant 1 mois</span></div>
        <div class="t-sub c2" style="margin-top:6px">Un mois complet, gratuit. Annule quand tu veux.</div></div>
      <div class="sec" style="margin-top:16px"><div class="card" style="padding:14px 12px">
        <div class="flex between" style="position:relative">
          <div style="position:absolute;left:12%;right:12%;top:13px;height:3px;border-radius:2px;background:linear-gradient(90deg, var(--tint) 0 50%, var(--fill) 50% 100%)"></div>
          ${[['gift', 'Aujourd’hui', '0 $', true], ['bell', '7 novembre', 'On te prévient', false], ['star', '10 novembre', '1er paiement', false]].map(([i, d, t, on]) => `<div class="flex col items-c" style="width:33%;position:relative;gap:4px"><span style="width:30px;height:30px;border-radius:15px;display:grid;place-items:center;background:${on ? 'var(--tint)' : 'var(--bg2)'};color:${on ? 'var(--tint-ink)' : 'var(--label2)'};box-shadow:0 0 0 2px ${on ? 'var(--tint)' : 'var(--fill)'}">${ic(i, 15, { sw: 2.2 })}</span><span class="t-foot b">${d}</span><span class="t-cap c2">${t}</span></div>`).join('')}
        </div></div></div>
      <div class="sec-h small"><h4>Après le mois gratuit</h4></div>
      <div class="sec flex col gap8">
        ${plan(true, 'Annuel', '24,92 $', '299 $ facturés une fois par an', '−23 %')}
        ${plan(false, 'Mensuel', '32,50 $', '32,50 $ facturés chaque mois', '')}
      </div>
      <div class="t-cap c2 center" style="margin:10px 24px 0">Gratuit jusqu’au 10 nov. 2026, puis 299 $ CA par an (soit 24,92 $ par mois). Renouvellement automatique ; annulable dans les réglages de ton compte Apple au moins 24 h avant la fin de la période. <u>Conditions</u> · <u>Confidentialité</u></div>
      <div style="height:120px"></div></div></div>
      ${navbar({ left: gb('x'), right: gbt('Restaurer') })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:30px;border-radius:30px;padding:6px"><span class="btn prom">Commencer mon mois gratuit</span><div class="t-cap c2 center" style="padding:6px 0 2px">0 $ aujourd’hui · rien à payer avant le 10 nov.</div></div>` };
  };

  // D3 — Confirmation d'achat App Store (feuille système)
  S.D3 = () => ({ html: `<div class="scroll">${S.D2().html}</div><div class="dim" style="background:rgba(0,0,0,.4)"></div>
    <div class="sheet" style="background:${v2 ? '#1C1C1E' : '#F2F2F7'};padding:0 0 34px">
      <div class="flex between items-c" style="padding:16px 18px 6px"><span class="t-title3" style="font-weight:700">App Store</span>${gb('x')}</div>
      <div class="sec"><div class="list"><div class="rowi ico-lg" style="min-height:72px"><img src="assets/logo.png" width="48" height="48" style="border-radius:11px" alt=""><div class="main"><div class="t b">THRIVE Maison — Annuel</div><div class="d">THRIVE Sport Positive · Abonnement</div></div></div></div></div>
      <div class="sec" style="margin-top:12px"><div class="list"><div class="rowi"><div class="main"><div class="t">Essai gratuit</div><div class="d">1 mois</div></div><span class="val">0,00 $</span></div><div class="rowi"><div class="main"><div class="t">À partir du 10 nov. 2026</div><div class="d">Se renouvelle chaque année</div></div><span class="val num">299,00 $ CA</span></div><div class="rowi"><div class="main"><div class="t">Compte</div></div><span class="val">${PARENT.email.replace('.tremblay', '…')}</span></div></div></div>
      <div class="flex col items-c" style="margin-top:22px;gap:6px"><span style="width:56px;height:56px;border-radius:16px;border:2px solid var(--sys-blue);color:var(--sys-blue);display:grid;place-items:center">${ic('faceid', 32, { sw: 1.6 })}</span><div class="t-sub b">Confirmer avec le bouton latéral</div></div>
    </div>` });

  // Z — Fin de parcours & certificat
  S.Z = () => ({ html: `<div class="scroll"><div style="padding-top:108px">
    <div class="sec"><div style="border-radius:30px;padding:24px 20px;text-align:center;position:relative;overflow:hidden;background:${v2 ? 'linear-gradient(160deg,#2A2614,#0b0b0b)' : v3 ? '#022539' : 'linear-gradient(160deg,#004E7A,#022539)'};color:#fff">
      <img src="assets/logo.png" width="46" height="46" style="border-radius:11px;margin:0 auto" alt="">
      <div style="font:600 12px/16px var(--sf);letter-spacing:1.4px;text-transform:uppercase;color:#F9EB50;margin-top:14px">Certificat THRIVE</div>
      <div style="font:600 34px/38px Fraunces,Georgia,serif;margin-top:8px">Léo Tremblay</div>
      <div style="font:400 15px/20px var(--sf);opacity:.82;margin-top:6px">a terminé le parcours des 13 séances<br>avec ${K.coach} · décembre 2026</div>
      <div class="flex" style="justify-content:center;gap:10px;margin-top:18px"><span class="btn md" style="background:#F9EB50;color:#141414">${ic('share', 18)}Partager</span><span class="btn md" style="background:rgba(255,255,255,.14);color:#fff">${ic('doc', 18)}PDF</span></div></div></div>
    <div class="sec-h"><h4>La courbe se referme</h4></div>
    <div class="sec"><div class="card" style="padding:12px 12px 6px"><div class="flex items-c gap8" style="padding:2px 4px 6px"><span class="t-title2 num">79</span><span class="t-headline" style="color:var(--ok)">+23 depuis le départ</span></div>${lsssCurve([56, 67, 79], { final: true })}</div></div>
    <div class="sec" style="margin-top:12px"><div class="card"><div class="kick">${ic('wave', 15)}Bien-être · 13 séances</div><div style="margin-top:8px">${spark([3.4, 3.6, 3.5, 3.8, 3.7, 4.0, 4.1, 4.0, 4.2, 4.1, 4.3, 4.4, 4.4], { w: 338, h: 64, min: 3.2, max: 4.6 })}</div></div></div>
    <div class="sec-h small"><h4>Documents du parcours</h4></div>
    <div class="sec"><div class="list">${rowi({ icon: 'doc', ibg: 'var(--sys-indigo)', t: 'Contrat de confiance' })}${rowi({ icon: 'envelope', ibg: 'var(--sys-pink)', t: 'Lettre à moi-même' })}${rowi({ icon: 'book', ibg: 'var(--tint)', t: 'Le Book THRIVE', d: 'Le récapitulatif du programme' })}${rowi({ icon: 'medal', ibg: 'var(--sys-orange)', t: 'Certificat THRIVE' })}</div><div class="sec-f">Chaque ouverture passe par un lien sécurisé à durée limitée.</div></div>
    <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), title: 'Fin de parcours', edge: true, right: gb('share') })}` });

  // ── Chapitres et légendes ───────────────────────────────────────────────
  const PERSONA = sel('Famille en programme Individuel (Maison inclus).', 'Famille abonnée à Maison seul, en essai gratuit.', 'Famille en programme Complet (Maison inclus).');
  const CH = [
    ['01', 'Arrivée', 'Du premier écran à l’essai gratuit de Maison', [
      ['A', 'Bienvenue', sel('Mascotte en médaillon, icône THRIVE en badge, trois promesses. Le bouton lance l’essai d’un mois.', 'La mascotte au centre des anneaux, accent soleil.', 'Couverture marine, mascotte en médaillon, titre Fraunces.')],
      ['B', 'Connexion', 'Médaillon de la mascotte, liste inset grouped, clavier en verre, rappel de la double authentification.'],
      ['C', 'Inscription · le parent', 'Étape 1 sur 2. Le bouton reste inactif tant que le mot de passe n’a pas 8 caractères.'],
      ['D', 'Inscription · les enfants', 'Âge par stepper (8–17), sport par menu d’actions en verre.'],
      ['D2', 'Essai gratuit de Maison', 'Le mois gratuit d’abord : « 0 $ par mois pendant 1 mois », la frise (aujourd’hui 0 $ → rappel → 1er paiement), puis les formules en prix par mois (annuel 24,92 $/mois, avec « 299 $ facturés une fois par an » juste en dessous ; mensuel 32,50 $). Restaurer, conditions, confidentialité.'],
      ['D3', 'Confirmation App Store', 'La feuille d’achat du système : essai à 0 $, puis 299 $ CA par an, confirmation au bouton latéral.'],
      ['F', 'Choisir le profil', sel('Liste système avec coche ; l’abonnement Maison est partagé avec le co-parent.', 'Grands avatars plein écran, comme les profils de l’app TV.', 'Cartes-maillots : le numéro devient la vignette.')],
    ]],
    ['02', 'Maison · la page d’accueil', 'Le premier onglet, celui de chaque soir', [
      ['K', 'Maison', sel('La présentation d’origine (« Soir de famille »), en ambiance jour : l’affiche du soir dans son arche de lin, Lancer, les quatre portes, la semaine en velours, les rangées d’affiches avec les vignettes, le carnet en papier. Écran déroulé.', 'La même présentation en ambiance nuit (marine), avec l’essai gratuit en haut et l’invitation discrète vers un coach.', 'La présentation d’origine en ambiance jour, sous les onglets Ce soir · Bilan · Mes séances.')],
      ['K2', 'Tout le parcours', 'Les 13 semaines et leurs 53 activités, chacune avec sa vignette. Faites, en cours, à venir. Écran long, déroulé.'],
      ['L', 'Fiche moment', 'Vignette en grand, durée 10/20/30, la phrase d’ouverture à copier, 4 étapes, niveau de preuve.'],
      ['M', 'Moment en cours', 'Plein écran sombre, mascotte, minuteur en anneau, commandes en verre. Arrêter compte quand même.'],
      ['N', 'Le carnet', 'Ce qu’on garde (avec la vignette de chaque activité), l’objet gagné, la collection.'],
    ]],
    ['03', 'Bilan & passeport', sel('Ouvert par le coach dans un programme', 'Visible avec cadenas pour un abonné Maison seul', 'Ouvert par le coach dans un programme'), [
      ['G', 'Bilan', sel('Le passeport : grand titre au prénom, carte d’identité, 13 pastilles, jauges, travail du coach.', 'Onglet visible mais verrouillé : aperçu flouté + carte « s’ouvre avec un coach », garantie des 2 séances, appel de 15 min.', 'Le passeport devient un objet : carte couleur de l’enfant, numéro géant, objectif cité.')],
      ['H', 'Compétences de vie', 'Feuille en grand détent : courbe LSSS Départ → Mi-parcours, 8 compétences avec repère de départ.'],
      ['I', 'Comprendre l’outil', 'Feuille flottante en verre : ce que ça mesure, pourquoi, comment le lire.'],
      ['J', 'Personnaliser', 'Photo, surnom, numéro, poste, et les 6 couleurs du passeport.'],
    ]],
    ['04', 'Avec le coach', sel('Programme Individuel : 13 séances, bilans, messages', 'Abonné Maison seul : Mes séances et Messages verrouillés', 'Programme Complet : 13 séances, bilans, messages'), [
      ['E', 'Ton espace se prépare', 'Après l’appel : fiche reçue, confirmée, ouverte par le coach. Le programme démarre 1 à 2 semaines plus tard ; Maison est déjà ouvert.'],
      ['S', 'Mes séances', sel('Anneau 7/13, séances par phase avec leur vignette : validée, prochaine, à venir.', 'Onglet visible, verrouillé : aperçu flouté des 13 séances et invitation.', 'Anneau 7/13, séances par phase avec leur vignette.')],
      ['T', 'Bilan du coach', 'Le message du coach, le bilan détaillé, les observations sur 5.'],
      ['U', 'Messages', sel('Le coach est l’onglet Prominent : un pouce pour lui écrire.', 'Aperçu factice + invitation : la messagerie vient avec un programme.', 'Fil poussé depuis le bilan, bulles crème.')],
      ['V', 'Notifications', 'Groupées par jour, pastille non lue, chaque ligne mène au bon endroit.'],
    ]],
    ['05', 'Offres & paiement', 'Maison : achat intégré Apple dans l’app. Programmes avec un coach : Stripe, 1er versement à l’inscription', [
      ['Y', 'Offres', 'Maison (32,50 $/mois ou 299 $/an, essai 1 mois), puis Groupe 600 $ (phare), Individuel 1 500 $, Complet 2 000 $, + tx. Garantie des 2 premières séances.'],
      ['Y2', 'Groupe · paiement', 'Moitié aujourd’hui (remboursable pendant la garantie), moitié à la séance 7. Paiement Stripe : Apple Pay, carte, ou lien par courriel. Total taxes incluses (TPS + TVQ).'],
      ['Y3', 'Appel de 15 min', 'Vidéo ou téléphone, jours et créneaux, ajout au calendrier. Rien n’est payé avant ; ensuite 1er versement par Stripe (app ou lien).'],
      ['X2', 'Mon abonnement', sel('Maison inclus avec le programme, puis l’option de continuer.', 'Essai jusqu’au 9 nov., renouvellement annuel, partage co-parent, Gérer dans l’App Store, Restaurer.', 'Maison inclus avec le programme, puis l’option de continuer.')],
    ]],
    ['06', 'Séances vidéo · en construction', 'Pas disponibles pour l’instant : l’écran l’annonce, les suivants restent un aperçu', [
      ['O', 'Bientôt disponible', 'Mascotte avec la pellicule, « En construction », « Me prévenir », retour vers Maison. Séances à venir grisées.'],
      ['P', 'Prêt avec Léo ?', 'Aperçu, avec le bandeau « pas disponible ».'],
      ['Q', 'Question en pause', 'Aperçu : scène de la mascotte derrière la question, portrait dans la carte.'],
      ['R', 'Après la séance', 'Aperçu : célébration avec la mascotte, slider Liquid Glass, action de transfert.'],
    ]],
    ['07', 'L’enfant', 'Pas de compte, pas de mot de passe : un lien que le parent lui tend', [
      ['W', 'Questionnaire de Léo', 'Interface ambrée pour l’EPOCH, gros boutons 1–5, FR/EN, note de confidentialité.'],
    ]],
    ['08', 'Compte & fin de parcours', 'Le cadre, puis la courbe qui se referme', [
      ['X', 'Compte & famille', 'Mon programme, abonnement Maison, offres, style de l’app (Natif · Nuit calme · Carnet), famille, préférences, 2FA, données au Canada.'],
      ['Z', 'Fin de parcours', 'Certificat partageable, Book THRIVE, courbe LSSS complète (+23), bien-être sur 13 séances.'],
    ]],
  ];

  function phone(letter) {
    const s = S[letter]();
    const hs = s.h ? ` style="height:${s.h}px"` : '';
    return `<div class="phone-wrap"${hs}><div class="phone${v2 ? ' dark' : ''}"${hs}>${s.html}${statusbar(s.dark && !v2 ? true : s.dark)}<div class="island"></div><div class="home-ind${s.dark ? ' light' : ''}"></div></div></div>`;
  }

  const root = document.getElementById('deck');
  root.innerHTML = CH.map(([n, t, d, shots]) => `<section class="chapter"><h2>${n} · ${t}</h2><h3>${d}</h3><div class="row-of-phones">${shots.map(([L, title, cap]) => `<figure class="shot" style="margin:0">${phone(L)}<figcaption><span class="letter">${L}</span><span class="cap-t">${title}</span><span class="cap-d">${cap}</span></figcaption></figure>`).join('')}</div></section>`).join('');

  // Mise à l'échelle sur petits écrans (le téléphone garde ses 402 pt logiques)
  function fit() {
    const w = Math.min(402 + 24, window.innerWidth - 32);
    document.querySelectorAll('.shot').forEach((el) => {
      const pw = el.querySelector('.phone-wrap');
      const k = Math.min(1, w / 426);
      pw.style.transform = k < 1 ? `scale(${k})` : '';
      pw.style.transformOrigin = 'top left';
      pw.style.marginBottom = k < 1 ? `${-874 * (1 - k)}px` : '';
      el.style.width = k < 1 ? `${426 * k}px` : '';
    });
  }
  window.addEventListener('resize', fit); fit();
})();
