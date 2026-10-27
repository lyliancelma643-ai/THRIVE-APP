import { TabGate } from '../../components/motion/TabGate';
import { SeancesScreen } from '../../components/hub/seances/SeancesScreen';

// Onglet Mes séances : copie fidèle de « Mes séances » du web (programme 1:1, jauge, prochaine séance, 13 séances,
// bilan du coach déplié sous chaque séance validée). Accès : section Séances de access_state() (migration 080) ;
// verrouillé → aperçu factice flouté, AUCUNE requête de données.
export default function SeancesRoute() {
  return (
    <TabGate tab="seances">
      <SeancesScreen />
    </TabGate>
  );
}

export { ErrorBoundary } from '../../components/ErrorBoundary';
