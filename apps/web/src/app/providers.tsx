'use client';

// Providers client de l'app — TanStack Query : cache des lectures Supabase
// (fini le re-fetch intégral à chaque navigation), dédoublonnage des requêtes,
// invalidation ciblée depuis le realtime (voir useBilanData).
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30 s de fraîcheur : navigation aller-retour instantanée, sans
            // servir des données périmées (le realtime invalide de toute façon).
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            // Mobile PWA : pas de re-fetch à chaque retour d'app — le realtime
            // et staleTime suffisent, on économise le réseau des parents.
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
