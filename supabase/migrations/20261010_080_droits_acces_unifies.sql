-- ─────────────────────────────────────────────────────────────────────────────
-- 080 — Droits d'accès parents : UNE seule source de calcul, packs datés,
-- overrides Super Admin avec journal d'audit, RLS Bilan / Mes séances.
--
-- Diagnostic (docs/audit-droits-acces-2026-10.md) :
--   B1  Bilan / Mes séances suivaient l'activation coach, pas le pack ;
--   B2  un pack n'avait ni date de début ni date de fin ;
--   B3  baisser families.pack à ESSENTIEL CRÉAIT un pack Groupe (trigger 075) ;
--   B5  les cartes Maison (home_card_moments) exigeaient l'activation coach ;
--   F1  les tables / RPC du Bilan n'avaient aucune garde de section (fuite) ;
--   S1  forçages sans raison, sans expiration, sans historique, écrits par Admin.
--
-- Règle (ordre de priorité, calculée par private.access_compute) :
--   1. override Super Admin actif (non révoqué, non expiré) → gagne toujours ;
--   2. pack actif (Groupe / Individuel / Complet, à date) → Maison + Bilan + Mes séances ;
--   3. abonnement Maison actif (RevenueCat thrive_moments, miroir billing_subscriptions) → Maison ;
--   4. rien → tout verrouillé.
--   Fin de pack : Maison se ferme après `delai_grace_jours` (0 par défaut) sauf
--   abonnement / override ; Bilan et Mes séances passent en LECTURE SEULE de
--   l'historique (`fin_pack_mode` = 'lecture_seule', ou 'floute' = verrouillé).
--
-- Les webhooks (stripe / revenuecat / billing-sync) n'écrivent QUE
-- billing_subscriptions : ils ne peuvent ni lire ni écraser un override.
--
-- Additive, idempotente, réversible :
--   supabase/rollbacks/20261010_080_droits_acces_unifies_rollback.sql
-- ─────────────────────────────────────────────────────────────────────────────

set lock_timeout = '5s';

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Paramètres modifiables (décisions ouvertes, Super Admin seulement)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.access_parameters (
  key        text primary key,
  value      jsonb not null,
  note       text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.access_parameters is
  'Réglages des règles d''accès parents (fin de pack, délai de grâce, pack + abonnement). Écriture : admin_set_access_parameter (Super Admin).';

insert into public.access_parameters (key, value, note) values
  ('fin_pack_mode', '"lecture_seule"'::jsonb,
   'Fin de pack : Bilan et Mes séances en "lecture_seule" (historique consultable) ou "floute" (verrouillés).'),
  ('delai_grace_jours', '0'::jsonb,
   'Jours pendant lesquels Maison reste ouverte après la fin du pack.'),
  ('pack_et_abonnement', '"signalement"'::jsonb,
   'Pack + abonnement Maison payé : "signalement" = rien d''automatique, signalé dans l''admin.')
on conflict (key) do nothing;

alter table public.access_parameters enable row level security;
drop policy if exists access_parameters_read on public.access_parameters;
create policy access_parameters_read on public.access_parameters
  for select to authenticated using ((select private.is_admin_or_super()));
revoke all on public.access_parameters from anon;
revoke insert, update, delete, truncate, references, trigger on public.access_parameters from authenticated;
grant select on public.access_parameters to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Packs datés (remplace parent_access.program_pack)
--    NB : `program_enrollments` existe déjà (inscription enfant ↔ programme).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.pack_enrollments (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.profiles(id) on delete cascade,
  pack       text not null check (pack in ('GROUPE', 'INDIVIDUEL', 'COMPLET')),
  starts_on  date not null default ((now() at time zone 'America/Toronto')::date),
  -- null = sans date de fin (programme en cours, fin non fixée)
  ends_on    date,
  -- admin | stripe | migration
  source     text not null default 'admin' check (source in ('admin', 'stripe', 'migration')),
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on - 1)
);
create index if not exists pack_enrollments_parent_idx on public.pack_enrollments (parent_id, starts_on desc);
comment on table public.pack_enrollments is
  'Packs THRIVE (Groupe / Individuel / Complet) datés. Un pack actif ouvre Maison + Bilan + Mes séances. Écriture : admin_set_pack / admin_end_pack.';

alter table public.pack_enrollments enable row level security;
drop policy if exists pack_enrollments_read on public.pack_enrollments;
create policy pack_enrollments_read on public.pack_enrollments
  for select to authenticated using ((select private.is_admin_or_super()));
revoke all on public.pack_enrollments from anon;
revoke insert, update, delete, truncate, references, trigger on public.pack_enrollments from authenticated;
grant select on public.pack_enrollments to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Overrides Super Admin (remplace les forçages de parent_access)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.access_overrides (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  section        text not null check (section in ('maison', 'bilan', 'seances')),
  etat           text not null check (etat in ('ouvert', 'ferme')),
  raison         text not null check (char_length(btrim(raison)) >= 3),
  expire_le      timestamptz,
  cree_par       uuid references public.profiles(id) on delete set null,
  cree_le        timestamptz not null default now(),
  revoque_le     timestamptz,
  revoque_par    uuid references public.profiles(id) on delete set null,
  revoque_raison text
);
create index if not exists access_overrides_user_idx
  on public.access_overrides (user_id, section, cree_le desc) where revoque_le is null;
