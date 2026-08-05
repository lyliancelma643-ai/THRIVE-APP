-- 058 — Liste d'attente : fiche prospect complète + verrouillage d'accès
--
-- Répartition : le FORMULAIRE PUBLIC vit sur le site vitrine (projet
-- Thrive_Site_Web) et écrit ici en `anon`. La QUALIFICATION (appel, rendez-vous,
-- notes) se fait dans l'espace SUPER ADMIN de l'app.
--
-- Deux choses dans cette migration :
--   1. les colonnes qui manquaient à la fiche prospect (enfant, besoin,
--      préférence de rappel, rendez-vous confirmé) ;
--   2. un CORRECTIF DE SÉCURITÉ : jusqu'ici `select` et `update` étaient
--      ouverts à TOUT compte connecté (`to authenticated`, `using true`) — un
--      parent ou un coach pouvait lire la totalité des prospects : prénom,
--      courriel, téléphone. Désormais réservé au SUPER_ADMIN.

begin;

-- ── 1) Fiche prospect ───────────────────────────────────────────────────────

alter table public.waitlist
  add column if not exists child_first_name text,
  add column if not exists child_age        smallint,
  add column if not exists age_group        text,
  add column if not exists main_need        text,
  add column if not exists call_preference  text,
  add column if not exists appointment_at   timestamptz,
  add column if not exists updated_at       timestamptz not null default now();

comment on column public.waitlist.call_preference is
  'Moment où le prospect souhaite être rappelé — déclaratif, saisi sur le site.';
comment on column public.waitlist.appointment_at is
  'Rendez-vous d''appel confirmé par le super admin. Null tant qu''il n''est pas fixé.';
comment on column public.waitlist.destination is
  'Ville / région du prospect, renseignée pendant l''appel.';

-- Ensembles fermés. Le formulaire public écrit ici SANS passer par du code
-- applicatif : c'est à la base de refuser elle-même les valeurs hors périmètre.
alter table public.waitlist drop constraint if exists waitlist_status_valid;
alter table public.waitlist add constraint waitlist_status_valid
  check (status in ('nouveau', 'appelé', 'sans réponse', 'converti', 'perdu'));

alter table public.waitlist drop constraint if exists waitlist_age_group_valid;
alter table public.waitlist add constraint waitlist_age_group_valid
  check (age_group is null or age_group in ('8-11', '12-14', '15-17'));

alter table public.waitlist drop constraint if exists waitlist_child_age_range;
alter table public.waitlist add constraint waitlist_child_age_range
  check (child_age is null or child_age between 5 and 20);

alter table public.waitlist drop constraint if exists waitlist_pack_valid;
alter table public.waitlist add constraint waitlist_pack_valid
  check (pack is null or pack in ('ESSENTIEL', 'AVANCE', 'PERFORMANCE'));

alter table public.waitlist drop constraint if exists waitlist_call_preference_valid;
alter table public.waitlist add constraint waitlist_call_preference_valid
  check (call_preference is null or call_preference in
    ('matin', 'midi', 'apres-midi', 'soir', 'fin-de-semaine', 'peu-importe'));

drop trigger if exists waitlist_set_updated_at on public.waitlist;
create trigger waitlist_set_updated_at
  before update on public.waitlist
  for each row execute function public.set_updated_at();

-- « Qui dois-je appeler aujourd'hui » : index partiel, seuls les rendez-vous
-- réellement fixés pèsent.
create index if not exists waitlist_appointment_idx
  on public.waitlist (appointment_at) where appointment_at is not null;

-- ── 2) Accès ────────────────────────────────────────────────────────────────

-- Autorité du rôle = app_metadata.role (posé par les edge functions via la clé
-- service, non modifiable par l'utilisateur) — jamais user_metadata, qui est
-- auto-modifiable et permettrait une escalade verticale.
create or replace function private.is_super_admin_jwt()
returns boolean language sql stable
set search_path = public
as $$
  select private.jwt_role() = 'SUPER_ADMIN';
$$;

grant execute on function private.is_super_admin_jwt() to authenticated;

-- Inscription publique : toujours ouverte, mais un visiteur ne peut déposer
-- QU'UN prospect neuf et consenti. Sans ce `with check`, n'importe qui pouvait
-- injecter une ligne « converti » avec un rendez-vous déjà fixé.
drop policy if exists "public can insert waitlist" on public.waitlist;
drop policy if exists waitlist_public_insert on public.waitlist;
create policy waitlist_public_insert on public.waitlist
  for insert to anon, authenticated
  with check (
    consent = true
    and status = 'nouveau'
    and called_at is null
    and appointment_at is null
  );

drop policy if exists "authenticated can read waitlist" on public.waitlist;
drop policy if exists waitlist_super_admin_read on public.waitlist;
create policy waitlist_super_admin_read on public.waitlist
  for select to authenticated
  using ((select private.is_super_admin_jwt()));

drop policy if exists "authenticated can update waitlist" on public.waitlist;
drop policy if exists waitlist_super_admin_update on public.waitlist;
create policy waitlist_super_admin_update on public.waitlist
  for update to authenticated
  using ((select private.is_super_admin_jwt()))
  with check ((select private.is_super_admin_jwt()));

-- Suppression : réservée au super admin (retirer un doublon ou un spam).
drop policy if exists waitlist_super_admin_delete on public.waitlist;
create policy waitlist_super_admin_delete on public.waitlist
  for delete to authenticated
  using ((select private.is_super_admin_jwt()));

commit;
