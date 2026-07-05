-- ─────────────────────────────────────────────────────────────────────────────
-- Refonte coach — Partie 2 : documents PDF (contrat de confiance, lettre à
-- moi-même, certificat THRIVE). Stockage privé Supabase Storage + table de
-- métadonnées. Accès :
--   coach/admin (hiérarchie)  : lecture + écriture des documents de leurs athlètes
--   parent                    : lecture SEULE des documents marqués parent_visible
-- Convention de chemin objet : "<child_id>/<kind>/<uuid>-<filename>"
-- (le 1er segment = child_id sert de clé aux policies Storage).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Table de métadonnées
create table if not exists public.athlete_documents (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.children(id) on delete cascade,
  kind           text not null check (kind in ('CONTRACT','LETTER','CERTIFICATE','OTHER')),
  title          text,
  storage_path   text not null unique,
  file_name      text,
  mime_type      text,
  size_bytes     bigint,
  parent_visible boolean not null default true,
  uploaded_by    uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_documents_child on public.athlete_documents(child_id, kind);

alter table public.athlete_documents enable row level security;

-- Lecture : coach/admin (édition) tout ; parent uniquement si parent_visible
drop policy if exists documents_read on public.athlete_documents;
create policy documents_read on public.athlete_documents for select to authenticated
  using (
    private.can_edit_child_bilan(child_id)
    or (parent_visible and private.is_parent_of_child(child_id))
  );

-- Écriture (insert/update/delete) : hiérarchie coach/admin uniquement
drop policy if exists documents_write on public.athlete_documents;
create policy documents_write on public.athlete_documents for all to authenticated
  using (private.can_edit_child_bilan(child_id))
  with check (private.can_edit_child_bilan(child_id));

alter table public.athlete_documents replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.athlete_documents;
exception when duplicate_object then null; end $$;

-- 2) Bucket privé
insert into storage.buckets (id, name, public)
values ('athlete-documents', 'athlete-documents', false)
on conflict (id) do nothing;

-- 3) Policies Storage — clé = premier segment du chemin (child_id)
--    Helper local : caster proprement le 1er dossier en uuid.
create or replace function private.storage_child_id(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select nullif((storage.foldername(p_name))[1], '')::uuid;
$$;

-- Lecture (génération d'URL signée) :
--   coach/admin : tous les documents de leurs athlètes
--   parent      : uniquement les objets référencés par un document parent_visible
drop policy if exists athlete_docs_read on storage.objects;
create policy athlete_docs_read on storage.objects for select to authenticated
  using (
    bucket_id = 'athlete-documents'
    and (
      private.can_edit_child_bilan(private.storage_child_id(name))
      or exists (
        select 1 from public.athlete_documents d
        where d.storage_path = storage.objects.name
          and d.parent_visible
          and private.is_parent_of_child(d.child_id)
      )
    )
  );

-- Écriture (upload / remplacement / suppression) : hiérarchie coach/admin
drop policy if exists athlete_docs_insert on storage.objects;
create policy athlete_docs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'athlete-documents'
    and private.can_edit_child_bilan(private.storage_child_id(name))
  );

drop policy if exists athlete_docs_update on storage.objects;
create policy athlete_docs_update on storage.objects for update to authenticated
  using (bucket_id = 'athlete-documents' and private.can_edit_child_bilan(private.storage_child_id(name)))
  with check (bucket_id = 'athlete-documents' and private.can_edit_child_bilan(private.storage_child_id(name)));

drop policy if exists athlete_docs_delete on storage.objects;
create policy athlete_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-documents' and private.can_edit_child_bilan(private.storage_child_id(name)));
