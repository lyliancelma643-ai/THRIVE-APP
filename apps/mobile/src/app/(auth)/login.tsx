import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#D4D1CA' }} />
          <Text style={{ fontSize: 13, color: '#7A7974' }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#D4D1CA' }} />
        </View>

        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F7F6F2', borderWidth: 1.5,
            borderColor: '#D4D1CA', borderRadius: 14, padding: 16, gap: 12,
          }}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={{ fontSize: 24 }}>👋</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#28251D' }}>
              Nouveau parent ?
            </Text>
            <Text style={{ fontSize: 12, color: '#7A7974', marginTop: 2 }}>
              Créez votre compte en 2 minutes
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: '#01696F', fontWeight: '700' }}>→</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}
