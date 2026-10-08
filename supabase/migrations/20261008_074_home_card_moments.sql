-- ─────────────────────────────────────────────────────────────────────────────
-- 074 (ex-061 locale, renumérotée le 2026-10-08) — Module « À la maison » : moments parent ↔ enfant.
--
-- Le CONTENU des 100 cartes vit dans le code (apps/web/src/content/a-la-maison,
-- parsé en JSON) : il est versionné avec l'app et n'a rien de personnel. La base
-- ne stocke que ce qui l'est : « tel parent a fait telle carte avec tel enfant,
-- et ça s'est passé / pas vraiment ».
--
--   • Compteur de fierté = nombre de lignes outcome = 'YES' (une phrase dans
--     l'app, jamais un score).
--   • 'NOT_REALLY' est conservé (pour proposer de refaire / pour le coach
--     plus tard) mais n'est JAMAIS présenté comme un échec.
--   • parent_id est gardé pour le futur « mode deux parents » (qui a fait quoi).
--   • Aucune mise à jour ni suppression côté parent : un moment vécu ne se
--     réécrit pas. La suppression suit celle de l'enfant (cascade, Loi 25).
--
-- Déverrouillage : calculé côté app à partir des séances déjà lisibles par le
-- parent (sessions COMPLETED du coach, video_session_runs terminées) — aucune
-- donnée dupliquée ici.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.home_card_moments (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  parent_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  card_id     text not null check (card_id ~ '^([ABC](0[1-9]|[12][0-9]|3[0-4])|JOKER)$'),
  outcome     text not null check (outcome in ('YES', 'NOT_REALLY')),
  created_at  timestamptz not null default now()
);

create index if not exists home_card_moments_child_idx
  on public.home_card_moments (child_id, created_at desc);
create index if not exists home_card_moments_parent_idx
  on public.home_card_moments (parent_id);

alter table public.home_card_moments enable row level security;

-- Lecture : le parent de l'enfant, son coach assigné (futur « mot du coach »),
-- les admins.
drop policy if exists home_card_moments_read on public.home_card_moments;
create policy home_card_moments_read on public.home_card_moments
  for select to authenticated
  using (
    private.is_parent_of_child(child_id)
    or private.is_assigned_coach(child_id)
    or private.is_admin()
  );

-- Écriture : uniquement le parent, pour son propre enfant, en son nom.
drop policy if exists home_card_moments_insert on public.home_card_moments;
create policy home_card_moments_insert on public.home_card_moments
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and private.is_parent_of_child(child_id)
  );

-- Même garde que le reste de la section Fitness : compte parent activé et
-- flag fitness_enabled (policy restrictive, cumulée aux précédentes).
drop policy if exists gate_parent_home_card_moments on public.home_card_moments;
create policy gate_parent_home_card_moments on public.home_card_moments
  as restrictive for all to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)))
  with check ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_access_unlocked((select auth.uid())))
             and coalesce((select enabled from public.app_settings
                           where key = 'fitness_enabled'), false)));

revoke all on public.home_card_moments from anon;
grant select, insert on public.home_card_moments to authenticated;
