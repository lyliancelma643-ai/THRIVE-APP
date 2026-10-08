import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabaseClient as supabase } from '@thrive/shared';

// Mot de passe oublié : le lien reçu par courriel ouvre la page web
// /reset-password (universal link si l'app est installée), où le nouveau mot de
// passe est choisi avec la même règle que partout (12 caractères).
const RESET_URL = 'https://app.thrivesportpositive.com/reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Entre une adresse courriel valide.'); return; }
    setError('');
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_URL });
      setSent(true); // même message que le compte existe ou non (pas d'énumération)
    } catch {
      setError('Envoi impossible pour le moment. Vérifie ta connexion et réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold mb-2">Mot de passe oublié</Text>
        {sent ? (
          <Text className="text-gray-600 mb-8" accessibilityRole="alert">
            Si un compte existe pour cette adresse, un courriel vient de partir avec un lien pour choisir un nouveau mot de passe.
          </Text>
        ) : (
          <>
            <Text className="text-gray-500 mb-8">Entre ton courriel : on t’envoie un lien pour en choisir un nouveau.</Text>
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {!!error && <Text className="text-red-500 mb-4 text-sm">{error}</Text>}
            <Pressable className="bg-black rounded-2xl py-4 items-center mb-4" onPress={submit} disabled={busy}>
              <Text className="text-white font-semibold text-base">{busy ? 'Envoi…' : 'Envoyer le lien'}</Text>
            </Pressable>
          </>
        )}
        <Pressable className="items-center py-3" onPress={() => router.replace('/(auth)/login')}>
          <Text className="text-gray-500">Retour à la connexion</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
