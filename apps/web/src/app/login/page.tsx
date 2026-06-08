'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

// Redirige vers le bon espace selon le rôle
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
    <main className="min-h-screen bg-gradient-to-br from-[#004e7a] to-[#002f4a] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-tertiary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-tertiary/20 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-white/10 p-4 rounded-[24px] mb-4 inline-flex backdrop-blur-md border border-white/20 shadow-xl">
            <span className="text-5xl">🏆</span>
          </div>
          <h1 className="text-[36px] font-extrabold text-white mb-2 tracking-tight drop-shadow-md">
            THRIVE
          </h1>
          <p className="text-[16px] text-white/80 font-medium">
            Connecte-toi à ton espace
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 mb-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[24px] p-6 shadow-2xl">
          <div>
            <label className="text-[13px] font-semibold text-white/90 mb-2 ml-1 block">
              Adresse email
            </label>
            <input
              type="email"
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-[15px] text-white placeholder-white/40 focus:outline-none focus:border-brand-tertiary/50 focus:ring-2 focus:ring-brand-tertiary/20 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              autoComplete="email"
            />
          </div>
          
          <div>
            <label className="text-[13px] font-semibold text-white/90 mb-2 ml-1 block">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-[15px] text-white placeholder-white/40 focus:outline-none focus:border-brand-tertiary/50 focus:ring-2 focus:ring-brand-tertiary/20 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-xl mt-2">
              <p className="text-red-200 text-[13px] text-center font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-tertiary text-[#002f4a] rounded-2xl py-4 mt-4 font-bold text-[16px] shadow-[0_4px_16px_rgba(167,196,188,0.3)] hover:bg-[#b8d2cb] transition-all disabled:opacity-50"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="flex flex-row items-center gap-4 mb-8 px-4">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-[13px] font-medium text-white/60">ou</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        <button
          type="button"
          onClick={() => router.push('/parent/self-register')}
          className="w-full flex flex-row items-center bg-white/5 backdrop-blur-md border-[1.5px] border-white/20 rounded-[20px] p-4 gap-4 text-left transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-1"
        >
          <div className="bg-white/10 p-3 rounded-xl">
            <span className="text-2xl leading-none block">👋</span>
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-bold text-white">
              Nouveau parent ?
            </div>
            <div className="text-[13px] font-medium text-white/60 mt-1">
              Créez votre compte en 2 minutes
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-tertiary/20 flex items-center justify-center">
            <span className="text-lg text-brand-tertiary font-bold">→</span>
          </div>
        </button>

      </div>
    </main>
  );
}
