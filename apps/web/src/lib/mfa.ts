// ─────────────────────────────────────────────────────────────────────────────
// Helper MFA (TOTP) — enveloppe de supabase.auth.mfa.*
// Réf. OWASP ASVS V2.8 / guide AppSec §3.2. Prérequis : activer le facteur TOTP
// dans Dashboard Supabase → Authentication → Multi-Factor Authentication.
//
// Modèle de niveaux d'assurance (AAL) de Supabase :
//   - currentLevel = niveau atteint par la session en cours ('aal1' | 'aal2')
//   - nextLevel    = niveau requis compte tenu des facteurs enrôlés
//   → nextLevel === 'aal2' && currentLevel === 'aal1'  ⇒ un facteur existe mais
//     la session n'a pas (encore) passé le second facteur : step-up nécessaire.
//   → nextLevel === 'aal1'                              ⇒ aucun facteur : rien à faire.
// C'est ce qui rend l'ensemble DORMANT tant qu'aucun facteur n'est enrôlé
// (aucun risque de verrouiller les comptes existants).
// ─────────────────────────────────────────────────────────────────────────────
import { supabaseClient as supabase } from '@thrive/shared';

export type MfaStatus = {
  hasVerifiedFactor: boolean;
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  /** true ⇒ un facteur est enrôlé mais la session est encore en aal1 (step-up requis). */
  needsStepUp: boolean;
  verifiedFactorId: string | null;
};

/** État MFA de l'utilisateur courant. Ne lève pas : renvoie un état neutre en cas d'erreur. */
export async function getMfaStatus(): Promise<MfaStatus> {
  const neutral: MfaStatus = {
    hasVerifiedFactor: false,
    currentLevel: null,
    nextLevel: null,
    needsStepUp: false,
    verifiedFactorId: null,
  };
  try {
    const { data: aal, error: aalErr } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) return neutral;

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.find((f) => f.status === 'verified') ?? null;

    return {
      hasVerifiedFactor: Boolean(verified),
      currentLevel: (aal?.currentLevel as MfaStatus['currentLevel']) ?? null,
      nextLevel: (aal?.nextLevel as MfaStatus['nextLevel']) ?? null,
      needsStepUp: aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2',
      verifiedFactorId: verified?.id ?? null,
    };
  } catch {
    return neutral;
  }
}

export type TotpEnrollment = {
  factorId: string;
  /** SVG du QR code à afficher (data-uri fournie par Supabase). */
  qrCodeSvg: string;
  /** Secret en clair, à saisir manuellement si le QR ne peut pas être scanné. */
  secret: string;
};

/** Démarre l'enrôlement d'un facteur TOTP. Renvoie le QR + le secret à afficher. */
export async function enrollTotp(): Promise<TotpEnrollment> {
  // friendlyName horodaté-libre côté appelant si besoin ; ici nom stable.
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'THRIVE TOTP',
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Finalise l'enrôlement : crée un challenge puis vérifie le code à 6 chiffres.
 * En cas de succès, la session passe à aal2.
 */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const clean = code.replace(/\s/g, '');
  const { data: challenge, error: cErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (cErr) throw cErr;
  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: clean,
  });
  if (vErr) throw vErr;
}

/** Retire un facteur TOTP (désenrôlement). */
export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
