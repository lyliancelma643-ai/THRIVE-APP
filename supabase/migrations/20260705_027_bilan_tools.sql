-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — Parties 1/2/3 : tables des outils du bilan.
-- Édition = private.can_edit_child_bilan (coach assigné / coach du programme /
-- admin superviseur / super admin). Lecture = private.can_view_child_bilan
-- (édition + parent). Tout est diffusé en Realtime pour l'espace parent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0) Extensions de athlete_identity ------------------------------------------------
alter table public.athlete_identity
  add column if not exists routine              jsonb not null default '[]'::jsonb,
  add column if not exists program_pct_override int,
  add column if not exists certificate_ready    boolean not null default false;

comment on column public.athlete_identity.program_pct_override is
  'Ajustement manuel du % de complétion par le coach (0-100). NULL = calcul auto (séances complétées / 13).';
comment on column public.athlete_identity.routine is
  'Routine pré-tir : tableau JSON [{step:int, label:text}] éditable par le coach.';

-- borne 0-100 sur l'override (idempotent)
do $$ begin
  alter table public.athlete_identity
    add constraint athlete_identity_pct_override_range
    check (program_pct_override is null or (program_pct_override between 0 and 100));
exception when duplicate_object then null; end $$;

-- 1) Objectifs SMART détaillés (Partie 2 « Fiche objectifs Thrive ») ----------------
create table if not exists public.athlete_objectives (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  kind        text not null default 'TECHNIQUE' check (kind in ('TECHNIQUE','LIFE_SKILL')),
  title       text not null,
  description text,
  due_date    date,
  status      text not null default 'not_started'
              check (status in ('not_started','in_progress','achieved')),
  progress    int  not null default 0 check (progress between 0 and 100),
  sort_order  int  not null default 0,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_objectives_child on public.athlete_objectives(child_id);

-- 2) Historique du Focus Word (Partie 2 « avec historique si modifié ») -------------
create table if not exists public.focus_word_history (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  word       text not null,
  note       text,
  is_current boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_focus_history_child on public.focus_word_history(child_id, created_at desc);

-- Trigger : toute écriture de athlete_identity.focus_word journalise l'historique
-- et n'y garde qu'un seul « courant ».
create or replace function public.log_focus_word_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.focus_word is not null and new.focus_word <> ''
     and (tg_op = 'INSERT' or new.focus_word is distinct from old.focus_word) then
    update public.focus_word_history set is_current = false
      where child_id = new.child_id and is_current;
    insert into public.focus_word_history (child_id, word, is_current, created_by)
      values (new.child_id, new.focus_word, true, coalesce(new.updated_by, auth.uid()));
  end if;
  return new;
end $$;

drop trigger if exists trg_log_focus_word on public.athlete_identity;
create trigger trg_log_focus_word
  after insert or update of focus_word on public.athlete_identity
  for each row execute function public.log_focus_word_change();

-- 3) Roue des émotions — historique des relevés (Partie 2) --------------------------
create table if not exists public.emotion_logs (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.children(id) on delete cascade,
  emotion        text not null,
  intensity      int check (intensity is null or (intensity between 1 and 5)),
  context        text,
  session_number int,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_emotion_logs_child on public.emotion_logs(child_id, created_at desc);

-- 4) Prochaines étapes (Partie 3) --------------------------------------------------
create table if not exists public.athlete_next_steps (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  label      text not null,
  due_date   date,
  status     text not null default 'todo' check (status in ('todo','doing','done')),
  sort_order int  not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_next_steps_child on public.athlete_next_steps(child_id, sort_order);

-- ── RLS générique : lecture = can_view, écriture = can_edit ────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'athlete_objectives','focus_word_history','emotion_logs','athlete_next_steps'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_view_child_bilan(child_id))',
      t||'_read', t);

    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.can_edit_child_bilan(child_id)) with check (private.can_edit_child_bilan(child_id))',
      t||'_write', t);
  end loop;
end $$;

-- ── Realtime ──────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'athlete_objectives','focus_word_history','emotion_logs','athlete_next_steps'
  ] loop
    execute format('alter table public.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
