import { useEffect } from 'react';
import { useSubscriptionStore } from '../stores/subscription.store';
import { cancelTrialReminder, syncTrialReminder } from '../services/trialReminder';

/**
 * Garde le rappel de fin d’essai (J-3) synchronisé avec le CustomerInfo du
 * store d’abonnement : (re)programme, ou annule si résiliation / accès changé.
 * À monter une fois dans le layout parent connecté.
 */
export function useTrialReminder(): void {
  const customerInfo = useSubscriptionStore((s) => s.customerInfo);

  useEffect(() => {
    if (!customerInfo) {
      void cancelTrialReminder();
      return;
    }
    void syncTrialReminder(customerInfo);
  }, [customerInfo]);
}
