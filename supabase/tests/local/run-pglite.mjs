#!/usr/bin/env node
// Rejoue les tests SQL de droits d'accès sur un Postgres embarqué (PGlite,
// WebAssembly) : ni Docker, ni psql, ni production.
//
//   npm i --no-save @electric-sql/pglite@0.2.17   (une fois, hors workspace)
//   node supabase/tests/local/run-pglite.mjs
//
// Étapes (chacune sur une base neuve) :
//   1. AVANT 080 : la fuite Bilan doit être PRÉSENTE (preuve que le test la voit) ;
//   2. APRÈS 080 (appliquée deux fois : idempotence) : fuite corrigée, matrice
//      080 et régression sécurité OK ;
//   3. ROLLBACK 080 : l'ancienne matrice (068/070/075) repasse, puis 080 se
//      réapplique et la matrice 080 repasse.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let PGlite;
try {
  ({ PGlite } = await import('@electric-sql/pglite'));
} catch {
  console.error('PGlite absent : npm i --no-save @electric-sql/pglite@0.2.17');
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const mig = (f) => join(root, 'migrations', f);
const test = (f) => join(root, 'tests', f);

const base = [
  join(here, '00_replica_schema.sql'),
  join(here, '01_seed.sql'),
  join(here, '02_replica_complement.sql'),
  mig('20261001_066_security_audit_final.sql'),
  mig('20261002_067_require_email_confirmation.sql'),
  mig('20261006_068_parent_section_access.sql'),
  mig('20261008_070_acces_unifie_sandbox.sql'),
  mig('20261009_075_packs_programme_unifies.sql'),
  mig('20261009_076_sandbox_revue_stores.sql'),
];
const m080 = mig('20261010_080_droits_acces_unifies.sql');
const r080 = join(root, 'rollbacks', '20261010_080_droits_acces_unifies_rollback.sql');

// Les tests se terminent par une exception dont le message porte le verdict.
async function run(label, files, expectations) {
  const db = new PGlite();
  const verdicts = [];
  for (const f of files) {
    const name = f.split('/').pop();
    try {
      await db.exec(readFileSync(f, 'utf8'));
      if (f.includes('/tests/') && !f.includes('/local/')) verdicts.push(`${name}: (aucun verdict)`);
    } catch (e) {
      const msg = String(e.message);
      if (!f.includes('/tests/') || f.includes('/local/')) {
        console.error(`✗ ${label} — ${name} : ${msg}`);
        return false;
      }
      verdicts.push(`${name}: ${msg}`);
    }
  }
  await db.close();
  let ok = true;
  for (const [i, re] of expectations.entries()) {
    const v = verdicts[i] ?? '(absent)';
    const pass = re.test(v);
    ok &&= pass;
    console.log(`${pass ? '✓' : '✗'} ${label} — ${v.slice(0, pass ? 90 : 4000)}`);
  }
  return ok;
}

const results = [
  await run('avant 080', [...base, test('bilan_leak_regression.sql')], [/BILAN_LEAK_PRESENT/]),
  await run(
    'après 080',
    [...base, m080, m080, test('bilan_leak_regression.sql'), test('access_rights_080.sql'), test('security_rls_regression.sql')],
    [/BILAN_LEAK_FIXED/, /ACCESS_080_PASSED/, /SECURITY_TESTS_PASSED/]
  ),
  await run(
    'rollback 080',
    [...base, m080, r080, test('access_matrix.sql'), m080, test('access_rights_080.sql')],
    [/ACCESS_MATRIX_PASSED/, /ACCESS_080_PASSED/]
  ),
];

if (results.every(Boolean)) {
  console.log('\nOK : fuite reproduite avant 080, corrigée après ; rollback et réapplication sûrs.');
} else {
  console.error('\nÉCHEC');
  process.exit(1);
}
