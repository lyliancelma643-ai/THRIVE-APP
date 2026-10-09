-- Retour arrière de 075 : supprime la synchronisation et rend à Maison la
-- règle de 068 (abonnement seul ou forçage). Les lignes parent_access reprises
-- (note « Repris de families.pack (migration 075) ») sont retirées.

drop trigger if exists trg_sync_family_pack_from_program_pack on public.parent_access;
drop trigger if exists trg_sync_program_pack_from_family_pack on public.families;
drop function if exists private.sync_family_pack_from_program_pack();
drop function if exists private.sync_program_pack_from_family_pack();

delete from public.parent_access
 where note = 'Repris de families.pack (migration 075)'
   and maison is null and bilan is null and seances is null;

create or replace function private.parent_section_access(p_parent uuid, p_section text)
returns boolean language plpgsql stable security definer
set search_path = public
as $$
declare
  r parent_access%rowtype;
  v_forced boolean;
begin
  if not (auth.uid() is null or auth.uid() = p_parent or private.is_admin()) then
    return false;
  end if;
  select * into r from parent_access where parent_id = p_parent;
  v_forced := case p_section
    when 'maison'  then r.maison
    when 'bilan'   then r.bilan
    when 'seances' then r.seances
  end;
  if v_forced is not null then
    return v_forced;
  end if;
  if p_section = 'maison' then
    return private.has_p3_subscription(p_parent);
  end if;
  if p_section in ('bilan', 'seances') then
    return private.parent_access_unlocked(p_parent);
  end if;
  return false;
end;
$$;

-- admin_parent_access_list : réappliquer la définition de
-- supabase/migrations/20261006_068_parent_section_access.sql (section 5).

drop function if exists private.program_pack_to_family_pack(text);
drop function if exists private.family_pack_to_program_pack(text);
