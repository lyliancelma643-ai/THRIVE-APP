import { supabaseClient as supabase } from '@thrive/shared';

// « 1 mois offert » du Certificat THRIVE Maison (CGU §5). L'application du
// crédit est faite par le serveur (edge function claim-certificate-reward,
// déclenchée aussi par la base à l'émission du certificat) ; l'app relance la
// réclamation (idempotente) et affiche l'état réel du crédit.

export type GrantStatus = 'PENDING' | 'APPLIED' | 'STORE_MANUAL' | 'FAILED';
export type CertificateGrant = { status: GrantStatus; channel: string | null; applied_at: string | null };

export async function claimCertificateReward(childId: string): Promise<void> {
  await supabase.functions.invoke('claim-certificate-reward', { body: { child_id: childId } });
}

export async function fetchCertificateGrant(familyId: string): Promise<CertificateGrant | null> {
  const { data } = await supabase
    .from('reward_grants')
    .select('status, channel, applied_at')
    .eq('family_id', familyId)
    .eq('reward_id', 'certificat')
    .maybeSingle();
  return (data as CertificateGrant | null) ?? null;
}

/** Texte affiché sous « 1 mois offert », selon l'état réel du crédit. */
export function grantMessage(grant: Pick<CertificateGrant, 'status' | 'channel'> | null): string {
  if (!grant) return 'Ton mois offert est en cours d’application.';
  switch (grant.status) {
    case 'APPLIED':
      return grant.channel === 'checkout'
        ? 'Ton mois offert a été déduit de ta souscription.'
        : 'Ton mois offert est appliqué : il sera déduit de ta prochaine facture.';
    case 'PENDING':
      return grant.channel === 'deferred'
        ? 'Ton mois offert est réservé : il sera déduit automatiquement de ta prochaine souscription sur le web.'
        : 'Ton mois offert est en cours d’application.';
    case 'STORE_MANUAL':
      return 'Abonnement pris sur iPhone ou Android : notre équipe te contacte pour te remettre ton mois offert.';
    default:
      return 'L’application de ton mois offert a pris du retard ; notre équipe s’en occupe.';
  }
}
