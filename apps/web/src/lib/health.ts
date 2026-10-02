// Sonde de santé : la cible des outils d'uptime (Better Stack, UptimeRobot,
// .github/workflows/uptime.yml). Vérifie ce dont un parent a besoin pour
// entrer dans l'app : l'API Auth de Supabase et une vraie requête en base.
// Aucun secret, aucune donnée : la réponse ne contient que des statuts.

export type CheckStatus = 'ok' | 'down';

export interface CheckResult {
  status: CheckStatus;
  latency_ms: number;
  /** Raison courte et non sensible (code HTTP, « timeout »…). */
  detail?: string;
}

export interface HealthReport {
  status: CheckStatus;
  checks: { auth: CheckResult; database: CheckResult };
  version: string;
  time: string;
}

type Fetch = typeof fetch;

const TIMEOUT_MS = 3000;

async function timed(run: () => Promise<Omit<CheckResult, 'latency_ms'>>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const r = await run();
    return { ...r, latency_ms: Date.now() - start };
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { status: 'down', latency_ms: Date.now() - start, detail: timeout ? 'timeout' : 'network' };
  }
}

/** GoTrue répond 200 sur /auth/v1/health quand le service Auth est joignable. */
export function checkAuth(url: string, anonKey: string, f: Fetch = fetch) {
  return timed(async () => {
    const res = await f(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? { status: 'ok' } : { status: 'down', detail: `http_${res.status}` };
  });
}

/**
 * Requête réelle en base via PostgREST, en rôle anonyme : la RLS renvoie 0
 * ligne (200). Un refus de droits n'est accepté que s'il vient de Postgres
 * (corps JSON avec le code 42501) : un 401/403 renvoyé par un proxy ou un
 * pare-feu ne prouve rien et compte comme une panne.
 */
export function checkDatabase(url: string, anonKey: string, f: Fetch = fetch) {
  return timed(async () => {
    const res = await f(`${url}/rest/v1/app_settings?select=*&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { status: 'ok' };
    if (res.status === 401 || res.status === 403) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      if (body?.code === '42501') return { status: 'ok' };
    }
    return { status: 'down', detail: `http_${res.status}` };
  });
}

export async function runHealthChecks(url: string, anonKey: string, f: Fetch = fetch): Promise<HealthReport> {
  const [auth, database] = await Promise.all([checkAuth(url, anonKey, f), checkDatabase(url, anonKey, f)]);
  return {
    status: auth.status === 'ok' && database.status === 'ok' ? 'ok' : 'down',
    checks: { auth, database },
    version: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    time: new Date().toISOString(),
  };
}
