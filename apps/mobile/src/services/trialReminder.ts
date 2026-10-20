// ─────────────────────────────────────────────────────────────────────────────
// Rappel de fin d’essai : notification LOCALE programmée à J-3 de la fin de
// l’essai gratuit (date lue dans le CustomerInfo RevenueCat).
//
// Partie PURE (computeTrialReminderDate) : testée dans trialReminder.test.ts,
// sans dépendance native. Partie service : expo-notifications est importé à la
// demande pour que la logique reste testable hors React Native.
//
// RÈGLE ANTI-STEERING : texte neutre, sans lien, sans prix, sans mention d’un
// autre canal de paiement. La permission n’est JAMAIS demandée ici : on
// réutilise celle déjà accordée (cf. usePushNotifications) ; sinon, on ne fait rien.
// ─────────────────────────────────────────────────────────────────────────────
import { ENTITLEMENT_ID } from './subscription-logic';

/** Identifiant stable : reprogrammer remplace, annuler cible toujours la même. */
export const TRIAL_REMINDER_ID = 'thrive-trial-reminder';
/** Nombre de jours avant la fin d’essai. */
export const REMINDER_DAYS_BEFORE = 3;
/** Heure locale d’envoi (ni trop tôt, ni trop tard). */
export const REMINDER_HOUR = 18;

export const TRIAL_REMINDER_TITLE = 'Ton mois gratuit se termine bientôt';
export const TRIAL_REMINDER_BODY =
  'Il reste 3 jours. Tu peux gérer ton abonnement dans les réglages de ton téléphone.';

/** Sous-ensemble structurel de CustomerInfo (évite d’importer le SDK natif). */
export type TrialCustomerInfo = {
  entitlements: {
    active: Record<
      string,
      | {
          periodType?: string | null;
          expirationDate?: string | null;
          willRenew?: boolean | null;
        }
      | undefined
    >;
  };
} | null;

/**
 * Date de rappel (fin d’essai − 3 jours, à 18 h heure locale) ou null si :
 * pas d’entitlement `thrive_moments` actif, pas en période d’essai (TRIAL),
 * résilié (willRenew=false), date de fin absente/invalide, ou rappel déjà passé.
 */
export function computeTrialReminderDate(
  info: TrialCustomerInfo | undefined,
  now: Date = new Date(),
): Date | null {
  const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!ent) return null;
  if ((ent.periodType ?? '').toUpperCase() !== 'TRIAL') return null;
  if (ent.willRenew === false) return null;
  if (!ent.expirationDate) return null;
  const end = new Date(ent.expirationDate);
  if (Number.isNaN(end.getTime())) return null;

  const when = new Date(end.getTime());
  when.setDate(when.getDate() - REMINDER_DAYS_BEFORE);
  when.setHours(REMINDER_HOUR, 0, 0, 0);
  // Si l’essai finit avant 18 h le jour J-3 reste inchangé ; on ne programme
  // jamais après la fin de l’essai.
  if (when.getTime() >= end.getTime()) return null;
  if (when.getTime() <= now.getTime()) return null;
  return when;
}

/** Annule le rappel (résiliation, accès modifié, déconnexion). */
export async function cancelTrialReminder(): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID);
  } catch {
    /* module natif absent (Expo Go / tests) : rien à annuler */
  }
}

/**
 * Synchronise la notification avec l’état d’abonnement : annule l’ancienne puis
 * reprogramme si besoin. Sans permission déjà accordée, ne fait rien.
 */
export async function syncTrialReminder(info: TrialCustomerInfo | undefined): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    const when = computeTrialReminderDate(info);
    await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID);
    if (!when) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return; // jamais de demande agressive ici

    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_REMINDER_ID,
      content: { title: TRIAL_REMINDER_TITLE, body: TRIAL_REMINDER_BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
  } catch {
    /* module natif indisponible : le rappel est un confort, jamais bloquant */
  }
}
