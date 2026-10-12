import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { MascotHero, SPACING, ThemedText } from '../../design';
import { AuthButton, AuthError, AuthField, AuthLink, AuthScaffold } from '../../components/account/AuthScaffold';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Tous les champs sont requis'); return; }
    try {
      setError('');
      await signIn(email, password);
      // La redirection selon le rôle est faite par le layout racine.
    } catch (err: any) {
      setError(err.message ?? 'Connexion impossible');
    }
  };

  return (
    <AuthScaffold>
      <View style={{ alignItems: 'center', marginBottom: SPACING.space5 }}>
        <MascotHero size={140} />
      </View>
      <ThemedText variant="largeTitle" accessibilityRole="header">THRIVE</ThemedText>
      <ThemedText variant="body" color="label2" style={{ marginBottom: SPACING.space6 }}>Connecte-toi à ton espace</ThemedText>

      <AuthField
        label="Email"
        testID="login-email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <AuthField
        label="Mot de passe"
        testID="login-password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />

      <AuthError testID="login-error" message={error} />

      <AuthButton
        testID="login-submit"
        label={isLoading ? 'Connexion...' : 'Se connecter'}
        onPress={handleLogin}
        disabled={isLoading}
      />

      <AuthLink label="Mot de passe oublié ?" onPress={() => router.push('/(auth)/forgot-password')}>
        <ThemedText variant="subheadline" color="label2" style={{ textDecorationLine: 'underline' }}>Mot de passe oublié ?</ThemedText>
      </AuthLink>

      <AuthLink label="Créer un compte" onPress={() => router.push('/(auth)/register')}>
        <ThemedText variant="subheadline" color="label2">
          Pas encore de compte ? <ThemedText variant="subheadline" color="tint" style={{ fontWeight: '600' }}>Créer un compte</ThemedText>
        </ThemedText>
      </AuthLink>
    </AuthScaffold>
  );
}
