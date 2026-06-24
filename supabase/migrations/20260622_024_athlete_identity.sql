-- 20260622_024_athlete_identity.sql
-- Carte d'identité de l'athlète : contenu structuré par enfant (Fiche Identité
-- Athlète + supports co-construits, protocole §8.5). Une ligne par enfant.
-- Édition : coach assigné/programme + ADMIN/SUPER_ADMIN. Parent en lecture seule.

create table if not exists public.athlete_identity (
  child_id        uuid primary key references public.children(id) on delete cascade,
  sport           text default 'Hockey sur glace',
  position        text,
  club            text,
  sport_story     text,                                  -- histoire sportive
  strengths       text[]  not null default '{}',         -- forces VIA (liste)
  season_dream    text,                                  -- rêve de saison
  smart_goal      text,                                  -- objectif technique SMART
  life_skill_goal text,                                  -- objectif life skill
  my_actions      text[]  not null default '{}',         -- « ce qui dépend de moi »
  toolbox         jsonb   not null default '[]'::jsonb,   -- [{tool, context}] (boîte à outils)
  focus_word      text,
  letter          text,                                  -- lettre à moi-même dans 1 an
  notes           text,                                  -- notes libres coach/admin
  updated_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.athlete_identity enable row level security;

-- Lecture : parent de l'enfant, coach assigné/programme, admin
drop policy if exists athlete_identity_read on public.athlete_identity;
create policy athlete_identity_read on public.athlete_identity for select to authenticated
  using (private.is_parent_of_child(child_id)
         or private.is_assigned_coach(child_id)
         or private.is_program_coach_of_child(child_id)
         or private.is_admin());

-- Écriture (insert / update / delete) : coach assigné/programme + admin (jamais le parent)
drop policy if exists athlete_identity_insert on public.athlete_identity;
create policy athlete_identity_insert on public.athlete_identity for insert to authenticated
  with check (private.is_assigned_coach(child_id)
              or private.is_program_coach_of_child(child_id)
              or private.is_admin());

drop policy if exists athlete_identity_update on public.athlete_identity;
create policy athlete_identity_update on public.athlete_identity for update to authenticated
  using (private.is_assigned_coach(child_id)
         or private.is_program_coach_of_child(child_id)
         or private.is_admin())
  with check (private.is_assigned_coach(child_id)
              or private.is_program_coach_of_child(child_id)
              or private.is_admin());

drop policy if exists athlete_identity_delete on public.athlete_identity;
create policy athlete_identity_delete on public.athlete_identity for delete to authenticated
  using (private.is_assigned_coach(child_id)
         or private.is_program_coach_of_child(child_id)
         or private.is_admin());

-- ── updated_at automatique ───────────────────────────────────────────────────
create or replace function public.touch_athlete_identity()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_touch_athlete_identity on public.athlete_identity;
create trigger trg_touch_athlete_identity
  before update on public.athlete_identity
  for each row execute function public.touch_athlete_identity();

-- ── Realtime (la carte parent se met à jour en direct) ───────────────────────
alter table public.athlete_identity replica identity full;
alter publication supabase_realtime add table public.athlete_identity;
