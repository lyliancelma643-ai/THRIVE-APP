'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Connexion impossible');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-3xl font-bold">Connexion</h1>
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded-xl px-4 py-3" placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-red-500 text-sm">{error}</p> : null}
        <button className="w-full bg-black text-white rounded-xl py-3 font-semibold" disabled={isLoading}>
          {isLoading ? 'Chargement...' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}
