import { describe, expect, it } from 'vitest';
import { checkDatabase, runHealthChecks } from './health';

const URL = 'https://example.supabase.co';
const KEY = 'anon';

type Fake = number | Error | { status: number; body: unknown };

function fakeFetch(map: Record<string, Fake>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const u = String(input);
    const key = Object.keys(map).find((k) => u.includes(k));
    const v = key ? map[key] : 404;
    if (v instanceof Error) throw v;
    if (typeof v === 'number') return new Response(null, { status: v });
    return new Response(JSON.stringify(v.body), { status: v.status });
  }) as typeof fetch;
}

describe('sonde de santé', () => {
  it('ok quand Auth et la base répondent', async () => {
    const r = await runHealthChecks(URL, KEY, fakeFetch({ '/auth/v1/health': 200, '/rest/v1/': 200 }));
    expect(r.status).toBe('ok');
    expect(r.checks.auth.status).toBe('ok');
    expect(r.checks.database.status).toBe('ok');
  });

  it('un refus de droits Postgres (42501) prouve que la base répond', async () => {
    const r = await checkDatabase(URL, KEY, fakeFetch({ '/rest/v1/': { status: 401, body: { code: '42501' } } }));
    expect(r.status).toBe('ok');
  });

  it("un 403 d'intermédiaire (proxy, pare-feu) compte comme une panne", async () => {
    const r = await checkDatabase(URL, KEY, fakeFetch({ '/rest/v1/': 403 }));
    expect(r.status).toBe('down');
    expect(r.detail).toBe('http_403');
  });

  it('down sur 5xx de la base', async () => {
    const r = await runHealthChecks(URL, KEY, fakeFetch({ '/auth/v1/health': 200, '/rest/v1/': 503 }));
    expect(r.status).toBe('down');
    expect(r.checks.database.detail).toBe('http_503');
  });

  it('down sur délai dépassé, sans fuite de message', async () => {
    const timeout = Object.assign(new Error('secret détail'), { name: 'TimeoutError' });
    const r = await runHealthChecks(URL, KEY, fakeFetch({ '/auth/v1/health': timeout, '/rest/v1/': 200 }));
    expect(r.status).toBe('down');
    expect(r.checks.auth.detail).toBe('timeout');
    expect(JSON.stringify(r)).not.toContain('secret');
  });
});
