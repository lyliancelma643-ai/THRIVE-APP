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
//   4. PASSAGE 083 GO 3 → GO 4 : la 083 du GO 3 (natif|nuit|carnet, copie figée dans
//      083_ui_style_go3.sql) tourne d'abord, des profils portent les anciennes valeurs,
//      puis la 083 du GO 4 (lin|veillee) les convertit, deux fois, et ui_style.sql repasse.
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
const m081 = mig('20261012_081_program_payments.sql');
const r081 = join(root, 'rollbacks', '20261012_081_program_payments_rollback.sql');
const m082 = mig('20261012_082_call_requests.sql');
const m083 = mig('20261012_083_ui_style.sql');
const r083 = join(root, 'rollbacks', '20261012_083_ui_style_rollback.sql');
// 083 telle qu'elle était au GO 3 (commit a78501c) : base où elle aurait déjà tourné avant la version GO 4.
const m083go3 = join(here, '083_ui_style_go3.sql');

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

// Passage 083 GO 3 → GO 4 sur des données réelles de l'ancien schéma (pas seulement sur une base vide).
async function run083Upgrade() {
  const label = 'passage 083 GO 3 → GO 4';
  const db = new PGlite();
  const problems = [];
  try {
    for (const f of [...base, m080, m083go3]) await db.exec(readFileSync(f, 'utf8'));
    // GO 3 : seules les anciennes valeurs sont acceptées.
    const ids = { natif: crypto.randomUUID(), carnet: crypto.randomUUID(), nuit: crypto.randomUUID(), aucun: crypto.randomUUID(), ancien: crypto.randomUUID() };
    for (const [k, id] of Object.entries(ids)) {
      await db.exec(`insert into auth.users (id, email, raw_app_meta_data) values ('${id}', '${k}@example.test', '{"role":"PARENT"}');
        insert into public.profiles (id, email, role) values ('${id}', '${k}@example.test', 'PARENT') on conflict (id) do nothing;`);
    }
    for (const k of ['natif', 'carnet', 'nuit']) await db.exec(`update public.profiles set ui_style = '${k}' where id = '${ids[k]}'`);
    let refused = false;
    try { await db.exec(`update public.profiles set ui_style = 'lin' where id = '${ids.aucun}'`); } catch { refused = true; }
    if (!refused) problems.push('GO 3 aurait dû refuser « lin » (la base de départ n’est pas celle du GO 3)');

    // GO 4, deux fois : idempotence.
    await db.exec(readFileSync(m083, 'utf8'));
    await db.exec(readFileSync(m083, 'utf8'));
    const { rows } = await db.query('select id, ui_style from public.profiles where id = any($1::uuid[])', [Object.values(ids)]);
    const style = (k) => rows.find((r) => r.id === ids[k])?.ui_style ?? null;
    const expected = { natif: 'lin', carnet: 'lin', nuit: 'veillee', aucun: null };
    for (const [k, v] of Object.entries(expected)) if (style(k) !== v) problems.push(`${k} : attendu ${v}, obtenu ${style(k)}`);
    const def = (await db.query("select pg_get_constraintdef(oid) as d from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_ui_style_check'")).rows[0]?.d ?? '';
    if (!/lin/.test(def) || !/veillee/.test(def) || /natif|nuit|carnet/.test(def)) problems.push(`contrainte inattendue : ${def}`);

    // Un client GO 3 qui appelle encore la RPC avec l'ancien vocabulaire n'est pas cassé.
    await db.exec(`select set_config('request.jwt.claims', json_build_object('sub', '${ids.ancien}', 'role', 'authenticated', 'app_metadata', json_build_object('role', 'PARENT'))::text, false); set role authenticated;`);
    const old = (await db.query("select public.set_ui_style('nuit') as s")).rows[0]?.s;
    await db.exec('reset role');
    if (old !== 'veillee') problems.push(`set_ui_style('nuit') devrait renvoyer veillee, obtenu ${old}`);

    // Les tests du GO 4 repassent sur cette base migrée (ils se terminent par une exception).
    let verdict = '(aucun verdict)';
    try { await db.exec(readFileSync(test('ui_style.sql'), 'utf8')); } catch (e) { verdict = String(e.message); }
    if (!/UI_STYLE_PASSED/.test(verdict)) problems.push(`ui_style.sql : ${verdict.slice(0, 600)}`);
    await db.exec(readFileSync(test('access_rights_080.sql'), 'utf8')).catch((e) => {
      if (!/ACCESS_080_PASSED/.test(String(e.message))) problems.push(`access_rights_080.sql : ${String(e.message).slice(0, 600)}`);
    });
  } catch (e) {
    problems.push(String(e.message).slice(0, 800));
  }
  await db.close();
  if (problems.length) {
    console.error(`✗ ${label} — ${problems.join(' | ')}`);
    return false;
  }
  console.log(`✓ ${label} — natif|carnet→lin, nuit→veillee, NULL conservé, contrainte lin|veillee, RPC ancien client, UI_STYLE_PASSED`);
  return true;
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
  // GO 3 : paiements des programmes (081) et appels de 15 min (082), appliquées deux fois.
  await run(
    'GO 3 (081, 082)',
    [...base, m080, m081, m081, test('program_payments.sql'), test('access_rights_080.sql'), m082, m082, test('call_requests.sql')],
    [/PROGRAM_081_PASSED/, /ACCESS_080_PASSED/, /CALL_REQUESTS_PASSED/]
  ),
  // GO 3 · O5 : style de l'app (083), appliquée deux fois, puis rollback.
  await run(
    '083',
    [...base, m080, m083, m083, test('ui_style.sql'), test('access_rights_080.sql')],
    [/UI_STYLE_PASSED/, /ACCESS_080_PASSED/]
  ),
  await run(
    'rollback 083',
    [...base, m080, m083, r083, test('access_rights_080.sql'), m083, test('ui_style.sql')],
    [/ACCESS_080_PASSED/, /UI_STYLE_PASSED/]
  ),
  await run(
    'rollback 081',
    [...base, m080, m081, r081, test('access_rights_080.sql')],
    [/ACCESS_080_PASSED/]
  ),
  await run083Upgrade(),
];

if (results.every(Boolean)) {
  console.log('\nOK : fuite reproduite avant 080, corrigée après ; rollback et réapplication sûrs.');
} else {
  console.error('\nÉCHEC');
  process.exit(1);
}
