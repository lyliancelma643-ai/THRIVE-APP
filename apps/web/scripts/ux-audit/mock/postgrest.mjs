// ─────────────────────────────────────────────────────────────────────────────
// Mini-PostgREST en mémoire pour l'audit UX (aucune dépendance).
//
// Couvre ce que l'app web envoie réellement via supabase-js : projection
// `select` avec ressources imbriquées (`alias:table(cols)`, `alias:fk_col(cols)`,
// imbrication récursive), filtres eq/neq/in/is/gt/gte/lt/lte/like/ilike/cs/not,
// `or=(…)`, tri multi-colonnes, limit/offset/Range, `Prefer: count=exact`,
// objet unique (`application/vnd.pgrst.object+json`) et écritures
// (insert, upsert, update, delete) avec `return=representation`.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';

// Colonne de clé étrangère → table cible (conventions du schéma THRIVE).
export const FK = {
  coach_id: 'profiles',
  parent_id: 'profiles',
  user_id: 'profiles',
  author: 'profiles',
  created_by: 'profiles',
  assigned_by: 'profiles',
  admin_id: 'profiles',
  sender_id: 'profiles',
  updated_by: 'profiles',
  child_id: 'children',
  family_id: 'families',
  program_id: 'programs',
  video_session_id: 'video_sessions',
  conversation_id: 'conversations',
  task_id: 'admin_tasks',
  badge_id: 'badges',
  questionnaire_id: 'questionnaires',
};

// Préférences quand plusieurs colonnes pointent vers la même table.
const MANY_TO_ONE_PREF = {
  profiles: ['user_id', 'parent_id', 'coach_id', 'author', 'sender_id', 'created_by', 'admin_id'],
};

// ── Parsing du paramètre select ──────────────────────────────────────────────
function splitTop(str, sep = ',') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

export function parseSelect(select) {
  const raw = (select ?? '*').replace(/\s+/g, ' ').trim() || '*';
  return splitTop(raw).map((item) => {
    const paren = item.indexOf('(');
    if (paren >= 0 && item.endsWith(')')) {
      const head = item.slice(0, paren).trim();
      const inner = item.slice(paren + 1, -1);
      let alias = null;
      let target = head;
      if (head.includes(':')) [alias, target] = head.split(':').map((s) => s.trim());
      let hint = null;
      if (target.includes('!')) [target, hint] = target.split('!');
      return { kind: 'embed', alias: alias || target, target: target.trim(), hint, children: parseSelect(inner) };
    }
    let alias = null;
    let col = item;
    if (item.includes(':') && !item.includes('::')) [alias, col] = item.split(':').map((s) => s.trim());
    col = col.split('::')[0].trim();
    return { kind: 'col', alias: alias || col, col };
  });
}

// ── Filtres ──────────────────────────────────────────────────────────────────
function coerce(value, sample) {
  if (value === 'null') return null;
  if (typeof sample === 'number') return Number(value);
  if (typeof sample === 'boolean') return value === 'true';
  return value;
}

function parseList(v) {
  // in.(a,b,"c d")
  const inner = v.replace(/^\(/, '').replace(/\)$/, '');
  return splitTop(inner).map((s) => s.replace(/^"(.*)"$/, '$1'));
}

function likeToRegex(pattern, flags) {
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*');
  return new RegExp(`^${esc}$`, flags);
}

function testOp(rowValue, op, rawValue) {
  switch (op) {
    case 'eq':
      return String(rowValue) === String(coerce(rawValue, rowValue)) || rowValue === coerce(rawValue, rowValue);
    case 'neq':
      return !(String(rowValue) === String(coerce(rawValue, rowValue)));
    case 'gt':
      return rowValue != null && rowValue > coerce(rawValue, rowValue);
    case 'gte':
      return rowValue != null && rowValue >= coerce(rawValue, rowValue);
    case 'lt':
      return rowValue != null && rowValue < coerce(rawValue, rowValue);
    case 'lte':
      return rowValue != null && rowValue <= coerce(rawValue, rowValue);
    case 'in':
      return parseList(rawValue).some((v) => String(rowValue) === String(coerce(v, rowValue)));
    case 'is':
      if (rawValue === 'null') return rowValue === null || rowValue === undefined;
      if (rawValue === 'true') return rowValue === true;
      if (rawValue === 'false') return rowValue === false;
      return false;
    case 'like':
      return typeof rowValue === 'string' && likeToRegex(rawValue, '').test(rowValue);
    case 'ilike':
      return typeof rowValue === 'string' && likeToRegex(rawValue, 'i').test(rowValue);
    case 'cs': {
      // contains : tableau (`{a,b}`) ou JSON (`["a"]` / `{"k":1}`)
      if (Array.isArray(rowValue)) {
        let wanted;
        try {
          wanted = JSON.parse(rawValue);
        } catch {
          wanted = rawValue.replace(/^\{/, '').replace(/\}$/, '').split(',').filter(Boolean);
        }
        return (Array.isArray(wanted) ? wanted : [wanted]).every((w) => rowValue.includes(w));
      }
      return false;
    }
    default:
      return true;
  }
}

function testExpr(row, key, expr) {
  let negate = false;
  let e = expr;
  if (e.startsWith('not.')) {
    negate = true;
    e = e.slice(4);
  }
  const dot = e.indexOf('.');
  const op = e.slice(0, dot);
  const val = e.slice(dot + 1);
  const res = testOp(row[key], op, val);
  return negate ? !res : res;
}

function testOr(row, orExpr) {
  // or=(a.eq.1,b.is.null,and(c.eq.2,d.eq.3))
  const parts = splitTop(orExpr.replace(/^\(/, '').replace(/\)$/, ''));
  return parts.some((p) => {
    if (p.startsWith('and(')) return splitTop(p.slice(4, -1)).every((q) => testCond(row, q));
    return testCond(row, p);
  });
}

