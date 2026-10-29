import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { tourStorageKey } from '../components/maison/tour/steps';

/**
 * Visite guidée de Maison : proposée une seule fois par compte, au premier passage d'un parent qui n'a encore
 * vécu aucun moment (un parent déjà actif ne la voit pas). Terminée ou passée, elle ne revient plus.
 * `eligible` : Maison est prête (enfant, activité du soir) et aucun moment n'est encore enregistré.
 */
export function useMaisonTour(userId: string | undefined, eligible: boolean) {
  const [seen, setSeen] = useState<boolean | null>(null);
  // Une fois ouverte, la visite reste ouverte (un rechargement de Maison ne la referme pas).
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    AsyncStorage.getItem(tourStorageKey(userId))
      .then((v) => alive && setSeen(v !== null))
      // Stockage illisible : on ne force pas la visite.
      .catch(() => alive && setSeen(true));
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (seen === false && eligible) setOpen(true);
  }, [seen, eligible]);

  const finish = useCallback(() => {
    setSeen(true);
    setOpen(false);
    if (userId) AsyncStorage.setItem(tourStorageKey(userId), new Date().toISOString()).catch(() => {});
  }, [userId]);

  return {
    visible: open,
    finish,
    /** Revoir la visite à la demande. */
    start: useCallback(() => setOpen(true), []),
  };
}
