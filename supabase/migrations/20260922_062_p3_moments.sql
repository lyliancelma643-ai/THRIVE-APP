-- ─────────────────────────────────────────────────────────────────────────────
-- 062 — P3 « Le moment qui compte » : données d'usage du programme maison.
--
-- Même principe que 061 (« À la maison ») : le CONTENU des 39 fiches vit dans
-- le code (apps/web/src/content/p3-moments → activities.generated.json),
-- versionné avec l'app. La base ne stocke que ce qui est personnel.
--
--   • p3_moments  : un moment vécu (check-in, durée, débrief, note, phrase gardée).
--                   Jamais modifié ni supprimé par le parent : un moment vécu ne
--                   se réécrit pas. Suppression en cascade avec l'enfant (Loi 25).
--   • p3_skips    : « pas ce soir », « autre chose », refus de l'enfant. Sert au
--                   moteur (anti-refus après 2 refus), jamais affiché comme échec.
--   • p3_saved    : favoris et « mettre de côté » (le parent peut retirer).
--   • p3_rewards  : récompenses gagnées. Insert-only : une récompense gagnée
--                   est acquise pour toujours (règle 4 de l'Architecture §1.1).
--   • p3_letters  : la lettre à ouvrir dans un an (ACT-1302). Illisible par le
--                   parent ET par les admins avant deliver_at ; l'envoi par
--                   courriel se fait par une fonction planifiée (service role).
--
-- Accès : parent de l'enfant ; coach assigné et admins en lecture sur les
-- moments seulement (jamais les lettres). Garde parent identique au reste de
-- la section : compte activé + flag p3_enabled dans app_settings (absent = off).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── p3_moments ──────────────────────────────────────────────────────────────
create table if not exists public.p3_moments (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children(id) on delete cascade,
  parent_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id      text not null check (activity_id ~ '^ACT-(0[1-9]|1[0-3])0[1-3]$'),
  week             smallint not null check (week between 1 and 13),
  duration_chosen  smallint not null check (duration_chosen in (10, 20, 30)),
  duration_real_s  integer check (duration_real_s is null or duration_real_s between 0 and 14400),
  place            text check (place in ('maison', 'exterieur', 'voiture', 'partout')),
  -- Check-in (temps 1) : {"emotion":"joie","corps":"fatigue","tete":"libre"} — ressenti, jamais un score
  checkin          jsonb,
  -- Débrief (temps 4) : [{"kind":"vecu","answer":"..."}] — réponses facultatives
  debrief          jsonb,
  -- Ce que la fiche dépose dans le carnet : {"kind":"forces","items":["...","...","..."]}
  capture          jsonb,
  kept_phrase      text check (kept_phrase is null or char_length(kept_phrase) <= 500),
  photo_path       text,
  rating           smallint check (rating is null or rating between 1 and 5),
  outcome          text check (outcome is null or outcome in ('ACCROCHE', 'MOYEN', 'PAS_CE_SOIR')),
  content_version  text not null default '1.0.0-v1-8-17',
  created_at       timestamptz not null default now()
);

create index if not exists p3_moments_child_idx on public.p3_moments (child_id, created_at desc);
create index if not exists p3_moments_child_activity_idx on public.p3_moments (child_id, activity_id);
create index if not exists p3_moments_parent_idx on public.p3_moments (parent_id);

alter table public.p3_moments enable row level security;

drop policy if exists p3_moments_read on public.p3_moments;
create policy p3_moments_read on public.p3_moments
  for select to authenticated
  using (
    public.is_parent_of_child(child_id)
    or public.is_assigned_coach(child_id)
    or public.is_admin()
  );

drop policy if exists p3_moments_insert on public.p3_moments;
create policy p3_moments_insert on public.p3_moments
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and public.is_parent_of_child(child_id)
  );

-- ── p3_skips ────────────────────────────────────────────────────────────────
create table if not exists public.p3_skips (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children(id) on delete cascade,
  parent_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id  text not null check (activity_id ~ '^ACT-(0[1-9]|1[0-3])0[1-3]$'),
  reason       text not null check (reason in ('REFUS_ENFANT', 'AUTRE_ACTIVITE', 'PAS_LE_TEMPS')),
  created_at   timestamptz not null default now()
);

create index if not exists p3_skips_child_idx on public.p3_skips (child_id, created_at desc);

alter table public.p3_skips enable row level security;

drop policy if exists p3_skips_read on public.p3_skips;
create policy p3_skips_read on public.p3_skips
  for select to authenticated
  using (public.is_parent_of_child(child_id) or public.is_admin());