function testCond(row, cond) {
  const dot = cond.indexOf('.');
  return testExpr(row, cond.slice(0, dot), cond.slice(dot + 1));
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

export function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (RESERVED.has(key) || key.includes('.')) continue; // filtres sur ressource imbriquée ignorés
    if (key === 'or') out = out.filter((r) => testOr(r, value));
    else if (key === 'and') out = out.filter((r) => splitTop(value.slice(1, -1)).every((c) => testCond(r, c)));
    else out = out.filter((r) => testExpr(r, key, value));
  }
  return out;
}

export function applyOrder(rows, order) {
  if (!order) return rows;
  const specs = order.split(',').map((s) => {
    const [col, ...mods] = s.split('.');
    return {
      col,
      desc: mods.includes('desc'),
      nullsFirst: mods.includes('nullsfirst') ? true : mods.includes('nullslast') ? false : null,
    };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsFirst } of specs) {
      const av = a[col];
      const bv = b[col];
      if (av === bv) continue;
      const an = av === null || av === undefined;
      const bn = bv === null || bv === undefined;
      if (an || bn) {
        // PostgreSQL : NULLS LAST en ASC, NULLS FIRST en DESC par défaut.
        const nf = nullsFirst ?? desc;
        return an ? (nf ? -1 : 1) : nf ? 1 : -1;
      }
      const cmp = av < bv ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

// ── Ressources imbriquées ────────────────────────────────────────────────────
function singular(table) {
  if (table.endsWith('ies')) return `${table.slice(0, -3)}y`;
  if (table.endsWith('ses')) return table.slice(0, -2);
  if (table.endsWith('s')) return table.slice(0, -1);
  return table;
}

function resolveEmbed(db, baseTable, row, node) {
  const { target, hint } = node;
  // 1. `alias:fk_col(...)` → plusieurs-vers-un par la colonne nommée
  if (target in row && FK[target]) {
    const table = FK[target];
    const found = (db[table] ?? []).find((r) => r.id === row[target]) ?? null;
    return { mode: 'one', table, rows: found ? [found] : [] };
  }
  const table = target;
  const targetRows = db[table] ?? [];
  // 2. indice `!col` ou `!table_col_fkey`
  if (hint) {
    const col = hint in row ? hint : hint.replace(/_fkey$/, '').split('_').slice(-2).join('_');
    if (col in row) {
      const found = targetRows.find((r) => r.id === row[col]) ?? null;
      return { mode: 'one', table, rows: found ? [found] : [] };
    }
  }
  // 3. plusieurs-vers-un : une colonne de la ligne pointe vers la table cible
  const own = Object.keys(row).filter((k) => FK[k] === table);
  if (own.length) {
    const pref = MANY_TO_ONE_PREF[table] ?? [];
    const preferred = [`${singular(table)}_id`, ...pref].find((k) => own.includes(k)) ?? own[0];
    const found = targetRows.find((r) => r.id === row[preferred]) ?? null;
    return { mode: 'one', table, rows: found ? [found] : [] };
  }
  // 4. un-vers-plusieurs : les lignes cibles pointent vers la ligne de base
  const back = `${singular(baseTable)}_id`;
  const many = targetRows.filter((r) => r[back] === row.id);
  return { mode: 'many', table, rows: many };
}

export function project(db, table, rows, nodes) {
  return rows.map((row) => projectRow(db, table, row, nodes));
}

function projectRow(db, table, row, nodes) {
  const out = {};
  for (const n of nodes) {
    if (n.kind === 'col') {
      if (n.col === '*') Object.assign(out, row);
      else out[n.alias] = row[n.col] ?? null;
    } else {
      const { mode, table: t, rows } = resolveEmbed(db, table, row, n);
      const projected = project(db, t, rows, n.children);
      out[n.alias] = mode === 'one' ? projected[0] ?? null : projected;
    }
  }
  return out;
}

// ── Écritures ────────────────────────────────────────────────────────────────
// Colonnes NOT NULL sans défaut, relevées sur la base de production : une
// insertion qui les omet échoue comme en vrai (code 23502). C'est ce manque de
// fidélité qui avait masqué la perte des enfants déclarés à l'inscription.
export const NOT_NULL = {
  children: ['family_id', 'first_name', 'last_name', 'date_of_birth'],
};

/** Première colonne obligatoire manquante d'une insertion, sinon null. */
export function missingRequired(table, body) {
  const cols = NOT_NULL[table];
  if (!cols) return null;
  for (const input of Array.isArray(body) ? body : [body]) {
    const miss = cols.find((c) => input?.[c] === undefined || input?.[c] === null);
    if (miss) return miss;
  }
  return null;
}

export function insertRows(db, table, body, { onConflict, merge } = {}) {
  db[table] ??= [];
  const list = Array.isArray(body) ? body : [body];
  const now = new Date().toISOString();
  const written = [];
  for (const input of list) {
    const keys = onConflict ? onConflict.split(',') : null;
    const existing = keys ? db[table].find((r) => keys.every((k) => String(r[k]) === String(input[k]))) : null;
    if (existing && merge) {
      Object.assign(existing, input, { updated_at: now });
      written.push(existing);
      continue;
    }
    const row = { id: randomUUID(), created_at: now, ...input };
    db[table].push(row);
    written.push(row);
  }
  return written;
}

export function updateRows(db, table, params, patch) {
  const rows = applyFilters(db[table] ?? [], params);
  for (const r of rows) Object.assign(r, patch);
  return rows;
}

export function deleteRows(db, table, params) {
  const rows = applyFilters(db[table] ?? [], params);
  db[table] = (db[table] ?? []).filter((r) => !rows.includes(r));
  return rows;
}
