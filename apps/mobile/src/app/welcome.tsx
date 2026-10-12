import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MascotHero, SPACING, ThemedText, useTheme } from '../design';
import { AuthButton, AuthLink, AuthScaffold } from '../components/account/AuthScaffold';
import { SloganDuo } from '../components/account/SloganDuo';

// Écran Bienvenue (maquette A). Les boutons mènent aux écrans de connexion et
// d'inscription existants. Il n'est pas encore l'écran d'arrivée non connecté :
// app/_layout.tsx redirige toujours vers /(auth)/login (à décider par S1).
export default function WelcomeScreen() {
  const router = useRouter();
  const { style } = useTheme();
  return (
    <AuthScaffold logo={false}>
      <View style={{ alignItems: 'center', marginBottom: SPACING.space6 }}>
        <MascotHero size={220} withLogo />
      </View>
      <ThemedText variant={style === 'carnet' ? 'displayLarge' : 'largeTitle'} style={{ textAlign: 'center', marginBottom: SPACING.space2 }} accessibilityRole="header">
        Bienvenue dans THRIVE
      </ThemedText>
      <View style={{ marginBottom: SPACING.space8 }}>
        <SloganDuo variant="headline" color="tint" dotColor="tint" align="center" />
      </View>
      <AuthButton label="Créer mon compte" onPress={() => router.push('/(auth)/register')} />
      <AuthLink label="Se connecter" onPress={() => router.push('/(auth)/login')}>
        <ThemedText variant="body" color="tint">J’ai déjà un compte</ThemedText>
      </AuthLink>
    </AuthScaffold>
  );
}
