// ─────────────────────────────────────────────────────────────────────────
// THRIVE — section client de A à Z, VERSIONS FINALES (grammaire iOS 27 × « Soir de famille »).
//   v4 · Lin      (jour)  — crème, lin, papier, marine feutré, un seul soleil.
//   v5 · Veillée  (nuit)  — marine profond, lampe, velours, papier crème, un seul soleil.
// Les deux versions ont exactement les mêmes écrans, les mêmes parcours et les mêmes textes :
// seule l'ambiance (jetons dans final.css) et quelques matières changent.
// Maquettes statiques. Aucun fichier du code de l'app n'est modifié.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  const V = document.documentElement.dataset.v || 'v4';
  const NIGHT = V === 'v5';
  const THEME = NIGHT ? 'Veillée' : 'Lin';

  // ── Données de démonstration (cohérentes avec le protocole réel) ─────────
  const K = { prenom: 'Léo', nom: 'Tremblay', surnom: 'Flash', num: 17, age: 11, sport: 'Hockey', poste: 'Ailier gauche', club: 'Les Faucons de Rosemont', coach: 'Coach Lylian', coachP: 'Lylian', force: 'Persévérance', focus: 'Calme', tranche: '8-11 ans' };
  const PARENT = { prenom: 'Camille', nom: 'Tremblay', email: 'camille.tremblay@exemple.ca' };
  // Personas : Lin = programme Individuel · Veillée = programme Complet (Maison inclus dans les deux).
  // Les états « abonné Maison seul » (verrouillés) sont montrés au chapitre 09, dans les deux versions.
  const PROG = NIGHT ? 'Complet' : 'Individuel';
  const TAX = 1.14975; // TPS 5 % + TVQ 9,975 %
  const money = (n) => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
  const KIDINK = NIGHT ? '#022539' : '#F7F5F2';
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

  // ── Vignettes des activités (mascotte THRIVE, une par activité) ───────────
  const ACTS = window.ACTS || {};
  const VSET = new Set(window.VIGN || []);
  const vsrc = (id) => (VSET.has(id) ? (window.VIGN_BASE || 'assets/vignettes/') + id + '.webp' : null);
  function vimg(id, size = 64, { r = 18, done = false, dim = false, label = '' } = {}) {
    const src = vsrc(id);
    const inner = src ? `<img src="${src}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:cover;display:block${dim ? ';filter:grayscale(1);opacity:.55' : ''}">`
      : `<span style="width:${size}px;height:${size}px;display:grid;place-items:center;background:var(--fill3);color:var(--label2);font:600 ${Math.round(size * .3)}px/1 var(--sf)">${label || '·'}</span>`;
    return `<span style="position:relative;width:${size}px;height:${size}px;border-radius:${r}px;overflow:hidden;flex:none;display:block;background:#F1EEE8;box-shadow:0 0 0 1px rgba(2,37,57,.08)">${inner}${done ? `<span style="position:absolute;right:4px;bottom:4px;width:22px;height:22px;border-radius:11px;background:#A7C4BC;color:#022539;display:grid;place-items:center;box-shadow:0 0 0 2px rgba(255,255,255,.9)">${ic('check', 13, { sw: 3 })}</span>` : ''}</span>`;
  }

  // L'arche de lin : la mascotte vit toujours dans cette fenêtre (jamais un disque posé sur un fond).
  const MASCOT = 'ACT-0603';
  const arch = (w, h, { id = MASCOT, pos = '50% 38%', cls = '', style = '', inner = '' } = {}) =>
    `<div class="arch ${cls}" style="width:${w}px;height:${h}px;${style}"><div class="in">${inner || `<img src="${vsrc(id)}" alt="" style="object-position:${pos}">`}</div></div>`;

  // Bandeau « bientôt » posé sur les écrans vidéo mis de côté
  const soonPill = (top = 60) => `<div style="position:absolute;left:50%;top:${top}px;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:16px;font:600 13px/1 var(--sf);white-space:nowrap;background:#FFE7B8;color:#3D2600;box-shadow:0 2px 10px rgba(0,0,0,.18)">${ic('timer', 15, { sw: 2.2 })}Aperçu · pas disponible pour l’instant</div>`;

  // Carte « s'ouvre avec un programme » posée sur un aperçu flouté (abonné Maison seul)
  const programLock = (title, text) => `<div class="sheet float glassy" style="bottom:110px;padding:22px 20px 20px">
      <div class="flex items-c gap12">${arch(62, 70, { cls: 'xs' })}<div class="f1"><div class="flex items-c gap4 eyebrow" style="color:var(--sage-ink);font-size:11px">${ic('lock', 12, { sw: 2.6 })}Avec un programme THRIVE</div><div class="t-title3" style="margin-top:3px">${title}</div></div></div>
      <div class="t-sub c2" style="margin-top:12px">${text}</div>
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
  const gdark = (inner, extra = '') => `<span class="gbtn ic glass" style="color:#F7F5F2;background:rgba(247,245,242,.14);border-color:rgba(247,245,242,.14);${extra}">${inner}</span>`;

  function navbar({ title = '', left = '', right = '', edge = false } = {}) {
    return `<div class="navbar${edge ? ' edge' : ''}"><div class="bar"><div class="grp">${left}</div>${title ? `<div class="ttl">${title}</div>` : ''}<div class="grp">${right}</div></div></div>`;
  }

  // Trois onglets (comme le vrai LiquidTabBar) + le rôle Prominent d'iOS 27 :
  //   Lin       → « Coach » (messages)         Veillée → « Ce soir » (lancer le moment du soir)
  const TABS = { tabs: [['Maison', 'house'], ['Bilan', 'sparkle'], ['Mes séances', 'calendar']], prom: NIGHT ? ['Ce soir', 'play'] : ['Coach', 'bubble'] };
  function tabbar(active) {
    const tabs = TABS.tabs.map(([l, i], n) => `<span class="tab${n === active ? ' on' : ''}">${ic(i, 24)}<span>${l}</span></span>`).join('');
    return `<div class="fade-bottom"></div><div class="tabbar"><div class="tabs glass">${tabs}</div><span class="prom glass tinted" aria-label="${TABS.prom[0]}">${ic(TABS.prom[1], 25)}</span></div>`;
  }

  function ring(p, { size = 64, sw = 8, color = 'var(--kid)', track = 'var(--fill)', cap = 'round', label = '' } = {}) {
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
      ${p > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${cap}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}${label}</svg>`;
  }

  function spark(vals, { w = 140, h = 44, min = 3, max = 4.4, color = 'var(--kid)', dots = true, fill = true } = {}) {
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - 8) + 4, h - 4 - ((v - min) / (max - min)) * (h - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${fill ? `<path d="${d} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h}Z" fill="${color}" opacity=".13"/>` : ''}
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${dots ? pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 4 : 2.4}" fill="${i === pts.length - 1 ? color : 'var(--bg2)'}" stroke="${color}" stroke-width="2"/>`).join('') : ''}</svg>`;
  }

  function lsssCurve(points, { w = 338, h = 150, final = false } = {}) {
    const labels = ['Départ', 'Mi-parcours', 'Final'];
    const xs = [24, w / 2, w - 24], y = (v) => h - 30 - ((v - 40) / 50) * (h - 50);
    let s = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">`;
    [50, 70, 90].forEach((g) => (s += `<line x1="0" x2="${w}" y1="${y(g)}" y2="${y(g)}" stroke="var(--sep)" stroke-dasharray="2 4"/><text x="${w}" y="${y(g) - 4}" text-anchor="end" font-size="11" fill="var(--label3)" font-family="var(--sf)">${g}</text>`));
    const known = points.filter((p) => p != null);
    s += `<path d="${known.map((v, i) => (i ? 'L' : 'M') + xs[i] + ' ' + y(v)).join(' ')}" fill="none" stroke="var(--kid)" stroke-width="3" stroke-linecap="round"/>`;
    if (!final && known.length < 3) s += `<path d="M${xs[known.length - 1]} ${y(known[known.length - 1])} L${xs[2]} ${y(known[known.length - 1] + 6)}" stroke="var(--label3)" stroke-width="2" stroke-dasharray="3 5" fill="none"/>`;
    labels.forEach((l, i) => {
      const v = points[i];
      s += v != null ? `<circle cx="${xs[i]}" cy="${y(v)}" r="6" fill="var(--kid)" stroke="var(--bg2)" stroke-width="2.5"/><text x="${xs[i]}" y="${y(v) - 13}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--label)" font-family="var(--sf)">${v}</text>`
        : `<circle cx="${xs[i]}" cy="${y(points[1] + 6)}" r="5.5" fill="none" stroke="var(--label3)" stroke-width="2" stroke-dasharray="2 2.5"/>`;
      s += `<text x="${xs[i]}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}" font-size="12" fill="var(--label2)" font-family="var(--sf)">${l}</text>`;
    });
    return s + '</svg>';
  }

  const avatar = (size = 44, txt = K.prenom[0], bg = 'var(--kid)', fg = KIDINK) =>
    `<span class="avatar fr" style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${Math.round(size * 0.46)}px;font-weight:500;font-family:var(--display)">${txt}</span>`;
  const jersey = (size = 56, bg = 'var(--kid)', fg = KIDINK) => `<span class="avatar fr" style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${Math.round(size * .46)}px;font-weight:600;letter-spacing:-1px;font-family:var(--display);box-shadow:inset 0 1px 0 rgba(255,255,255,.3), inset 0 -3px 6px rgba(0,0,0,.14)">${K.num}</span>`;
  const rowi = ({ icon, ibg, t, d, val, chev = true, cls = '', right = '' }) => `<div class="rowi ${icon ? 'ico' : ''} ${cls}">${icon ? `<span class="ibadge" style="background:${ibg || 'var(--tint)'}">${ic(icon, 18, { sw: 2 })}</span>` : ''}<div class="main"><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${val ? `<span class="val">${val}</span>` : ''}${right}${chev ? `<span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span>` : ''}</div>`;
  const childPill = () => `<span class="gbtn glass" style="padding:0 12px 0 5px;gap:8px">${avatar(34)}<span class="t-headline fr" style="font-family:var(--display);font-weight:600">${K.prenom}</span>${ic('chevD', 14, { sw: 2.6 })}</span>`;

  // Deux slogans qui se relaient en fondu (accueil) : le programme, puis Maison
  const sloganDuo = (st, { br = ' ', dots = 'currentColor', align = 'left' } = {}) => `<style>
    @keyframes thrSlA{0%,44%{opacity:1;transform:none;filter:blur(0)}50%,94%{opacity:0;transform:translateY(-10px);filter:blur(8px)}100%{opacity:1;transform:none;filter:blur(0)}}
    @keyframes thrSlB{0%,44%{opacity:0;transform:translateY(10px);filter:blur(8px)}50%,94%{opacity:1;transform:none;filter:blur(0)}100%{opacity:0;transform:translateY(10px);filter:blur(8px)}}
    @keyframes thrDtA{0%,44%{width:22px;opacity:1}50%,94%{width:6px;opacity:.35}100%{width:22px;opacity:1}}
    @keyframes thrDtB{0%,44%{width:6px;opacity:.35}50%,94%{width:22px;opacity:1}100%{width:6px;opacity:.35}}
    .thr-sl{display:grid}.thr-sl>div{grid-area:1/1;will-change:opacity,transform,filter}.thr-sl .b{opacity:0}
    .thr-sl .a{animation:thrSlA 9s cubic-bezier(.45,0,.2,1) infinite}.thr-sl .b{animation:thrSlB 9s cubic-bezier(.45,0,.2,1) infinite}
    .thr-dt{display:flex;gap:6px;margin-top:16px}.thr-dt i{height:6px;border-radius:3px;background:${dots}}
    .thr-dt i:first-child{animation:thrDtA 9s cubic-bezier(.45,0,.2,1) infinite}.thr-dt i:last-child{animation:thrDtB 9s cubic-bezier(.45,0,.2,1) infinite}
    @media (prefers-reduced-motion: reduce){.thr-sl .a,.thr-sl .b,.thr-dt i{animation:none}.thr-sl .b{opacity:0}}
  </style><div class="thr-sl" style="${st}"><div class="a">Grandir par le sport,${br}réussir pour la vie.</div><div class="b">Moins de temps,${br}plus de bons moments.</div></div><div class="thr-dt" style="justify-content:${align === 'center' ? 'center' : 'flex-start'}"><i></i><i></i></div>`;

  // Un petit soleil à quatre branches, pour les étoiles de décor
  const spark4 = (s, c = 'currentColor') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="M12 1.5c.7 4.6 2.4 7.1 4.4 8.4 1.5 1 3.4 1.7 6.1 2.1-2.7.4-4.6 1.1-6.1 2.1-2 1.3-3.7 3.800-4.4 8.400-.7-4.600-2.400-7.100-4.400-8.400-1.500-1-3.400-1.700-6.100-2.100 2.700-.4 4.600-1.100 6.100-2.100 2-1.300 3.700-3.800 4.400-8.400z"/></svg>`;

  // ── Les écrans ──────────────────────────────────────────────────────────
  const S = {};

  // A — Bienvenue : l'arche de lin, la lampe, deux slogans qui se relaient
  S.A = () => {
    const bg = NIGHT ? 'background:radial-gradient(130% 55% at 50% -6%, #0f4563 0%, rgba(6,22,30,0) 62%), linear-gradient(180deg,#05202f 0%,#031923 100%)' : '';
    const star = ([x, y, s, d]) => `<span class="twinkle" style="left:${x}px;top:${y}px;animation-delay:${d}s;color:${NIGHT ? '#F9EB50' : '#D9C531'}">${spark4(s)}</span>`;
    const stars = [[42, 168, 15, 0], [338, 150, 11, 1.2], [356, 330, 13, 2.4], [28, 356, 9, .8], [296, 104, 8, 3.1], [86, 96, 8, 1.9]].map(star).join('');
    return { html: `<div class="scroll" style="${bg}">
      <div class="track-lines"></div>${stars}
      <div style="position:absolute;left:0;right:0;top:76px;display:flex;justify-content:center"><img src="assets/logo.png" width="44" height="44" style="border-radius:11px;box-shadow:0 0 0 1px rgba(255,255,255,.2),0 8px 18px -6px rgba(0,0,0,.5)" alt="THRIVE"></div>
      <div style="position:absolute;left:0;right:0;top:140px;display:flex;justify-content:center"><div class="floaty">${arch(226, 252)}</div></div>
      <div style="position:absolute;left:24px;right:24px;top:418px;text-align:center;color:var(--label)">
        ${sloganDuo('font:500 35px/40px var(--display);letter-spacing:-.4px;font-variation-settings:"SOFT" 100;text-align:center', { br: '<br>', dots: 'var(--tint)', align: 'center' })}
        <div class="t-body c2" style="margin-top:16px">Un moment par soir avec ton enfant. Un coach quand tu veux aller plus loin.</div></div>
      <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn sun">Essayer 1 mois gratuitement</span><span class="btn plain">J’ai déjà un compte</span></div></div>` };
  };

  // B — Connexion
  S.B = () => ({ html: `${navbar({ left: gb('chevL', { label: 'Retour' }) })}<div class="scroll"><div style="padding-top:120px">
    <div class="pad flex items-c gap12"><div class="f1"><div class="t-title1">Content de te revoir</div><div class="t-body c2" style="margin-top:6px">Connecte-toi à l’espace de ta famille.</div></div>${arch(88, 100, { cls: 'sm' })}</div>
    <div class="sec" style="margin-top:20px"><div class="list"><div class="field"><label>Courriel</label><span class="in">${PARENT.email}</span></div><div class="field"><label>Mot de passe</label><span class="in">••••••••••<span class="caret"></span></span></div></div>
    <div class="sec-f">Mot de passe oublié ? <span class="ctint">Recevoir un lien</span></div></div>
    <div class="sec" style="margin-top:28px"><span class="btn prom">Se connecter</span></div>
    <div class="sec" style="margin-top:14px"><div class="list">${rowi({ icon: 'shield', t: 'Double authentification', d: 'Code à 6 chiffres demandé si activée', chev: false })}</div></div>
    </div></div>
    <div class="glass" style="position:absolute;left:8px;right:8px;bottom:8px;height:268px;border-radius:40px;padding:10px 6px 0">
      <div class="flex gap4" style="padding:0 6px">${['courriel', 'camille@', '@gmail.com'].map((s) => `<span class="f1 center t-sub" style="padding:9px 0">${s}</span>`).join('<span style="width:1px;background:var(--sep);margin:8px 0"></span>')}</div>
      ${['azertyuiop', 'qsdfghjklm', 'wxcvbn'].map((r, ri) => `<div class="flex" style="gap:6px;padding:6px ${ri === 2 ? 48 : 4}px;justify-content:center">${r.split('').map((k) => `<span style="flex:1;max-width:33px;height:44px;border-radius:9px;background:${NIGHT ? 'rgba(247,245,242,.16)' : '#fff'};display:grid;place-items:center;font:400 22px/1 var(--sf);box-shadow:0 1px 0 rgba(0,0,0,.18)">${k}</span>`).join('')}</div>`).join('')}
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
    const kid = (n, prenom, age, sport) => `<div class="sec-h small"><h4>Enfant ${n}</h4>${n > 1 ? '<span class="t-foot" style="color:var(--sys-red)">Retirer</span>' : ''}</div>
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
        <div style="margin-top:18px" class="flex col">${steps.map(([t, d, ok], i) => `<div class="flex gap12" style="min-height:58px"><div class="flex col items-c" style="width:28px"><span style="width:28px;height:28px;border-radius:14px;display:grid;place-items:center;background:${ok ? 'var(--sys-green)' : 'var(--fill)'};color:var(--tint-ink)">${ok ? ic('check', 16, { sw: 2.8 }) : `<span style="width:10px;height:10px;border-radius:5px;background:var(--tint)"></span>`}</span>${i < 2 ? `<span style="flex:1;width:2px;background:${ok ? 'var(--sys-green)' : 'var(--fill)'};margin:3px 0"></span>` : ''}</div><div><div class="t-headline">${t}</div><div class="t-sub c2">${d}</div></div></div>`).join('')}</div>
        <div class="t-foot c2" style="margin-top:6px">Ton programme ${PROG} démarre 1 à 2 semaines après l’appel. En attendant, Maison est déjà ouvert.</div>
      </div>${tabbar(1)}` };
  };

  // F — Choisir le profil : deux arches-portraits (l'arche de lin × le maillot de l'enfant)
  S.F = () => {
    const kids = [['Léo', '11 ans · Hockey', 'Séance 8 sur 13', 17, 'var(--kid)', NIGHT ? '#022539' : '#F7F5F2', true], ['Inès', '14 ans · Natation', 'Séance 3 sur 13', 4, NIGHT ? '#3380AC' : '#004E7A', '#F7F5F2', false]];
    const portrait = ([n, d, p, num, c, ink, on]) => `<div class="flex col items-c" style="min-width:0">
      <div style="position:relative">${arch(166, 208, { cls: 'sm', inner: `<div style="position:absolute;inset:0;background:${c}"></div><div style="position:absolute;inset:0;background:radial-gradient(90% 55% at 50% 0%, rgba(255,255,255,.28), rgba(255,255,255,0))"></div><div style="position:absolute;inset:0;display:grid;place-items:center"><span class="fr" style="font:500 94px/1 var(--display);letter-spacing:-4px;color:${ink};font-variation-settings:'SOFT' 100">${num}</span></div>` })}
        ${on ? `<span class="enamel" style="position:absolute;right:2px;bottom:8px;width:34px;height:34px;border-radius:17px;display:grid;place-items:center">${ic('check', 18, { sw: 3 })}</span>` : ''}</div>
      <div class="fr" style="font:600 26px/30px var(--display);margin-top:14px;font-variation-settings:'SOFT' 100">${n}</div><div class="t-sub c2">${d}</div><span class="tag" style="margin-top:8px">${p}</span></div>`;
    return { html: `${navbar({ left: gb('x'), right: gbt('Modifier') })}<div class="scroll"><div style="padding-top:112px">
      <div class="pad"><div class="eyebrow" style="color:var(--sage-ink)">Profils</div><div class="largetitle" style="padding:6px 0 0">Ce soir, on suit…</div><div class="subtitle-nav" style="padding:6px 0 0">Tout l’espace suit le profil choisi : passeport, séances, bilans et messages.</div></div>
      <div class="sec" style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:14px">${kids.map(portrait).join('')}</div>
      <div class="sec" style="margin-top:26px"><div class="card flex items-c gap12" style="background:transparent;border:1.5px dashed var(--label4);box-shadow:none"><span class="ctint">${ic('plus', 24)}</span><span class="t-headline ctint">Ajouter un enfant</span></div></div>
      <div class="sec-f" style="margin:10px 16px 0">L’abonnement Maison est partagé avec ton co-parent : un seul paiement pour vous deux.</div>
      </div></div>` };
  };

  // H — Compétences de vie (détail)
  S.H = () => {
    const bars = SKILLS.map(([n, a, b]) => `<div class="rowi" style="min-height:58px"><div class="main"><div class="flex between"><span class="t-sub">${n}</span><span class="t-sub num"><b>${b}</b> <span style="color:var(--ok)">+${b - a}</span></span></div><div style="position:relative;height:8px;border-radius:4px;background:var(--fill);margin-top:7px"><span style="position:absolute;left:0;top:0;height:8px;width:${b}%;border-radius:4px;background:var(--chart)"></span><span style="position:absolute;top:-3px;left:calc(${a}% - 1px);width:2px;height:14px;border-radius:1px;background:var(--label2)"></span></div></div></div>`).join('');
    return { html: `<div class="scroll" style="z-index:0">${S.G().html}</div><div class="dim"></div>
      <div class="sheet" style="top:62px"><div class="grabber"></div><div class="sbar">${gb('x')}<span class="ttl fr" style="font-family:var(--display)">Compétences de vie</span>${gb('info')}</div>
        <div class="pad"><div class="seg"><span class="on">Global</span><span>Par compétence</span></div></div>
        <div class="flex items-c gap16" style="padding:18px 20px 0"><div class="fr num" style="font:500 60px/62px var(--display)">67</div><div><div class="t-headline" style="color:var(--ok)">+11 depuis le départ</div><div class="t-sub c2">LSSS · mi-parcours, séance 7</div></div></div>
        <div class="sec" style="margin-top:6px"><div class="card" style="padding:10px 12px 6px">${lsssCurve([56, 67, null])}</div></div>
        <div class="sec-h small"><h4>8 compétences · trait = départ</h4></div>
        <div class="sec"><div class="list">${bars}</div></div>
      </div>` };
  };

  // K — Maison : la page d'accueil, dans la présentation d'origine (« Soir de famille »)
  // — la lampe, l'affiche du soir en fond, Lancer en émail, les quatre portes en feutre,
  // la semaine en velours et ses trois étoiles, les rangées d'affiches, le carnet en papier.
  S.K = (o = {}) => {
    const trial = !!o.trial;
    const SAGE = NIGHT ? '#A7C4BC' : '#46695F';
    const disp = 'var(--display)';
    const card = 'background:var(--bg2);border:1px solid var(--sep);border-radius:26px;box-shadow:var(--shadow-card)';
    const pill = (t, on) => `<span class="chip${on ? ' on' : ''}" style="height:40px;padding:0 16px;font:600 14px/1 var(--sf)">${t}</span>`;
    const poster = (id, done = false) => { const a = ACTS[id]; return `<div style="width:148px;flex:none"><div style="position:relative;width:148px;height:148px;border-radius:20px;overflow:hidden;background:#F3EFE6;box-shadow:var(--shadow-card)"><img src="${vsrc(id)}" alt="" style="width:100%;height:100%;object-fit:cover">${done ? `<span style="position:absolute;top:9px;right:9px;width:24px;height:24px;border-radius:12px;background:#A7C4BC;color:#022539;display:grid;place-items:center">${ic('check', 14, { sw: 3 })}</span>` : ''}</div><div style="margin-top:8px;font:600 15px/19px var(--sf);color:var(--label)">${a.t}</div><div style="margin-top:2px;font:400 13px/17px var(--sf);color:var(--label2)">${a.d.join(' · ')} min</div></div>`; };
    const rowHead = (t, more) => `<div class="flex between items-c" style="margin:0 20px"><div class="fr" style="margin:0;font:600 22px/27px ${disp};color:var(--label);font-variation-settings:'SOFT' 100">${t}</div><span class="flex items-c gap4" style="font:600 14px/1 var(--sf);color:${SAGE}">${more}${ic('chevR', 14, { sw: 2.4 })}</span></div>`;
    const rail = (ids, doneIds = []) => `<div class="flex gap12" style="padding:0 20px;margin-top:14px;overflow:hidden">${ids.map((id) => poster(id, doneIds.includes(id))).join('')}</div>`;
    const doors = [['grid', 'Toutes les activités', true], ['compass', 'Le programme', false], ['book', 'Le carnet', false], ['bubble', 'Quand il dit non', false]];
    const doorIcon = { grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>' };
    const dIc = (n) => (doorIcon[n] ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${doorIcon[n]}</svg>` : ic(n, 20));
    const door = ([i, t, strong]) => `<div class="flex items-c gap12 ${strong ? 'felt-strong' : 'felt'}" style="min-height:76px;padding:12px 14px;border-radius:22px;${strong ? '' : 'background-color:var(--bg2);border:1px solid var(--sep);'}"><span style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:${strong ? 'rgba(247,245,242,.14)' : 'var(--badge-bg)'};color:${strong ? '#F7F5F2' : 'var(--badge-ink)'}">${dIc(i)}</span><span style="font:600 15px/19px var(--sf);color:${strong ? '#F7F5F2' : 'var(--label)'}">${t}</span></div>`;
    const star = (on) => on ? `<span class="star-on" style="width:64px;height:64px"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/></svg></span>` : `<span class="star-off" style="width:64px;height:64px">${ic('star', 28, { sw: 1.6 })}</span>`;
    const papers = [['jeudi 8 octobre', 'Mes trois personnes', '« Maman, Coach Lylian, Noah. Noah, c’est pour quand j’ai peur au hockey. »'], ['dimanche 4 octobre', 'Le podium des progrès', '« Avant, je lâchais après une erreur. Là, je reviens au jeu. »'], ['mercredi 30 septembre', 'Spaghetti cru, spaghetti cuit', 'Son corps qui se pose : épaules basses, trois respirations.']];
    return { auto: true, html: `<div class="scroll">
      <div style="position:relative">
        <section aria-label="Le moment recommandé ce soir" style="position:relative;height:676px;overflow:hidden">
          <img src="${vsrc('ACT-0802')}" alt="" style="position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(34px) saturate(1.15);opacity:${NIGHT ? '.55' : '.9'}">
          <img src="${vsrc('ACT-0802')}" alt="La cabane impossible" style="position:absolute;left:0;top:52px;width:402px;height:396px;object-fit:cover;object-position:50% 45%;-webkit-mask-image:linear-gradient(to bottom, #000 62%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,0) 0%, #000 12%, #000 88%, rgba(0,0,0,0) 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to bottom, #000 62%, rgba(0,0,0,0) 100%), linear-gradient(to right, rgba(0,0,0,0) 0%, #000 12%, #000 88%, rgba(0,0,0,0) 100%);mask-composite:intersect">
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom, ${NIGHT ? 'rgba(2,37,57,.55)' : 'rgba(247,245,242,.35)'} 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 44%, var(--bg) 72%, var(--bg) 100%)"></div>
          <div class="flex" style="position:absolute;top:110px;left:0;right:0;justify-content:center">${trial ? `<span class="glass flex items-c gap8" style="height:32px;padding:0 13px;border-radius:16px;font:600 13px/1 var(--sf);color:var(--tint-text)">${ic('gift', 15)}Essai gratuit · encore 24 jours</span>` : `<span class="glass flex items-c gap4" style="height:30px;padding:0 12px;border-radius:15px;color:${SAGE};font:600 12px/1 var(--sf)">${ic('check', 12, { sw: 3 })}Inclus avec ton programme ${PROG}</span>`}</div>
          <div style="position:absolute;left:20px;right:20px;bottom:6px">
            <span class="glass flex items-c gap8" style="display:inline-flex;height:32px;padding:0 13px;border-radius:16px;color:${SAGE};font:700 12px/1 var(--sf);letter-spacing:.1em;text-transform:uppercase">${ic('sparkle', 14)}Recommandé pour ${K.prenom} ce soir</span>
            <div class="fr" style="margin-top:12px;font:500 40px/42px ${disp};color:var(--label);font-variation-settings:'SOFT' 100">La cabane impossible</div>
            <p style="margin:10px 0 0;font:500 16px/22px var(--sf);color:var(--label2)">Le cœur de la semaine 8 : ${K.prenom} découvre qu’il réussit mieux en demandant.</p>
            <div class="flex gap8" style="margin-top:14px">${[['timer', '20 min'], ['figure', 'Actif'], ['gift', 'Coussins, couverture']].map(([i, t]) => `<span class="flex items-c gap4" style="height:30px;padding:0 11px;border-radius:15px;background:var(--fill3);border:1px solid var(--sep);color:var(--label);font:600 13px/1 var(--sf);white-space:nowrap">${ic(i, 14, { sw: 2.2 })}${t}</span>`).join('')}</div>
            <div class="flex items-c gap8" style="margin-top:18px">
              <span class="btn sun" style="flex:1.4;width:auto;height:56px;border-radius:28px;font-weight:700">${ic('play', 18)}Lancer · 20 min</span>
              <span class="glass flex items-c" style="flex:1;height:56px;border-radius:28px;justify-content:center;font:600 16px/1 var(--sf);color:var(--label)">Voir la fiche</span>
              <span class="glass" aria-label="Plus d’options" style="width:56px;height:56px;border-radius:28px;flex:none;display:grid;place-items:center;color:var(--label)">${ic('ellipsis', 22)}</span>
            </div>
          </div>
        </section>

        <div class="flex" style="justify-content:center;margin-top:22px"><span class="flex items-c gap8" style="height:44px;padding:0 18px;border-radius:22px;background:var(--fill3);border:1px solid var(--sep);font:600 15px/1 var(--sf);color:var(--label)">${ic('timer', 17)}20 min<span style="color:var(--label2)">·</span>${ic('house', 17)}À la maison${ic('chevD', 14, { sw: 2.4 })}</span></div>

        <nav style="margin:30px 20px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${doors.map(door).join('')}
          <div class="flex items-c gap12 felt" style="grid-column:span 2;min-height:64px;padding:10px 14px;border-radius:22px;background-color:var(--bg2);border:1px solid var(--sep);opacity:.8"><span style="width:40px;height:40px;border-radius:20px;flex:none;display:grid;place-items:center;background:var(--badge-bg);color:var(--badge-ink)">${ic('playRect', 20)}</span><span class="f1" style="font:600 15px/19px var(--sf);color:var(--label)">Les séances vidéo de 20 min</span><span style="height:24px;padding:0 10px;border-radius:12px;display:inline-flex;align-items:center;font:600 12px/1 var(--sf);background:#FFE7B8;color:#5A3A00">Bientôt</span></div></nav>

        <section class="velvet" style="margin:30px 20px 0;padding:24px 20px;border-radius:26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">
          <p class="fr" style="margin:0;font:500 30px/34px ${disp};font-variation-settings:'SOFT' 100">14 moments ensemble</p>
          <div class="flex gap16">${star(true)}${star(false)}${star(false)}</div>
          <p style="margin:0;font:600 14px/1 var(--sf);color:rgba(247,245,242,.84)">1 sur 3 cette semaine</p>
          <p style="margin:-6px 0 0;font:400 13.5px/1 var(--sf);color:rgba(247,245,242,.68)">3 semaines complètes d’affilée</p></section>

        <div style="margin-top:34px">${rowHead('Cette semaine', 'Le programme')}<p style="margin:6px 20px 0;font:400 14px/19px var(--sf);color:var(--label2)">Semaine 8 · Sur qui je compte. Les trois premières suffisent.</p>${rail(['ACT-0801', 'ACT-0802', 'ACT-0803', 'ACT-0804'], ['ACT-0801'])}</div>

        <div style="margin-top:34px">${rowHead('Selon ton moment', 'Tout voir')}
          <div class="flex gap8" style="padding:0 20px;margin-top:12px;overflow:hidden">${['Rien à préparer', 'Soir à plat', 'Il dit non', 'En voiture', 'Bouger', '30 minutes', 'Week-end'].map((t, i) => pill(t, i === 0)).join('')}</div>
          <p style="margin:10px 20px 0;font:400 14px/19px var(--sf);color:var(--label2)">Tu peux commencer dans la minute.</p>${rail(['ACT-0101', 'ACT-0403', 'ACT-0903', 'ACT-1103'], ['ACT-0101', 'ACT-0403'])}</div>

        <div style="margin-top:34px">${rowHead('Tout le parcours', 'Le programme')}
          <div class="flex gap8" style="padding:0 20px;margin-top:12px">${['Ancrer', 'Développer', 'Intégrer'].map((t, i) => pill(t, i === 1)).join('')}</div>
          <p style="margin:10px 20px 0;font:400 14px/19px var(--sf);color:var(--label2)">Semaines 3 à 10 : le cœur du travail.</p>${rail(['ACT-0301', 'ACT-0401', 'ACT-0501', 'ACT-0601'], ['ACT-0301', 'ACT-0401', 'ACT-0501', 'ACT-0601'])}</div>

        <div class="flex items-c" style="margin:30px 20px 0;height:56px;border-radius:28px;justify-content:center;gap:8px;border:1px solid var(--sep);background:var(--fill4);font:600 16px/1 var(--sf);color:var(--label)">${dIc('grid')}Voir les 53 activités, triées par âge</div>

        ${trial ? `<div class="flex items-c gap12" style="margin:24px 20px 0;padding:14px;${card}">${vimg('BON-01', 56, { r: 16 })}<div class="f1"><div style="font:600 16px/20px var(--sf);color:var(--label)">Envie d’aller plus loin ?</div><div style="font:400 14px/19px var(--sf);color:var(--label2)">Un coach, en groupe ou seul, près de chez toi.</div></div><span style="color:var(--label3)">${ic('chevR', 16, { sw: 2.4 })}</span></div>` : ''}

        <section style="margin:34px 20px 0"><div class="fr" style="margin:0 0 12px;font:600 22px/27px ${disp};color:var(--label);font-variation-settings:'SOFT' 100">Le carnet</div>
          <div class="flex col gap12">${papers.map(([d, t, p], i) => `<div class="paper laid" style="border-radius:20px;padding:16px;transform:rotate(${[-0.6, 0.5, -0.3][i]}deg)"><p class="fr" style="margin:0;font:italic 400 13px/17px ${disp};color:#46695F">${d}</p><p style="margin:4px 0 0;font:700 15px/19px var(--sf)">${t}</p><p class="fr" style="margin:6px 0 0;font:400 16px/22px ${disp}">${p}</p></div>`).join('')}</div>
          <span class="flex items-c gap4" style="margin-top:14px;font:600 15px/1 var(--sf);color:${SAGE}">Tout le carnet${ic('arrowR', 16)}</span></section>

        <footer style="margin:40px 20px 0;padding-top:20px;border-top:1px solid var(--sep);font:400 14px/1 var(--sf);color:var(--label2)">Les sources de la méthode</footer>
        <div style="height:140px"></div>
      </div></div>${navbar({ left: childPill(), right: gpair('bell', 'person') })}${tabbar(0)}` };
  };

  // K2 — Tout le parcours : les 13 semaines et toutes leurs activités (écran long, défilé)
  S.K2 = () => {
    const ids = Object.keys(ACTS);
    const card = (id) => {
      const a = ACTS[id], w = a.w || 0, done = w && w < 8;
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
    return { auto: true, html: `<div class="scroll"><div style="padding-top:108px">
      <div class="largetitle">Tout le parcours</div><div class="subtitle-nav">13 semaines · ${ids.length} activités. Les trois premières de chaque semaine suffisent ; les autres vont plus loin.</div>
      ${body}<div style="height:60px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('search'), edge: true })}` };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 03 · BILAN — la vraie page « Carte d'identité » de l'app, case par case,
  // dans la grammaire iOS 27 (verre à bords nets, grands détents, listes inset)
  // et l'identité de la marque (papier, feutre, velours, émail soleil).
  // Mêmes cartes, même ordre, mêmes textes que l'app ; seule l'enveloppe change.
  // ═══════════════════════════════════════════════════════════════════════
  const SAGE = '#A7C4BC', SUN = '#F9EB50';
  const BIL = {
    pct: 54, completed: 7,
    perma: [62, 66, 64, 71, 70, 78, 80],
    pillars: [['Engagement', 84], ['Persévérance', 79], ['Optimisme', 74], ['Connexion aux autres', 82], ['Bonheur', 85]],
    tools: [['Respiration 4-4', 'avant un match'], ['Ma phrase : « Je reviens au jeu »', 'après une erreur'], ['Le spaghetti cuit', 'quand je suis tendu'], ['Mes trois personnes', 'quand j’ai peur']],
    steps: [['Choisir mes trois personnes', 'done', ''], ['Demander de l’aide une fois d’ici dimanche', 'doing', '18 oct.'], ['Apporter le bâton cassé jeudi', 'todo', '15 oct.']],
    story: 'Léo a commencé le hockey à 5 ans, sur la patinoire du parc, avec son grand-père. Ailier gauche aux Faucons de Rosemont, il adore les matchs — mais il lâche vite après une erreur.',
    strengths: ['Persévérance', 'Humour', 'Bonté'],
    dream: 'Jouer toute la saison sans lâcher après une erreur.',
    smart: '3 rondelles récupérées par match d’ici le 15 novembre.',
    life: 'Revenir au calme en moins de 30 secondes après une erreur.',
    actions: ['Ma respiration avant chaque match', 'Mon effort à chaque présence', 'Mon calme après une erreur', 'Mon sourire avec mes coéquipiers'],
    routine: ['Respire · 3 cycles lents', 'Visualise le geste parfait', `Mot-ancre · « ${K.focus} »`, 'Action — j’y vais'],
  };
  const hint = `<span aria-hidden="true" style="position:absolute;right:4px;top:6px;width:40px;height:40px;display:grid;place-items:center;color:var(--label3)">${ic('chevR', 16, { sw: 2.4 })}</span>`;
  const bcard = (inner, st = '') => `<div class="card" style="position:relative;padding:18px;${st}">${hint}${inner}</div>`;
  const eyeL = (t, st = '') => `<div class="eyebrow" style="margin:0;${st}">${t}</div>`;
  const track = (p, color = SAGE, h = 7) => `<div style="height:${h}px;border-radius:${h / 2}px;background:var(--fill);overflow:hidden"><i style="display:block;height:100%;width:${p}%;border-radius:${h / 2}px;background:${color}"></i></div>`;
  const okTag = (t, c = 'var(--ok)') => `<span style="font:600 13px/1 var(--sf);color:${c};white-space:nowrap;display:inline-flex;align-items:center;gap:4px">${ic('check', 13, { sw: 3 })}${t}</span>`;
  const waitTag = (t, c = 'var(--label3)') => `<span style="font:600 13px/1 var(--sf);color:${c};white-space:nowrap">${t}</span>`;
  const toolHead = (title, badge) => `<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:14px;padding-right:30px"><span class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100">${title}</span>${badge}</div>`;
  const lockNote = (txt) => `<div class="flex gap8" style="align-items:flex-start;padding:12px 14px;border-radius:16px;background:var(--tint-soft);border:1px solid var(--sep)"><span style="color:var(--tint-text);margin-top:1px;flex:none">${ic('lock', 16, { sw: 2.2 })}</span><span class="t-foot" style="color:var(--label2);line-height:19px"><b style="color:var(--label)">Contenu réservé.</b> ${txt} <u style="color:var(--tint-text);font-weight:600">Voir les forfaits</u></span></div>`;
  const blurBars = `<div aria-hidden="true" style="filter:blur(5px);display:flex;align-items:flex-end;gap:8px;height:96px;padding:12px 4px 0">${[35, 55, 45, 70, 60, 85, 78].map((h) => `<div style="flex:1;height:${h}%;border-radius:4px 4px 0 0;background:rgba(167,196,188,.4)"></div>`).join('')}</div>`;

  // Courbe EPOCH : une mesure par séance (S1 → S13)
  const permaChart = (vals) => {
    const W = 292, H = 128, X = (s) => 10 + ((s - 1) / 12) * (W - 20), Y = (v) => 14 + ((100 - v) / 60) * (H - 34);
    const pts = vals.map((v, i) => [X(i + 1), Y(v)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg width="100%" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="display:block">
      ${[100, 80, 60].map((g) => `<line x1="0" x2="${W}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--sep)" stroke-dasharray="2 4"/>`).join('')}
      <path d="${d} L${last[0]} ${H - 20} L${pts[0][0]} ${H - 20}Z" fill="${SAGE}" opacity=".16"/>
      <path d="${d}" fill="none" stroke="${NIGHT ? SAGE : '#46695F'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.slice(0, -1).map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--bg2)" stroke="${NIGHT ? SAGE : '#46695F'}" stroke-width="2"/>`).join('')}
      <circle cx="${last[0]}" cy="${last[1]}" r="6.5" fill="${SUN}" stroke="var(--bg2)" stroke-width="2.5"/>
      <text x="${last[0] - 6}" y="${last[1] - 13}" text-anchor="end" font-size="12" font-weight="600" fill="var(--label)" font-family="var(--sf)">S${vals.length} · ${vals[vals.length - 1]}</text>
      ${[1, 3, 5, 7, 9, 11, 13].map((s) => `<text x="${X(s)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--label3)" font-family="var(--sf)">S${s}</text>`).join('')}
    </svg>`;
  };

  // ── G · LA PAGE BILAN ───────────────────────────────────────────────────
  S.G = (o = {}) => {
    const grp = !!o.grp;               // forfait Groupe : analyses réservées (teasers)
    const skills = SKILLS.slice(0, 4);
    const skillRow = (n, v, blur) => `<div class="flex items-c gap12" style="${blur ? 'filter:blur(5px)' : ''}"><span class="t-sub f1" style="color:var(--label2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n}</span><span style="width:88px;flex:none">${track(v, SAGE, 6)}</span><span class="fr num" style="width:26px;text-align:right;font:600 15px/1 var(--display)">${v}</span></div>`;
    const nodes = Array.from({ length: 13 }, (_, i) => {
      const n = i + 1, done = n <= DONE, cur = n === NEXT;
      const st = done ? `background:${SAGE};color:#06222A;` : cur ? `background:${SUN};color:#06222A;box-shadow:0 0 0 4px rgba(249,235,80,.28);` : 'box-shadow:inset 0 0 0 1px var(--fill);color:var(--label3);';
      const sub = n === 7 ? 'LSSS' : n === 13 ? 'Bilan' : `S${n}`;
      return `<div class="flex col items-c" style="gap:6px"><span class="fr num" style="width:36px;height:36px;border-radius:18px;display:grid;place-items:center;font:600 15px/1 var(--display);${st}">${n}</span><span style="font:600 10px/1 var(--sf);color:${cur ? 'var(--tint-text)' : done ? 'var(--label2)' : 'var(--label3)'}">${sub}</span></div>`;
    }).join('');
    const stepIcon = (s) => s === 'done' ? ic('check', 15, { sw: 2.6 }) : s === 'doing' ? ic('timer', 15, { sw: 2.2 }) : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
    const steps = BIL.steps.map(([t, s, due]) => `<div class="flex items-c gap12" style="padding:12px 14px;border-radius:16px;background:${s === 'done' ? 'var(--badge-bg)' : 'var(--fill4)'}"><span style="width:30px;height:30px;border-radius:15px;flex:none;display:grid;place-items:center;background:var(--bg2);color:${s === 'done' ? 'var(--ok)' : 'var(--tint-text)'}">${stepIcon(s)}</span><span class="t-sub" style="color:var(--label);line-height:19px">${t}${due ? ` <span style="color:var(--label3)">· ${due}</span>` : ''}</span></div>`).join('');
    const emoChips = `<div class="flex wrap gap8" style="justify-content:center"><span class="tag warm">Trac</span><span class="tag">Confiance</span><span class="tag gray">Détermination</span></div>`;
    const roLine = BIL.routine.map((t, i) => `<div style="position:relative;display:flex;align-items:center;gap:13px"><span class="fr" style="z-index:1;flex:none;width:30px;height:30px;border-radius:15px;display:grid;place-items:center;font:600 14px/1 var(--display);${i === 0 ? `background:${SUN};color:#06222A` : i === 3 ? 'box-shadow:inset 0 0 0 1px var(--fill);color:var(--label)' : `background:${SAGE};color:#06222A`}">${i + 1}</span><span class="t-sub" style="font-weight:${i === 3 ? 700 : 500};color:var(--label)">${t}</span></div>`).join('');

    const body = `
      <div style="padding-top:104px">
        <div class="sec" style="margin-bottom:12px"><div class="card flex items-c gap12" style="padding:14px 16px;background:var(--badge-bg)"><span class="ibadge">${ic('wave', 20)}</span><div class="f1"><div class="t-sub b" style="line-height:19px">Questionnaire bien-être à compléter — séance 8</div><div class="t-foot c2" style="line-height:17px">${K.prenom} a un court questionnaire (EPOCH) à remplir avec toi.</div></div><span class="btn sm gray" style="flex:none">Ouvrir</span></div></div>

        <div class="sec"><div style="position:relative;padding:8px 4px 2px">
          <div style="position:absolute;inset:-26px -20px -6px;background:radial-gradient(70% 90% at 14% 0%, rgba(249,235,80,${NIGHT ? '.14' : '.26'}), transparent 72%);pointer-events:none"></div>
          <div style="position:relative">${eyeL('Programme complété')}
            <div class="flex" style="align-items:baseline;gap:6px;margin-top:2px"><span class="fr num" style="font:600 104px/.9 var(--display);font-variation-settings:'SOFT' 100">${BIL.pct}</span><span class="fr" style="font:500 32px/1 var(--display);color:var(--label3)">%</span></div>
            <div class="t-sub" style="margin-top:12px;color:var(--label2);font-weight:500">${BIL.completed} séances sur 13 · en cours</div>
            <div style="margin-top:12px">${track(BIL.pct, SUN, 8)}</div></div></div></div>

        <div class="sec" style="margin-top:22px"><div class="flex items-c gap8">
          <div class="paper felt-edge f1" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px"><span style="position:relative;flex:none;display:inline-flex">${avatar(44, 'L', 'var(--kid)', KIDINK)}<span style="position:absolute;right:-6px;bottom:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:7px;background:${SAGE};color:#06222A;font:800 10px/20px var(--sf);text-align:center;box-shadow:0 0 0 2px #FFFEFB">${K.num}</span></span>
            <span class="f1" style="min-width:0"><div class="fr" style="font:600 18px/22px var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variation-settings:'SOFT' 100">${K.prenom} ${K.nom}</div><div class="t-foot" style="color:var(--label2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fr" style="font-family:var(--display);color:#46695F">« ${K.surnom} »</i> · ${K.age} ans · Les Faucons de Rosemont</div></span>${ic('chevR', 16, { sw: 2.4 }).replace('<svg', '<svg style="flex:none;color:var(--label3)"')}</div>
          <span class="gbtn ic glass" aria-label="Personnaliser le passeport" style="width:48px;height:48px;flex:none">${ic('pencil', 19)}</span></div></div>

        <div class="sec" style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          ${bcard(`${eyeL('Compétences de vie')}
            <div class="flex" style="align-items:baseline;gap:10px;margin-top:8px"><span class="fr num" style="font:600 52px/1 var(--display)">67</span><span class="t-sub" style="font-weight:600;color:var(--tint-text)">+11 pts depuis le départ</span></div>
            ${grp ? `<div style="margin-top:18px;display:flex;flex-direction:column;gap:14px">${[68, 44, 81].map((v) => skillRow('Compétence', v, true)).join('')}</div><div style="margin-top:14px">${lockNote('Le détail par compétence et son évolution sont inclus dès le pack Individuel.')}</div>`
              : `<div style="margin-top:18px;display:flex;flex-direction:column;gap:14px">${skills.map(([n, , v]) => skillRow(n, v)).join('')}</div>`}
            <div class="t-foot" style="margin-top:16px;color:var(--label2)">Basé sur le questionnaire LSSS · mesuré aux séances 1, 7 et 13.</div>`)}
          ${bcard(`<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px;padding-right:30px">${eyeL('Progression du bien-être')}${waitTag(`EPOCH · ${grp ? 'pack Individuel' : '7 séances'}`)}</div>
            ${grp ? `${blurBars}<div style="margin-top:12px">${lockNote('La courbe de bien-être EPOCH (mesurée après chaque séance : 5 dimensions scientifiques) est incluse dès le pack Individuel.')}</div>`
              : `<div class="flex gap8" style="margin-top:14px"><div style="display:flex;flex-direction:column;justify-content:space-between;padding:4px 0 24px;font:400 11px/1 var(--sf);color:var(--label3);text-align:right;width:34px;flex:none"><span>Élevé</span><span>Moyen</span><span>Bas</span></div><div class="f1" style="min-width:0">${permaChart(BIL.perma)}</div></div>
              <div style="display:flex;flex-direction:column;gap:11px;margin-top:16px">${BIL.pillars.map(([n, v]) => `<div class="flex items-c gap12"><span class="t-foot" style="width:122px;flex:none;color:var(--label2)">${n}</span><span class="f1">${track(v, SAGE, 6)}</span><span class="fr num" style="width:26px;text-align:right;font:600 13px/1 var(--display)">${v}</span></div>`).join('')}</div>
              <div class="t-foot" style="margin-top:14px;color:var(--label2);line-height:18px">Bien-être mesuré après chaque séance — échelle EPOCH (engagement, persévérance, optimisme, connexion aux autres, bonheur).</div>`}`)}
        </div>

        <div class="sec" style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
          ${bcard(`<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px;padding-right:30px">${eyeL('Parcours des 13 séances')}<span class="fr num" style="font:600 15px/1 var(--display);color:var(--tint-text)">${DONE}/13</span></div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px 2px;margin-top:16px">${nodes}</div>
            <div class="flex wrap gap16" style="margin-top:18px;padding-top:14px;border-top:1px solid var(--sep)">${[[SAGE, 'Terminée', ''], [SUN, 'En cours', ''], ['transparent', 'À venir', 'box-shadow:inset 0 0 0 1px var(--label3)']].map(([c, t, x]) => `<span class="t-foot" style="display:inline-flex;align-items:center;gap:7px;color:var(--label2)"><i style="width:8px;height:8px;border-radius:4px;background:${c};${x}"></i>${t}</span>`).join('')}</div>
            <div class="t-sub" style="margin-top:12px;color:var(--label2);font-weight:500;line-height:24px">Dernière validée · <b style="color:var(--label)">S${DONE}</b><br>Prochaine · <b style="color:var(--label)">S${NEXT}</b> · jeudi 15 oct.</div>`)}
          ${bcard(`${eyeL('Boîte à outils')}
            <div class="flex" style="align-items:baseline;gap:8px;margin-top:8px"><span class="fr num" style="font:600 44px/1 var(--display)">${BIL.tools.length}</span><span class="t-sub" style="font-weight:500;color:var(--label2)">/ 6 outils collectés</span></div>
            <div style="margin:14px 0 16px">${track(Math.round(BIL.tools.length / 6 * 100), SAGE, 7)}</div>
            <div style="display:flex;flex-direction:column;gap:10px">${BIL.tools.map(([t, c]) => `<div class="flex gap8" style="align-items:baseline"><i style="width:5px;height:5px;border-radius:50%;background:${SAGE};margin-top:8px;flex:none"></i><span class="t-sub" style="color:var(--label);line-height:20px">${t}<span style="color:var(--label3)"> — ${c}</span></span></div>`).join('')}</div>
            <div class="flex items-c gap12" style="margin-top:16px;padding:13px 16px;border-radius:16px;background:var(--tint-soft)"><span class="t-foot" style="color:var(--label2)">Focus word</span><span class="fr" style="margin-left:auto;font:600 19px/1 var(--display);letter-spacing:.04em;color:var(--tint-text)">${K.focus}</span></div>`)}
          ${bcard(`${eyeL('Prochaines étapes', 'margin-bottom:14px')}<div style="display:flex;flex-direction:column;gap:10px">${steps}</div>
            <div class="flex items-c gap8" style="justify-content:center;min-height:48px;margin-top:14px;padding-top:12px;border-top:1px solid var(--sep);font:600 15px/1 var(--sf);color:var(--tint-text)">Voir le parcours complet ${ic('arrowR', 17)}</div>`)}
        </div>

        <div style="margin:34px 20px 16px"><div class="fr" style="margin:0 0 4px;font:600 28px/33px var(--display);font-variation-settings:'SOFT' 100">Mes outils THRIVE</div><div class="t-sub" style="color:var(--label2);line-height:21px">Les livrables construits séance après séance — chacun son atelier.</div><div class="t-foot" style="margin-top:6px;font-weight:600;color:var(--tint-text)">8 ateliers · 5 renseignés</div></div>

        <div class="sec" style="display:flex;flex-direction:column;gap:12px">
          <div class="paper laid" style="position:relative;border-radius:26px;padding:18px">${hint}${toolHead('Fiche Identité Athlète', okTag('S1 · renseigné', '#33543F'))}
            <div class="eyebrow" style="margin:0 0 6px">Histoire sportive</div><p class="fr" style="margin:0 0 16px;font:400 16px/24px var(--display);font-variation-settings:'SOFT' 100">${BIL.story}</p>
            <div style="padding:14px 16px;border-radius:16px;background:rgba(0,78,122,.07);margin-bottom:16px"><div class="eyebrow" style="margin:0 0 4px;color:#004E7A">Rêve de saison</div><p class="fr" style="margin:0;font:italic 400 18px/25px var(--display)">« ${BIL.dream} »</p></div>
            <div class="eyebrow" style="margin:0 0 10px">Forces (VIA)</div><div class="flex wrap gap8">${BIL.strengths.map((s) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:12px;background:rgba(70,105,95,.14);font:600 13px/1 var(--sf);color:#33543F"><i style="width:6px;height:6px;border-radius:3px;background:#46695F"></i>${s}</span>`).join('')}</div></div>

          ${bcard(`${toolHead('Fiche Objectif THRIVE', okTag('S2 · renseigné'))}
            <div style="padding:14px 16px;border-radius:16px;background:var(--badge-bg);margin-bottom:16px"><p class="fr" style="margin:0;font:500 19px/26px var(--display);font-variation-settings:'SOFT' 100">${BIL.smart}</p></div>
            ${eyeL('Objectif life skill', 'margin-bottom:6px')}<p class="t-sub" style="margin:0 0 16px;color:var(--label);line-height:21px">${BIL.life}</p>
            ${eyeL('Ce qui dépend de moi', 'margin-bottom:10px')}<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">${BIL.actions.map((a) => `<div class="flex gap8" style="align-items:baseline"><span style="color:var(--tint-text);flex:none;line-height:0">${ic('check', 14, { sw: 2.6 })}</span><span class="t-sub" style="color:var(--label)">${a}</span></div>`).join('')}</div>
            <div class="flex wrap gap8" style="margin-bottom:16px">${[['S', 'Spécifique'], ['M', 'Mesurable'], ['A', 'Atteignable'], ['R', 'Réaliste'], ['T', 'Temporel']].map(([l, t]) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:12px;background:var(--fill4);font:500 13px/1 var(--sf);color:var(--label2)"><b class="fr" style="color:var(--tint-text);font-family:var(--display)">${l}</b>${t}</span>`).join('')}</div>
            <div class="flex between items-c" style="margin-bottom:10px"><span class="t-sub" style="color:var(--label2)">Progression du parcours</span><span class="fr num" style="font:600 16px/1 var(--display);color:var(--tint-text)">${BIL.pct} %</span></div>${track(BIL.pct, SUN, 7)}`)}

          <div class="velvet" style="position:relative;border-radius:26px;padding:24px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px"><span aria-hidden="true" style="position:absolute;right:4px;top:6px;width:40px;height:40px;display:grid;place-items:center;color:rgba(247,245,242,.5)">${ic('chevR', 16, { sw: 2.4 })}</span>
            <div class="eyebrow" style="margin:0 0 8px;color:rgba(247,245,242,.72)">Focus Word · S9</div><div class="fr" style="font:600 46px/50px var(--display);letter-spacing:.06em;color:${SUN};font-variation-settings:'SOFT' 100">${K.focus.toUpperCase()}</div><div style="margin-top:8px;font:600 12px/1 var(--sf);letter-spacing:.1em;text-transform:uppercase;color:rgba(247,245,242,.72)">Mot-ancre actif</div></div>

          ${bcard(`<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;padding-right:30px"><span class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100">Roue des Émotions</span>${waitTag('Séances S4 · S5')}</div>
            <div style="position:relative;width:150px;height:150px;margin:18px auto"><div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from -90deg,${SUN} 0 25%,${SAGE} 25% 50%,#6FA8B0 50% 75%,#cdbf78 75% 100%);-webkit-mask:radial-gradient(circle at 50% 50%,transparent 47px,#000 48px);mask:radial-gradient(circle at 50% 50%,transparent 47px,#000 48px);opacity:.92"></div>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">${grp ? `<span class="t-foot b" style="color:var(--label2)">Identifiée</span><span class="fr" aria-hidden="true" style="font:600 22px/1 var(--display);color:var(--tint-text);filter:blur(6px)">Trac</span>` : `<span class="t-foot b" style="color:var(--label2)">Identifiée</span><span class="fr" style="font:600 22px/1 var(--display);color:var(--tint-text)">Trac</span>`}</div></div>
            ${grp ? lockNote('La roue des émotions et le suivi de séance en séance sont inclus dès le pack Individuel.') : emoChips}`)}

          ${bcard(`<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:18px;padding-right:30px"><span class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100">Routine pré-tir</span>${waitTag('Séance S6')}</div>
            <div style="position:relative;display:flex;flex-direction:column;gap:14px"><div style="position:absolute;left:14px;top:14px;bottom:14px;width:2px;background:linear-gradient(180deg,${SUN},${SAGE} 60%,rgba(167,196,188,.3))"></div>${roLine}</div>`)}

          ${bcard(`<div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:6px;padding-right:30px"><span class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100">Contrat de confiance</span>${waitTag('Séance S1')}</div>
            ${[['Athlète', K.prenom], ['Coach', K.coach], ['Parent', 'Engagé']].map(([r, v], i, a) => `<div class="flex between items-c" style="gap:10px;padding:12px 0;${i < a.length - 1 ? 'border-bottom:1px solid var(--sep)' : ''}"><span style="min-width:0"><div class="eyebrow" style="margin:0;font-size:11px;color:var(--label3)">${r}</div><div class="fr" style="font:italic 400 18px/24px var(--display)">${v}</div></span><span style="width:26px;height:26px;flex:none;border-radius:13px;display:grid;place-items:center;background:var(--badge-bg);color:var(--ok)">${ic('check', 14, { sw: 2.6 })}</span></div>`).join('')}
            <div class="flex items-c gap8" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--sep);font:600 15px/1 var(--sf);color:var(--tint-text);min-height:44px">${ic('arrowUp', 17).replace('<svg', '<svg style="transform:rotate(180deg)"')}Télécharger le contrat signé</div>`)}

          <div class="paper laid" style="position:relative;border-radius:26px;padding:18px">${hint}${toolHead('Lettre à moi-même dans 1 an', waitTag('S13 · à venir', '#5A6C73'))}
            <div style="border-radius:16px;background:rgba(0,49,76,.05);padding:18px"><p class="fr" style="margin:0 0 14px;font:italic 400 16px/20px var(--display);color:#33454F">Chère ${K.prenom},</p><div style="display:flex;flex-direction:column;gap:10px">${[92, 100, 84, 60].map((w) => `<i style="display:block;height:7px;width:${w}%;border-radius:4px;background:rgba(0,49,76,.16)"></i>`).join('')}</div></div>
            <div style="margin-top:12px;font:500 14px/19px var(--sf);color:#33454F">À écrire lors de la séance bilan (S13).</div></div>

          <div style="position:relative;border:1.5px dashed var(--label4, rgba(127,127,127,.4));border-radius:26px;padding:18px">${hint}${toolHead('Certificat THRIVE', waitTag('à venir · S13'))}
            <p class="t-sub" style="margin:0 0 16px;color:var(--label2);line-height:21px">Reconnaissance officielle de fin de parcours — débloquée à la dernière séance.</p>
            <div class="flex between" style="margin-bottom:10px"><span class="t-sub" style="color:var(--label2)">${DONE}/13 séances</span><span class="fr num" style="font:600 16px/1 var(--display);color:var(--label2)">${13 - DONE} restantes</span></div>${track(BIL.pct, SAGE, 7)}
            <div class="flex items-c gap10" style="margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--tint-soft)"><span style="color:var(--tint-text);flex:none;line-height:0">${ic('lock', 16, { sw: 2 })}</span><span class="t-foot" style="color:var(--label2);line-height:18px;margin-left:8px">Disponible en téléchargement dès la validation de la séance 13.</span></div></div>
        </div>
        <div style="height:150px"></div>
      </div>`;
    if (o.locked) {
      return { html: `<div class="scroll"><div style="filter:blur(7px);opacity:.55;pointer-events:none;max-height:874px;overflow:hidden" aria-hidden="true">${body}</div></div>
        ${navbar({ left: childPill(), right: gb('bell') })}
        ${programLock('Le Bilan s’ouvre avec un coach', `Ton coach y construit le passeport de ${K.prenom} : ses forces, ses objectifs, ses jauges, et un bilan après chaque séance.`)}${tabbar(1)}` };
    }
    return { auto: true, html: `<div class="scroll">${body}</div>${navbar({ edge: true, title: 'Bilan', left: childPill(), right: gpair('pencil', 'bell') })}${tabbar(1)}` };
  };

  // ── Fiches détaillées (clic sur une carte) ──────────────────────────────
  const dLabel = (t) => `<div class="eyebrow" style="margin:0 0 8px;font-size:11px;color:var(--label3)">${t}</div>`;
  const DMETA = {
    boite: ['target', 'Boîte à outils', 'Construite au fil des séances'], etapes: ['check', 'Prochaines étapes', 'Définies avec le coach'],
    identite: ['idcard', 'Fiche Identité Athlète', 'Séance S1'], objectif: ['target', 'Fiche Objectif THRIVE', 'Séance S2'],
    focus: ['sparkle', 'Focus Word', 'Séance S9'], routine: ['timer', 'Routine pré-tir', 'Séance S6'],
    lettre: ['envelope', 'Lettre à moi-même dans 1 an', 'Séance S13'], certificat: ['medal', 'Certificat THRIVE', 'Fin de parcours'],
  };
  const dBody = (k) => {
    const row = (inner, st = '') => `<div style="padding:13px 15px;border-radius:15px;background:var(--badge-bg);${st}">${inner}</div>`;
    if (k === 'boite') return `<div class="flex" style="align-items:baseline;gap:8px;margin-bottom:16px"><span class="fr num" style="font:600 44px/1 var(--display)">${BIL.tools.length}</span><span class="t-sub" style="color:var(--label2)">/6 outils collectés</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">${BIL.tools.map(([t, c]) => row(`<div class="t-headline" style="line-height:21px">${t}</div><div class="t-sub c2" style="margin-top:3px">${c}</div>`)).join('')}</div>
      <div class="flex items-c gap12" style="margin-top:16px;padding:14px 16px;border-radius:15px;background:var(--tint-soft)"><span class="t-foot c2">Focus word</span><span class="fr" style="margin-left:auto;font:600 22px/1 var(--display);color:var(--tint-text)">${K.focus}</span></div>`;
    if (k === 'etapes') return `<div style="display:flex;flex-direction:column;gap:10px">${BIL.steps.map(([t, s, due]) => `<div class="flex items-c gap12" style="padding:14px 15px;border-radius:15px;background:${s === 'done' ? 'var(--badge-bg)' : 'var(--fill4)'}"><span style="width:40px;height:40px;border-radius:13px;flex:none;display:grid;place-items:center;background:var(--bg2);color:${s === 'done' ? 'var(--ok)' : 'var(--tint-text)'}">${s === 'done' ? ic('check', 18, { sw: 2.6 }) : s === 'doing' ? ic('timer', 18) : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>'}</span><div><div class="t-headline" style="line-height:21px">${t}</div><div class="t-foot c2" style="margin-top:2px">${s === 'done' ? 'Terminé' : s === 'doing' ? 'En cours' : 'À venir'}${due ? ' · ' + due.replace('oct.', 'octobre') : ''}</div></div></div>`).join('')}</div>`;
    if (k === 'identite') return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px">${[['Sport', K.sport], ['Poste', 'Ailier G.'], ['Club', 'Faucons']].map(([l, v]) => `<div style="padding:11px 12px;border-radius:14px;background:var(--fill4)"><div class="eyebrow" style="margin:0 0 3px;font-size:10px;color:var(--label3)">${l}</div><div class="t-sub b">${v}</div></div>`).join('')}</div>
      ${dLabel('Histoire sportive')}<p class="fr" style="margin:0 0 18px;font:400 16px/24px var(--display)">${BIL.story}</p>
      ${dLabel('Forces (VIA)')}<div class="flex wrap gap8" style="margin-bottom:18px">${BIL.strengths.map((s) => `<span style="padding:9px 15px;border-radius:12px;background:var(--badge-bg);color:var(--badge-ink);font:600 15px/1 var(--sf)">${s}</span>`).join('')}</div>
      <div style="position:relative;padding:16px 18px 16px 44px;border-radius:16px;background:var(--tint-soft)"><span class="fr" style="position:absolute;left:14px;top:6px;font:400 36px/1 var(--display);color:var(--tint-text);opacity:.6">“</span><div class="eyebrow" style="margin:0 0 4px;color:var(--tint-text)">Rêve de saison</div><p class="fr" style="margin:0;font:italic 400 19px/26px var(--display)">${BIL.dream}</p></div>`;
    if (k === 'objectif') return `<div style="position:relative;padding:18px 20px 18px 44px;border-radius:16px;background:var(--badge-bg);margin-bottom:18px"><span class="fr" style="position:absolute;left:14px;top:6px;font:400 38px/1 var(--display);color:var(--tint-text);opacity:.6">“</span>${dLabel('Objectif SMART')}<p class="fr" style="margin:0;font:500 21px/28px var(--display)">${BIL.smart}</p></div>
      ${dLabel('Objectif life skill')}<p class="t-body" style="margin:0 0 18px;line-height:23px">${BIL.life}</p>
      ${dLabel('Ce qui dépend de moi')}<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:18px">${BIL.actions.map((a) => `<div class="flex gap8" style="align-items:baseline"><span style="color:var(--tint-text);line-height:0;flex:none">${ic('check', 15, { sw: 2.6 })}</span><span class="t-body" style="font-weight:500">${a}</span></div>`).join('')}</div>
      <div class="flex between items-c" style="margin-bottom:9px"><span class="t-sub c2">Progression du parcours</span><span class="fr num" style="font:600 17px/1 var(--display);color:var(--tint-text)">${BIL.pct}%</span></div>${track(BIL.pct, `linear-gradient(90deg,${SAGE},${SUN})`, 10)}`;
    if (k === 'focus') return `<div class="center" style="padding:30px 0 6px"><div class="velvet" style="border-radius:26px;padding:34px 20px"><div class="fr" style="font:600 56px/60px var(--display);letter-spacing:.06em;color:${SUN}">${K.focus.toUpperCase()}</div><div style="margin-top:14px;font:600 12px/1 var(--sf);letter-spacing:.1em;text-transform:uppercase;color:rgba(247,245,242,.72)">Mot-ancre actif de ${K.prenom}</div></div>
      <p class="t-sub c2" style="margin:20px auto 0;max-width:340px;line-height:22px">Choisi à la séance S9, ce mot ramène l’attention au bon endroit dans les moments importants — avant un match, un examen, un moment de pression.</p></div>`;
    if (k === 'routine') return `<div style="position:relative;display:flex;flex-direction:column;gap:20px;padding-left:4px"><div style="position:absolute;left:22px;top:16px;bottom:16px;width:2px;background:linear-gradient(180deg,${SUN},${SAGE} 60%,rgba(167,196,188,.3))"></div>${BIL.routine.map((t, i) => `<div style="position:relative;display:flex;align-items:center;gap:16px"><span class="fr" style="z-index:1;flex:none;width:38px;height:38px;border-radius:19px;display:grid;place-items:center;font:600 15px/1 var(--display);${i === 0 ? `background:${SUN};color:#06222A` : i === 3 ? 'box-shadow:inset 0 0 0 1px var(--fill);color:var(--label)' : `background:${SAGE};color:#06222A`}">${i + 1}</span><span class="t-body" style="font-weight:${i === 3 ? 700 : 500}">${t}</span></div>`).join('')}</div>
      <p class="t-foot c2" style="margin:22px 0 0;line-height:19px">Travaillée à la séance S6, cette routine se répète à l’identique avant chaque geste important pour installer calme et constance.</p>`;
    if (k === 'lettre') return `<div class="paper laid" style="border-radius:22px;padding:22px"><p class="fr" style="margin:0 0 14px;font:italic 400 16px/20px var(--display);color:#33454F">Chère ${K.prenom},</p><div style="display:flex;flex-direction:column;gap:11px">${[92, 100, 84, 96, 60].map((w) => `<i style="display:block;height:7px;width:${w}%;border-radius:4px;background:rgba(0,49,76,.16)"></i>`).join('')}</div></div>
      <p class="t-sub c2" style="margin:16px 0 0;line-height:21px">La lettre sera écrite lors de la séance bilan (S13), puis scellée ici pendant un an.</p>`;
    return `<p class="t-body c2" style="margin:0 0 20px;line-height:23px">Reconnaissance officielle de fin de parcours de ${K.prenom} — débloquée à la dernière séance.</p>
      <div class="flex between items-c" style="margin-bottom:9px"><span class="t-sub c2">${DONE}/13 séances</span><span class="fr num" style="font:600 16px/1 var(--display);color:var(--label2)">${13 - DONE} restantes</span></div>${track(Math.round(DONE / 13 * 100), `linear-gradient(90deg,${SAGE},${SUN})`, 11)}
      <div class="flex items-c gap10" style="margin-top:18px;padding:14px 16px;border-radius:15px;background:var(--tint-soft)"><span style="color:var(--tint-text);flex:none;line-height:0">${ic('lock', 17, { sw: 2 })}</span><span class="t-sub c2" style="line-height:19px;margin-left:8px">Disponible en téléchargement dès la validation de la séance 13.</span></div>`;
  };
  const bilanSheet = (k) => {
    const [icn, title, sess] = DMETA[k];
    return { html: `<div class="scroll" style="z-index:0">${S.G().html}</div><div class="dim"></div>
      <div class="sheet" style="top:66px;bottom:0;overflow:hidden"><div class="grabber"></div><div class="sbar">${gb('x')}<span class="ttl fr" style="font-family:var(--display)">${title}</span><span style="width:44px"></span></div>
        <div class="flex items-c gap12" style="padding:6px 20px 0"><span class="ibadge lg">${ic(icn, 24)}</span><div><div class="fr" style="font:600 22px/26px var(--display);font-variation-settings:'SOFT' 100">${title}</div><div class="t-foot c2">${K.prenom} · ${sess}</div></div></div>
        <div style="padding:20px 20px 0">${dBody(k)}</div>
        <div style="position:absolute;right:20px;bottom:34px"><span class="btn md ${k === 'focus' ? 'gray' : 'sun'}" style="width:auto;height:52px;padding:0 22px">Comprendre cette carte${ic('arrowR', 19)}</span></div>
      </div>` };
  };
  ['identite', 'objectif', 'focus', 'routine', 'boite', 'etapes', 'lettre', 'certificat'].forEach((k, i) => { S['G' + (i + 3)] = () => bilanSheet(k); });

  // I — « Comprendre cette carte » : la fiche d'explication de l'app, par-dessus la fiche détaillée
  S.I = () => {
    const secs = [['C’est quoi ?', 'Un score qui résume où en est ton enfant dans ses « life skills » : les compétences qu’on apprend par le sport mais qu’on utilise dans toute la vie — à l’école, à la maison, avec les amis.', null],
      ['Les 8 familles mesurées', null, ['Fixer des objectifs', 'Gérer ses émotions', 'Travailler en équipe', 'Communiquer', 'Créer des liens (habiletés sociales)', 'Prendre le leadership', 'Résoudre des problèmes', 'Gérer son temps']],
      ['Pourquoi c’est le vrai but ?', 'THRIVE n’est pas un programme pour former un meilleur joueur de hockey — c’est un programme pour former un jeune plus solide, qui utilise le hockey comme terrain d’entraînement. Le score qui monte, c’est ça, la victoire.', null]];
    return { html: `<div class="scroll" style="z-index:0">${S.G().html}</div><div class="dim" style="background:rgba(0,0,0,.3)"></div>
      <div class="sheet" style="top:66px;bottom:0;overflow:hidden"><div class="grabber"></div><div class="sbar"><span style="width:44px"></span><span class="ttl">Comprendre cette carte</span>${gb('x')}</div>
        <div style="padding:2px 20px 0"><div class="flex items-c gap10" style="margin-bottom:10px"><span class="ibadge lg">${ic('check', 22, { sw: 2.4 })}</span><span class="tag" style="margin-left:10px">Score global</span></div>
          <div class="fr" style="font:600 28px/32px var(--display);font-variation-settings:'SOFT' 100">Compétences de vie</div><p class="t-sub c2" style="margin:4px 0 14px;line-height:20px">Le niveau global des habiletés utiles partout — pas juste sur la glace.</p>
          <div style="display:flex;flex-direction:column;gap:10px">${secs.map(([l, t, b]) => `<div style="padding:13px 15px;border-radius:15px;background:var(--fill4)"><div class="eyebrow" style="margin:0 0 6px;font-size:10.5px">${l}</div>${t ? `<p class="t-sub" style="margin:0;line-height:20px;color:var(--label)">${t}</p>` : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px">${b.map((x) => `<div class="flex gap8" style="align-items:baseline"><span style="color:var(--tint-text);font-size:10px;flex:none">✦</span><span class="t-foot" style="color:var(--label);line-height:17px">${x}</span></div>`).join('')}</div>`}</div>`).join('')}
            <div class="paper" style="border-radius:15px;padding:13px 15px;display:flex;gap:10px"><span style="color:#46695F;line-height:0;flex:none;margin-top:2px">${ic('house', 18)}</span><div><div class="eyebrow" style="margin:0 0 4px;font-size:10.5px">À la maison</div><p class="t-foot" style="margin:0;line-height:18px;color:#022539">Cette jauge suit les mesures LSSS (S1 · S7 · S13) : elle avance au rythme des vraies évaluations, pas des impressions.</p></div></div></div></div></div>` };
  };

  // J — Personnaliser le passeport (photo, surnom, n° de maillot, couleur) — feuille sur la page Bilan
  S.J = () => {
    const sw = [['Soleil', '#F9EB50'], ['Ambre', '#F6B45A'], ['Sauge', '#A7C4BC'], ['Ciel', '#6EC1E4'], ['Corail', '#F58A7E'], ['Violet', '#B79CE4']];
    const cur = 'Sauge';
    return { html: `<div class="scroll" style="z-index:0">${S.G().html}</div><div class="dim"></div>
      <div class="sheet" style="top:66px;bottom:0;overflow:hidden"><div class="grabber"></div><div class="sbar">${gb('x')}<span class="ttl fr" style="font-family:var(--display)">Personnaliser le passeport</span><span style="width:44px"></span></div>
        <div class="flex items-c gap16" style="padding:8px 20px 0"><span style="position:relative;flex:none">${avatar(76, 'L', 'var(--kid)', KIDINK).replace('class="avatar fr"', 'class="avatar fr" data-x')}<span style="position:absolute;right:-8px;bottom:-8px;min-width:26px;height:26px;padding:0 6px;border-radius:9px;background:${SAGE};color:#06222A;font:800 12px/26px var(--sf);text-align:center;box-shadow:0 0 0 2px var(--bg2)">${K.num}</span></span>
          <div style="display:flex;flex-direction:column;gap:6px"><span class="btn sm gray" style="width:auto">${ic('camera', 17)}Changer la photo</span><span class="t-foot c2" style="padding-left:6px">Retirer la photo</span></div></div>
        <div class="sec" style="margin-top:20px;display:grid;grid-template-columns:1fr 108px;gap:12px"><div class="list"><div class="field" style="flex-direction:column;align-items:flex-start;gap:4px;padding:10px 16px"><label style="font-size:12px">Surnom d’athlète</label><span class="in" style="width:100%">${K.surnom}<span class="caret"></span></span></div></div><div class="list"><div class="field" style="flex-direction:column;align-items:flex-start;gap:4px;padding:10px 16px"><label style="font-size:12px">N° maillot</label><span class="in num">${K.num}</span></div></div></div>
        <div class="sec-h small"><h4>Couleur du passeport</h4></div>
        <div class="sec"><div class="list" style="padding:16px 12px"><div class="flex between">${sw.map(([n, c]) => `<div class="flex col items-c gap4" style="width:52px"><span style="width:44px;height:44px;border-radius:22px;background:${c};box-shadow:inset 0 1px 0 rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.14)${n === cur ? ',0 0 0 3px var(--bg2),0 0 0 5.5px ' + c : ''}"></span><span class="t-cap ${n === cur ? 'b' : 'c2'}">${n}</span></div>`).join('')}</div></div></div>
        <div class="sec" style="margin-top:22px"><span class="btn sun">Enregistrer</span><p class="t-cap c2 center" style="margin:12px 0 0">La photo reste privée : visible uniquement par la famille, le coach et l’équipe THRIVE.</p></div>
      </div>` };
  };
  S.G11 = () => S.G({ grp: true });

  // D2 — Essai gratuit THRIVE Maison (paywall App Store, règle 3.1.2) : le mois gratuit d'abord
  S.D2 = () => {
    const plan = (on, name, perMonth, billed, badge) => `<div class="card flex items-c gap12" style="padding:14px 16px;${on ? 'box-shadow:0 0 0 2.5px var(--tint)' : ''}">
        ${on ? `<span style="width:24px;height:24px;border-radius:12px;flex:none;background:var(--tint);color:var(--tint-ink);display:grid;place-items:center">${ic('check', 14, { sw: 3 })}</span>` : '<span style="width:24px;height:24px;border-radius:12px;flex:none;box-shadow:inset 0 0 0 2px var(--label3)"></span>'}
        <div class="f1"><div class="flex items-c gap8"><span class="t-headline">${name}</span>${badge ? `<span class="tag">${badge}</span>` : ''}</div><div class="t-foot c2" style="margin-top:2px">${billed}</div></div>
        <div style="text-align:right"><div class="num" style="font:700 20px/24px var(--sf)">${perMonth}</div><div class="t-cap c2">par mois</div></div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:110px">
      <div class="flex items-c gap12" style="padding:0 24px">${arch(62, 70, { cls: 'xs' })}<div><div class="eyebrow" style="font-size:11px">THRIVE Maison</div><div class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100;margin-top:2px">Le moment qui compte, 10 min par soir</div></div></div>
      <div class="center" style="margin-top:16px">
        <div class="flex" style="justify-content:center;align-items:baseline;gap:10px"><span class="fr" style="font:400 62px/1 var(--display);letter-spacing:-.5px;color:var(--label);font-variation-settings:'SOFT' 100">0 $</span><span class="fr" style="font:italic 400 19px/1 var(--display);color:var(--label2)">par mois, pendant 1 mois</span></div>
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
      <div style="height:130px"></div></div></div>
      ${navbar({ left: gb('x'), right: gbt('Restaurer') })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:30px;border-radius:34px;padding:6px"><span class="btn sun">Commencer mon mois gratuit</span><div class="t-cap c2 center" style="padding:6px 0 2px">0 $ aujourd’hui · rien à payer avant le 10 nov.</div></div>` };
  };

  // D3 — Confirmation d'achat App Store (feuille système, volontairement neutre : c'est Apple qui parle)
  S.D3 = () => ({ html: `<div class="scroll">${S.D2().html}</div><div class="dim" style="background:rgba(0,0,0,.4)"></div>
    <div class="sheet" style="background:${NIGHT ? '#1C1C1E' : '#F2F2F7'};--bg2:${NIGHT ? '#2C2C2E' : '#FFFFFF'};--label:${NIGHT ? '#fff' : '#000'};--label2:${NIGHT ? 'rgba(235,235,245,.6)' : 'rgba(60,60,67,.6)'};--sep:${NIGHT ? 'rgba(84,84,88,.6)' : 'rgba(60,60,67,.29)'};color:var(--label);padding:0 0 34px">
      <div class="flex between items-c" style="padding:16px 18px 6px"><span style="font:700 20px/25px var(--sf)">App Store</span>${gb('x')}</div>
      <div class="sec"><div class="list" style="background:var(--bg2);border-color:transparent;box-shadow:none"><div class="rowi ico-lg" style="min-height:72px"><img src="assets/logo.png" width="48" height="48" style="border-radius:11px" alt=""><div class="main"><div class="t b">THRIVE Maison — Annuel</div><div class="d">THRIVE Sport Positive · Abonnement</div></div></div></div></div>
      <div class="sec" style="margin-top:12px"><div class="list" style="background:var(--bg2);border-color:transparent;box-shadow:none"><div class="rowi"><div class="main"><div class="t">Essai gratuit</div><div class="d">1 mois</div></div><span class="val">0,00 $</span></div><div class="rowi"><div class="main"><div class="t">À partir du 10 nov. 2026</div><div class="d">Se renouvelle chaque année</div></div><span class="val num">299,00 $ CA</span></div><div class="rowi"><div class="main"><div class="t">Compte</div></div><span class="val">${PARENT.email.replace('.tremblay', '…')}</span></div></div></div>
      <div class="flex col items-c" style="margin-top:22px;gap:6px"><span style="width:56px;height:56px;border-radius:16px;border:2px solid #0A84FF;color:#0A84FF;display:grid;place-items:center">${ic('faceid', 32, { sw: 1.6 })}</span><div class="t-sub b">Confirmer avec le bouton latéral</div></div>
    </div>` });

  // L — Fiche moment : l'affiche en grand dans l'arche de lin, puis une liste d'étapes
  S.L = () => ({ html: `<div class="scroll"><div style="padding-top:0">
    <div style="height:372px;position:relative;overflow:hidden">
      <img src="${vsrc('ACT-0802')}" alt="" style="position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(34px) saturate(1.15);opacity:${NIGHT ? '.5' : '.85'}">
      <img src="${vsrc('ACT-0802')}" alt="La cabane impossible" style="position:absolute;left:0;top:52px;width:402px;height:330px;object-fit:cover;object-position:50% 45%;-webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 100%);mask-image:linear-gradient(to bottom,#000 70%,transparent 100%)">
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0) 62%, var(--bg) 100%)"></div>
      <div style="position:absolute;left:20px;right:20px;bottom:6px"><div class="eyebrow">Semaine 8 · Moment 2</div><div class="fr" style="font:500 38px/40px var(--display);font-variation-settings:'SOFT' 100;margin-top:6px">La cabane impossible</div></div></div>
    <div class="pad" style="margin-top:12px"><div class="t-callout c2">Objectif : votre enfant découvre par lui-même qu’il réussit mieux en demandant.</div></div>
    <div class="sec" style="margin-top:14px"><div class="seg"><span class="num">10 min</span><span class="on num">20 min</span><span class="num">30 min</span></div></div>
    <div class="sec" style="margin-top:14px"><div class="paper laid" style="border-radius:22px;padding:18px"><div class="kick" style="display:flex;align-items:center;gap:6px">${ic('quote', 15)}Ce que tu dis pour commencer</div><div class="fr" style="font:400 20px/27px var(--display);margin-top:8px;font-variation-settings:'SOFT' 100">« Défi : une cabane avec les coussins et la couverture. Je suis là si t’as besoin. »</div><div class="flex gap8" style="margin-top:12px"><span class="btn sm gray" style="background:rgba(0,49,76,.07);color:#022539">${ic('copy', 16)}Copier la phrase</span></div></div></div>
    <div class="sec-h small"><h4>Ce que tu vas faire</h4></div>
    <div class="sec"><div class="list">${['Il construit seul.', 'Vous êtes là. Vous ne faites rien.', 'Ça coince ? Attendez sa demande.', 'Il demande : aidez tout de suite.', '« T’as demandé. C’est ça qu’il fallait. »'].map((t, i) => `<div class="rowi ico"><span class="ibadge"><b class="fr" style="font:600 16px/1 var(--display)">${i + 1}</b></span><div class="main"><div class="t">${t}</div></div></div>`).join('')}</div></div>
    <div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'leaf', t: 'Pourquoi ça marche', val: 'Niveau A' })}${rowi({ icon: 'hand', t: 'S’il dit non' })}</div></div>
    <div style="height:130px"></div></div></div>
    ${navbar({ left: gb('chevL'), right: gpair('star', 'ellipsis') })}
    <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:34px;padding:6px;display:flex;gap:6px"><span class="btn gray" style="width:auto;padding:0 18px;background:transparent">Pas ce soir</span><span class="btn sun f1">${ic('play', 18)}Commencer · 20 min</span></div>` });

  // N — Le carnet : papier vergé, objets en feutre
  S.N = () => {
    const items = [['Ses trois forces', 'Les trois choses · « Il n’abandonne pas, il aide Noah, il rit fort »', 'ACT-0101'], ['Ce qui dépend de lui', 'Ce qui dépend de toi · 4 choses notées', 'ACT-0201'], ['Sa phrase', 'Deux outils, tu choisis · « Je reviens au jeu »', 'ACT-0501'], ['Ses trois personnes', 'Mes trois personnes · Maman, Coach Lylian, Noah', 'ACT-0801']];
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Le carnet</div><div class="subtitle-nav">Il se remplit tout seul, moment après moment.</div>
      <div class="sec-h"><h4>Gagné · à ouvrir</h4></div>
      <div class="sec"><div class="card flex items-c gap16" style="padding:16px"><span class="enamel" style="width:64px;height:64px;border-radius:20px;display:grid;place-items:center;flex:none;color:#022539">${ic('gift', 30)}</span><div class="f1"><div class="t-headline">La clé du vestiaire</div><div class="t-sub c2">Semaine 7 complète. À ouvrir avec Léo.</div></div><span class="btn sm prom">Ouvrir</span></div></div>
      <div class="sec-h"><h4>Ce qu’on garde</h4></div>
      <div class="sec"><div class="list">${items.map(([t, d, id]) => `<div class="rowi ico-lg">${vimg(id, 48, { r: 14 })}<div class="main"><div class="t">${t}</div><div class="d">${d}</div></div><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div>`).join('')}</div></div>
      <div class="sec-h"><h4>Objets</h4><a class="num">3 sur 13</a></div>
      <div class="sec"><div class="grid2" style="grid-template-columns:repeat(4,1fr);gap:10px">${Array.from({ length: 8 }, (_, i) => `<div class="${i < 3 ? 'paper' : 'felt'}" style="aspect-ratio:1;border-radius:20px;display:grid;place-items:center;${i < 3 ? 'color:#46695F' : 'background-color:var(--fill4);color:var(--label4)'}">${ic(['medal', 'star', 'key', 'lock', 'lock', 'lock', 'lock', 'lock'][i], 28)}</div>`).join('')}</div></div>
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('share') })}` };
  };

  // O — Séances vidéo : en construction (l'écran l'annonce clairement)
  S.O = () => {
    const soonTile = (n, t) => `<div style="width:150px;flex:none;opacity:.62"><div style="height:93px;border-radius:18px;position:relative;overflow:hidden;background:#F1EEE8"><img src="${vsrc('ACT-' + String(n).padStart(2, '0') + '01')}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%;filter:grayscale(.6)"><span class="tag gray" style="position:absolute;left:8px;bottom:8px;background:rgba(2,37,57,.6);color:#F7F5F2">${ic('lock', 11, { sw: 2.4 })}Bientôt</span></div><div class="t-sub b" style="margin-top:6px">${n}. ${t}</div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Séances</div><div style="height:12px"></div>
      <div class="sec" style="margin-bottom:14px"><div class="seg"><span>Avec le coach</span><span class="on">Vidéo · bientôt</span></div></div>
      <div class="sec"><div class="card center" style="padding:26px 20px 20px">
        <div class="flex" style="justify-content:center">${arch(168, 188, { id: 'ACT-1001', pos: '50% 45%', cls: 'floaty' })}</div>
        <span class="tag warm" style="margin-top:16px">${ic('timer', 12, { sw: 2.4 })}En construction</span>
        <div class="fr" style="font:500 26px/31px var(--display);margin-top:10px;font-variation-settings:'SOFT' 100">Les séances vidéo arrivent bientôt</div>
        <div class="t-sub c2" style="margin-top:6px">On prépare les 13 séances de 20 minutes à vivre avec ${K.prenom}. En attendant, les moments Maison sont là pour ce soir.</div>
        <div class="list" style="margin-top:16px;text-align:left;background:var(--bg3)"><div class="rowi"><div class="main"><div class="t">Me prévenir à l’ouverture</div></div><span class="tgl on"></span></div></div>
        <span class="btn gray" style="margin-top:12px">${ic('house', 18)}Voir les moments de ce soir</span>
      </div></div>
      <div class="sec-h"><h4>Ce qui viendra</h4><a class="num">13 séances</a></div>
      <div class="flex gap12" style="padding:0 16px;overflow:hidden">${soonTile(1, 'Reconnaître ses forces')}${soonTile(2, 'Objectif d’effort')}${soonTile(3, 'Les preuves')}</div>
      <div style="height:130px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('ellipsis') })}` };
  };

  // P — Prêt avec Léo ? (aperçu)
  S.P = () => ({ dark: true, html: `<div class="scroll" style="background:radial-gradient(120% 60% at 50% 0%, #0f4563 0%, #022539 70%);color:#F7F5F2">
    <div class="center" style="position:relative;padding-top:118px"><div class="flex items-c" style="justify-content:center">${arch(150, 168, { id: 'ACT-0801', cls: 'floaty' })}</div><div class="flex" style="justify-content:center;margin-top:-18px;position:relative">${avatar(44, 'L', '#A7C4BC', '#022539')}<span style="margin-left:-10px">${avatar(44, 'C', '#2C4A5E', '#F7F5F2')}</span></div>
      <div class="fr" style="font:500 36px/40px var(--display);margin-top:24px;font-variation-settings:'SOFT' 100">Prêt avec ${K.prenom} ?</div>
      <div class="t-body" style="color:rgba(247,245,242,.72);margin:10px 36px 0">Cette séance se vit à deux. La vidéo s’arrêtera 3 fois pour poser une question à ${K.prenom}.</div></div>
    <div class="felt" style="position:relative;margin:28px 16px 0;border-radius:26px;background-color:rgba(247,245,242,.08);border:1px solid rgba(247,245,242,.14)"><div>${[['Thème', 'Connexion'], ['Compétence', 'Demander de l’aide'], ['Durée', '20 min']].map(([a, b], i) => `<div class="flex between" style="padding:14px 18px;${i ? 'border-top:.5px solid rgba(247,245,242,.14)' : ''}"><span style="color:rgba(247,245,242,.66)">${a}</span><span class="b">${b}</span></div>`).join('')}</div></div>
    <div style="position:absolute;left:24px;right:24px;bottom:44px" class="flex col gap8"><span class="btn sun">${ic('play', 18)}On y va</span><span class="btn" style="color:#F7F5F2">Plus tard</span></div>
    </div>${navbar({ left: gdark(ic('x', 21)) })}${soonPill()}` });

  // Q — Question en pause (aperçu)
  S.Q = () => ({ dark: true, html: `<div class="scroll" style="background:#022539;color:#F7F5F2">
    <img src="${vsrc('ACT-0801')}" alt="" style="position:absolute;left:0;top:0;width:402px;height:560px;object-fit:cover;object-position:50% 35%">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,37,57,.35) 0%,rgba(2,37,57,.5) 40%,#022539 78%)"></div>
    <div style="position:absolute;left:16px;right:16px;top:300px;border-radius:34px;padding:22px 18px;background:rgba(2,37,57,.74);border-color:rgba(247,245,242,.16);--label:#F7F5F2;--label2:rgba(247,245,242,.72);--label3:rgba(247,245,242,.4);--tint-text:#CFE3DC;--sage-ink:#CFE3DC;--fill:rgba(247,245,242,.18);--fill3:rgba(247,245,242,.1);--sep:rgba(247,245,242,.16);color:#F7F5F2" class="glass strong">
      <div class="flex items-c gap8">${arch(40, 46, { cls: 'xs', id: 'ACT-0603', pos: '50% 25%' })}<div class="eyebrow" style="font-size:11px">Question pour ${K.prenom} · 2 sur 3</div></div>
      <div class="fr" style="font:500 23px/29px var(--display);margin-top:10px;color:var(--label);font-variation-settings:'SOFT' 100">Ton bâton casse en plein match. Tu vas voir qui en premier ?</div>
      <div class="flex col gap8" style="margin-top:16px">${['Personne, je me débrouille', 'Mon coach, sur le banc', 'Un coéquipier à côté de moi', 'Je ne sais pas encore'].map((t, i) => `<span class="btn ${i === 1 ? 'prom' : 'gray'}" style="justify-content:flex-start;padding:0 18px;font-weight:${i === 1 ? 600 : 500}">${i === 1 ? ic('check', 18, { sw: 2.6 }) : ''}${t}</span>`).join('')}</div>
    </div>
    <div style="position:absolute;left:16px;right:16px;bottom:44px"><div style="position:relative;height:5px;border-radius:3px;background:rgba(247,245,242,.25)"><span style="position:absolute;left:0;top:0;height:5px;width:46%;border-radius:3px;background:#F7F5F2"></span>${[22, 46, 78].map((p) => `<span style="position:absolute;top:-3.5px;left:${p}%;width:12px;height:12px;border-radius:6px;background:#F9EB50;border:2px solid #022539;transform:translateX(-50%)"></span>`).join('')}</div>
      <div class="flex between t-foot num" style="margin-top:6px;color:rgba(247,245,242,.7)"><span>9:12</span><span>La vidéo reprend après la réponse</span><span>20:00</span></div></div>
    </div>${navbar({ left: gdark(ic('x', 21)), right: `<span class="gbtn glass" style="color:#F7F5F2;background:rgba(247,245,242,.14);border-color:rgba(247,245,242,.14)">${ic('pause', 16)}En pause</span>` })}${soonPill(116)}` });

  // R — Après la séance (aperçu)
  S.R = () => ({ html: `<div class="scroll"><div style="padding-top:118px" class="center">
    <div class="flex" style="justify-content:center">${arch(130, 146, { id: 'ACT-1303', pos: '50% 40%', cls: 'floaty' })}</div>
    <div class="fr" style="font:500 32px/36px var(--display);margin-top:18px;font-variation-settings:'SOFT' 100">Séance 8, c’est fait</div><div class="t-body c2" style="margin-top:6px">20 minutes à deux. Bravo à vous deux.</div></div>
    <div class="sec" style="margin-top:24px"><div class="card"><div class="t-headline">C’était difficile aujourd’hui ?</div><div class="t-sub c2">Demande à ${K.prenom}. De 0 (facile) à 10 (très dur).</div>
      <div class="flex items-c gap12" style="margin-top:16px"><span class="t-foot c2 num">0</span><div class="slider f1"><div class="trk"></div><div class="fil" style="width:60%"></div><div class="thumb glass" style="left:60%"></div></div><span class="t-foot c2 num">10</span></div>
      <div class="center fr num" style="font:500 32px/1.2 var(--display);margin-top:4px">6</div></div></div>
    <div class="sec" style="margin-top:12px"><div class="card flex gap12" style="background:var(--sage-soft, rgba(70,105,95,.12))">${vimg('ACT-0803', 72, { r: 18 })}<div class="f1"><div class="kick" style="display:flex;align-items:center;gap:6px">${ic('house', 15)}À la maison cette semaine</div><div class="t-headline" style="margin-top:4px">La demande de la semaine</div><div class="t-sub c2" style="margin-top:2px">Une fois d’ici dimanche, ${K.prenom} demande de l’aide à quelqu’un.</div></div></div></div>
    <div style="position:absolute;left:16px;right:16px;bottom:34px" class="flex col gap8"><span class="btn sun">Terminer</span></div>
    </div>${soonPill(60)}` });

  // S — Mes séances (13)
  S.S = (o = {}) => {
    if (o.locked) return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Mes séances</div>
      <div style="filter:blur(6px);opacity:.45" aria-hidden="true"><div class="sec" style="margin-top:14px"><div class="list">${SESS.slice(0, 8).map(([n, , t]) => `<div class="rowi ico-lg" style="--sep-inset:76px">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 48, { r: 14, dim: true })}<div class="main"><div class="t">${n}. ${t}</div><div class="d">60 à 70 min avec ton coach</div></div></div>`).join('')}</div></div></div></div></div>
      ${navbar({ right: gb('calendar') })}
      ${programLock('13 séances avec un coach', 'Une séance par semaine, 60 à 70 minutes, seul avec un coach ou en petit groupe. Elles s’afficheront ici, avec leur bilan.')}${tabbar(2)}` };
    const phase = (name, sub, from, to) => `<div class="sec-h small"><h4>${name} · ${sub}</h4></div><div class="sec"><div class="list">${SESS.slice(from - 1, to).map(([n, , t]) => {
      const done = n <= DONE, next = n === NEXT;
      return `<div class="rowi ico-lg" style="--sep-inset:76px;${!done && !next ? 'opacity:.7' : ''}">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 48, { r: 14, done, dim: !done && !next })}<div class="main"><div class="t">${n}. ${t}</div><div class="d">${done ? `Validée par le coach · ${DATES[n - 1]}` : next ? 'Jeudi 15 oct. · 17 h 30' : 'À venir'}</div></div>${done || next ? `<span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span>` : `<span class="c3">${ic('lock', 16)}</span>`}</div>`;
    }).join('')}</div></div>`;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Séances</div><div style="height:12px"></div>
      <div class="sec" style="margin-bottom:6px"><div class="seg"><span class="on">Avec le coach</span><span>Vidéo · bientôt</span></div></div>
      <div class="sec" style="margin-top:8px"><div class="velvet" style="border-radius:26px;padding:16px 18px;display:flex;align-items:center;gap:16px"><div style="position:relative">${ring(DONE / 13, { size: 64, sw: 8, color: '#F9EB50', track: 'rgba(247,245,242,.18)' })}<div style="position:absolute;inset:0;display:grid;place-items:center;font:500 24px/1 var(--display)" class="num">7</div></div><div class="f1"><div class="fr" style="font:500 21px/26px var(--display);font-variation-settings:'SOFT' 100">7 séances sur 13</div><div style="font:400 14px/19px var(--sf);color:rgba(247,245,242,.78)">Prochaine : jeudi avec ${K.coach}</div></div></div></div>
      ${phase('Phase 1', 'Ancrer', 1, 2)}${phase('Phase 2', 'Développer', 3, 10)}
      <div style="height:120px"></div></div></div>${navbar({ right: gb('calendar') })}${tabbar(2)}` };
  };

  // T — Bilan du coach
  S.T = () => {
    const n = 7, title = SESS[n - 1][2];
    const obs = [['Nomme ses progrès', 4.5], ['Se compare à lui-même', 4], ['Accepte le compliment', 3], ['Fixe un prochain pas', 4]];
    const ob = obs.map(([t, v]) => `<div class="flex col items-c gap4" style="width:76px"><div style="position:relative">${ring(v / 5, { size: 58, sw: 7, color: v >= 4 ? 'var(--ok)' : 'var(--warn)' })}<div style="position:absolute;inset:0;display:grid;place-items:center" class="t-sub b num">${String(v).replace('.', ',')}</div></div><div class="t-cap center c2" style="line-height:14px">${t}</div></div>`).join('');
    const detail = `<div class="t-sub"><b>Travaillé.</b> Comparer ses performances à celles d’il y a six semaines, pas à celles des autres.</div><div class="t-sub" style="margin-top:8px"><b>Observé.</b> Léo a nommé trois progrès sans aide, dont un en dehors du hockey.</div><div class="t-sub" style="margin-top:8px"><b>Ensuite.</b> Séance 8 : construire sa carte des personnes ressources.</div>`;
    return { html: `<div class="scroll"><div style="padding-top:116px">
      <div class="pad"><div class="flex gap8 items-c"><span class="tag ok">${ic('check', 12, { sw: 3 })}Validée par le coach</span><span class="t-foot c2">${DATES[n - 1]}</span></div><div class="flex items-c gap12" style="margin-top:10px">${vimg('ACT-' + String(n).padStart(2, '0') + '01', 64, { r: 18 })}<div class="f1"><div class="fr" style="font:600 28px/32px var(--display);font-variation-settings:'SOFT' 100">${title}</div><div class="t-sub c2">Séance ${n} · ${SESS[n - 1][3]}</div></div></div></div>
      <div class="sec-h small"><h4>1 · Le message du coach</h4></div>
      <div class="sec"><div class="paper laid" style="border-radius:22px;padding:18px"><div class="flex items-c gap8">${avatar(32, 'L', '#46695F', '#F7F5F2')}<span class="t-headline">${K.coach}</span></div><div class="fr" style="font:400 18px/26px var(--display);margin-top:10px;font-variation-settings:'SOFT' 100">Léo a été fier de lui aujourd’hui — et il a su dire pourquoi. Ce soir, demandez-lui son progrès préféré.</div></div></div>
      <div class="sec-h small"><h4>2 · Le bilan détaillé</h4></div>
      <div class="sec"><div class="card">${detail}</div></div>
      <div class="sec-h small"><h4>3 · Observations du coach · sur 5</h4></div>
      <div class="sec"><div class="card flex between">${ob}</div></div>
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), right: gb('share'), edge: true, title: 'Bilan' })}` };
  };

  // U — Messages avec le coach (bulles crème / marine)
  S.U = (o = {}) => {
    const paywall = !!o.locked;
    const msgs = [['in', 'Bonjour Camille ! Séance 7 validée. Léo a été super aujourd’hui.'], ['out', 'Merci ! Il en parle depuis le souper.'], ['in', 'Pour jeudi, il peut apporter son bâton cassé ? On s’en sert dans un exercice.'], ['out', 'Parfait, c’est noté.']];
    return { html: `<div class="scroll"><div style="padding:118px 16px 0" class="flex col gap8">
      <div class="center t-foot c2" style="margin:4px 0 6px">Jeudi 8 oct.</div>
      ${msgs.map(([d, t]) => `<div class="bub ${d}"${paywall ? ' style="filter:blur(4px)"' : ''}>${paywall ? 'Message d’exemple' : t}</div>`).join('')}
      <div class="t-cap c2" style="align-self:flex-end;margin-top:-2px">${paywall ? '' : 'Lu'}</div></div></div>
      ${paywall ? `<div class="sheet float glassy" style="bottom:110px;padding:20px"><div class="flex items-c gap12"><span class="ibadge lg">${ic('bubble', 24)}</span><div><div class="t-title3">Écrire à un coach</div><div class="t-sub c2">La messagerie est incluse dans les programmes Groupe, Individuel et Complet.</div></div></div><div class="t-foot c2" style="margin-top:12px">Ceci est un aperçu : aucun message réel n’est affiché.</div><div class="flex gap8" style="margin-top:14px"><span class="btn md gray f1">Voir les offres</span><span class="btn md prom f1">Appel de 15 min</span></div></div>` : ''}
      <div style="position:absolute;left:16px;right:16px;bottom:${paywall ? 34 : 100}px;display:flex;gap:8px;align-items:center${paywall ? ';opacity:.4' : ''}"><span class="gbtn ic glass">${ic('plus', 22)}</span><span class="glass f1" style="height:44px;border-radius:22px;display:flex;align-items:center;padding:0 6px 0 16px;justify-content:space-between"><span class="c3">Message</span><span style="width:34px;height:34px;border-radius:17px;background:var(--tint);color:var(--tint-ink);display:grid;place-items:center">${ic('arrowUp', 18, { sw: 2.6 })}</span></span></div>
      ${navbar({ edge: true, left: paywall ? gb('chevL') : '', title: `<span class="flex items-c gap8">${avatar(28, 'L', '#46695F', '#F7F5F2')}${K.coach}</span>`, right: gb('info') })}${paywall ? '' : tabbar(-1)}` };
  };

  // V — Notifications
  S.V = () => {
    const n = [['Aujourd’hui', [['bubble', 'Nouveau message de Lylian', 'Pour jeudi, il peut apporter son bâton cassé ?', '18 h 24', 1], ['doc', 'Bilan de la séance 7', 'Se mesurer à soi · validée par le coach', '17 h 52', 1]]], ['Cette semaine', [['wave', 'Questionnaire à faire remplir', 'Prise de pouls de Léo · 3 min', 'mer.', 0], ['doc', 'Nouveau document', 'Lettre à moi-même · disponible', 'lun.', 0], ['gift', 'Semaine 7 complète', 'Un objet attend dans le carnet', 'dim.', 0]]]];
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Notifications</div>
      ${n.map(([h, items]) => `<div class="sec-h small"><h4>${h}</h4></div><div class="sec"><div class="list">${items.map(([i, t, d, w, un]) => `<div class="rowi ico-lg">${un ? `<span style="position:absolute;left:6px;width:8px;height:8px;border-radius:4px;background:#F9EB50;box-shadow:0 0 0 1.5px rgba(0,49,76,.25)"></span>` : ''}<span class="ibadge lg">${ic(i, 22)}</span><div class="main"><div class="flex between"><span class="t ${un ? 'b' : ''}">${t}</span><span class="t-foot c2">${w}</span></div><div class="d">${d}</div></div></div>`).join('')}</div></div>`).join('')}
      <div class="sec" style="margin-top:22px"><div class="list"><div class="rowi"><div class="main"><div class="t">Notifications push</div><div class="d">Sur cet iPhone</div></div><span class="tgl on"></span></div></div></div>
      </div></div>${navbar({ left: gb('chevL'), right: gbt('Tout lire') })}` };
  };

  // W — Questionnaire de l'enfant (lien unique, sans compte) : lampe chaude, papier crème
  S.W = () => {
    const scale = ['Presque jamais', 'Rarement', 'Parfois', 'Souvent', 'Presque toujours'];
    const bg = NIGHT ? '#2A1A05' : '#FFF4E2', ink = NIGHT ? '#FFE3B3' : '#4A2A00', acc = NIGHT ? '#FFB340' : '#C46A00';
    return { html: `<div class="scroll" style="background:${bg};color:${ink}"><div style="padding-top:62px">
      <div class="flex between items-c" style="padding:8px 16px"><img src="assets/logo.png" width="34" height="34" style="border-radius:9px" alt="THRIVE"><span class="seg" style="width:104px;height:32px;background:rgba(0,0,0,.07)"><span class="on" style="font-size:13px;background:${NIGHT ? '#5a4220' : '#fff'};color:${ink}">FR</span><span style="font-size:13px;color:${ink}">EN</span></span></div>
      <div class="pad" style="margin-top:14px"><div class="fr" style="font:600 36px/40px var(--display);font-variation-settings:'SOFT' 100;color:${ink}">Salut ${K.prenom} !</div><div class="t-callout" style="margin-top:6px;opacity:.82;color:${ink}">Il n’y a pas de bonne ou de mauvaise réponse. Réponds comme tu te sens ces jours-ci.</div></div>
      <div class="pad" style="margin-top:18px"><div class="flex between t-foot num" style="font-weight:600;color:${ink}"><span>Prise de pouls</span><span>7 sur 20</span></div><div style="height:8px;border-radius:4px;background:rgba(0,0,0,.08);margin-top:6px"><div style="width:35%;height:100%;border-radius:4px;background:${acc}"></div></div></div>
      <div style="margin:18px 16px 0;border-radius:30px;padding:20px;background:${NIGHT ? 'rgba(255,255,255,.06)' : '#FFFBF3'};box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 8px 22px rgba(120,70,0,.10)"><div class="t-foot" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${acc}">Engagement</div><div class="fr" style="font:500 21px/28px var(--display);margin-top:6px;color:${ink};font-variation-settings:'SOFT' 100">Quand je fais une activité, j’y prends tellement de plaisir que je perds la notion du temps.</div>
        <div class="flex col gap8" style="margin-top:16px">${scale.map((s, i) => `<span class="btn" style="height:54px;justify-content:space-between;padding:0 18px;background:${i === 3 ? acc : NIGHT ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)'};color:${i === 3 ? (NIGHT ? '#2A1A05' : '#fff') : ink}"><span>${s}</span><span class="fr num" style="font-weight:600;font-family:var(--display)">${i + 1}</span></span>`).join('')}</div></div>
      <div class="center t-foot" style="margin-top:14px;opacity:.75;color:${ink}">${ic('eye', 14, { style: 'display:inline;vertical-align:-2px' })} Tes réponses sont partagées avec ton coach.</div>
      </div></div>` };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 02 bis · DURANT L'ACTIVITÉ — le vrai « mode activité » de l'app, écran par
  // écran (ActivityMode.tsx) : check-in → la fois d'avant → amorce → déroulé
  // (les étapes s'ajoutent l'une sous l'autre) → approfondir → débrief →
  // clôture → « 18 minutes avec Léo. » → synthèse → fin. Plein écran, toujours
  // sur le fond marine de la veillée (classe bg-night-bg du vrai code), dans les
  // deux versions : `vig: true` pose les jetons Veillée sur le téléphone.
  // Mêmes textes, mêmes éléments, même ordre ; seule l'enveloppe devient iOS 27 :
  // barre du haut en verre, contenu qui glisse dessous, barre d'actions flottante.
  // ═══════════════════════════════════════════════════════════════════════
  const SUNC = '#F9EB50', CREAM = '#F7F5F2', DEEP = '#022539';
  const ACT = {
    id: 'ACT-0802', title: 'La cabane impossible', week: 8, skill: 'Connexion · soutien',
    subtitle: 'Séance 8 · Demander pour réussir', pillar: 'Le moteur intérieur',
    objective: 'Votre enfant découvre par lui-même qu’il réussit mieux en demandant.',
    opener: '« Défi : une cabane avec les coussins et la couverture. Je suis là si t’as besoin. »',
    steps: ['Il construit seul.', 'Vous êtes là. Vous ne faites rien.', 'Ça coince ? Attendez sa demande.', 'Il demande : aidez tout de suite.', '« T’as demandé. C’est ça qu’il fallait. »'],
    guide: [
      { beats: [['faire', 'Donnez-lui les coussins et une couverture. Le défi : un toit qui tient tout seul. Impossible à deux mains seulement.'], ['dire', '« Tu construis seul. Je suis là si t’as besoin. »']] },
      { beats: [['faire', 'Restez à côté, disponible. Ne touchez à rien. Regardez-le, sans téléphone.']] },
      { beats: [['faire', 'Quand ça coince, attendez. Même s’il soupire, même s’il vous regarde : attendez les mots.']], help: 'S’il s’énerve vraiment, dites une seule fois : « Je suis là. » Rien de plus.', timer: ['Vous attendez sa demande.', '1 min'] },
      { beats: [['faire', 'Dès qu’il demande, aidez tout de suite. Exactement ce qu’il demande, pas plus.']] },
      { beats: [['dire', '« T’as demandé. C’est exactement ce qu’il fallait faire. »']] },
    ],
    ext: [['approfondir', 'Inversez : c’est vous qui construisez, les yeux bandés, et il vous guide à la voix. Vous demandez de l’aide à voix haute quand vous êtes perdu. Il vous voit le faire.', true], ['transferer', 'Assis, il raconte une fois où quelqu’un lui a demandé de l’aide, à lui. « Qu’est-ce que t’en as pensé, de cette personne ? » Il découvre que demander ne rend pas petit aux yeux des autres.', false]],
    debrief: [['vecu', 'Ce qu’il a vécu', '« Avant de me demander, ça faisait quoi, dans ta tête ? »'], ['fait', 'Ce qu’il a fait', '« Qu’est-ce qui t’a fait demander, finalement ? »'], ['ailleurs', 'Où il le réutilise', '« Des fois, tu préfères faire tout seul, même si c’est plus dur ? »'], ['ailleurs', 'Où il le réutilise', '« Où, par exemple ? »']],
    closing: '« Les gens qui réussissent le mieux, c’est ceux qui savent quand demander. »',
    capture: 'Comment il a demandé, et ce que ça a changé',
    recall: 'La dernière fois, Léo avait dit « Quand je respire, ça va mieux. »',
  };
  const CAR = { id: 'ACT-0103', title: 'Ton rêve de l’année', opener: '« J’ai une question, et je n’ai pas la réponse. »',
    steps: ['« Un truc que tu aimerais réussir cette année ? »', 'Silence. Même long.', '« Et pour y arriver, tu ferais quoi ? »', 'Une seule phrase. La sienne.'],
    dire: [['« Cette année, il y a un truc que tu aimerais réussir. C’est quoi ? »'], [], ['« Et pour y arriver, tu ferais quoi ? »'], ['« Tu peux me le redire en une seule phrase ? »']] };

  // ── Petits éléments communs ─────────────────────────────────────────────
  const mmss = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const D2 = DEEP;
  const GL = (inner) => `<svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true" style="flex:none">${inner}</svg>`;
  const gst = `stroke="${D2}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const face = (f, inner) => `<circle cx="24" cy="24" r="21" fill="${f}" stroke="${D2}" stroke-width="2.2"/>${inner}`;
  const eyes = (y = 20, r = 2.4) => `<circle cx="16.5" cy="${y}" r="${r}" fill="${D2}"/><circle cx="31.5" cy="${y}" r="${r}" fill="${D2}"/>`;
  const GLYPH = {
    joie: GL(face('#F9EB50', `<path d="M14 19 Q16.5 15.5 19 19 M29 19 Q31.5 15.5 34 19" ${gst}/><path d="M13 28 Q24 40 35 28Z" fill="${D2}" stroke="${D2}" stroke-width="1.6" stroke-linejoin="round"/>`)),
    calme: GL(face('#F7F5F2', `${eyes(20)}<path d="M16 31 Q24 37 32 31" ${gst}/>`)),
    nervosite: GL(face('#C9DCD6', `${eyes(19)}<rect x="13" y="28" width="22" height="9" rx="3" fill="#F7F5F2" stroke="${D2}" stroke-width="2"/><path d="M20.5 28 V37 M27.5 28 V37 M13 32.5 H35" stroke="${D2}" stroke-width="1.6"/>`)),
    frustration: GL(face('#67A4C9', `<path d="M12 16 L21 19 M36 16 L27 19" ${gst}/>${eyes(22)}<path d="M17 33 H31" ${gst}/>`)),
    tristesse: GL(face('#C9DCD6', `<path d="M12 16 L20 13 M36 16 L28 13" ${gst} stroke-width="1.8"/>${eyes(22)}<path d="M17 35 Q24 29 31 35" ${gst}/>`)),
    fatigue: GL(face('#C9DCD6', `<path d="M13 21 H20 M28 21 H35" ${gst}/><path d="M18 33 Q24 36 30 33" ${gst}/><path d="M36 6 H43 L36 13 H43" ${gst} stroke-width="1.8"/>`)),
    energie: GL(`<path d="M27 3 L9 27 H22 L19 45 L39 18 H25Z" fill="#F9EB50" stroke="${D2}" stroke-width="2.2" stroke-linejoin="round"/>`),
    pleine: GL(`<path d="M6 10 H42 M10 18 H38 M15 26 H34 M19 34 H30 M23 42 H27" ${gst} stroke="#3380AC" stroke-width="3.4"/>`),
    libre: GL(`<circle cx="24" cy="24" r="9" fill="#F9EB50" stroke="${D2}" stroke-width="2.2"/><path d="M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M10.5 37.5 L14 34 M34 14 L37.5 10.5" ${gst}/>`),
  };
  const nc = (t) => `<div class="eyebrow" style="margin:0;color:rgba(247,245,242,.66)">${t}</div>`;
  const big = (t, st = '') => `<p class="fr" style="margin:0;font:400 31px/38px var(--display);font-variation-settings:'SOFT' 100;color:var(--label);text-wrap:balance;${st}">${t}</p>`;
  const sunBtn = (t, st = '') => `<span class="btn sun" style="height:56px;font-size:17px;${st}">${t}</span>`;
  const grayBtn = (t, st = '') => `<span class="btn gray" style="height:56px;font-size:17px;${st}">${t}</span>`;
  const ghost = (t) => `<span style="min-height:48px;padding:0 6px;display:inline-flex;align-items:center;font:600 16px/1 var(--sf);color:var(--label2)">${t}</span>`;
  const fadeB = `<div aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;height:170px;z-index:40;pointer-events:none;background:linear-gradient(to bottom,transparent,color-mix(in srgb,var(--bg) 94%,transparent) 58%)"></div>`;
  const ctaBar = (inner) => `${fadeB}<div style="position:absolute;left:20px;right:20px;bottom:36px;z-index:46;display:flex;align-items:center;gap:10px">${inner}</div>`;
  const pill = (txt, on, glyph) => `<span style="display:inline-flex;align-items:center;gap:9px;min-height:52px;padding:0 18px 0 12px;border-radius:26px;font:500 16px/1 var(--sf);white-space:nowrap;${on ? `background:${CREAM};color:${DEEP};box-shadow:0 8px 20px -10px rgba(0,0,0,.6)` : 'background:var(--fill4);color:var(--label);box-shadow:inset 0 0 0 1px var(--sep)'}">${glyph || ''}${txt}</span>`;
  const iconBtn = (name, label) => `<span class="gbtn ic glass" aria-label="${label}" style="width:44px;height:44px;flex:none">${ic(name, 20)}</span>`;
  const topBar = (right) => navbar({ edge: true, left: gb('x', { label: 'Quitter le mode activité' }), title: `<span class="fr" style="display:block;max-width:${right ? 128 : 220}px;overflow:hidden;text-overflow:ellipsis;font:500 15px/20px var(--display);color:var(--label2);font-variation-settings:'SOFT' 100;white-space:nowrap">${ACT.title}</span>`, right: right || '<span style="width:44px;display:block"></span>' });
  const timerPill = (rem, tot, o = {}) => `<span class="gbtn glass" style="position:relative;height:44px;padding:0 14px 0 5px;gap:9px">${ring(Math.min(1, (tot - rem) / tot), { size: 34, sw: 4, color: o.near ? '#A7C4BC' : SUNC, track: 'rgba(247,245,242,.16)' })}<span style="display:flex;flex-direction:column;line-height:1"><b class="num" style="font:600 16px/1 var(--sf);letter-spacing:-.2px">${mmss(rem)}</b><span style="font:500 10.5px/1 var(--sf);color:var(--label2);margin-top:3px">sur ${Math.round(tot / 60)} min</span></span>${o.boost ? `<span style="position:absolute;top:calc(100% + 6px);left:0;padding:3px 9px;border-radius:12px;background:${SUNC};color:${DEEP};font:700 12px/1.2 var(--sf)">${o.boost}</span>` : ''}</span>`;
  const page = (inner, o = {}) => `<div class="scroll"><div style="padding:${o.top ?? 128}px 20px ${o.bottom ?? 150}px;${o.shift ? `margin-top:-${o.shift}px` : ''}">${inner}</div></div>`;
  const imd = (t) => t.replace(/\*\*([^*]+)\*\*/g, '<b style="font-weight:600;color:var(--label)">$1</b>');
  const field = (txt, h = 70, ph) => `<div style="margin-top:14px;padding:14px 16px;border-radius:20px;background:var(--fill4);box-shadow:inset 0 0 0 1px var(--sep);min-height:${h}px;font:400 16px/23px var(--sf);color:${txt ? 'var(--label)' : 'var(--label3)'}">${txt || ph}</div>`;
  const stepCard = (t) => `<div style="margin-top:16px;padding:16px;border-radius:22px;background:var(--fill4);box-shadow:inset 0 0 0 1px var(--sep)">${t}</div>`;

  // ── Les trois temps du déroulé ──────────────────────────────────────────
  const beatHtml = (kind, text, hot) => kind === 'dire'
    ? `<div style="padding:16px 20px;border-radius:22px 22px 22px 8px;border:1px solid ${hot ? 'rgba(167,196,188,.55)' : 'var(--sep)'};background:${hot ? 'color-mix(in srgb,var(--bg2) 70%,rgba(247,245,242,.08))' : 'var(--fill4)'};${hot ? 'box-shadow:var(--shadow-card)' : ''}"><div style="font:700 12px/1 var(--sf);letter-spacing:.1em;text-transform:uppercase;color:var(--sage)">Dis</div><div class="fr" style="margin-top:6px;font:italic 400 22px/29px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">${text}</div></div>`
    : `<div style="display:flex;gap:12px;padding:0 4px"><span style="margin-top:3px;color:var(--sage);flex:none;line-height:0">${ic('arrowR', 18, { sw: 2.2 })}</span><p style="margin:0;font:${hot ? 600 : 400} 17px/26px var(--sf);color:${hot ? 'var(--label)' : 'var(--label2)'}">${text}</p></div>`;
  const stepSection = (i, current, beats, extra = '') => `<section style="${i > 0 ? 'margin-top:36px;padding-top:30px;border-top:1px solid var(--sep);' : ''}${current ? '' : 'opacity:.6'}">
      ${nc(`Étape ${i + 1} sur 5`)}
      <p class="fr" style="margin:8px 0 0;font:400 28px/34px var(--display);font-variation-settings:'SOFT' 100;color:var(--label);text-wrap:balance">${imd(ACT.steps[i])}</p>
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">${beats.map(([k, t], j) => beatHtml(k, t, current && j === beats.length - 1)).join('')}</div>${extra}</section>`;
  const helpRow = (txt) => stepCard(`<div style="display:flex;align-items:center;justify-content:space-between;min-height:28px;font:600 15px/1 var(--sf);color:var(--label)">Si ça bloque<span style="color:var(--label2);line-height:0">${ic('chevD', 17, { sw: 2.2 })}</span></div>`);
  const timerCard = (label, dur) => stepCard(`<div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:20px;display:grid;place-items:center;flex:none;background:#A7C4BC;color:#022539">${ic('play', 16)}</span><div style="min-width:0"><div style="font:600 15px/20px var(--sf);color:var(--label)">Minuteur · ${dur}</div><div style="font:400 13px/18px var(--sf);color:var(--label2)">À lancer quand vous êtes prêts, tous les deux.</div></div></div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:8px;font:400 13px/1 var(--sf);color:var(--label2)"><i style="width:12px;height:12px;border-radius:6px;background:${DEEP};box-shadow:0 0 0 1px rgba(247,245,242,.4)"></i>${label} · ${dur}</div>
      <span class="btn gray" style="margin-top:14px;height:52px">Lancer le minuteur</span>`);
  const actionBar = (o = {}) => `<div class="glass" style="position:absolute;left:14px;right:14px;bottom:30px;z-index:46;border-radius:36px;padding:7px;display:flex;align-items:center;gap:8px;background:var(--glass-strong)">
      ${iconBtn('chevL', 'Revenir d’un cran')}${iconBtn('plus', 'Noter')}<span style="flex:1"></span>
      ${o.last ? `<span class="btn sun" style="width:auto;height:52px;padding:0 24px;font-size:16px">Terminer l’activité</span>`
        : `<span style="padding:0 10px;font:600 14px/1 var(--sf);color:var(--label2)">Terminer</span><span class="btn sun" style="width:auto;height:52px;padding:0 18px 0 22px;font-size:16px;gap:4px">Suivant${ic('chevR', 19, { sw: 2.4 })}</span>`}</div>`;

  // ── 1 · Check-in ────────────────────────────────────────────────────────
  S.M1 = () => ({ vig: true, dark: true, html: `${page(`${nc('Check-in')}
      <p style="margin:12px 0 0;font:400 17px/26px var(--sf);color:var(--label2)">Avant de commencer, trois petites questions. Il répond d’un geste.</p>
      <div style="margin-top:26px;display:flex;flex-direction:column;gap:26px">
        <div><p class="fr" style="margin:0 0 12px;font:400 21px/27px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">« Là, maintenant, t’es comment ? »</p><div class="flex wrap gap8">${pill('Content', 0, GLYPH.joie)}${pill('Tranquille', 1, GLYPH.calme)}${pill('Nerveux', 0, GLYPH.nervosite)}${pill('Frustré', 0, GLYPH.frustration)}${pill('Pas terrible', 0, GLYPH.tristesse)}</div></div>
        <div><p class="fr" style="margin:0 0 12px;font:400 21px/27px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">« Et ton corps ? »</p><div class="flex wrap gap8">${pill('Fatigué', 0, GLYPH.fatigue)}${pill('Correct', 1, GLYPH.calme)}${pill('Plein d’énergie', 0, GLYPH.energie)}</div></div>
        <div><p class="fr" style="margin:0 0 12px;font:400 21px/27px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">« Et ta tête ? »</p><div class="flex wrap gap8">${pill('Pleine', 0, GLYPH.pleine)}${pill('Ça va', 0, GLYPH.calme)}${pill('Libre', 0, GLYPH.libre)}</div></div></div>`)}
      ${topBar()}${ctaBar(`${grayBtn('Continuer', 'flex:1;opacity:.55')}${ghost('Passer')}`)}` });

  // ── 2 · La fois d'avant ─────────────────────────────────────────────────
  S.M2 = () => ({ vig: true, dark: true, html: `${page(`<div style="padding-top:34px"><span aria-hidden="true" class="fr" style="display:block;height:54px;font:400 96px/1 var(--display);color:var(--sage);opacity:.55">“</span>${nc('La fois d’avant')}<div style="margin-top:14px">${big(ACT.recall, 'font-size:36px;line-height:44px')}</div></div>`)}
      ${topBar()}${ctaBar(sunBtn('Continuer', 'flex:1'))}` });

  // ── 3 · Amorce ──────────────────────────────────────────────────────────
  S.M3 = () => ({ vig: true, dark: true, auto: true, html: `<div class="scroll"><div style="padding:124px 20px 56px">
      <div style="display:flex;justify-content:center;margin-bottom:28px">${arch(240, 268, { id: ACT.id, style: 'box-shadow:0 34px 60px -28px rgba(0,0,0,.7)' })}</div>
      <div class="paper laid" style="border-radius:26px;padding:22px;transform:rotate(-.3deg)"><div class="eyebrow" style="margin:0">Ce qu’on travaille</div>
        <p class="fr" style="margin:6px 0 0;font:500 24px/28px var(--display);font-variation-settings:'SOFT' 100;color:#022539;text-wrap:balance">${ACT.skill}</p>
        <p style="margin:10px 0 0;font:400 15px/22px var(--sf);color:#022539">${ACT.objective}</p>
        <p style="margin:8px 0 0;font:400 13px/18px var(--sf);color:#56626b">${ACT.subtitle} · ${ACT.pillar}</p></div>
      <div style="position:relative;margin-top:36px;padding:46px 24px 24px;border-radius:26px 26px 26px 8px;background:color-mix(in srgb,var(--bg2) 70%,rgba(247,245,242,.08));box-shadow:inset 0 0 0 1px var(--sep),var(--shadow-card)">
        <span aria-hidden="true" class="fr" style="position:absolute;left:18px;top:2px;font:400 84px/1 var(--display);color:var(--sage);opacity:.6">“</span>
        <p style="position:relative;margin:0;font:400 15px/20px var(--sf);color:var(--label2)">Pour commencer, dis :</p>
        <p class="fr" style="position:relative;margin:8px 0 0;font:italic 400 30px/37px var(--display);font-variation-settings:'SOFT' 100;color:var(--label);text-wrap:balance">${ACT.opener}</p></div>
      <p style="margin:22px 4px 0;font:400 15px/22px var(--sf);color:var(--label2)">Le minuteur démarre sur 20 minutes. Ensuite, touche « Suivant » : chaque consigne s’ajoute en dessous, une à la fois.</p>
      <div style="margin-top:30px">${sunBtn('C’est dit, on commence')}</div></div></div>${topBar()}` });

  // ── 4 · Moment en cours : le déroulé (état : étape 3, minuteur de jeu prêt) ──
  S.M = () => ({ vig: true, dark: true, html: `${page(`${stepSection(0, false, ACT.guide[0].beats)}${stepSection(1, false, ACT.guide[1].beats)}${stepSection(2, true, ACT.guide[2].beats, `${helpRow(ACT.guide[2].help)}${timerCard(ACT.guide[2].timer[0], ACT.guide[2].timer[1])}`)}`, { shift: 400, bottom: 230 })}${topBar(timerPill(800, 1200))}${actionBar()}` });

  // ── 5 · Minuteur de jeu, plein écran (ton « silence ») ──────────────────
  S.M4 = () => ({ vig: true, dark: true, html: `<div style="position:absolute;inset:0;z-index:2;background:radial-gradient(90% 50% at 50% 0%,rgba(249,235,80,.06),transparent 70%),#022539;color:${CREAM}">
      <div style="position:absolute;top:62px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center"><span class="gbtn glass" style="padding:0 18px;font:600 15px/1 var(--sf)">Son : oui</span></div>
      <div style="position:absolute;left:0;right:0;top:230px;text-align:center;padding:0 28px">
        <p class="fr" style="margin:0;font:600 40px/44px var(--display);text-transform:uppercase;font-variation-settings:'SOFT' 100;text-wrap:balance">Vous attendez sa demande.</p>
        <p class="fr num" style="margin:34px 0 0;font:600 120px/1 var(--display);font-variation-settings:'SOFT' 100">38</p>
        </div>
      <div style="position:absolute;left:0;right:0;bottom:50px;display:flex;justify-content:center"><span style="height:58px;padding:0 44px;border-radius:29px;display:inline-flex;align-items:center;font:700 17px/1 var(--sf);background:rgba(247,245,242,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)">Arrêter</span></div></div>` });

  // ── 6 · Approfondir : la fin du déroulé ─────────────────────────────────
  S.M5 = () => ({ vig: true, dark: true, html: `${page(`${stepSection(3, false, ACT.guide[3].beats)}${stepSection(4, false, ACT.guide[4].beats)}
      <div style="margin-top:34px;padding-top:30px;border-top:1px solid var(--sep);display:flex;flex-direction:column;gap:16px">${nc('Vous avez encore envie, tous les deux ?')}
        <div style="padding:20px;border-radius:26px;background:var(--bg2);box-shadow:inset 0 0 0 1px rgba(167,196,188,.5),var(--shadow-card)">${nc('+10 min — Approfondir')}<p style="margin:10px 0 0;font:400 17px/26px var(--sf);color:var(--label)">${ACT.ext[0][1]}</p></div>
        <div style="display:flex;align-items:center;gap:14px;padding:16px;border-radius:24px;box-shadow:inset 0 0 0 2px rgba(167,196,188,.6)"><span style="width:44px;height:44px;border-radius:22px;flex:none;display:grid;place-items:center;background:#A7C4BC;color:${DEEP};font:800 15px/1 var(--sf)">+10</span><span style="flex:1"><span style="display:block;font:700 18px/23px var(--sf)">Transférer</span><span style="display:block;font:400 14px/19px var(--sf);color:var(--label2)">Ajoute 10 minutes au minuteur</span></span><span style="color:var(--label2);line-height:0">${ic('chevR', 20, { sw: 2.2 })}</span></div></div>`, { shift: 330, bottom: 230 })}${topBar(timerPill(215, 1200, { near: true }))}${actionBar({ last: true })}` });

  // ── 7 · En voiture : lire avant de partir, puis la route ────────────────
  S.M6 = () => ({ vig: true, dark: true, auto: true, html: `<div class="scroll"><div style="padding:128px 20px 150px">${nc('En voiture')}
      <p style="margin:12px 0 0;font:400 20px/29px var(--sf);color:var(--label)">Lis les étapes maintenant. Pendant la route, pose le téléphone : tout se fait à voix haute.</p>
      <div class="card" style="margin-top:24px;padding:20px 22px"><p style="margin:0 0 8px;font:400 15px/20px var(--sf);color:var(--label2)">Dis :</p><p class="fr" style="margin:0;font:400 23px/30px var(--display);font-variation-settings:'SOFT' 100">${CAR.opener}</p></div>
      <ol style="margin:22px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">${CAR.steps.map((s, i) => `<li style="display:flex;gap:14px"><span class="fr" style="width:26px;flex:none;font:600 22px/26px var(--display);color:var(--sage)">${i + 1}</span><span style="font:400 18px/26px var(--sf);color:var(--label2)">${s}${CAR.dire[i].map((d) => `<span style="display:block;margin-top:4px;font:400 16px/23px var(--sf);color:var(--label)">Dites : ${d}</span>`).join('')}</span></li>`).join('')}</ol></div></div>
      ${topBar().replace(ACT.title, CAR.title)}${ctaBar(sunBtn('C’est lu', 'flex:1'))}` });
  S.M7 = () => ({ vig: true, dark: true, html: `<div class="scroll"><div style="padding:108px 20px 0;display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="margin-top:84px;position:relative;width:236px;height:236px">${ring(.32, { size: 236, sw: 12, color: SUNC, track: 'rgba(247,245,242,.1)' })}<div style="position:absolute;inset:0;display:grid;place-content:center"><div class="fr num" style="font:600 52px/1 var(--display);font-variation-settings:'SOFT' 100">${mmss(408)}</div><div style="margin-top:8px;font:500 14px/1 var(--sf);color:var(--label2)">sur 10 min</div></div></div>
      <p style="margin:34px 0 0;max-width:290px;font:400 17px/26px var(--sf);color:var(--label2)">Tout se fait à voix haute. Le téléphone peut rester posé.</p></div></div>
      ${topBar().replace(ACT.title, CAR.title)}${ctaBar(grayBtn('Terminer', 'flex:1'))}` });

  // ── 8 · Débrief : les questions s'ajoutent une à une ────────────────────
  S.M8 = () => ({ vig: true, dark: true, html: `${page(`<p style="margin:0 0 26px;font:400 15px/23px var(--sf);color:var(--label2)">Lis la question à voix haute. Note sa réponse d’un tap, ou passe.</p>
      <div style="opacity:.6">${nc('Question 1 sur 4 · Ce qu’il a vécu')}<p class="fr" style="margin:10px 0 0;font:400 21px/27px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">${ACT.debrief[0][2]}</p>${field('Je voulais y arriver tout seul, mais ça tombait toujours.', 64)}</div>
      <div style="margin-top:34px">${nc(`Question 2 sur 4 · ${ACT.debrief[1][1]}`)}<p class="fr" style="margin:12px 0 0;font:400 30px/37px var(--display);font-variation-settings:'SOFT' 100;color:var(--label);text-wrap:balance">${ACT.debrief[1][2]}</p>
        <div style="margin-top:14px;min-height:44px;display:inline-flex;align-items:center;font:600 15px/1 var(--sf);color:var(--tint-text);text-decoration:underline;text-underline-offset:4px">Noter sa réponse</div></div>`)}
      ${topBar()}${ctaBar(`${sunBtn('Question suivante', 'flex:1')}${ghost('Passer')}`)}` });

  // ── 9 · Pour finir ──────────────────────────────────────────────────────
  S.M9 = () => ({ vig: true, dark: true, html: `${page(`<div style="padding-top:60px"><p style="margin:0;font:400 18px/24px var(--sf);color:var(--label2)">Pour finir, dis :</p><div style="margin-top:14px">${big(ACT.closing, 'font-size:38px;line-height:46px')}</div></div>`)}${topBar()}${ctaBar(sunBtn('C’est dit', 'flex:1'))}` });

  // ── 10 · « 18 minutes avec Léo. » (une seconde, seul à l'écran) ─────────
  S.M10 = () => ({ vig: true, dark: true, html: `<div class="scroll"><div style="height:874px;display:grid;place-items:center;padding:0 36px;text-align:center">${big('18 minutes avec Léo.', 'font-size:42px;line-height:50px')}</div></div>${topBar()}` });

  // ── 11 · Synthèse facultative ───────────────────────────────────────────
  S.M11 = () => ({ vig: true, dark: true, html: `${page(`${nc('Une note, pour toi')}
      <div style="margin-top:10px;display:flex;gap:4px">${[1, 2, 3, 4, 5].map((n) => `<span style="width:48px;height:48px;display:grid;place-items:center;color:${n <= 4 ? '#CFE3DC' : 'rgba(247,245,242,.3)'}">${ic('star', 32, { sw: n <= 4 ? 2.6 : 1.6 }).replace('<svg', n <= 4 ? '<svg fill="currentColor"' : '<svg')}</span>`).join('')}</div>
      <div style="margin-top:30px">${nc('Ça a donné quoi ?')}<div class="flex wrap gap8" style="margin-top:12px">${pill('Il a accroché', 1)}${pill('Moyen', 0)}${pill('Pas ce soir', 0)}</div></div>
      <div style="margin-top:30px">${nc('Une phrase à garder ?')}${field('« Tu peux tenir ça ? »', 78)}</div>`)}${topBar()}${ctaBar(`${sunBtn('Garder ce moment', 'flex:1')}${ghost('Passer')}`)}` });

  // ── 12 · Fin : le compteur, les étoiles de la semaine ───────────────────
  const stars = (n) => [0, 1, 2].map((i) => i < n ? `<span class="enamel" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;color:#022539">${ic('star', 24, { sw: 1.7 }).replace('<svg', '<svg fill="currentColor"')}</span>` : `<span style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;background:rgba(0,0,0,.14);box-shadow:inset 0 2px 5px rgba(0,0,0,.45),inset 0 -1px 0 rgba(255,255,255,.08);color:rgba(247,245,242,.5)">${ic('star', 20, { sw: 1.6 })}</span>`).join('');
  const finBody = (o) => `<div style="padding-top:40px"><p class="fr" style="margin:0;font:600 38px/44px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">${o.count} moments avec Léo</p>
      <div style="margin-top:22px;display:flex;align-items:center;gap:12px">${stars(o.stars)}<span style="margin-left:4px;font:600 14px/1 var(--sf);color:var(--label2)">${o.stars} sur 3 cette semaine</span></div>
      <p style="margin:30px 0 0;font:400 18px/27px var(--sf);color:var(--label2)">Tu viens de faire quelque chose que la plupart des parents ne font jamais.</p>
      ${o.reward ? `<div style="margin-top:28px;padding:18px;border-radius:26px;background:var(--bg2);box-shadow:inset 0 0 0 1px rgba(167,196,188,.5),var(--shadow-card)"><div style="display:flex;align-items:center;gap:14px"><span class="ibadge lg" style="width:48px;height:48px;border-radius:24px;display:grid;place-items:center;flex:none">${ic('medal', 24)}</span><div><div class="eyebrow" style="margin:0;color:var(--label2)">Débloqué</div><div class="fr" style="font:600 20px/25px var(--display);font-variation-settings:'SOFT' 100;margin-top:2px">${o.reward}</div></div></div>
          <div style="margin-top:16px;display:flex;gap:8px"><span class="btn md gray" style="height:46px">Voir</span><span style="min-height:46px;padding:0 14px;display:inline-flex;align-items:center;font:600 15px/1 var(--sf);color:var(--label2)">Plus tard</span></div></div>` : ''}
      <div style="margin-top:30px">${o.reward ? `<p style="margin:0 0 14px;font:500 16px/22px var(--sf);color:var(--label)">Semaine ${o.week} complète.</p>` : ''}<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:0 18px;border-radius:22px;background:var(--fill4);box-shadow:inset 0 0 0 1px var(--sep)"><span style="font:400 15px/21px var(--sf);color:var(--label2)">La suite : <b style="font-weight:600;color:var(--label)">${o.next}</b></span><span style="color:var(--label2);line-height:0">${ic('chevR', 19, { sw: 2.2 })}</span></div>
      <div style="margin-top:16px"><span style="display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 32px;border-radius:26px;font:600 16px/1 var(--sf);box-shadow:inset 0 0 0 1px rgba(247,245,242,.2)">Retour à Maison</span></div></div></div>`;
  S.M12 = () => ({ vig: true, dark: true, html: `${page(finBody({ count: 12, stars: 2, next: 'La demande de la semaine' }))}${topBar()}` });
  S.M13 = () => ({ vig: true, dark: true, html: `${page(finBody({ count: 13, stars: 3, next: 'Le chapeau des talents', reward: 'La Carte Ma Boîte à Outils de Léo', week: 8 }), { top: 96 })}${topBar()}` });

  // ── Feuilles : Noter, Lettre scellée, Quitter ───────────────────────────
  const bsheet = (top, inner) => `<div class="scroll" style="z-index:0">${S.M().html.replace(/^<div class="scroll">/, '<div>')}</div><div class="dim" style="background:rgba(0,0,0,.46)"></div><div class="sheet" style="top:${top}px;bottom:0;background:var(--bg2);overflow:hidden"><div class="grabber"></div><div style="padding:20px 20px 0">${inner}</div></div>`;
  S.M14 = () => ({ vig: true, dark: true, html: bsheet(420, `${nc('À garder')}<p style="margin:10px 0 0;font:400 18px/26px var(--sf);color:var(--label)">${ACT.capture}</p>
      <div style="margin-top:16px;padding:14px 16px;border-radius:20px;background:var(--fill4);box-shadow:inset 0 0 0 1px var(--sep);min-height:116px;font:400 16px/24px var(--sf);color:var(--label)">Il a dit « Tu peux tenir ça ? » — et il a souri quand le toit a tenu.<span style="display:inline-block;width:2px;height:20px;margin-left:2px;background:var(--tint-text);vertical-align:-4px"></span></div>
      <div style="margin-top:22px">${sunBtn('C’est noté')}</div>`) });
  const letterShell = (top, inner) => `<div class="scroll" style="z-index:0"><div style="padding:108px 20px 0">${nc('Séance 13')}<p class="fr" style="margin:10px 0 0;font:400 30px/37px var(--display);color:var(--label)">Lettre à moi-même</p></div></div><div class="dim" style="background:rgba(0,0,0,.46)"></div><div class="sheet" style="top:${top}px;bottom:0;background:var(--bg2);overflow:hidden"><div class="grabber"></div><div style="padding:20px 20px 0">${inner}</div></div>`;
  S.M15 = () => ({ vig: true, dark: true, html: letterShell(150, `${nc('À garder')}<p style="margin:10px 0 0;font:400 17px/25px var(--sf);color:var(--label)">Une lettre à ouvrir le 13 octobre 2027</p>
      <div class="paper laid" style="margin-top:16px;border-radius:22px;padding:22px;min-height:360px"><p class="fr" style="margin:0 0 12px;font:italic 400 18px/24px var(--display);color:#33454F">Cher moi de l’an prochain,</p><p class="fr" style="margin:0;font:400 18px/28px var(--display);color:#022539">Aujourd’hui, j’ai fini THRIVE. Je sais maintenant que demander de l’aide, ce n’est pas un aveu. J’espère que tu joues toujours au hockey, et que tu ne lâches plus après une erreur<span style="display:inline-block;width:2px;height:20px;margin-left:2px;background:#46695F;vertical-align:-4px"></span></p></div>
      <div style="margin-top:20px;display:flex;align-items:center;gap:10px">${sunBtn('Sceller la lettre', 'flex:1')}${ghost('Plus tard')}</div>`) });
  S.M16 = () => ({ vig: true, dark: true, html: letterShell(430, `<p class="fr" style="margin:6px 0 0;font:400 25px/32px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">Une fois scellée, personne ne pourra la lire avant le 13 octobre 2027, pas même toi.</p>
      <div style="margin-top:26px;display:flex;align-items:center;gap:10px">${sunBtn('Sceller', 'flex:1')}${ghost('Revenir')}</div>`) });
  S.M17 = () => ({ vig: true, dark: true, html: `<div class="scroll" style="z-index:0">${S.M().html.replace(/^<div class="scroll">/, '<div>')}</div><div class="dim" style="background:rgba(0,0,0,.5)"></div>
      <div class="sheet float glassy" style="padding:26px 22px 22px;bottom:12px"><p class="fr" style="margin:0;font:600 26px/31px var(--display);font-variation-settings:'SOFT' 100;color:var(--label)">Enregistrer ce moment ?</p>
        <p style="margin:8px 0 0;font:400 15px/21px var(--sf);color:var(--label2)">18 minutes avec Léo, jusqu’ici.</p>
        <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px">${sunBtn('Oui')}${grayBtn('Non')}</div></div>` });

  // Sélecteur de style de l'app : deux ambiances, un seul produit
  const styleTile = (key, name, d, on) => {
    const m = key === 'v4'
      ? { bg: '#F7F5F2', ink: '#022539', sub: 'rgba(2,37,57,.25)', card: '#FFFEFB', head: '#004E7A', hi: '#F7F5F2', arch: '#EDE6D6' }
      : { bg: '#022539', ink: '#F7F5F2', sub: 'rgba(247,245,242,.28)', card: '#00314C', head: '#0B3C59', hi: '#F7F5F2', arch: '#0f4563' };
    const phone = `<div style="position:relative;width:100%;aspect-ratio:9/13;border-radius:20px;overflow:hidden;background:${m.bg};box-shadow:0 0 0 ${on ? '2.5px var(--tint)' : '.5px var(--sep)'}${on ? ', 0 8px 22px rgba(0,0,0,.16)' : ''}">
      <div style="position:absolute;left:50%;top:10px;transform:translateX(-50%);width:44px;height:50px;border-radius:22px 22px 8px 8px;background:${m.arch};box-shadow:inset 0 0 0 1px rgba(127,127,127,.2)"></div>
      <div style="position:absolute;left:50%;top:64px;transform:translateX(-50%);font:italic 500 14px/1 Fraunces,Georgia,serif;color:${m.ink}">${name}</div>
      <div style="position:absolute;left:12px;right:12px;top:92px;height:5px;border-radius:3px;background:${m.sub}"></div>
      <div style="position:absolute;left:12px;width:55%;top:104px;height:5px;border-radius:3px;background:${m.sub}"></div>
      <div style="position:absolute;left:12px;right:12px;top:122px;height:24px;border-radius:12px;background:#F9EB50"></div>
      <div style="position:absolute;left:12px;right:12px;top:154px;height:30px;border-radius:10px;background:${m.card};box-shadow:0 0 0 .5px rgba(127,127,127,.25)"></div>
      <div style="position:absolute;left:14px;right:14px;bottom:8px;height:12px;border-radius:6px;background:${key === 'v5' ? 'rgba(247,245,242,.14)' : 'rgba(0,49,76,.08)'}"></div>
    </div>`;
    return `<div class="flex col items-c" style="gap:8px;min-width:0">${phone}<div class="center"><div class="fr" style="font:600 17px/20px var(--display)">${name}</div><div class="t-foot c2">${d}</div></div><span style="width:24px;height:24px;border-radius:12px;display:grid;place-items:center;${on ? 'background:var(--tint);color:var(--tint-ink)' : 'box-shadow:inset 0 0 0 1.5px var(--label4)'}">${on ? ic('check', 14, { sw: 3 }) : ''}</span></div>`;
  };
  const stylePicker = () => `<div class="sec-h small"><h4>Style de l’app</h4></div>
    <div class="sec"><div class="card" style="padding:16px 14px 14px"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 18px">
      ${styleTile('v4', 'Lin', 'Clair, papier et lin', !NIGHT)}${styleTile('v5', 'Veillée', 'Sombre, à la lampe', NIGHT)}</div></div>
    <div class="sec-f">Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.</div></div>`;

  // X — Compte & famille
  S.X = () => ({ html: `<div class="scroll"><div style="padding-top:108px">
    <div class="flex col items-c" style="margin-top:4px">${avatar(84, 'C', 'var(--fill)', 'var(--label)')}<div class="fr" style="font:600 26px/31px var(--display);margin-top:10px;font-variation-settings:'SOFT' 100">${PARENT.prenom} ${PARENT.nom}</div><div class="t-sub c2">${PARENT.email}</div></div>
    <div class="sec" style="margin-top:18px"><div class="list">${rowi({ icon: 'star', t: 'Mon programme', val: PROG })}${rowi({ icon: 'house', t: 'Abonnement Maison', val: 'Inclus' })}${rowi({ icon: 'sparkle', t: 'Offres THRIVE' })}</div></div>
    ${stylePicker()}
    <div class="sec-h small"><h4>Famille</h4></div>
    <div class="sec"><div class="list"><div class="rowi ico">${avatar(30, 'L', 'var(--kid)')}<div class="main"><div class="t">Léo</div></div><span class="val">11 ans</span><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div><div class="rowi ico">${avatar(30, 'I', NIGHT ? '#6E8C84' : '#A7C4BC', '#022539')}<div class="main"><div class="t">Inès</div></div><span class="val">14 ans</span><span class="chev">${ic('chevR', 16, { sw: 2.4 })}</span></div>${rowi({ icon: 'people', t: 'Co-parent', val: 'Invité' })}</div></div>
    <div class="sec-h small"><h4>Préférences</h4></div>
    <div class="sec"><div class="list"><div class="rowi ico"><span class="ibadge">${ic('bell', 18, { sw: 2 })}</span><div class="main"><div class="t">Notifications push</div></div><span class="tgl on"></span></div>${rowi({ icon: 'shield', t: 'Double authentification', val: 'Activée' })}</div></div>
    <div class="sec-h small"><h4>Données · hébergées au Canada</h4></div>
    <div class="sec"><div class="list">${rowi({ icon: 'tray', t: 'Exporter mes données' })}${rowi({ icon: 'doc', t: 'Confidentialité · Loi 25' })}</div>
    <div class="sec-f">Le courriel et le mot de passe se changent avec ton coach ou l’équipe THRIVE.</div></div>
    <div class="sec" style="margin-top:22px"><div class="list"><div class="rowi danger" style="justify-content:center"><div class="main center"><div class="t">Se déconnecter</div></div></div></div></div>
    <div style="height:40px"></div></div></div>${navbar({ title: 'Compte', right: gb('check', { tinted: true, label: 'OK' }), edge: true })}` });

  // Y — Offres THRIVE (Maison · Groupe · Individuel · Complet)
  S.Y = () => {
    const progs = [
      ['Groupe', 600, 'Notre programme phare', '13 séances en petit groupe (4 à 6 enfants), ateliers sportifs', 'BON-01', true],
      ['Individuel', 1500, 'Seul avec un coach', '13 séances 1:1 de 60 à 70 min, et le Book THRIVE à la fin', 'ACT-0101', false],
      ['Complet', 2000, 'Le parcours le plus complet', '13 séances 1:1, puis l’intégration progressive au groupe', 'ACT-0801', false],
    ];
    const card = ([n, p, k, d, img, star]) => {
      const on = n === PROG;
      return `<div class="card" style="${on ? 'box-shadow:0 0 0 2.5px var(--tint)' : ''}"><div class="flex gap12">${vimg(img, 64, { r: 18 })}<div class="f1"><div class="flex between items-c"><span class="fr" style="font:600 20px/24px var(--display);font-variation-settings:'SOFT' 100">THRIVE ${n}</span><span class="fr num" style="font:500 20px/24px var(--display)">${money(p).replace(',00', '')}<span class="t-foot c2" style="font-family:var(--sf)"> + tx</span></span></div><div class="t-foot c2">${k}</div></div></div>
        <div class="t-sub" style="margin-top:10px">${d}.</div>
        <div class="flex wrap gap4" style="margin-top:10px">${star ? '<span class="tag warm">Phare</span>' : ''}${on ? '<span class="tag">Ton programme</span>' : ''}<span class="tag gray">En 2 versements</span><span class="tag gray">Maison inclus</span><span class="tag gray">Bilan + Mes séances</span></div></div>`;
    };
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Offres</div><div class="subtitle-nav">Pour ta famille. Prix en dollars canadiens.</div>
      <div class="sec-h"><h4>Chaque soir</h4></div>
      <div class="sec"><div class="card"><div class="flex gap12">${vimg('ACT-0603', 64, { r: 18 })}<div class="f1"><div class="flex between items-c"><span class="fr" style="font:600 20px/24px var(--display);font-variation-settings:'SOFT' 100">THRIVE Maison</span><span class="tag ok">Inclus</span></div><div class="t-foot c2">Le moment qui compte, 10 minutes par jour</div></div></div>
        <div class="flex gap8" style="margin-top:12px"><div class="f1" style="border-radius:16px;padding:10px 12px;background:var(--fill4)"><div class="fr num" style="font:500 22px/26px var(--display)">32,50 $</div><div class="t-foot c2">par mois</div></div><div class="f1" style="border-radius:16px;padding:10px 12px;background:var(--tint-soft)"><div class="fr num" style="font:500 22px/26px var(--display)">299 $</div><div class="t-foot c2">par an · −23 %</div></div></div>
        <div class="t-foot c2" style="margin-top:8px">1 mois d’essai gratuit · partagé avec ton co-parent</div>
        <div class="flex items-c gap4 t-foot c2" style="margin-top:6px">${ic('phone', 13, { sw: 2.2 })}Abonnement géré par l’App Store</div></div></div>
      <div class="sec-h"><h4>Avec un coach</h4></div>
      <div class="sec flex col gap12">${progs.map(card).join('')}</div>
      <div class="sec" style="margin-top:12px"><div class="card flex gap12 items-c"><span style="width:36px;height:36px;border-radius:10px;background:#635BFF;color:#fff;display:grid;place-items:center;flex:none;font:800 18px/1 var(--sf)">S</span><div class="t-sub"><b>Paiement des programmes par Stripe.</b> 1<sup>er</sup> versement à l’inscription, dans l’app ou par lien courriel ; le 2<sup>e</sup> à la séance 7.</div></div></div>
      <div class="sec" style="margin-top:12px"><div class="card flex gap12 items-c" style="background:var(--badge-bg)"><span style="color:var(--ok)">${ic('shield', 26)}</span><div class="t-sub"><b>Garantie :</b> les 2 premières séances ne sont pas facturées si tu n’es pas convaincu.</div></div></div>
      <div class="sec-f" style="margin:8px 16px 0">Hors de l’île de Montréal ? Individuel aussi en visio, à [prix visio à confirmer].</div>
      <div style="height:120px"></div></div></div>
      ${navbar({ left: gb('x'), edge: true })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:34px;padding:6px"><span class="btn sun">${ic('calendar', 18)}Réserver un appel de 15 min</span></div>` };
  };

  // Y2 — Programme Groupe : paiement en 2 versements (Stripe)
  S.Y2 = () => {
    const half = 300, halfTx = half * TAX;
    const applePay = NIGHT ? 'background:#F7F5F2;color:#022539' : 'background:#000;color:#fff';
    return { html: `<div class="scroll"><div style="padding-top:0">
      <div style="height:300px;position:relative;overflow:hidden">
        <img src="${vsrc('BON-01')}" alt="" style="position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(34px) saturate(1.15);opacity:${NIGHT ? '.5' : '.85'}">
        <img src="${vsrc('BON-01')}" alt="" style="position:absolute;left:0;top:52px;width:402px;height:248px;object-fit:cover;-webkit-mask-image:linear-gradient(to bottom,#000 68%,transparent 100%);mask-image:linear-gradient(to bottom,#000 68%,transparent 100%)">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0) 66%, var(--bg) 100%)"></div></div>
      <div class="pad" style="margin-top:4px"><span class="tag warm">Programme phare</span><div class="fr" style="font:600 34px/38px var(--display);margin-top:8px;font-variation-settings:'SOFT' 100">THRIVE Groupe</div><div class="t-sub c2">13 séances en petit groupe · ateliers sportifs · 4 à 6 enfants</div></div>
      <div class="sec" style="margin-top:14px"><div class="list">${rowi({ icon: 'people', t: 'Vague d’automne · 8–11 ans', d: '2 inscrits · le groupe démarre dès 2', chev: false })}${rowi({ icon: 'house', t: 'Maison inclus', d: 'Pendant tout le programme', chev: false })}${rowi({ icon: 'sparkle', t: 'Bilan et Mes séances', d: 'Questionnaires avant / après', chev: false })}</div></div>
      <div class="sec-h small"><h4>Paiement</h4></div>
      <div class="sec"><div class="seg"><span class="on">En 2 versements</span><span>En une fois</span></div></div>
      <div class="sec" style="margin-top:10px"><div class="list"><div class="rowi"><div class="main"><div class="t">Aujourd’hui</div><div class="d">Remboursable pendant la garantie</div></div><span class="val num" style="color:var(--label)">${money(half)} + tx</span></div><div class="rowi"><div class="main"><div class="t">À la séance 7</div><div class="d">Prélevé automatiquement</div></div><span class="val num">${money(half)} + tx</span></div></div>
      <div class="sec-f">Aujourd’hui : ${money(halfTx)} taxes incluses (TPS + TVQ).</div></div>
      <div class="sec-h small"><h4>Moyen de paiement</h4></div>
      <div class="sec"><div class="list">${[['Apple Pay', 'Traité par Stripe', 'phone', true], ['Carte de crédit ou de débit', 'Visa, Mastercard, Amex · traité par Stripe', 'tray', false], ['Recevoir un lien de paiement', 'Payer depuis ton ordinateur, par courriel', 'envelope', false]].map(([t, d, i, on]) => `<div class="rowi ico"><span class="ibadge">${ic(i, 18, { sw: 2 })}</span><div class="main"><div class="t">${t}</div><div class="d">${d}</div></div>${on ? `<span class="ctint">${ic('check', 20, { sw: 2.6 })}</span>` : ''}</div>`).join('')}</div>
      <div class="sec-f flex items-c gap4"><span style="width:18px;height:18px;border-radius:5px;background:#635BFF;color:#fff;display:inline-grid;place-items:center;font:800 11px/1 var(--sf);flex:none">S</span>Paiement sécurisé par Stripe. Le 2<sup>e</sup> versement est prélevé sur le même moyen à la séance 7 ; reçu par courriel.</div></div>
      <div style="height:140px"></div></div></div>
      ${navbar({ left: gb('chevL'), right: gb('share') })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:34px;padding:6px"><span class="btn" style="${applePay}">${ic('phone', 18)}Payer ${money(halfTx)} · Apple Pay</span></div>` };
  };

  // Y3 — Appel de 15 min avec un coach
  S.Y3 = () => {
    const days = [['lun.', 13], ['mar.', 14], ['mer.', 15], ['jeu.', 16], ['ven.', 17]];
    const slots = ['17 h 00', '17 h 30', '18 h 00', '18 h 30', '19 h 00', '19 h 30'];
    return { html: `<div class="scroll"><div style="padding-top:108px">
      <div class="pad flex items-c gap12"><div class="f1"><div class="fr" style="font:600 32px/36px var(--display);font-variation-settings:'SOFT' 100">Rencontrer un coach</div><div class="t-sub c2" style="margin-top:4px">15 minutes, sans engagement. On parle de ${K.prenom} et du programme qui lui va.</div></div>${arch(78, 90, { id: 'ACT-1301', cls: 'sm' })}</div>
      <div class="sec" style="margin-top:16px"><div class="seg"><span class="on">${ic('playRect', 15, { style: 'display:inline;vertical-align:-3px' })} Vidéo</span><span>Téléphone</span></div></div>
      <div class="sec-h small"><h4>Octobre 2026</h4></div>
      <div class="sec flex between">${days.map(([d, n], i) => `<div class="flex col items-c ${i === 1 ? '' : 'felt'}" style="width:62px;height:72px;border-radius:20px;justify-content:center;gap:2px;background-color:${i === 1 ? (NIGHT ? '#A7C4BC' : 'var(--tint)') : 'var(--bg2)'};border:1px solid ${i === 1 ? 'transparent' : 'var(--sep)'};color:${i === 1 ? (NIGHT ? '#022539' : 'var(--tint-ink)') : 'var(--label)'}"><span class="t-foot" style="opacity:.75">${d}</span><span class="fr num" style="font:500 22px/26px var(--display)">${n}</span></div>`).join('')}</div>
      <div class="sec-h small"><h4>Mardi 14 octobre</h4></div>
      <div class="sec" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${slots.map((t, i) => `<span class="chip num${i === 3 ? ' on' : ''}" style="justify-content:center;height:44px;border-radius:14px;${i === 1 ? 'opacity:.35;text-decoration:line-through' : ''}">${t}</span>`).join('')}</div>
      <div class="sec" style="margin-top:16px"><div class="list">${rowi({ icon: 'calendar', t: 'Ajouter au calendrier', chev: false, right: '<span class="tgl on"></span>' })}</div>
      <div class="sec-f">Rien n’est payé avant l’appel. Ensuite, tu règles le 1<sup>er</sup> versement par Stripe, dans l’app ou par le lien reçu par courriel, et le programme démarre 1 à 2 semaines plus tard.</div></div>
      <div style="height:120px"></div></div></div>
      ${navbar({ left: gb('x'), edge: true })}
      <div class="glass" style="position:absolute;left:16px;right:16px;bottom:34px;border-radius:34px;padding:6px"><span class="btn sun">Réserver mardi 14 oct. · 18 h 30</span></div>` };
  };

  // X2 — Mon abonnement Maison (inclus avec le programme · ou essai gratuit)
  S.X2 = (o = {}) => {
    const trial = !!o.trial;
    return { html: `<div class="scroll"><div style="padding-top:108px"><div class="largetitle">Mon abonnement</div>
      <div class="sec" style="margin-top:14px"><div class="card"><div class="flex items-c gap12">${vimg('ACT-0603', 56, { r: 16 })}<div class="f1"><div class="fr" style="font:600 20px/24px var(--display);font-variation-settings:'SOFT' 100">THRIVE Maison</div><div class="t-sub c2">${trial ? 'Annuel · 299 $ CA par an' : `Inclus avec ton programme ${PROG}`}</div></div><span class="tag ${trial ? '' : 'ok'}">${trial ? 'Essai gratuit' : 'Actif'}</span></div>
        <div style="height:.5px;background:var(--sep);margin:14px 0"></div>
        ${trial ? `<div class="flex between t-sub"><span class="c2">Fin de l’essai</span><span class="b num">9 novembre 2026</span></div><div class="bar-p" style="margin-top:8px"><i style="width:20%"></i></div><div class="t-foot c2" style="margin-top:8px">Puis 299 $ CA par an, renouvelé automatiquement. Annule au moins 24 h avant pour ne rien payer.</div>`
          : `<div class="flex between t-sub"><span class="c2">Accès ouvert jusqu’à</span><span class="b">la fin du programme</span></div><div class="t-foot c2" style="margin-top:8px">Ensuite, tu pourras continuer à 32,50 $ par mois ou 299 $ par an, via l’App Store.</div>`}</div></div>
      <div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'people', t: 'Partagé avec ton co-parent', d: 'Alex Tremblay a aussi accès à Maison', chev: false })}${rowi({ icon: trial ? 'phone' : 'tray', t: trial ? 'Payé via l’App Store' : 'Payé avec ton programme', d: trial ? 'Sur cet iPhone' : 'Programme réglé par Stripe · aucun abonnement séparé', chev: false })}</div></div>
      ${trial ? `<div class="sec" style="margin-top:12px"><div class="list">${rowi({ icon: 'gear', t: 'Gérer dans l’App Store', d: 'Changer de formule ou annuler' })}${rowi({ icon: 'rotate', t: 'Restaurer les achats', chev: false })}</div>
        <div class="sec-f">Déjà abonné ailleurs (autre appareil, ou sur le site THRIVE) ? Connecte-toi avec la même adresse : ton accès est reconnu partout.</div></div>` : ''}
      <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), edge: true })}` };
  };

  // Z — Fin de parcours : le certificat, double cadre sauge sur papier
  S.Z = () => ({ html: `<div class="scroll"><div style="padding-top:108px">
    <div class="sec"><div class="paper frame" style="border-radius:30px;padding:26px 20px 22px;text-align:center;position:relative;overflow:hidden">
      <div style="display:flex;justify-content:center">${arch(70, 80, { cls: 'xs' })}</div>
      <div class="eyebrow" style="color:#46695F;margin-top:14px">Certificat THRIVE</div>
      <div class="fr" style="font:600 36px/40px var(--display);margin-top:8px;font-variation-settings:'SOFT' 100">Léo Tremblay</div>
      <div style="font:400 15px/21px var(--sf);color:#33454F;margin-top:6px">a terminé le parcours des 13 séances<br>avec ${K.coach} · décembre 2026</div>
      <div class="flex" style="justify-content:center;gap:10px;margin-top:18px"><span class="btn md sun" style="width:auto">${ic('share', 18)}Partager</span><span class="btn md" style="width:auto;background:rgba(0,49,76,.08);color:#022539">${ic('doc', 18)}PDF</span></div></div></div>
    <div class="sec-h"><h4>La courbe se referme</h4></div>
    <div class="sec"><div class="card" style="padding:12px 12px 6px"><div class="flex items-c gap8" style="padding:2px 4px 6px"><span class="fr num" style="font:500 36px/1 var(--display)">79</span><span class="t-headline" style="color:var(--ok)">+23 depuis le départ</span></div>${lsssCurve([56, 67, 79], { final: true })}</div></div>
    <div class="sec" style="margin-top:12px"><div class="card"><div class="kick" style="display:flex;align-items:center;gap:6px">${ic('wave', 15)}Bien-être · 13 séances</div><div style="margin-top:8px">${spark([3.4, 3.6, 3.5, 3.8, 3.7, 4.0, 4.1, 4.0, 4.2, 4.1, 4.3, 4.4, 4.4], { w: 338, h: 64, min: 3.2, max: 4.6 })}</div></div></div>
    <div class="sec-h small"><h4>Documents du parcours</h4></div>
    <div class="sec"><div class="list">${rowi({ icon: 'doc', t: 'Contrat de confiance' })}${rowi({ icon: 'envelope', t: 'Lettre à moi-même' })}${rowi({ icon: 'book', t: 'Le Book THRIVE', d: 'Le récapitulatif du programme' })}${rowi({ icon: 'medal', t: 'Certificat THRIVE' })}</div><div class="sec-f">Chaque ouverture passe par un lien sécurisé à durée limitée.</div></div>
    <div style="height:40px"></div></div></div>${navbar({ left: gb('chevL'), title: 'Fin de parcours', edge: true, right: gb('share') })}` });

  // ── Variantes d'état (chapitre 09) ──────────────────────────────────────
  S.G2 = () => S.G({ locked: true });
  S.S2 = () => S.S({ locked: true });
  S.U2 = () => S.U({ locked: true });
  S.K3 = () => S.K({ trial: true });
  S.X2b = () => S.X2({ trial: true });

  // ── Chapitres et légendes ───────────────────────────────────────────────
  const CH = [
    ['01', 'Arrivée', 'Du premier écran à l’essai gratuit de Maison', [
      ['A', 'Bienvenue', 'L’arche de lin avec la mascotte, le logo, deux slogans qui se relaient ; un seul geste soleil : l’essai d’un mois.'],
      ['B', 'Connexion', 'Médaillon d’arche, liste inset grouped, rappel de la double authentification.'],
      ['C', 'Inscription · le parent', 'Étape 1 sur 2. Le bouton reste inactif tant que le mot de passe n’a pas 8 caractères.'],
      ['D', 'Inscription · les enfants', 'Âge par stepper (8–17), sport par menu d’actions en verre.'],
      ['D2', 'Essai gratuit de Maison', '« 0 $ par mois pendant 1 mois » en Fraunces, la frise, puis les formules en prix par mois. Restaurer, conditions, confidentialité.'],
      ['D3', 'Confirmation App Store', 'La feuille d’achat du système, volontairement neutre : c’est Apple qui parle.'],
      ['E', 'Ton espace se prépare', 'Après l’appel : fiche reçue, confirmée, ouverte par le coach. Maison est déjà ouvert.'],
      ['F', 'Choisir le profil', 'Deux arches-portraits avec le numéro du maillot, coche en émail sur le profil actif.'],
    ]],
    ['02', 'Maison · la page d’accueil', 'Le premier onglet, celui de chaque soir', [
      ['K', 'Maison', 'La présentation d’origine « Soir de famille » dans la structure iOS 27 : l’affiche du soir, Lancer en émail, quatre portes en feutre, la semaine en velours, les rangées d’affiches, le carnet en papier. Écran déroulé.'],
      ['K2', 'Tout le parcours', 'Les 13 semaines et leurs activités, chacune avec sa vignette. Écran long, déroulé.'],
      ['L', 'Fiche moment', 'L’affiche en grand, durée 10/20/30, la phrase d’ouverture sur papier, 4 étapes, niveau de preuve.'],
      ['N', 'Le carnet', 'Ce qu’on garde, l’objet gagné en émail, la collection (papier / feutre).'],
    ]],
    ['02 bis', 'Durant l’activité · le mode activité', 'Plein écran, toujours sur le fond marine de la veillée. Les temps de la Méthode, un écran à la fois : tout s’ajoute en dessous, rien n’avance tout seul', [
      ['M1', 'Check-in', 'Trois petites questions, il répond d’un geste : pictogrammes dessinés, pastille crème quand elle est choisie, « Passer » toujours possible.'],
      ['M2', 'La fois d’avant', 'La dernière phrase gardée par Léo, en grand, sous la lampe.'],
      ['M3', 'Amorce', 'L’affiche en arche, « Ce qu’on travaille » sur papier, la phrase à dire pour commencer, le minuteur part sur 20 minutes.'],
      ['M', 'Moment en cours', 'Le déroulé : chaque « Suivant » ajoute une consigne ou une phrase à dire en dessous ; « Si ça bloque », minuteur de jeu, anneau du moment dans la barre du haut en verre.'],
      ['M4', 'Minuteur de jeu', 'Plein écran, ton « silence » : le mot en très grand, les secondes qui restent, « Arrêter ».'],
      ['M5', 'Approfondir', 'En fin de déroulé : « Vous avez encore envie, tous les deux ? », +10 min Approfondir puis Transférer ; la barre propose « Terminer l’activité ».'],
      ['M6', 'En voiture · lire', 'Tout se fait à voix haute : on lit les étapes avant de partir.'],
      ['M7', 'En voiture · la route', 'Anneau du moment et une seule action : Terminer. Le téléphone reste posé.'],
      ['M8', 'Débrief', 'Les questions s’ajoutent l’une sous l’autre, une à la fois ; la réponse se note d’un tap, ou on passe.'],
      ['M9', 'Pour finir', 'La phrase de clôture, à dire.'],
      ['M10', '« 18 minutes avec Léo. »', 'Une seconde, seul à l’écran, avant la synthèse.'],
      ['M11', 'Synthèse', 'Une note pour toi (étoiles), « Ça a donné quoi ? », une phrase à garder. Facultatif.'],
      ['M12', 'Fin', 'Le compteur de moments, les 3 étoiles de la semaine, la phrase de fierté, la suite, retour à Maison.'],
      ['M13', 'Fin · objet débloqué', 'Semaine complète : la carte « Débloqué » avec Voir / Plus tard.'],
      ['M14', 'Noter', 'La feuille « À garder » : ce qu’il a dit, dans ses mots.'],
      ['M15', 'Lettre à moi-même', 'Séance 13 : la lettre sur papier vergé, à ouvrir dans un an.'],
      ['M16', 'Sceller la lettre', 'Une fois scellée, personne ne pourra la lire avant la date, pas même toi.'],
      ['M17', 'Quitter', '« Enregistrer ce moment ? » : Oui compte les minutes, Non quitte sans rien garder.'],
    ]],
    ['03', 'Bilan & passeport', 'Ouvert par le coach dans un programme', [
      ['G', 'Bilan · la page complète', 'Toutes les cartes d’origine, dans l’ordre : % du programme, passeport, Compétences de vie, EPOCH, parcours des 13 séances, boîte à outils, étapes, puis « Mes outils THRIVE ». Écran long, déroulé.'],
      ['G11', 'Bilan · forfait Groupe', 'Mêmes cartes ; compétences détaillées, courbe EPOCH et roue des émotions deviennent des aperçus floutés « dès le pack Individuel ».'],
      ['G3', 'Fiche Identité Athlète', 'Histoire sportive, forces VIA, rêve de saison — feuille en grand détent + « Comprendre cette carte ».'],
      ['G4', 'Fiche Objectif', 'Objectif SMART cité, life skill, ce qui dépend de moi, progression.'],
      ['G5', 'Focus Word', 'Le mot-ancre en émail sur velours.'],
      ['G6', 'Routine pré-tir', 'Les 4 étapes reliées par le fil sauge → soleil.'],
      ['G7', 'Boîte à outils', 'Les 4 outils collectés sur 6 et le Focus word.'],
      ['G8', 'Prochaines étapes', 'Terminé / en cours / à venir avec échéances.'],
      ['G9', 'Lettre à moi-même', 'Papier vergé, scellée jusqu’à la séance 13.'],
      ['G10', 'Certificat THRIVE', 'Décompte des séances restantes, verrouillé jusqu’à S13.'],
      ['H', 'Compétences de vie', 'Feuille en grand détent : courbe LSSS Départ → Mi-parcours, 8 compétences avec repère de départ.'],
      ['I', 'Comprendre cette carte', 'La fiche d’explication de l’app : c’est quoi, les 8 familles, pourquoi c’est le vrai but.'],
      ['J', 'Personnaliser le passeport', 'Photo, surnom d’athlète, n° de maillot, 6 couleurs, Enregistrer, note de confidentialité.'],
    ]],
    ['04', 'Avec le coach', 'Programme : 13 séances, bilans, messages', [
      ['S', 'Mes séances', 'Carte de velours 7/13 avec anneau soleil, séances par phase avec leur vignette.'],
      ['T', 'Bilan du coach', 'Le message du coach sur papier, le bilan détaillé, les observations sur 5.'],
      ['U', 'Messages', 'Bulles crème et marine, champ en verre. Le coach est l’onglet Prominent.'],
      ['V', 'Notifications', 'Groupées par jour, pastille soleil non lue, badges tonals.'],
    ]],
    ['05', 'Offres & paiement', 'Maison : achat intégré Apple. Programmes : Stripe, 1er versement à l’inscription', [
      ['Y', 'Offres', 'Maison (32,50 $/mois ou 299 $/an, essai 1 mois), puis Groupe 600 $ (phare), Individuel 1 500 $, Complet 2 000 $, + tx. Garantie des 2 premières séances.'],
      ['Y2', 'Groupe · paiement', 'Moitié aujourd’hui, moitié à la séance 7. Apple Pay, carte ou lien par courriel (Stripe). Total taxes incluses.'],
      ['Y3', 'Appel de 15 min', 'Vidéo ou téléphone, jours et créneaux, ajout au calendrier. Rien n’est payé avant.'],
      ['X2', 'Mon abonnement', 'Maison inclus avec le programme, puis l’option de continuer.'],
    ]],
    ['06', 'Séances vidéo · en construction', 'Pas disponibles pour l’instant : l’écran l’annonce, les suivants restent un aperçu', [
      ['O', 'Bientôt disponible', 'Mascotte dans son arche, « En construction », « Me prévenir », retour vers Maison.'],
      ['P', 'Prêt avec Léo ?', 'Aperçu, avec le bandeau « pas disponible ».'],
      ['Q', 'Question en pause', 'Aperçu : scène de la mascotte derrière la question, portrait dans la carte.'],
      ['R', 'Après la séance', 'Aperçu : célébration, slider Liquid Glass, action de transfert.'],
    ]],
    ['07', 'L’enfant', 'Pas de compte, pas de mot de passe : un lien que le parent lui tend', [
      ['W', 'Questionnaire de Léo', 'Lampe chaude, grands boutons 1–5, FR/EN, note de confidentialité.'],
    ]],
    ['08', 'Compte & fin de parcours', 'Le cadre, puis la courbe qui se referme', [
      ['X', 'Compte & famille', 'Mon programme, abonnement Maison, offres, style de l’app (Lin · Veillée), famille, préférences, 2FA, données au Canada.'],
      ['Z', 'Fin de parcours', 'Certificat en papier à double cadre sauge, Book THRIVE, courbe LSSS complète (+23).'],
    ]],
    ['09', 'États · abonné Maison seul', 'Les mêmes écrans quand la famille n’a que Maison : les onglets restent visibles, avec cadenas', [
      ['K3', 'Maison · essai gratuit', 'Bandeau « Essai gratuit · encore 24 jours » et invitation discrète vers un coach.'],
      ['G2', 'Bilan verrouillé', 'Aperçu flouté + carte « s’ouvre avec un coach », garantie des 2 séances, appel de 15 min.'],
      ['S2', 'Mes séances verrouillé', 'Aperçu flouté des 13 séances et invitation.'],
      ['U2', 'Messages verrouillé', 'Aperçu factice + invitation : la messagerie vient avec un programme.'],
      ['X2b', 'Mon abonnement · essai', 'Essai jusqu’au 9 nov., renouvellement annuel, Gérer dans l’App Store, Restaurer.'],
    ]],
  ];

  function phone(letter) {
    const s = S[letter]();
    const hs = s.h ? ` style="height:${s.h}px"` : '';
    return `<div class="phone-wrap"${hs}${s.vig ? ' data-v="v5"' : ''}><div class="phone"${hs}${s.auto ? ' data-auto="1"' : ''}>${s.html}${statusbar(s.dark)}<div class="island"></div><div class="home-ind${s.dark ? ' light' : ''}"></div></div></div>`;
  }

  const root = document.getElementById('deck');
  root.innerHTML = CH.map(([n, t, d, shots]) => `<section class="chapter"><h2>${n} · ${t}</h2><h3>${d}</h3><div class="row-of-phones">${shots.map(([L, title, cap]) => `<figure class="shot" data-l="${L}" style="margin:0">${phone(L)}<figcaption><span class="letter">${L}</span><span class="cap-t">${title}</span><span class="cap-d">${cap}</span></figcaption></figure>`).join('')}</div></section>`).join('');

  // Écrans déroulés (K, K2) : la hauteur suit le contenu
  function autoHeights() {
    document.querySelectorAll('.phone[data-auto]').forEach((ph) => {
      const sc = ph.querySelector('.scroll');
      const inner = sc && sc.firstElementChild;
      if (!inner) return;
      const h = Math.max(874, Math.ceil(inner.getBoundingClientRect().height / (ph.getBoundingClientRect().width / 402 || 1)) + 8);
      ph.style.height = h + 'px';
      ph.parentElement.style.height = h + 'px';
    });
  }
  autoHeights();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoHeights);
  window.addEventListener('load', autoHeights);

  // Mise à l'échelle sur petits écrans (le téléphone garde ses 402 pt logiques)
  function fit() {
    const w = Math.min(402 + 24, window.innerWidth - 32);
    document.querySelectorAll('.shot').forEach((el) => {
      const pw = el.querySelector('.phone-wrap');
      const k = Math.min(1, w / 426);
      pw.style.transform = k < 1 ? `scale(${k})` : '';
      pw.style.transformOrigin = 'top left';
      pw.style.marginBottom = k < 1 ? `${-pw.offsetHeight * (1 - k)}px` : '';
      el.style.width = k < 1 ? `${426 * k}px` : '';
    });
  }
  window.addEventListener('resize', fit); fit();
})();
