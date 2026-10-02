import { supabaseClient as supabase } from '@thrive/shared';

// Familles dont l'utilisateur est parent : titulaire (families.parent_id) OU
// co-parent (family_members OWNER/PARENT). Même définition que la fonction
// private.parent_family_ids() de la migration 066, qui ouvre ces lectures.
// Titulaire en premier : c'est sa famille qui sert par défaut (forfait, ajout).

export type MyFamily = { id: string; pack: string | null; isOwner: boolean };

export async function fetchMyFamilies(userId: string): Promise<MyFamily[]> {
  const [owned, memberships] = await Promise.all([
    supabase.from('families').select('id, pack').eq('parent_id', userId),
    supabase
      .from('family_members')
      .select('family_id')
      .eq('profile_id', userId)
      .in('member_role', ['OWNER', 'PARENT']),
  ]);
  const ownedRows = (owned.data ?? []) as { id: string; pack: string | null }[];
  const ownedIds = new Set(ownedRows.map((f) => f.id));
  const joinedIds = ((memberships.data ?? []) as { family_id: string }[])
    .map((m) => m.family_id)
    .filter((id) => !ownedIds.has(id));

  let joined: { id: string; pack: string | null }[] = [];
  if (joinedIds.length) {
    const { data } = await supabase.from('families').select('id, pack').in('id', joinedIds);
    joined = (data ?? []) as { id: string; pack: string | null }[];
  }
  return [
    ...ownedRows.map((f) => ({ ...f, isOwner: true })),
    ...joined.map((f) => ({ ...f, isOwner: false })),
  ];
}
