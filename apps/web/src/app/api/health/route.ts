// GET /api/health — 200 si l'app peut servir un parent, 503 sinon.
// Hors du matcher du middleware : publique, sans session. Jamais en cache.
import { NextResponse } from 'next/server';
import { runHealthChecks } from '@/lib/health';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  const report = await runHealthChecks(SUPABASE_URL, SUPABASE_ANON_KEY);
  return NextResponse.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: NO_STORE,
  });
}

// Certaines sondes n'envoient que HEAD : même verdict, sans corps.
export async function HEAD() {
  const report = await runHealthChecks(SUPABASE_URL, SUPABASE_ANON_KEY);
  return new Response(null, { status: report.status === 'ok' ? 200 : 503, headers: NO_STORE });
}
