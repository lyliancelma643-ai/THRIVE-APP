'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

// Redirige vers le bon espace selon le rôle
function getRedirectPath(role?: string): string {
  switch (role) {
    case 'PARENT':      return '/parent/select-profile'; // ← page de sélection profil style Netflix
    case 'COACH':       return '/coach/dashboard';
    case 'ADMIN':
    case 'SUPER_ADMIN': return '/admin';
    default:            return '/dashboard';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Tous les champs sont requis'); return; }
    try {
      setError('');
      await signIn(email, password);
      const role = useAuthStore.getState().user?.role;
      router.push(getRedirectPath(role));
    } catch (err: any) {
      setError(err.message ?? 'Connexion impossible');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-1">THRIVE 🏆</h1>
        <p className="text-gray-500 mb-8">Connecte-toi à ton espace</p>

        <form onSubmit={handleLogin}>
          <label className="text-sm text-gray-500 mb-1 block">Email</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            autoComplete="email"
          />
          <label className="text-sm text-gray-500 mb-1 block">Mot de passe</label>
          <input
            type="password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white rounded-xl py-3 font-semibold disabled:opacity-50 hover:bg-gray-900 transition-colors"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="flex flex-row items-center gap-3 my-8">
          <div className="flex-1 h-px bg-[#E5E3DB]" />
          <span className="text-[13px] font-medium text-[#A3A19A]">ou</span>
          <div className="flex-1 h-px bg-[#E5E3DB]" />
        </div>

        <button
          type="button"
          onClick={() => router.push('/parent/self-register')}
          className="w-full flex flex-row items-center bg-[#F7F6F2] border-[1.5px] border-[#D4D1CA] rounded-[16px] p-4 gap-3 text-left transition-colors hover:bg-[#F0EFEA]"
        >
          <span className="text-2xl leading-none">👋</span>
          <div className="flex-1">
            <div className="text-[15px] font-bold text-[#28251D]">
              Nouveau parent ?
            </div>
            <div className="text-[12px] font-medium text-[#7A7974] mt-0.5">
              Créez votre compte en 2 minutes
            </div>
          </div>
          <span className="text-lg text-[#01696F] font-bold">→</span>
        </button>

      </div>
    </main>
  );
}
