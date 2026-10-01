import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { LEGAL, LEGAL_VERSION } from '../../services/legal';

export default function RegisterScreen() {
  const router = useRouter();
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
      <View className="flex-1 justify-center items-center px-6 bg-white">
        <Text className="text-4xl mb-4">🎉</Text>
        <Text className="text-2xl font-bold mb-2">Compte créé !</Text>
        <Text className="text-gray-500 text-center mb-8">Vérifie ton email pour confirmer ton compte.</Text>
        <Pressable className="bg-black rounded-2xl py-4 px-8" onPress={() => router.push('/(auth)/login')}>
          <Text className="text-white font-semibold">Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text className="text-4xl font-bold mb-2">Rejoins THRIVE 🏆</Text>
        <Text className="text-gray-500 mb-8">Crée ton espace parent</Text>

        <TextInput className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base" placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
        <TextInput className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base" placeholder="Nom" value={lastName} onChangeText={setLastName} />
        <TextInput className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base" placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable
          className="flex-row items-start mb-4"
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View className={`w-6 h-6 rounded-md border-2 mr-3 mt-0.5 items-center justify-center ${accepted ? 'bg-black border-black' : 'border-gray-300'}`}>
            {accepted && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="flex-1 text-sm text-gray-600">
            J’ai 18 ans ou plus, je suis parent ou tuteur légal, et j’accepte les{' '}
            <Text className="underline text-black" onPress={() => Linking.openURL(LEGAL.terms)}>conditions d’utilisation</Text>
            {LEGAL.privacy ? (
              <>
                {' '}et la{' '}
                <Text className="underline text-black" onPress={() => Linking.openURL(LEGAL.privacy)}>politique de confidentialité</Text>
              </>
            ) : null}
            .
          </Text>
        </Pressable>

        {!!error && <Text className="text-red-500 mb-4 text-sm">{error}</Text>}

        <Pressable className="bg-black rounded-2xl py-4 items-center mb-4" onPress={handleRegister} disabled={isLoading}>
          <Text className="text-white font-semibold text-base">{isLoading ? 'Création...' : 'Créer mon compte'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text className="text-center text-gray-500">Déjà un compte ? <Text className="text-black font-semibold">Se connecter</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
