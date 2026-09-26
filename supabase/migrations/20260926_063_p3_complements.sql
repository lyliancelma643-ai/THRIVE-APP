-- ─────────────────────────────────────────────────────────────────────────────
-- 063 — P3 « Le moment qui compte » : fiches complémentaires et bonus.
--
-- Le contenu 2.1.0 ajoute, à côté des 39 fiches cœur (ACT-SS01 à ACT-SS03) :
--   • 13 compléments « Pour aller plus loin cette semaine » : ACT-SS04, ACT-SS05 ;
--   • 1 bonus hors programme : BON-01, rattaché à aucune semaine.
--
-- La base ne stocke toujours que l'usage (le contenu vit dans le code). On élargit
-- seulement le format des identifiants acceptés, et on laisse la semaine vide pour
-- un bonus (et seulement pour lui) : un moment de fiche cœur ou complément garde
-- obligatoirement sa semaine 1–13.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── p3_moments ──────────────────────────────────────────────────────────────
alter table public.p3_moments drop constraint if exists p3_moments_activity_id_check;
alter table public.p3_moments
  add constraint p3_moments_activity_id_check
  check (activity_id ~ '^(ACT-(0[1-9]|1[0-3])0[1-9]|BON-[0-9]{2})$');

alter table public.p3_moments alter column week drop not null;
alter table public.p3_moments drop constraint if exists p3_moments_week_check;
alter table public.p3_moments
  add constraint p3_moments_week_check
  check (
    case
      when activity_id like 'BON-%' then week is null
      else week is not null and week between 1 and 13
    end
  );

-- ── p3_skips ────────────────────────────────────────────────────────────────
alter table public.p3_skips drop constraint if exists p3_skips_activity_id_check;
alter table public.p3_skips
  add constraint p3_skips_activity_id_check
  check (activity_id ~ '^(ACT-(0[1-9]|1[0-3])0[1-9]|BON-[0-9]{2})$');

-- ── p3_saved ────────────────────────────────────────────────────────────────
alter table public.p3_saved drop constraint if exists p3_saved_activity_id_check;
alter table public.p3_saved
  add constraint p3_saved_activity_id_check
  check (activity_id ~ '^(ACT-(0[1-9]|1[0-3])0[1-9]|BON-[0-9]{2})$');
