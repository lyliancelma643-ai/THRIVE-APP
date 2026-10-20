import { Redirect } from 'expo-router';

// Racine « / » (surtout pour l'aperçu web) : on passe par Bienvenue ; le layout
// racine renvoie ensuite un utilisateur connecté vers son espace (homeFor).
export default function Index() {
  return <Redirect href="/welcome" />;
}
