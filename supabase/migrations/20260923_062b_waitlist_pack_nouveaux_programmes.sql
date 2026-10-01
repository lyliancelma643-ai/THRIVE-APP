-- Rapatriée de la production (version 20260923023914 « waitlist_pack_nouveaux_programmes »).
-- Le site enregistre désormais le programme depuis lequel le parent a cliqué
-- « Réserver ma place ». Les anciennes valeurs restent valides pour les
-- lignes déjà qualifiées dans l'admin.
alter table public.waitlist drop constraint waitlist_pack_valid;
alter table public.waitlist add constraint waitlist_pack_valid check (
  pack is null or pack = any (array[
    'ESSENTIEL', 'AVANCE', 'PERFORMANCE',
    'OSER_ESSAYER', 'ALLER_VERS_LES_AUTRES'
  ])
);
