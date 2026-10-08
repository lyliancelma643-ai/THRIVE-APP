'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, logout } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';
import { hasWorkspace, homeForRole } from '@/lib/role-home';

// Rôle inconnu ou sans espace (ex. profil enfant) : plutôt qu'une boucle de
// redirections, on explique et on propose de se déconnecter.
export default function UnconfiguredAccountPage() {
  const router = useRouter();
  const { user, isLoading, hydrate } = useAuthStore();
  const [busy, setBusy] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  // Un rôle valide n'a rien à faire ici (lien conservé en favori, rôle corrigé).
  useEffect(() => {
    if (!isLoading && user && hasWorkspace(user.role)) router.replace(homeForRole(user.role));
  }, [isLoading, user, router]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm text-center" role="alert">
        <BrandLogo className="mx-auto mb-5 h-14 w-14" />
        <h1 className="text-xl font-extrabold text-navy-600">Ton compte n’est pas encore configuré</h1>
        <p className="mt-3 text-sm text-navy-600/80">
          Ton compte n’a pas encore d’espace dans l’application. Écris-nous et nous
          réglons ça rapidement, ou reconnecte-toi avec un autre compte.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setBusy(true); void logout(); }}
          className="mt-6 min-h-11 w-full rounded-full bg-navy-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Déconnexion…' : 'Me déconnecter'}
        </button>
        <a href="/support" className="mt-4 inline-block min-h-11 px-3 py-3 text-sm font-semibold text-navy-600 underline">
          Contacter le support
        </a>
      </div>
    </main>
  );
}
