-- Migration : ajout des colonnes sport et notes à la table children
-- Ces champs sont visibles par les coachs et administrateurs via RLS

alter table children
  add column if not exists sport  text default null,
  add column if not exists notes  text default null;

comment on column children.sport is 'Sport pratiqué par l\'enfant (Football, Tennis, etc.)';
comment on column children.notes is 'Notes libres pour le coach ou l\'administrateur (allergies, objectifs...)';

-- Index léger pour filtrer par sport dans le dashboard admin/coach
create index if not exists idx_children_sport on children(sport) where sport is not null;