drop policy if exists p3_skips_insert on public.p3_skips;
create policy p3_skips_insert on public.p3_skips
  for insert to authenticated
  with check (parent_id = (select auth.uid()) and public.is_parent_of_child(child_id));

-- ── p3_saved : favoris et mis de côté ───────────────────────────────────────
create table if not exists public.p3_saved (
  child_id     uuid not null references public.children(id) on delete cascade,
  activity_id  text not null check (activity_id ~ '^ACT-(0[1-9]|1[0-3])0[1-3]$'),
  kind         text not null check (kind in ('FAVORI', 'DE_COTE')),
  parent_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (child_id, activity_id, kind)
);

alter table public.p3_saved enable row level security;

drop policy if exists p3_saved_read on public.p3_saved;
create policy p3_saved_read on public.p3_saved
  for select to authenticated
  using (public.is_parent_of_child(child_id) or public.is_admin());

drop policy if exists p3_saved_insert on public.p3_saved;
create policy p3_saved_insert on public.p3_saved
  for insert to authenticated
  with check (parent_id = (select auth.uid()) and public.is_parent_of_child(child_id));

drop policy if exists p3_saved_delete on public.p3_saved;
create policy p3_saved_delete on public.p3_saved
  for delete to authenticated
  using (public.is_parent_of_child(child_id));

-- ── p3_rewards : acquis pour toujours ───────────────────────────────────────
create table if not exists public.p3_rewards (
  child_id     uuid not null references public.children(id) on delete cascade,
  reward_id    text not null check (reward_id in (
                 'fiche_identite', 'bilan_mi_parcours', 'boite_a_outils',
                 'certificat', 'lettre_un_an', 'pack_dehors', 'book_thrive')),
  payload      jsonb,           -- ex. forces nommées pour la Fiche Identité / le Certificat
  earned_at    timestamptz not null default now(),
  primary key (child_id, reward_id)
);

alter table public.p3_rewards enable row level security;

drop policy if exists p3_rewards_read on public.p3_rewards;
create policy p3_rewards_read on public.p3_rewards
  for select to authenticated
  using (public.is_parent_of_child(child_id) or public.is_assigned_coach(child_id) or public.is_admin());

drop policy if exists p3_rewards_insert on public.p3_rewards;
create policy p3_rewards_insert on public.p3_rewards
  for insert to authenticated
  with check (public.is_parent_of_child(child_id));
-- Aucune policy update/delete : une récompense ne se reprend pas.

-- ── p3_letters : scellées jusqu'à deliver_at ────────────────────────────────
create table if not exists public.p3_letters (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.children(id) on delete cascade,
  parent_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author        text not null check (author in ('ENFANT', 'PARENT')),
  body          text not null check (char_length(body) between 1 and 20000),
  sealed_at     timestamptz not null default now(),
  deliver_at    timestamptz not null default (now() + interval '1 year'),
  delivered_at  timestamptz
);

create index if not exists p3_letters_deliver_idx on public.p3_letters (deliver_at) where delivered_at is null;

alter table public.p3_letters enable row level security;

-- Lecture : le parent, et seulement une fois la date passée. Pas d'accès admin/coach.
drop policy if exists p3_letters_read on public.p3_letters;
create policy p3_letters_read on public.p3_letters
  for select to authenticated
  using (public.is_parent_of_child(child_id) and deliver_at <= now());

drop policy if exists p3_letters_insert on public.p3_letters;
create policy p3_letters_insert on public.p3_letters
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and public.is_parent_of_child(child_id)
    and deliver_at >= now() + interval '11 months'
  );

-- ── Garde parent commune (restrictive, cumulée) — même logique que 061 ──────
do $$
declare t text;
begin
  foreach t in array array['p3_moments', 'p3_skips', 'p3_saved', 'p3_rewards', 'p3_letters'] loop
    execute format('drop policy if exists gate_parent_%1$s on public.%1$s', t);
    execute format($p$
      create policy gate_parent_%1$s on public.%1$s
        as restrictive for all to authenticated
        using ((select private.jwt_role()) <> 'PARENT'
               or ((select private.parent_access_unlocked((select auth.uid())))
                   and coalesce((select enabled from public.app_settings
                                 where key = 'p3_enabled'), false)))
        with check ((select private.jwt_role()) <> 'PARENT'
               or ((select private.parent_access_unlocked((select auth.uid())))
                   and coalesce((select enabled from public.app_settings
                                 where key = 'p3_enabled'), false)))
    $p$, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

grant select, insert on public.p3_moments, public.p3_skips, public.p3_rewards, public.p3_letters to authenticated;
grant select, insert, delete on public.p3_saved to authenticated;
