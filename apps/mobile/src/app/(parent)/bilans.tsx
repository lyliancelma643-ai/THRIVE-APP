import { BilanScreen } from '../../components/hub/bilan/BilanScreen';

// Onglet Bilan : copie fidèle du Bilan du web (« Carte d'identité » de l'enfant, gabarit HTML du web rendu à l'identique,
// fiches détaillées et explications en feuilles iOS). Accès : section Bilan de access_state() (migration 080) ;
// verrouillé → aperçu factice flouté, AUCUNE requête de données. ?child=…&focus=… : arrivée depuis une notification.
export default function BilansScreen() {
  return <BilanScreen />;
}

export { ErrorBoundary } from '../../components/ErrorBoundary';
