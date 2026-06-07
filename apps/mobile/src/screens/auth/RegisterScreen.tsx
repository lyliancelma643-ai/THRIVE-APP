import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useAuthStore } from '../stores/auth.store';

export default function RegisterScreen() {
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      setError('');
      await signUp(email, password, { firstName, lastName, role: 'PARENT' });
    } catch (err: any) {
      setError(err.message || 'Inscription impossible');
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-6">Créer un compte</Text>
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Nom" value={lastName} onChangeText={setLastName} />
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      {!!error && <Text className="text-red-500 mb-4">{error}</Text>}
      <Pressable className="bg-black rounded-xl py-4 items-center" onPress={handleSubmit} disabled={isLoading}>
        <Text className="text-white font-semibold">{isLoading ? 'Chargement...' : 'Créer le compte'}</Text>
      </Pressable>
    </View>
  );
}
