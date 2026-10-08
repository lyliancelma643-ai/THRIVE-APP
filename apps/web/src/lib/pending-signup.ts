import { supabaseClient as supabase } from '@thrive/shared';
import { CONSENT_PURPOSE, PRIVACY_VERSION, SIGNUP_MISSED_KEY, type SignupMissed } from '@/lib/signup';

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

/** Preuve de consentement (Loi 25) posée dans user_metadata à l'inscription. */
export type PendingConsent = { purpose: string; version: string; at: string };

export function buildPendingConsent(): PendingConsent {
  return { purpose: CONSENT_PURPOSE, version: PRIVACY_VERSION, at: new Date().toISOString() };
}

/**
 * Finalise l'inscription à la première session confirmée :
 *  1. trace le consentement dans `consents` (une seule fois par finalité/version) ;
 *  2. crée la famille puis les enfants déclarés, UN PAR UN (le quota du forfait
 *     ou une erreur sur une ligne ne fait pas échouer les autres) ;
 *  3. efface les métadonnées d'attente (minimisation).
 * Best-effort : un échec n'empêche pas l'entrée dans l'app. Les enfants non
 * enregistrés sont mémorisés (SIGNUP_MISSED_KEY) : l'écran d'ajout de profil
 * les reprend avec la raison. `failed` = au moins un enfant non enregistré.
 */
export async function finalizePendingSignup(): Promise<{ failed: boolean; missed: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { failed: false, missed: [] };
  const meta = user.user_metadata ?? {};
  const pending = meta.pendingChildren as PendingChild[] | null | undefined;
  const consent = meta.pendingConsent as PendingConsent | null | undefined;
  const hasChildren = Array.isArray(pending) && pending.length > 0;
  if (!hasChildren && !consent) return { failed: false, missed: [] };

  const missed: string[] = [];
  let quota = false;
  let consentOk = true;

  if (consent?.purpose) {
    try {
      const { data: existing } = await supabase
        .from('consents').select('id')
        .eq('profile_id', user.id).eq('purpose', consent.purpose)
        .eq('policy_version', consent.version).limit(1).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('consents').insert({
          profile_id: user.id, purpose: consent.purpose, policy_version: consent.version,
          granted: true, granted_at: consent.at,
        });
        if (error) throw error;
      }
    } catch {
      consentOk = false; // on garde la preuve dans les métadonnées : nouvel essai à la prochaine connexion
    }
  }

  if (hasChildren) {
    const names = pending!.map((c) => String(c.firstName).trim());
    let familyId: string | null = null;
    const lastName = String(meta.lastName ?? '').trim();
    try {
      const { data: family } = await supabase
        .from('families').select('id').eq('parent_id', user.id).limit(1).maybeSingle();
      familyId = family?.id ?? null;
      if (!familyId) {
        const { data: created, error: famErr } = await supabase
          .from('families')
          .insert({ name: `Famille ${lastName || 'Nouvelle'}`.trim(), parent_id: user.id })
          .select('id').single();
        if (famErr) throw famErr;
        familyId = created.id;
      }
    } catch {
      missed.push(...names);
    }
    if (familyId) {
      for (const c of pending!) {
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - Number(c.age));
        const { error } = await supabase.from('children').insert({
          family_id: familyId,
          first_name: String(c.firstName).trim(),
          last_name: lastName || null,
          date_of_birth: dob.toISOString().split('T')[0],
          sport: String(c.sport ?? '').trim() || null,
          is_active: true,
        });
        if (error) {
          missed.push(String(c.firstName).trim());
          if (/quota/i.test(error.message ?? '')) quota = true;
        }
      }
    }
  }

  if (missed.length > 0) {
    try {
      window.sessionStorage.setItem(
        SIGNUP_MISSED_KEY,
        JSON.stringify({ names: missed, quota } satisfies SignupMissed)
      );
    } catch {
      /* sessionStorage indisponible : l'écran d'ajout s'ouvre sans message */
    }
  }

  // On ne garde pas de données d'enfants dans les métadonnées d'authentification
  // (et on ne les recrée pas en double). La preuve de consentement reste tant
  // qu'elle n'est pas écrite en base.
  await supabase.auth
    .updateUser({ data: { pendingChildren: null, ...(consentOk ? { pendingConsent: null } : {}) } })
    .catch(() => {});
  return { failed: missed.length > 0, missed };
}
