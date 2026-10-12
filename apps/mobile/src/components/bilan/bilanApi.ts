import { supabaseClient as supabase } from '@thrive/shared';
import { isAccentKey, type Gauge, type Identity, type LsssPoint, type PermaPoint } from './bilanData';

export async function fetchInsights(childId: string): Promise<{ lsss: LsssPoint[]; perma: PermaPoint[]; gauge: Gauge | null }> {
  const [l, p, g] = await Promise.all([
    supabase.rpc('lsss_progression', { p_child: childId }),
    supabase.rpc('perma_progression', { p_child: childId }),
    supabase.rpc('gauge_summary', { p_child_id: childId }),
  ]);
  const gauge = g.data as Gauge | null;
  return {
    lsss: ((l.data ?? []) as LsssPoint[]),
    perma: ((p.data ?? []) as PermaPoint[]),
    gauge: gauge && typeof gauge.global === 'number' && gauge.sample_size > 0 ? gauge : null,
  };
}

export async function fetchIdentity(childId: string): Promise<Identity> {
  const { data } = await supabase.from('children').select('nickname, jersey_number, accent_color').eq('id', childId).maybeSingle();
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    nickname: typeof r.nickname === 'string' ? r.nickname : null,
    jersey_number: typeof r.jersey_number === 'number' ? r.jersey_number : null,
    accent_color: isAccentKey(r.accent_color) ? r.accent_color : null,
  };
}

export async function saveIdentity(childId: string, v: Identity): Promise<boolean> {
  const { error } = await supabase
    .from('children')
    .update({ nickname: v.nickname, jersey_number: v.jersey_number, accent_color: v.accent_color } as never)
    .eq('id', childId);
  return !error;
}
