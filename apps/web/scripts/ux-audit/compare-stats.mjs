// Compare deux rapports d'audit sur les viewports communs.
//   node scripts/ux-audit/compare-stats.mjs before progress
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../ux-audit');
const [a, b] = process.argv.slice(2);
const load = (n) => JSON.parse(readFileSync(path.join(root, n, 'report.json'), 'utf8')).results;
const A = load(a), B = load(b);
const vps = new Set(B.map((r) => r.viewport));
const keyset = new Set(B.map((r) => `${r.role}|${r.screen}|${r.viewport}`));
const A2 = A.filter((r) => vps.has(r.viewport) && keyset.has(`${r.role}|${r.screen}|${r.viewport}`));
const stat = (rs) => {
  const axe = {};
  for (const r of rs) for (const v of r.axe ?? []) axe[`${v.impact}:${v.id}`] = (axe[`${v.impact}:${v.id}`] ?? 0) + v.nodes;
  return {
    captures: rs.length,
    erreurs: rs.filter((r) => r.error).length,
    debordements: rs.filter((r) => r.overflow?.length).length,
    'captures cibles<44': rs.filter((r) => r.smallTargetsCount).length,
    'total cibles<44': rs.reduce((n, r) => n + (r.smallTargetsCount ?? 0), 0),
    'champs<16': rs.filter((r) => r.smallInputs?.length).length,
    'CLS>0.1': rs.filter((r) => r.cls > 0.1).length,
    'CLS max': Math.max(0, ...rs.map((r) => r.cls ?? 0)),
    axe,
  };
};
console.log(a, JSON.stringify(stat(A2), null, 1));
console.log(b, JSON.stringify(stat(B), null, 1));
