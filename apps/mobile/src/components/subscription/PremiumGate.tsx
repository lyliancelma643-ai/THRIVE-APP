import React, { type ReactNode } from 'react';
import { useEntitlement } from '../../hooks/useEntitlement';
import { Paywall } from './Paywall';
import { SubscriptionLoader } from './SubscriptionLoader';

/**
 * Enveloppe de toute vue premium P3 :
 *   • vérification en cours → chargement (aucun clignotement) ;
 *   • accès (abonné `thrive_moments` ou rôle staff) → contenu ;
 *   • sinon → paywall (ou `fallback` fourni).
 */
export function PremiumGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { isLoading, hasAccess } = useEntitlement();
  if (isLoading) return <SubscriptionLoader />;
  if (!hasAccess) return <>{fallback ?? <Paywall />}</>;
  return <>{children}</>;
}
