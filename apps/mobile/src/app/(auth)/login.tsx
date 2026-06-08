import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

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
      router.replace('/(parent)/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Connexion impossible');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold mb-2">THRIVE 🏆</Text>
        <Text className="text-gray-500 mb-8">Connecte-toi à ton espace</Text>

        <TextInput
          className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!error && <Text className="text-red-500 mb-4 text-sm">{error}</Text>}

        <Pressable
          className="bg-black rounded-2xl py-4 items-center mb-4"
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text className="text-white font-semibold text-base">
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text className="text-center text-gray-500">
            Pas encore de compte ? <Text className="text-black font-semibold">Créer un compte</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
