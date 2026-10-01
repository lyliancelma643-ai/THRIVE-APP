-- 067 — Plus de sport « Hockey sur glace » par défaut sur athlete_identity.
-- Le défaut s'affichait au parent (Bilan › fiche identité) comme une donnée
-- réelle pour tout enfant dont le coach n'avait pas encore saisi le sport.
-- Les lignes existantes ne sont pas modifiées : le coach corrige au besoin.
alter table public.athlete_identity alter column sport drop default;
