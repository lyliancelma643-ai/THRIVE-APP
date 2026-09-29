// ─────────────────────────────────────────────────────────────────────────────
// Backend Supabase simulé pour l'audit UX (Node pur, aucune dépendance).
//
// L'app web s'exécute SANS aucune modification : on la construit simplement
// avec NEXT_PUBLIC_SUPABASE_URL pointant ici. Auth GoTrue (jetons HS256
// signés localement, vérifiés par le middleware via /auth/v1/user), PostgREST
// (voir postgrest.mjs), RPC, Storage (images et PDF de démonstration),
// fonctions Edge de facturation et canal temps réel Phoenix minimal.
//
//   node scripts/ux-audit/mock/server.mjs [--port 54321]
// ─────────────────────────────────────────────────────────────────────────────

import http from 'node:http';
import https from 'node:https';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { PASSWORD, PERSONAS, buildDb, makeFunctions, makeRpc } from './fixtures.mjs';
import { applyFilters, applyOrder, deleteRows, insertRows, parseSelect, project, updateRows } from './postgrest.mjs';

const SECRET = 'thrive-ux-audit-local-secret';
const b64 = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');

export function signJwt(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

function verifyJwt(token) {
  try {
    const [h, p, s] = token.split('.');
    const expected = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
    if (s !== expected) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Clé « anon » publique du projet simulé (valable 10 ans).
export const ANON_KEY = signJwt({ iss: 'supabase', ref: 'uxaudit', role: 'anon', iat: 1_780_000_000, exp: 2_100_000_000 });

// `tls` ({ key, cert, publicHost }) : sert en HTTPS sous un nom *.supabase.co
// (Lighthouse : la CSP de l'app n'autorise que https://*.supabase.co).
export function startMockSupabase({ port = 54321, host = '127.0.0.1', log = false, tls = null } = {}) {
  const db = buildDb();
  const rpc = makeRpc(db);
  const functions = makeFunctions(db);
  const origin = tls ? `https://${tls.publicHost}${port === 443 ? '' : `:${port}`}` : `http://${host}:${port}`;
  const unknown = new Set();

  // Les vignettes pointent vers l'origine réelle du mock.
  for (const v of db.video_sessions) if (v.thumbnail_url) v.thumbnail_url = v.thumbnail_url.replace('MOCK_ORIGIN', origin);

  const users = Object.values(PERSONAS).map((p) => ({ ...p }));
  const userById = (uid) => users.find((u) => u.id === uid) ?? null;

  function userObject(u) {
    const created = '2026-06-01T12:00:00.000Z';
    return {
      id: u.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: u.email,
      email_confirmed_at: created,
      phone: '',
      confirmed_at: created,
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'], role: u.role },
      user_metadata: { firstName: u.firstName, lastName: u.lastName, email_verified: true },
      identities: [],
      created_at: created,
      updated_at: created,
      is_anonymous: false,
      factors: [],
    };
  }

  function session(u) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600 * 24 * 365 * 5; // aucune expiration pendant l'audit
    const access_token = signJwt({
      iss: `${origin}/auth/v1`,
      sub: u.id,
      aud: 'authenticated',
      exp,
      iat: now,
      email: u.email,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'], role: u.role },
      user_metadata: { firstName: u.firstName, lastName: u.lastName },
      role: 'authenticated',
      aal: 'aal1',
      amr: [{ method: 'password', timestamp: now }],
      session_id: randomUUID(),
      is_anonymous: false,
    });
    return {
      access_token,
      token_type: 'bearer',
      expires_in: exp - now,
      expires_at: exp,
      refresh_token: `refresh-${u.id}`,
      user: userObject(u),
    };
  }

  function currentUser(req) {
    const auth = req.headers.authorization ?? '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const payload = token ? verifyJwt(token) : null;
    if (!payload?.sub) return null;
    const u = userById(payload.sub);
    return u ? { id: u.id, role: u.role, email: u.email } : null;
  }

  // ── Réponses ───────────────────────────────────────────────────────────────
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    // Liste explicite, comme Supabase : le joker « * » ne couvre pas Authorization.
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer, range, accept-profile, content-profile, x-client-info, x-supabase-api-version, x-upsert, cache-control',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
  };
  function send(res, status, body, headers = {}) {
    const isBuf = Buffer.isBuffer(body);
    const payload = body === undefined || body === null ? '' : isBuf || typeof body === 'string' ? body : JSON.stringify(body);
    res.writeHead(status, {
      ...CORS,
      ...(isBuf || typeof body === 'string' ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
      ...headers,
    });
    res.end(payload);
  }
  const pgError = (res, status, code, message) => send(res, status, { code, message, details: null, hint: null });

  async function readBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  async function handleAuth(req, res, url) {
    const p = url.pathname.replace('/auth/v1', '');
    if (p === '/health') return send(res, 200, { status: 'ok' });
    if (p === '/settings') return send(res, 200, { external: { email: true }, disable_signup: false, mailer_autoconfirm: true });
    if (p === '/token') {
      const body = (await readBody(req)) ?? {};
      const grant = url.searchParams.get('grant_type');
      let u = null;
      if (grant === 'password') {
        u = users.find((x) => x.email.toLowerCase() === String(body.email ?? '').toLowerCase());
        if (!u || body.password !== PASSWORD) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' });
      } else if (grant === 'refresh_token') {
        u = userById(String(body.refresh_token ?? '').replace('refresh-', ''));
        if (!u) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
      }
      return u ? send(res, 200, session(u)) : send(res, 400, { error: 'unsupported_grant_type' });
    }
    if (p === '/user') {
      const me = currentUser(req);
      if (!me) return send(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });
      const u = userById(me.id);
      if (req.method === 'PUT') {
        const body = (await readBody(req)) ?? {};
        if (body.data?.firstName !== undefined) u.firstName = body.data.firstName;
        if (body.data?.lastName !== undefined) u.lastName = body.data.lastName;
      }
      return send(res, 200, userObject(u));
    }
    if (p === '/logout') return send(res, 204, null);
    if (p === '/recover' || p === '/otp') return send(res, 200, {});
    if (p === '/signup') {
      const body = (await readBody(req)) ?? {};
      const u = { id: randomUUID(), email: body.email, role: 'PARENT', firstName: body.data?.firstName ?? '', lastName: body.data?.lastName ?? '' };
      users.push(u);
      return send(res, 200, session(u));
    }
    if (p.startsWith('/factors')) return send(res, 200, []);
    return send(res, 404, { msg: `mock: ${p}` });
  }

  // ── REST ───────────────────────────────────────────────────────────────────
  async function handleRest(req, res, url) {
    const rest = url.pathname.replace('/rest/v1/', '');
    const me = currentUser(req);
    if (rest.startsWith('rpc/')) {
      const name = rest.slice(4);
      const args = req.method === 'GET' ? Object.fromEntries(url.searchParams) : (await readBody(req)) ?? {};
      const fn = rpc[name];
      if (!fn) {
        unknown.add(`rpc:${name}`);
        return pgError(res, 404, 'PGRST202', `Could not find the function public.${name}`);
      }
      const out = fn(args, me);
      if (out && typeof out === 'object' && '__error' in out) return pgError(res, 400, 'P0001', out.__error);
      // Réponse toujours encodée en JSON (un uuid scalaire devient "…").
      return send(res, 200, JSON.stringify(out ?? null), { 'Content-Type': 'application/json; charset=utf-8' });
    }

    const table = decodeURIComponent(rest.split('/')[0]);
    if (!(table in db)) {
      unknown.add(`table:${table}`);
      db[table] = [];
    }
    const params = url.searchParams;
    const prefer = req.headers.prefer ?? '';
    const wantsRep = prefer.includes('return=representation');
    const single = (req.headers.accept ?? '').includes('application/vnd.pgrst.object+json');
    const nodes = parseSelect(params.get('select'));

    const respondRows = (rows, status = 200) => {
      const projected = project(db, table, rows, nodes);
      if (single) {
        if (projected.length !== 1) return pgError(res, 406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
        return send(res, status, projected[0]);
      }
      return send(res, status, projected);
    };

    if (req.method === 'GET' || req.method === 'HEAD') {
      let rows = applyFilters(db[table], params);
      rows = applyOrder(rows, params.get('order'));
      const total = rows.length;
      let from = Number(params.get('offset') ?? 0);
      let to = params.has('limit') ? from + Number(params.get('limit')) - 1 : total - 1;
      const range = req.headers.range?.match(/(\d+)-(\d+)/);
      if (range) {
        from = Number(range[1]);
        to = Number(range[2]);
      }
      const page = rows.slice(from, to + 1);
      const headers = prefer.includes('count=')
        ? { 'Content-Range': `${page.length ? `${from}-${from + page.length - 1}` : '*'}/${total}` }
        : {};
      if (req.method === 'HEAD') return send(res, 200, null, headers);
      const projected = project(db, table, page, nodes);
      if (single) {
        if (projected.length !== 1) return pgError(res, 406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
        return send(res, 200, projected[0], headers);
      }
      return send(res, 200, projected, headers);
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const written = insertRows(db, table, body ?? {}, {
        onConflict: params.get('on_conflict'),
        merge: prefer.includes('resolution=merge-duplicates'),
      });
      return wantsRep ? respondRows(written, 201) : send(res, 201, null);
    }
    if (req.method === 'PATCH') {
      const body = (await readBody(req)) ?? {};
      const rows = updateRows(db, table, params, body);
      return wantsRep ? respondRows(rows) : send(res, 204, null);
    }
    if (req.method === 'DELETE') {
      const rows = deleteRows(db, table, params);
      return wantsRep ? respondRows(rows) : send(res, 204, null);
    }
    return send(res, 405, null);
  }

  // ── Storage ────────────────────────────────────────────────────────────────
  const PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
  );
  function placeholderSvg(name) {
    const thumb = name.match(/s(\d+)\.svg$/);
    if (thumb) {
      const hue = [200, 45, 160, 330][(Number(thumb[1]) - 1) % 4];
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,42%)"/><stop offset="1" stop-color="hsl(${hue + 30},60%,18%)"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="930" cy="250" r="190" fill="hsla(${hue},80%,80%,.18)"/><path d="M180 560 C420 380 700 640 1100 420" stroke="hsla(0,0%,100%,.35)" stroke-width="18" fill="none" stroke-linecap="round"/></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#6EC1E4"/><circle cx="200" cy="160" r="78" fill="#F7F5F2"/><rect x="92" y="252" width="216" height="170" rx="100" fill="#F7F5F2"/></svg>`;
  }
  async function handleStorage(req, res, url) {
    const p = url.pathname.replace('/storage/v1', '');
    if (p.startsWith('/object/sign/') && req.method === 'POST') {
      const key = p.replace('/object/sign/', '');
      return send(res, 200, { signedURL: `/object/sign/${key}?token=demo` });
    }
    if (p.startsWith('/object/sign/') || p.startsWith('/object/public/') || p.startsWith('/object/authenticated/')) {
      const key = decodeURIComponent(p.replace(/^\/object\/(sign|public|authenticated)\//, ''));
      if (key.endsWith('.pdf')) return send(res, 200, PDF, { 'Content-Type': 'application/pdf' });
      return send(res, 200, placeholderSvg(key), { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
    }
    if (p.startsWith('/object/list/')) return send(res, 200, []);
    if (p.startsWith('/object/')) {
      if (req.method === 'DELETE') return send(res, 200, []);
      await readBody(req);
      const key = p.replace('/object/', '');
      return send(res, 200, { Key: key, Id: randomUUID() });
    }
    return send(res, 404, { message: 'mock storage' });
  }

  async function handleFunctions(req, res, url) {
    const name = url.pathname.replace('/functions/v1/', '');
    const body = await readBody(req);
    const fn = functions[name];
    if (!fn) return send(res, 200, { ok: true });
    return send(res, 200, fn(body, currentUser(req)));
  }

  const handler = async (req, res) => {
    const url = new URL(req.url, origin);
    if (log) console.log(req.method, url.pathname + url.search);
    try {
      if (req.method === 'OPTIONS') return send(res, 204, null);
      if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url);
      if (url.pathname.startsWith('/rest/v1/')) return await handleRest(req, res, url);
      if (url.pathname.startsWith('/storage/v1')) return await handleStorage(req, res, url);
      if (url.pathname.startsWith('/functions/v1/')) return await handleFunctions(req, res, url);
      return send(res, 404, { message: 'mock: route inconnue' });
    } catch (err) {
      console.error('[mock-supabase]', err);
      return send(res, 500, { message: String(err) });
    }
  };
  const server = tls ? https.createServer({ key: tls.key, cert: tls.cert }, handler) : http.createServer(handler);

  // ── Temps réel : Phoenix minimal (accepte les abonnements, n'émet rien) ────
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) return socket.destroy();
    const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const sendText = (text) => {
      const payload = Buffer.from(text);
      const len = payload.length;
      const head = len < 126 ? Buffer.from([0x81, len]) : len < 65536 ? Buffer.from([0x81, 126, len >> 8, len & 255]) : null;
      if (!head) return;
      socket.write(Buffer.concat([head, payload]));
    };
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const opcode = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        const masked = (buf[1] & 0x80) !== 0;
        const mask = masked ? buf.subarray(off, off + 4) : null;
        if (masked) off += 4;
        if (buf.length < off + len) return;
        const data = Buffer.from(buf.subarray(off, off + len));
        if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
        buf = buf.subarray(off + len);
        if (opcode === 0x8) return socket.end();
        if (opcode === 0x9) {
          socket.write(Buffer.concat([Buffer.from([0x8a, data.length]), data]));
          continue;
        }
        if (opcode !== 0x1) continue;
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          continue;
        }
        const isArray = Array.isArray(msg);
        const [joinRef, ref, topic, event, payload] = isArray ? msg : [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload];
        let response = {};
        if (event === 'phx_join') {
          const bindings = payload?.config?.postgres_changes ?? [];
          response = { postgres_changes: bindings.map((b, i) => ({ ...b, id: i + 1 })) };
        }
        const reply = { status: 'ok', response };
        sendText(JSON.stringify(isArray ? [joinRef, ref, topic, 'phx_reply', reply] : { join_ref: joinRef, ref, topic, event: 'phx_reply', payload: reply }));
      }
    });
    socket.on('error', () => socket.destroy());
  });

  return new Promise((resolve) => {
    server.listen(port, host, () =>
      resolve({
        origin,
        anonKey: ANON_KEY,
        db,
        unknown,
        close: () => new Promise((r) => server.close(() => r())),
      })
    );
  });
}

// Lancement direct : node server.mjs [--port 54321] [--log]
if (import.meta.url === `file://${process.argv[1]}`) {
  const portArg = process.argv.indexOf('--port');
  const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 54321;
  const m = await startMockSupabase({ port, log: process.argv.includes('--log') });
  console.log(`[mock-supabase] ${m.origin}  anon=${m.anonKey.slice(0, 24)}…`);
}
