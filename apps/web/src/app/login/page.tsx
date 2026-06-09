'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';

function getRedirectPath(role?: string): string {
  switch (role) {
    case 'PARENT':      return '/parent/select-profile';
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
      const role = useAuthStore.getState().user?.role?.toUpperCase();
      router.push(getRedirectPath(role));
    } catch (err: any) {
      setError(err.message ?? 'Connexion impossible');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center" style={{ backgroundColor: '#F7F5F2' }}>
      <div className="rounded-3xl shadow-xl p-10 w-full max-w-sm" style={{ backgroundColor: '#004E7A' }}>
        <h1 style={{ fontFamily: 'Times New Roman, serif' }} className="text-3xl font-bold tracking-widest uppercase mb-2 text-white">
          THRIVE
        </h1>
        <p style={{ fontFamily: 'Times New Roman, serif' }} className="text-sm tracking-widest text-white/60 uppercase mb-4">
          Connexion
        </p>
        <br />
        <form onSubmit={handleLogin} className="flex flex-col w-full gap-4">
          <div className="flex flex-col text-left gap-1">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
            />
          </div>

          <div className="flex flex-col text-left gap-1">
            <label className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50 transition-colors"
            />
          </div>

          <br />

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white font-semibold py-3 px-6 rounded-xl mt-2 hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-2">
          <Link
            href="/parent/self-register"
            className="w-full block text-white font-semibold py-2.5 px-4 rounded-xl text-center text-sm whitespace-nowrap hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: '#a7c4bc' }}
          >
            Nouveau parent ? Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
