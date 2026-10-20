import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { LoginView } from '../../components/account/LoginView';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (isLoading) return;
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
    <LoginView
      email={email}
      password={password}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      error={error}
      loading={isLoading}
      onSubmit={handleLogin}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      onForgot={() => router.push('/(auth)/forgot-password')}
      onRegister={() => router.push('/(auth)/register')}
    />
  );
}