comment on table public.access_overrides is
  'Décisions manuelles du Super Admin par section, prioritaires sur tout calcul automatique. Écriture : admin_set_access_override / admin_revoke_access_override.';

alter table public.access_overrides enable row level security;
drop policy if exists access_overrides_read on public.access_overrides;
create policy access_overrides_read on public.access_overrides
  for select to authenticated using ((select private.is_admin_or_super()));
revoke all on public.access_overrides from anon;
revoke insert, update, delete, truncate, references, trigger on public.access_overrides from authenticated;
grant select on public.access_overrides to authenticated;

-- Défense en profondeur : même un appel service role / SQL ne peut écrire un
-- override qu'en Super Admin, ou hors contexte JWT (migration, SQL Editor).
create or replace function private.guard_access_overrides()
returns trigger language plpgsql
set search_path = public
as $$
begin
  -- Suppression en cascade d'un compte (droit à l'effacement) : toujours permise.
  if tg_op = 'DELETE' and not exists (select 1 from profiles p where p.id = old.user_id) then
    return old;
  end if;
  if auth.uid() is not null and not (private.jwt_role() = 'SUPER_ADMIN' and private.is_super_admin()) then
    raise exception 'Réservé au Super Admin' using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'UPDATE' and (new.user_id, new.section, new.etat, new.raison, new.cree_par, new.cree_le)
                       is distinct from (old.user_id, old.section, old.etat, old.raison, old.cree_par, old.cree_le) then
    raise exception 'Un override ne se modifie pas : le révoquer puis en créer un nouveau';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_guard_access_overrides on public.access_overrides;
create trigger trg_guard_access_overrides
  before insert or update or delete on public.access_overrides
  for each row execute function private.guard_access_overrides();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Journal d'audit (toute écriture, d'où qu'elle vienne)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.access_audit_log (
  id          bigint generated always as identity primary key,
  cree_le     timestamptz not null default now(),
  acteur      uuid,
  acteur_role text,
  cible       uuid,
  objet       text not null,   -- override | pack | parametre
  action      text not null,   -- INSERT | UPDATE | DELETE
  raison      text,
  avant       jsonb,
  apres       jsonb
);
create index if not exists access_audit_log_cible_idx on public.access_audit_log (cible, cree_le desc);
comment on table public.access_audit_log is
  'Historique de chaque modification manuelle des accès (qui, quoi, quand, pourquoi). Écrit par triggers.';

alter table public.access_audit_log enable row level security;
drop policy if exists access_audit_log_read on public.access_audit_log;
create policy access_audit_log_read on public.access_audit_log
  for select to authenticated using ((select private.is_admin_or_super()));
revoke all on public.access_audit_log from anon;
revoke insert, update, delete, truncate, references, trigger on public.access_audit_log from authenticated;
grant select on public.access_audit_log to authenticated;

