// Page de comparaison avant / après : ux-audit/compare.html
//   node scripts/ux-audit/compare.mjs [before] [after]
// Les captures restent dans ux-audit/<dossier>/ (régénérables, non versionnées).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../ux-audit');
const [A = 'before', B = 'after'] = process.argv.slice(2);
const load = (n) => JSON.parse(readFileSync(path.join(root, n, 'report.json'), 'utf8')).results;
const before = load(A);
const after = load(B);
const key = (r) => `${r.viewport}|${r.role}|${r.screen}`;
const bMap = new Map(before.map((r) => [key(r), r]));
const rows = after
  .filter((r) => !r.error)
  .map((r) => ({ a: r, b: bMap.get(key(r)) }))
  .sort((x, y) => key(x.a).localeCompare(key(y.a)));

const issues = (r) =>
  r
    ? {
        o: r.overflow?.length ? 1 : 0,
        t: r.smallTargetsCount ?? 0,
        i: r.smallInputs?.length ?? 0,
        c: r.cls ?? 0,
        x: (r.axe ?? []).reduce((n, v) => n + v.nodes, 0),
      }
    : null;

const data = rows.map(({ a, b }) => ({
  v: a.viewport,
  r: a.role,
  s: a.screen,
  before: b ? path.relative(root, path.join(root, '..', b.file)) : null,
  after: path.relative(root, path.join(root, '..', a.file)),
  bi: issues(b),
  ai: issues(a),
}));
const uniq = (k) => [...new Set(data.map((d) => d[k]))];

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>THRIVE — avant / après</title>
<style>
:root{--bg:#F7F5F2;--ink:#022539;--soft:#44576a;--line:#dde4ea;--card:#fff;--accent:#004E7A;--ok:#15803D;--bad:#B91C1C}
@media (prefers-color-scheme:dark){:root{--bg:#06161e;--ink:#f7f5f2;--soft:#a9bcc4;--line:#1d3440;--card:#0c2029;--accent:#F9EB50;--ok:#4ade80;--bad:#fca5a5}}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--ink)}
header{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:14px 16px}
h1{margin:0 0 10px;font-size:20px}
.filters{display:flex;flex-wrap:wrap;gap:8px}
select,input{font:inherit;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
main{padding:16px;display:grid;gap:20px}
.item{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px}
.item h2{font-size:15px;margin:0 0 10px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:700px){.pair{grid-template-columns:1fr}}
figure{margin:0}figcaption{font-size:13px;color:var(--soft);margin-bottom:6px}
.frame{max-height:70vh;overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
.frame img{display:block;width:100%;height:auto}
.muted{color:var(--soft)}.good{color:var(--ok)}.badc{color:var(--bad)}
.count{font-size:13px;color:var(--soft);margin-top:8px}
</style>
</head>
<body>
<header>
  <h1>THRIVE — comparaison avant / après</h1>
  <div class="filters">
    <select id="v" aria-label="Format"><option value="">Tous les formats</option>${uniq('v').map((v) => `<option>${v}</option>`).join('')}</select>
    <select id="r" aria-label="Rôle"><option value="">Tous les rôles</option>${uniq('r').map((v) => `<option>${v}</option>`).join('')}</select>
    <input id="s" type="search" placeholder="Filtrer par écran" aria-label="Filtrer par écran">
  </div>
  <p class="count" id="count"></p>
</header>
<main id="list"></main>
<script>
const DATA=${JSON.stringify(data)};
const fmt=(i)=>i?'débord. '+i.o+' · cibles<44 '+i.t+' · champs<16 '+i.i+' · CLS '+i.c+' · axe '+i.x:'—';
function render(){
  const v=document.getElementById('v').value,r=document.getElementById('r').value,s=document.getElementById('s').value.toLowerCase();
  const list=DATA.filter(d=>(!v||d.v===v)&&(!r||d.r===r)&&(!s||d.s.toLowerCase().includes(s))).slice(0,60);
  document.getElementById('count').textContent=list.length+' affiché(s) sur '+DATA.filter(d=>(!v||d.v===v)&&(!r||d.r===r)&&(!s||d.s.toLowerCase().includes(s))).length+' (60 max, affine les filtres)';
  document.getElementById('list').innerHTML=list.map(d=>'<article class="item"><h2>'+d.r+' / '+d.s+' <span class="muted">@ '+d.v+'</span></h2><div class="pair">'+
   '<figure><figcaption>Avant — '+fmt(d.bi)+'</figcaption><div class="frame">'+(d.before?'<img loading="lazy" alt="Avant : '+d.s+'" src="'+d.before+'">':'<p class="muted" style="padding:12px">Pas de capture</p>')+'</div></figure>'+
   '<figure><figcaption>Après — '+fmt(d.ai)+'</figcaption><div class="frame"><img loading="lazy" alt="Après : '+d.s+'" src="'+d.after+'"></div></figure></div></article>').join('');
}
['v','r','s'].forEach(id=>document.getElementById(id).addEventListener('input',render));
document.getElementById('v').value='iphone-se';render();
</script>
</body>
</html>`;
writeFileSync(path.join(root, 'compare.html'), html);
console.log(`ux-audit/compare.html — ${data.length} comparaisons`);
