-- ─────────────────────────────────────────────────────────────────────────────
-- Vague 4 — RPC gauge_summary : agrège skill_scores en jauge globale + par
-- dimension (UI onglet « Progrès » ; freemium = jauge globale seule côté front).
-- security invoker → respecte le RLS de skill_scores (un appelant non autorisé
-- obtient une jauge vide, jamais les données d'une autre famille).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.gauge_summary(p_child_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'global',      coalesce(round(avg(value))::int, 0),
    'sample_size', count(*),
    'by_skill',    coalesce((
      select jsonb_object_agg(skill_key, avg_val)
      from (
        select skill_key, round(avg(value))::int as avg_val
        from public.skill_scores
        where child_id = p_child_id
        group by skill_key
      ) s
    ), '{}'::jsonb)
  )
  from public.skill_scores
  where child_id = p_child_id;
$$;

revoke execute on function public.gauge_summary(uuid) from public;
grant  execute on function public.gauge_summary(uuid) to authenticated;
