import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { passwordError, PASSWORD_MIN_LENGTH } from '@thrive/shared/validation/password';
import { LEGAL, LEGAL_VERSION } from '../../services/legal';
import { SPACING, ThemedText, useTheme } from '../../design';
import { AuthButton, AuthError, AuthField, AuthLink, AuthScaffold } from '../../components/account/AuthScaffold';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signUp, isLoading } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError('Tous les champs sont requis');
      return;
    }
    const pwdErr = passwordError(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    // Consentement explicite (Loi 25 art. 4.1 et 14, RGPD art. 7, Apple 5.1.1) :
    // le compte est réservé à un adulte titulaire de l'autorité parentale.
    if (!accepted) {
      setError('Veuillez confirmer votre âge et accepter les conditions pour continuer.');
      return;
    }
    try {
      setError('');
      await signUp(email, password, {
        firstName,
        lastName,
        role: 'PARENT',
        legal_version: LEGAL_VERSION,
        legal_accepted_at: new Date().toISOString(),
        adult_guardian_confirmed: true,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Inscription impossible');
    }
  };

  if (success) {
    return (
      <AuthScaffold>
        <ThemedText variant="title1" accessibilityRole="header" style={{ marginBottom: SPACING.space2 }}>Compte créé !</ThemedText>
        <ThemedText variant="body" color="label2" style={{ marginBottom: SPACING.space8 }}>Vérifie ton email pour confirmer ton compte.</ThemedText>
        <AuthButton label="Se connecter" onPress={() => router.push('/(auth)/login')} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold>
      <ThemedText variant="largeTitle" accessibilityRole="header">Rejoins THRIVE</ThemedText>
      <ThemedText variant="body" color="label2" style={{ marginBottom: SPACING.space6 }}>Crée ton espace parent</ThemedText>

      <AuthField label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
      <AuthField label="Nom" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
      <AuthField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <AuthField label={`Mot de passe (min. ${PASSWORD_MIN_LENGTH} caractères)`} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />

      <Pressable
        onPress={() => setAccepted((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityLabel="Je confirme avoir 18 ans ou plus, être parent ou tuteur légal, et accepter les conditions"
        accessibilityState={{ checked: accepted }}
        style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: 44, marginBottom: SPACING.space4 }}
      >
        <View
          style={{
            width: 24, height: 24, borderRadius: 7, marginRight: SPACING.space3, marginTop: 1,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: accepted ? colors.tint : 'transparent',
            borderWidth: accepted ? 0 : 2, borderColor: colors.label2,
          }}
        >
          {accepted ? <Ionicons name="checkmark" size={16} color={colors.tintInk} /> : null}
        </View>
        <ThemedText variant="footnote" color="label2" style={{ flex: 1 }}>
          J’ai 18 ans ou plus, je suis parent ou tuteur légal, et j’accepte les{' '}
          <ThemedText variant="footnote" color="tint" style={{ textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(LEGAL.terms)}>conditions d’utilisation</ThemedText>
          {LEGAL.privacy ? (
            <>
              {' '}et la{' '}
              <ThemedText variant="footnote" color="tint" style={{ textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(LEGAL.privacy)}>politique de confidentialité</ThemedText>
            </>
          ) : null}
          .
        </ThemedText>
      </Pressable>

      <AuthError message={error} />

      <AuthButton label={isLoading ? 'Création...' : 'Créer mon compte'} onPress={handleRegister} disabled={isLoading} />

      <AuthLink label="Se connecter" onPress={() => router.back()}>
        <ThemedText variant="subheadline" color="label2">
          Déjà un compte ? <ThemedText variant="subheadline" color="tint" style={{ fontWeight: '600' }}>Se connecter</ThemedText>
        </ThemedText>
      </AuthLink>
    </AuthScaffold>
  );
}
