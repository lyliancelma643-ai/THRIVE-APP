import { supabaseClient as supabase } from '@thrive/shared';

// Inscription avec confirmation d'e-mail obligatoire (Loi 25 : aucun compte
// traitant des données de mineurs n'est actif sans preuve que le parent
// contrôle son adresse). Tant que l'e-mail n'est pas confirmé il n'y a pas de
// session, donc pas d'écriture possible (RLS) : les enfants déclarés dans le
// formulaire sont mis en attente dans user_metadata, puis créés à la première
// connexion confirmée et aussitôt effacés des métadonnées (minimisation).

export type PendingChild = { firstName: string; age: number; sport: string };

export const CONFIRM_PATH = '/auth/confirm';

export function confirmRedirectUrl(): string {
  return `${window.location.origin}${CONFIRM_PATH}`;
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: confirmRedirectUrl() },
  });
  if (error) throw error;
}

/**
 * Crée la famille et les enfants déclarés à l'inscription, si besoin.
 * Best-effort : un échec n'empêche pas l'entrée dans l'app (le parent pourra
 * ajouter ses enfants via « + Ajouter un enfant »). Retourne true si des
 * enfants étaient en attente mais n'ont pas pu être créés.
 */
export async function finalizePendingSignup(): Promise<{ failed: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  const pending = user?.user_metadata?.pendingChildren as PendingChild[] | null | undefined;
  if (!user || !Array.isArray(pending) || pending.length === 0) return { failed: false };

  try {
    let { data: family } = await supabase
      .from('families').select('id').eq('parent_id', user.id).limit(1).maybeSingle();
    if (!family) {
      const lastName = String(user.user_metadata?.lastName ?? '').trim();
      const { data: created, error: famErr } = await supabase
        .from('families')
        .insert({ name: `Famille ${lastName || 'Nouvelle'}`.trim(), parent_id: user.id })
        .select('id')
        .single();
      if (famErr) throw famErr;
      family = created;
    }

    const rows = pending.map((c) => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - Number(c.age));
      return {
        family_id: family!.id,
        first_name: String(c.firstName).trim(),
        date_of_birth: dob.toISOString().split('T')[0],
        sport: String(c.sport ?? '').trim() || 'Hockey',
        is_active: true,
      };
    });
    const { error: childErr } = await supabase.from('children').insert(rows);
    if (childErr) throw childErr;
    return { failed: false };
  } catch {
    return { failed: true };
  } finally {
    // Dans tous les cas : on ne garde pas de données d'enfants dans les
    // métadonnées d'authentification (et on ne les recrée pas en double).
    await supabase.auth.updateUser({ data: { pendingChildren: null } }).catch(() => {});
  }
}