create or replace function private.audit_access_change()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_raison text := nullif(current_setting('thrive.audit_raison', true), '');
begin
  insert into access_audit_log (acteur, acteur_role, cible, objet, action, raison, avant, apres)
  values (
    auth.uid(),
    nullif(private.jwt_role(), ''),
    case tg_argv[0]
      when 'override' then (v_row ->> 'user_id')::uuid
      when 'pack'     then (v_row ->> 'parent_id')::uuid
    end,
    tg_argv[0],
    tg_op,
    coalesce(v_raison, v_row ->> 'revoque_raison', v_row ->> 'raison', v_row ->> 'note'),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
revoke execute on function private.audit_access_change() from public, anon, authenticated;

drop trigger if exists trg_audit_access_overrides on public.access_overrides;
create trigger trg_audit_access_overrides
  after insert or update or delete on public.access_overrides
  for each row execute function private.audit_access_change('override');
drop trigger if exists trg_audit_pack_enrollments on public.pack_enrollments;
create trigger trg_audit_pack_enrollments
  after insert or update or delete on public.pack_enrollments
  for each row execute function private.audit_access_change('pack');
drop trigger if exists trg_audit_access_parameters on public.access_parameters;
create trigger trg_audit_access_parameters
  after insert or update or delete on public.access_parameters
  for each row execute function private.audit_access_change('parametre');

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Signal de rafraîchissement temps réel (un parent ne lit que SA ligne)
--    Bumpé à chaque changement de pack / override / abonnement : l'app se met
--    à jour sans redémarrer (web : realtime ; mobile : realtime + premier plan).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.access_versions (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.access_versions enable row level security;
drop policy if exists access_versions_read_own on public.access_versions;
create policy access_versions_read_own on public.access_versions
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.access_versions from anon;
revoke insert, update, delete, truncate, references, trigger on public.access_versions from authenticated;
grant select on public.access_versions to authenticated;
do $$
begin
  alter publication supabase_realtime add table public.access_versions;
exception when duplicate_object or undefined_object then null;
end $$;

-- Le titulaire et tous les membres de ses familles (co-parents) sont prévenus.
create or replace function private.bump_access_version(p_user uuid)
returns void language sql security definer
set search_path = public
as $$
  insert into access_versions (user_id)
  select u from (
    select p_user as u
    union
    select m.profile_id from families f join family_members m on m.family_id = f.id where f.parent_id = p_user
    union
    select f.parent_id from families f join family_members m on m.family_id = f.id where m.profile_id = p_user
  ) x
  where u is not null and exists (select 1 from profiles p where p.id = u)
  on conflict (user_id) do update
    set version = access_versions.version + 1, updated_at = now();
$$;
revoke execute on function private.bump_access_version(uuid) from public, anon, authenticated;

create or replace function private.bump_access_version_trigger()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  perform private.bump_access_version(coalesce(v_row ->> tg_argv[0], v_row ->> 'user_id')::uuid);
  return coalesce(new, old);
end;
$$;
revoke execute on function private.bump_access_version_trigger() from public, anon, authenticated;

drop trigger if exists trg_bump_access_overrides on public.access_overrides;
create trigger trg_bump_access_overrides after insert or update or delete on public.access_overrides
  for each row execute function private.bump_access_version_trigger('user_id');
drop trigger if exists trg_bump_pack_enrollments on public.pack_enrollments;
create trigger trg_bump_pack_enrollments after insert or update or delete on public.pack_enrollments
  for each row execute function private.bump_access_version_trigger('parent_id');
drop trigger if exists trg_bump_billing_subscriptions on public.billing_subscriptions;
create trigger trg_bump_billing_subscriptions after insert or update on public.billing_subscriptions
  for each row execute function private.bump_access_version_trigger('user_id');

-- ════════════════════════════════════════════════════════════════════════════
-- 6. LE calcul (unique) — tout le reste en découle
-- ════════════════════════════════════════════════════════════════════════════
create or replace function private.access_param(p_key text, p_default jsonb)
returns jsonb language sql stable security definer
set search_path = public
as $$
  select coalesce((select value from access_parameters where key = p_key), p_default);
$$;
revoke execute on function private.access_param(text, jsonb) from public, anon;
grant execute on function private.access_param(text, jsonb) to authenticated;

create or replace function private.access_compute(p_user uuid)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_today    date := (now() at time zone 'America/Toronto')::date;
  v_grace    int  := coalesce((private.access_param('delai_grace_jours', '0'::jsonb) #>> '{}')::int, 0);
  v_end_mode text := coalesce(private.access_param('fin_pack_mode', '"lecture_seule"'::jsonb) #>> '{}', 'lecture_seule');
  v_holders  uuid[];
  e_active   pack_enrollments%rowtype;
  e_grace    pack_enrollments%rowtype;
  e_last     pack_enrollments%rowtype;
  v_has_active boolean;
  v_has_grace  boolean;
  v_had_pack   boolean;
  v_sub        boolean;
  v_sub_exp    timestamptz;
  v_own_paid   boolean;
  o_maison   access_overrides%rowtype;
  o_bilan    access_overrides%rowtype;
  o_seances  access_overrides%rowtype;
  v_maison   boolean;
  v_src_m    text;
  v_mode_b   text;
  v_src_b    text;
  v_mode_s   text;
  v_src_s    text;
  v_ends     date[] := '{}';
  v_open_end boolean := false;
  v_fin      date;
  v_auto_m   boolean;
  v_auto_prog text;
begin
  -- Jamais les droits d'autrui (même garde que has_p3_subscription).
  if not (auth.uid() is null or auth.uid() = p_user or private.is_admin()) then
    return jsonb_build_object('maison', false, 'bilan', false, 'seances', false,
      'bilan_mode', 'verrouille', 'seances_mode', 'verrouille',
      'source_maison', 'aucune', 'source_bilan', 'aucune', 'source_seances', 'aucune');
  end if;

  -- Pack : le sien, ou celui du titulaire d'une famille dont il est membre (co-parent).
  v_holders := array(
    select p_user
    union
    select f.parent_id from families f join family_members m on m.family_id = f.id
    where m.profile_id = p_user
  );

  select * into e_active from pack_enrollments
   where parent_id = any(v_holders) and starts_on <= v_today and (ends_on is null or ends_on >= v_today)
   order by (ends_on is null) desc, ends_on desc, starts_on desc
   limit 1;
  v_has_active := found;

  if not v_has_active then
    select * into e_grace from pack_enrollments
     where parent_id = any(v_holders) and starts_on <= v_today
       and ends_on < v_today and ends_on + v_grace >= v_today
     order by ends_on desc limit 1;
    v_has_grace := found;
  else
    v_has_grace := false;
  end if;

  select * into e_last from pack_enrollments
   where parent_id = any(v_holders) and ends_on < v_today
   order by ends_on desc limit 1;
  v_had_pack := found;

  v_sub := private.has_p3_subscription(p_user);
  -- Échéance : la sienne ou celle du titulaire qui la partage (co-parent).
  select max(s.expires_at) into v_sub_exp
    from billing_subscriptions s
   where s.user_id = any(v_holders) and s.active and (s.expires_at is null or s.expires_at > now());
  -- Abonnement PAYÉ par ce compte (signalement « pack + abonnement »).
  select coalesce(bool_or(not s.is_sandbox and coalesce(s.store, '') not in ('promotional', 'PROMOTIONAL')), false)
    into v_own_paid
    from billing_subscriptions s
   where s.user_id = p_user and s.active and (s.expires_at is null or s.expires_at > now());

  -- Overrides actifs (le plus récent par section).
  select * into o_maison from access_overrides
   where user_id = p_user and section = 'maison' and revoque_le is null
     and (expire_le is null or expire_le > now())
   order by cree_le desc limit 1;
  select * into o_bilan from access_overrides
   where user_id = p_user and section = 'bilan' and revoque_le is null
     and (expire_le is null or expire_le > now())
   order by cree_le desc limit 1;
  select * into o_seances from access_overrides
   where user_id = p_user and section = 'seances' and revoque_le is null
     and (expire_le is null or expire_le > now())
   order by cree_le desc limit 1;

  -- ── Maison ────────────────────────────────────────────────────────────────
  v_auto_m := v_has_active or v_has_grace or v_sub;
  if o_maison.id is not null then
    v_maison := o_maison.etat = 'ouvert';
    v_src_m := 'override';
  elsif v_has_active or v_has_grace then
    v_maison := true;  v_src_m := 'pack';
  elsif v_sub then
    v_maison := true;  v_src_m := 'abonnement';
  else
    v_maison := false; v_src_m := 'aucune';
  end if;

  -- Date de fermeture prévue de Maison (null = pas de fin connue ou fermée).
  if v_maison then
    if v_src_m = 'override' then
      if o_maison.expire_le is null then v_open_end := true;
      else v_ends := v_ends || (o_maison.expire_le at time zone 'America/Toronto')::date; end if;
    end if;
    if v_has_active then
      if e_active.ends_on is null then v_open_end := true;
      else v_ends := v_ends || (e_active.ends_on + v_grace); end if;
    elsif v_has_grace then
      v_ends := v_ends || (e_grace.ends_on + v_grace);
    end if;
    if v_sub and v_src_m <> 'override' then
      if v_sub_exp is null then v_open_end := true;
      else v_ends := v_ends || (v_sub_exp at time zone 'America/Toronto')::date; end if;
    end if;
    if not v_open_end then
      select max(d) into v_fin from unnest(v_ends) d;
    end if;
  end if;

  -- ── Bilan / Mes séances : pack actif = complet ; pack terminé = historique ─
  v_auto_prog := case
    when v_has_active then 'complet'
    when v_had_pack and v_end_mode = 'lecture_seule' then 'lecture'
    else 'verrouille'
  end;

  if o_bilan.id is not null then
    v_mode_b := case when o_bilan.etat = 'ouvert' then 'complet' else 'verrouille' end;
    v_src_b := 'override';
  else
    v_mode_b := v_auto_prog;
    v_src_b := case v_auto_prog when 'complet' then 'pack' when 'lecture' then 'historique' else 'aucune' end;
  end if;

  if o_seances.id is not null then
    v_mode_s := case when o_seances.etat = 'ouvert' then 'complet' else 'verrouille' end;
    v_src_s := 'override';
  else
    v_mode_s := v_auto_prog;
    v_src_s := case v_auto_prog when 'complet' then 'pack' when 'lecture' then 'historique' else 'aucune' end;
  end if;

  return jsonb_build_object(
    'maison',  v_maison,
    'bilan',   v_mode_b <> 'verrouille',
    'seances', v_mode_s <> 'verrouille',
    'bilan_mode',   v_mode_b,
    'seances_mode', v_mode_s,
    'source_maison',  v_src_m,
    'source_bilan',   v_src_b,
    'source_seances', v_src_s,
    'pack_actif', case when v_has_active then lower(e_active.pack) end,
    'pack_debut', case when v_has_active then e_active.starts_on end,
    'pack_fin',   case when v_has_active then e_active.ends_on
                       when v_had_pack then e_last.ends_on end,
    'pack_termine', case when not v_has_active and v_had_pack then lower(e_last.pack) end,
    'maison_en_grace', v_has_grace and v_src_m = 'pack',
    'fin_acces_maison', v_fin,
    'abonnement_actif', v_sub,
    'pack_et_abonnement', v_has_active and coalesce(v_own_paid, false),
    'auto', jsonb_build_object(
      'maison',  v_auto_m,
      'bilan',   v_auto_prog <> 'verrouille',
      'seances', v_auto_prog <> 'verrouille'),
    'overrides', jsonb_build_object(
      'maison',  case when o_maison.id  is not null then jsonb_build_object('id', o_maison.id,  'etat', o_maison.etat,  'expire_le', o_maison.expire_le) end,
      'bilan',   case when o_bilan.id   is not null then jsonb_build_object('id', o_bilan.id,   'etat', o_bilan.etat,   'expire_le', o_bilan.expire_le) end,
      'seances', case when o_seances.id is not null then jsonb_build_object('id', o_seances.id, 'etat', o_seances.etat, 'expire_le', o_seances.expire_le) end)
  );
end;
$$;
revoke execute on function private.access_compute(uuid) from public, anon;
grant execute on function private.access_compute(uuid) to authenticated;

-- Signature conservée (policies 064 / 068 / 070 et gardes ci-dessous).
create or replace function private.parent_section_access(p_parent uuid, p_section text)
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce((private.access_compute(p_parent) ->> p_section)::boolean, false);
$$;
revoke execute on function private.parent_section_access(uuid, text) from public, anon;
grant execute on function private.parent_section_access(uuid, text) to authenticated;

-- Écriture côté parent (Bilan / Séances) : refusée en lecture seule.
create or replace function private.parent_section_writable(p_parent uuid, p_section text)
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce(private.access_compute(p_parent) ->> (p_section || '_mode'), 'verrouille') = 'complet';
$$;
revoke execute on function private.parent_section_writable(uuid, text) from public, anon;
grant execute on function private.parent_section_writable(uuid, text) to authenticated;

create or replace function private.parent_p3_access(p_parent uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.parent_section_access(p_parent, 'maison');
$$;
revoke execute on function private.parent_p3_access(uuid) from public, anon;
grant execute on function private.parent_p3_access(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. RLS : l'écran et la base ne peuvent plus diverger
-- ════════════════════════════════════════════════════════════════════════════

-- 7a. Bilan : toute donnée du dossier, pour un PARENT, exige la section Bilan.
--     (Restrictive : s'ajoute aux policies existantes, n'élargit rien.)
do $$
declare t text;
begin
  foreach t in array array['questionnaires', 'athlete_identity', 'athlete_objectives', 'athlete_next_steps',
                           'athlete_documents', 'focus_word_history', 'emotion_logs', 'skill_scores',
                           'progress_log', 'perma_scores', 'coach_reports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists gate_parent_bilan_%1$s on public.%1$I', t);
      execute format($p$
        create policy gate_parent_bilan_%1$s on public.%1$I
          as restrictive for select to authenticated
          using ((select private.jwt_role()) <> 'PARENT'
                 or (select private.parent_section_access((select auth.uid()), 'bilan')))
      $p$, t);
    end if;
  end loop;
end $$;

-- 7b. Séances et rapports parents : lus par Bilan ET par Mes séances (068, inchangé
--     dans la forme, désormais branché sur le calcul unique via parent_section_access).

-- 7c. RPC SECURITY DEFINER du Bilan (gauge_summary, session_report, *_progression,
--     dossier_completeness) : elles passent toutes par can_view_child_bilan.
--     Parent : Bilan OU Mes séances ouverts (session_report sert aussi Mes séances).
create or replace function private.can_view_child_bilan(p_child uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select private.can_edit_child_bilan(p_child)
      or (private.is_parent_of_child(p_child)
          and (private.jwt_role() <> 'PARENT'
               or private.parent_section_access(auth.uid(), 'bilan')
               or private.parent_section_access(auth.uid(), 'seances')));
$$;

-- 7d. Maison : les cartes « À la maison » suivent Maison (et non l'activation coach).
do $$
begin
  if to_regclass('public.home_card_moments') is not null then
    drop policy if exists gate_parent_home_card_moments on public.home_card_moments;
    create policy gate_parent_home_card_moments on public.home_card_moments
      as restrictive for all to authenticated
      using ((select private.jwt_role()) <> 'PARENT'
             or ((select private.parent_p3_access((select auth.uid())))
                 and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)))
      with check ((select private.jwt_role()) <> 'PARENT'
             or ((select private.parent_p3_access((select auth.uid())))
                 and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
  end if;
end $$;

-- 7e. Séances vidéo du programme : contenu du pack → section Mes séances.
drop policy if exists gate_parent_video_sessions on public.video_sessions;
create policy gate_parent_video_sessions on public.video_sessions
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_section_access((select auth.uid()), 'seances'))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
drop policy if exists gate_parent_video_runs on public.video_session_runs;
create policy gate_parent_video_runs on public.video_session_runs
  as restrictive for select to authenticated
  using ((select private.jwt_role()) <> 'PARENT'
         or ((select private.parent_section_access((select auth.uid()), 'seances'))
             and coalesce((select enabled from public.app_settings where key = 'fitness_enabled'), false)));
-- Lecture seule après un pack : pas de nouvelle séance vidéo enregistrée.
drop policy if exists gate_parent_video_runs_write on public.video_session_runs;
create policy gate_parent_video_runs_write on public.video_session_runs
  as restrictive for insert to authenticated
  with check ((select private.jwt_role()) <> 'PARENT'
              or (select private.parent_section_writable((select auth.uid()), 'seances')));

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Fin des anciens mécanismes
-- ════════════════════════════════════════════════════════════════════════════
-- 075 : la synchro families.pack ↔ program_pack transformait ESSENTIEL en pack
-- Groupe (B3). families.pack redevient un simple NIVEAU de détail des bilans,
-- posé par admin_set_pack quand un pack est attribué.
drop trigger if exists trg_sync_family_pack_from_program_pack on public.parent_access;
drop trigger if exists trg_sync_program_pack_from_family_pack on public.families;

-- Reprise : packs et forçages existants → nouvelles tables (une seule fois).
insert into public.pack_enrollments (parent_id, pack, starts_on, source, note, created_by)
select a.parent_id, a.program_pack, (a.created_at at time zone 'America/Toronto')::date,
       'migration', 'Repris de parent_access.program_pack (migration 080)', a.updated_by
from public.parent_access a
where a.program_pack is not null
  and not exists (select 1 from public.pack_enrollments e where e.parent_id = a.parent_id);

insert into public.access_overrides (user_id, section, etat, raison, cree_par, cree_le)
select a.parent_id, s.section, case when s.v then 'ouvert' else 'ferme' end,
       coalesce(nullif(btrim(a.note), ''), 'Repris de parent_access (migration 080)'),
       a.updated_by, a.updated_at
from public.parent_access a
cross join lateral (values ('maison', a.maison), ('bilan', a.bilan), ('seances', a.seances)) s(section, v)
where s.v is not null
  and not exists (select 1 from public.access_overrides o
                  where o.user_id = a.parent_id and o.section = s.section);

-- parent_access n'est plus lu ni écrit (gardée pour le retour arrière).
revoke insert, update, delete on public.parent_access from authenticated;
comment on table public.parent_access is
  'OBSOLÈTE depuis 080 : remplacée par pack_enrollments + access_overrides. Conservée pour le rollback.';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. access_state() : contrat unique web + mobile (anciennes clés conservées)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.access_state()
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := private.jwt_role();
  v_has_child boolean;
  v_has_confirmed boolean;
  v_coach_ok boolean;
  v_fitness boolean;
  v_level text;
  v_trial_used boolean;
  c jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('unlocked', false, 'reason', 'anonymous');
  end if;

  select coalesce(enabled, false) into v_fitness
  from app_settings where key = 'fitness_enabled';

  if v_role <> 'PARENT' then
    return jsonb_build_object(
      'role', v_role, 'unlocked', true, 'has_child', true, 'has_confirmed_child', true,
      'coach_validated', true, 'fitness_enabled', coalesce(v_fitness, false),
      'p3_subscribed', false, 'p3_access', true,
      'program_pack', null, 'bilan_access', true, 'seances_access', true,
      'sections', jsonb_build_object('maison', true, 'bilan', true, 'seances', true),
      'maison', true, 'bilan', true, 'seances', true,
      'bilan_mode', 'complet', 'seances_mode', 'complet',
      'source_maison', 'staff', 'source_bilan', 'staff', 'source_seances', 'staff',
      'pack_actif', null, 'fin_acces_maison', null,
      'bilan_level', 'PERFORMANCE',
      'is_staff', v_role in ('COACH', 'ADMIN', 'SUPER_ADMIN'),
      'forced', jsonb_build_object('maison', null, 'bilan', null, 'seances', null),
      'trial_used', true
    );
  end if;

  select
    exists (select 1 from children ch
            where private.is_family_parent(ch.family_id) and ch.is_active),
    exists (select 1 from children ch
            where private.is_family_parent(ch.family_id) and ch.is_active
              and ch.validation_status = 'CONFIRMED')
  into v_has_child, v_has_confirmed;

  select coalesce(p.coach_validated, false)
      or exists (
        select 1 from family_members m
        join families f on f.id = m.family_id
        join profiles owner on owner.id = f.parent_id
        where m.profile_id = v_uid and coalesce(owner.coach_validated, false)
      )
  into v_coach_ok
  from profiles p where p.id = v_uid;

  select f.pack into v_level
  from families f
  where private.is_family_parent(f.id)
  order by case f.pack when 'PERFORMANCE' then 3 when 'AVANCE' then 2 else 1 end desc
  limit 1;

  select coalesce(bool_or(ever_subscribed), false) into v_trial_used
  from billing_subscriptions where user_id = v_uid;

  c := private.access_compute(v_uid);

  return (c || jsonb_build_object(
    'role', v_role,
    -- « unlocked » = parcours prêt (enfant confirmé + coach) : information
    -- d'affichage (étapes d'activation), PLUS un droit d'accès.
    'unlocked', v_has_confirmed and coalesce(v_coach_ok, false),
    'has_child', v_has_child,
    'has_confirmed_child', v_has_confirmed,
    'coach_validated', coalesce(v_coach_ok, false),
    'fitness_enabled', coalesce(v_fitness, false),
    'p3_subscribed', (c ->> 'abonnement_actif')::boolean,
    'p3_access', (c ->> 'maison')::boolean,
    'program_pack', upper(c ->> 'pack_actif'),
    'bilan_access', (c ->> 'bilan')::boolean,
    'seances_access', (c ->> 'seances')::boolean,
    'sections', jsonb_build_object('maison', c -> 'maison', 'bilan', c -> 'bilan', 'seances', c -> 'seances'),
    'bilan_level', coalesce(v_level, 'ESSENTIEL'),
    'is_staff', false,
    'forced', jsonb_build_object(
      'maison',  case when c #> '{overrides,maison}'  <> 'null'::jsonb then to_jsonb((c #>> '{overrides,maison,etat}')  = 'ouvert') end,
      'bilan',   case when c #> '{overrides,bilan}'   <> 'null'::jsonb then to_jsonb((c #>> '{overrides,bilan,etat}')   = 'ouvert') end,
      'seances', case when c #> '{overrides,seances}' <> 'null'::jsonb then to_jsonb((c #>> '{overrides,seances,etat}') = 'ouvert') end),
    'trial_used', v_trial_used
  )) - 'overrides' - 'auto';
end;
$$;
revoke execute on function public.access_state() from public, anon;
grant execute on function public.access_state() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. API d'administration (toutes les écritures passent par ici, auditées)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function private.require_super_admin()
returns void language plpgsql stable
set search_path = public
as $$
begin
  if not (private.jwt_role() = 'SUPER_ADMIN' and private.is_super_admin()) then
    raise exception 'Réservé au Super Admin' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create or replace function private.require_reason(p_raison text)
returns text language plpgsql immutable
as $$
begin
  if p_raison is null or char_length(btrim(p_raison)) < 3 then
    raise exception 'Raison obligatoire (3 caractères minimum)' using errcode = 'check_violation';
  end if;
  return btrim(p_raison);
end;
$$;

-- Vue d'ensemble : état calculé + source pour chaque parent.
drop function if exists public.admin_parent_access_list();
create or replace function public.admin_parent_access_list()
returns table (
  parent_id          uuid,
  email              text,
  first_name         text,
  last_name          text,
  program_pack       text,
  pack_debut         date,
  pack_fin           date,
  maison             boolean,
  bilan              boolean,
  seances            boolean,
  bilan_mode         text,
  seances_mode       text,
  source_maison      text,
  source_bilan       text,
  source_seances     text,
  fin_acces_maison   date,
  p3_subscribed      boolean,
  pack_et_abonnement boolean,
  coach_unlocked     boolean,
  overrides          jsonb,
  -- compatibilité avec l'ancien écran (068)
  eff_maison         boolean,
  eff_bilan          boolean,
  eff_seances        boolean,
  auto_maison        boolean,
  auto_bilan         boolean,
  auto_seances       boolean
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select
    p.id, p.email, p.first_name, p.last_name,
    upper(c ->> 'pack_actif'),
    (c ->> 'pack_debut')::date,
    (c ->> 'pack_fin')::date,
    (c ->> 'maison')::boolean, (c ->> 'bilan')::boolean, (c ->> 'seances')::boolean,
    c ->> 'bilan_mode', c ->> 'seances_mode',
    c ->> 'source_maison', c ->> 'source_bilan', c ->> 'source_seances',
    (c ->> 'fin_acces_maison')::date,
    (c ->> 'abonnement_actif')::boolean,
    (c ->> 'pack_et_abonnement')::boolean,
    private.parent_access_unlocked(p.id),
    c -> 'overrides',
    (c ->> 'maison')::boolean, (c ->> 'bilan')::boolean, (c ->> 'seances')::boolean,
    (c #>> '{auto,maison}')::boolean, (c #>> '{auto,bilan}')::boolean, (c #>> '{auto,seances}')::boolean
  from profiles p
  cross join lateral private.access_compute(p.id) c
  where p.role = 'PARENT';
end;
$$;
revoke execute on function public.admin_parent_access_list() from public, anon;
grant execute on function public.admin_parent_access_list() to authenticated;

-- Détail d'un parent : état, packs, overrides (actifs + historique), journal.
create or replace function public.admin_parent_access_detail(p_parent uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs';
  end if;
  return jsonb_build_object(
    'state', private.access_compute(p_parent),
    'packs', coalesce((select jsonb_agg(to_jsonb(e) order by e.starts_on desc, e.created_at desc)
                       from pack_enrollments e where e.parent_id = p_parent), '[]'::jsonb),
    'overrides', coalesce((select jsonb_agg(to_jsonb(o) order by o.cree_le desc)
                           from access_overrides o where o.user_id = p_parent), '[]'::jsonb),
    'journal', coalesce((select jsonb_agg(to_jsonb(j) order by j.cree_le desc)
                         from (select * from access_audit_log l where l.cible = p_parent
                               order by l.cree_le desc limit 100) j), '[]'::jsonb),
    'parametres', coalesce((select jsonb_object_agg(key, value) from access_parameters), '{}'::jsonb),
    'can_override', private.jwt_role() = 'SUPER_ADMIN' and private.is_super_admin()
  );
end;
$$;
revoke execute on function public.admin_parent_access_detail(uuid) from public, anon;
grant execute on function public.admin_parent_access_detail(uuid) to authenticated;

-- Attribuer / modifier / prolonger le pack en cours (Admin ou Super Admin).
create or replace function public.admin_set_pack(
  p_parent uuid, p_pack text, p_starts_on date, p_ends_on date, p_raison text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_raison text := private.require_reason(p_raison);
  v_id uuid;
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs' using errcode = 'insufficient_privilege';
  end if;
  if p_pack not in ('GROUPE', 'INDIVIDUEL', 'COMPLET') then
    raise exception 'Pack inconnu : %', p_pack;
  end if;
  if not exists (select 1 from profiles where id = p_parent and role = 'PARENT') then
    raise exception 'Parent introuvable';
  end if;
  if p_ends_on is not null and p_ends_on < coalesce(p_starts_on, v_today) then
    raise exception 'La fin du pack précède son début';
  end if;
  perform set_config('thrive.audit_raison', v_raison, true);

  -- Pack en cours ou à venir : on le modifie (prolonger = nouvelle date de fin).
  select id into v_id from pack_enrollments
   where parent_id = p_parent and (ends_on is null or ends_on >= v_today)
   order by starts_on desc limit 1;

  if v_id is not null then
    update pack_enrollments
       set pack = p_pack, starts_on = coalesce(p_starts_on, starts_on), ends_on = p_ends_on,
           note = v_raison, updated_by = auth.uid(), updated_at = now()
     where id = v_id;
  else
    insert into pack_enrollments (parent_id, pack, starts_on, ends_on, source, note, created_by, updated_by)
    values (p_parent, p_pack, coalesce(p_starts_on, v_today), p_ends_on, 'admin', v_raison, auth.uid(), auth.uid())
    returning id into v_id;
  end if;

  -- Niveau de détail des bilans de ses familles = celui du pack.
  update families
     set pack = case p_pack when 'GROUPE' then 'ESSENTIEL' when 'INDIVIDUEL' then 'AVANCE' else 'PERFORMANCE' end
   where parent_id = p_parent;

  return v_id;
end;
$$;
revoke execute on function public.admin_set_pack(uuid, text, date, date, text) from public, anon;
grant execute on function public.admin_set_pack(uuid, text, date, date, text) to authenticated;

-- Terminer le pack en cours (fin = date donnée, hier par défaut = immédiat).
create or replace function public.admin_end_pack(p_parent uuid, p_ends_on date, p_raison text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_raison text := private.require_reason(p_raison);
  v_end date := coalesce(p_ends_on, v_today - 1);
  n int;
begin
  if not private.is_admin_or_super() then
    raise exception 'Réservé aux administrateurs' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('thrive.audit_raison', v_raison, true);
  update pack_enrollments
     set ends_on = greatest(v_end, starts_on - 1), note = v_raison, updated_by = auth.uid(), updated_at = now()
   where parent_id = p_parent and (ends_on is null or ends_on >= v_today);
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Aucun pack en cours pour ce parent';
  end if;
end;
$$;
revoke execute on function public.admin_end_pack(uuid, date, text) from public, anon;
grant execute on function public.admin_end_pack(uuid, date, text) to authenticated;

-- Override (Super Admin seulement) : remplace l'override actif de la section.
create or replace function public.admin_set_access_override(
  p_user uuid, p_section text, p_etat text, p_raison text, p_expire_le timestamptz
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_raison text;
  v_id uuid;
begin
  perform private.require_super_admin();
  v_raison := private.require_reason(p_raison);
  if p_section not in ('maison', 'bilan', 'seances') then raise exception 'Section inconnue : %', p_section; end if;
  if p_etat not in ('ouvert', 'ferme') then raise exception 'État inconnu : %', p_etat; end if;
  if p_expire_le is not null and p_expire_le <= now() then raise exception 'La date d''expiration est déjà passée'; end if;
  if not exists (select 1 from profiles where id = p_user and role = 'PARENT') then
    raise exception 'Parent introuvable';
  end if;

  update access_overrides
     set revoque_le = now(), revoque_par = auth.uid(), revoque_raison = 'Remplacé : ' || v_raison
   where user_id = p_user and section = p_section and revoque_le is null;

  insert into access_overrides (user_id, section, etat, raison, expire_le, cree_par)
  values (p_user, p_section, p_etat, v_raison, p_expire_le, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.admin_set_access_override(uuid, text, text, text, timestamptz) from public, anon;
grant execute on function public.admin_set_access_override(uuid, text, text, text, timestamptz) to authenticated;

create or replace function public.admin_revoke_access_override(p_override uuid, p_raison text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_raison text;
  n int;
begin
  perform private.require_super_admin();
  v_raison := private.require_reason(p_raison);
  update access_overrides
     set revoque_le = now(), revoque_par = auth.uid(), revoque_raison = v_raison
   where id = p_override and revoque_le is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Override introuvable ou déjà révoqué'; end if;
end;
$$;
revoke execute on function public.admin_revoke_access_override(uuid, text) from public, anon;
grant execute on function public.admin_revoke_access_override(uuid, text) to authenticated;

create or replace function public.admin_set_access_parameter(p_key text, p_value jsonb, p_raison text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_raison text;
begin
  perform private.require_super_admin();
  v_raison := private.require_reason(p_raison);
  if p_key = 'fin_pack_mode' and (p_value #>> '{}') not in ('lecture_seule', 'floute') then
    raise exception 'fin_pack_mode : lecture_seule ou floute';
  elsif p_key = 'delai_grace_jours' and (jsonb_typeof(p_value) <> 'number' or (p_value #>> '{}')::int not between 0 and 365) then
    raise exception 'delai_grace_jours : entier entre 0 et 365';
  elsif p_key = 'pack_et_abonnement' and (p_value #>> '{}') not in ('signalement') then
    raise exception 'pack_et_abonnement : seule la valeur "signalement" est implémentée';
  elsif p_key not in ('fin_pack_mode', 'delai_grace_jours', 'pack_et_abonnement') then
    raise exception 'Paramètre inconnu : %', p_key;
  end if;
  perform set_config('thrive.audit_raison', v_raison, true);
  update access_parameters set value = p_value, updated_by = auth.uid(), updated_at = now() where key = p_key;
  -- Tous les parents recalculent leur état.
  update access_versions set version = version + 1, updated_at = now();
end;
$$;
revoke execute on function public.admin_set_access_parameter(text, jsonb, text) from public, anon;
grant execute on function public.admin_set_access_parameter(text, jsonb, text) to authenticated;

reset lock_timeout;
