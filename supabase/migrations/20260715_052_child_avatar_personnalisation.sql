-- 052 — Passeport athlète personnalisable par le parent.
--
-- 1) children : surnom, numéro de maillot, couleur d'accent (préréglages).
-- 2) Bucket privé `child-avatars` pour la photo de profil des enfants
--    (photos de mineurs → jamais public ; l'app affiche via URL signée).
--    Chemin imposé : <child_id>/<fichier> — la RLS s'appuie sur ce préfixe.
-- 3) Politiques storage : lecture = quiconque peut voir le bilan de l'enfant
--    (parent, coach assigné, admin) ; écriture = parent de l'enfant ou admin.

-- 1) Colonnes de personnalisation ------------------------------------------
alter table public.children
  add column if not exists nickname      text,
  add column if not exists jersey_number int,
  add column if not exists accent_color  text;

alter table public.children drop constraint if exists children_nickname_len;
alter table public.children
  add constraint children_nickname_len
  check (nickname is null or char_length(nickname) <= 30);

alter table public.children drop constraint if exists children_jersey_range;
alter table public.children
  add constraint children_jersey_range
  check (jersey_number is null or (jersey_number between 0 and 999));

alter table public.children drop constraint if exists children_accent_allowed;
alter table public.children
  add constraint children_accent_allowed
  check (accent_color is null or accent_color in ('sun','amber','teal','sky','coral','violet'));

-- 2) Bucket privé (5 Mo max, images uniquement) ----------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('child-avatars', 'child-avatars', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- 3) RLS storage — helper : child_id extrait du 1er segment du chemin -------
create or replace function private.storage_child_uuid(p_name text)
returns uuid language sql immutable as $$
  select case
    when split_part(p_name, '/', 1)
         ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;
grant execute on function private.storage_child_uuid(text) to authenticated;

drop policy if exists child_avatars_read on storage.objects;
create policy child_avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'child-avatars'
         and private.can_view_child_bilan(private.storage_child_uuid(name)));

drop policy if exists child_avatars_parent_insert on storage.objects;
create policy child_avatars_parent_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'child-avatars'
              and (private.is_parent_of_child(private.storage_child_uuid(name))
                   or private.is_admin()));

drop policy if exists child_avatars_parent_update on storage.objects;
create policy child_avatars_parent_update on storage.objects for update to authenticated
  using (bucket_id = 'child-avatars'
         and (private.is_parent_of_child(private.storage_child_uuid(name))
              or private.is_admin()))
  with check (bucket_id = 'child-avatars'
              and (private.is_parent_of_child(private.storage_child_uuid(name))
                   or private.is_admin()));

drop policy if exists child_avatars_parent_delete on storage.objects;
create policy child_avatars_parent_delete on storage.objects for delete to authenticated
  using (bucket_id = 'child-avatars'
         and (private.is_parent_of_child(private.storage_child_uuid(name))
              or private.is_admin()));
