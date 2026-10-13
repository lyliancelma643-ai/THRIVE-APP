import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering } from '../../services/purchases';

/** Période d'essai gratuit (ISO 8601) d'un package, si le store en déclare une. */
export function freeTrialPeriod(pkg: PurchasesPackage): string | null {
  const p = pkg.product;
  if (Platform.OS === 'android') return p.defaultOption?.freePhase?.billingPeriod?.iso8601 ?? null;
  return p.introPrice && p.introPrice.price === 0 ? p.introPrice.period : null;
}

/** Offering RevenueCat courant : source unique des prix de Maison (jamais en dur). */
export function useMaisonOffering() {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getCurrentOffering()
      .then((o) => alive && setOffering(o))
      .catch(() => alive && setOffering(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  return {
    loading,
    monthly: offering?.monthly ?? null,
    annual: offering?.annual ?? null,
  };
}
