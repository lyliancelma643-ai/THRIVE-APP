import { useRouter } from 'expo-router';
import { WelcomeView } from '../components/account/WelcomeView';

// Écran Bienvenue (maquette A) : arrivée non connectée (app/_layout.tsx y renvoie).
// « Essayer 1 mois gratuitement » mène à l'inscription (C), « J’ai déjà un compte » à la connexion (B).
export default function WelcomeScreen() {
  const router = useRouter();
  return <WelcomeView onStart={() => router.push('/(auth)/register')} onLogin={() => router.push('/(auth)/login')} />;
}
