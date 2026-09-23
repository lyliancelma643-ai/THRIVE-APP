import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// On essaie de lire depuis les variables d'environnement (Next.js ou Expo),
// et on tombe sur la valeur réelle si aucune variable n'est définie.
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  'https://kkdcgzvdmipmrgkawnky.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZGNnenZkbWlwbXJna2F3bmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDMxNzcsImV4cCI6MjA5NzExOTE3N30.fI0EzwqjGpfWvBMhtk2qW8pETcDkWDmpbuRw9RpdAi4';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Supabase] URL ou ANON KEY manquante. Vérifie tes variables d\'environnement.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// fetch borné dans le temps. Sans ça, une requête réseau qui ne répond jamais
// (typique d'une PWA iOS qui revient d'arrière-plan, ou d'un réseau mobile
// instable) laisse la promesse pendante À VIE : le rafraîchissement du token
// reste « en vol », getSession() ne rend jamais la main et l'app tourne sur
// son spinner jusqu'à ce qu'on recharge la page. Avec un délai, l'appel échoue
// proprement et l'UI peut réagir (réessayer, afficher le formulaire).
//   • Auth (/auth/v1)      : 10 s — c'est le chemin critique de la connexion.
//   • REST / RPC / fonctions : 25 s.
//   • Storage (uploads)    : aucune limite (un gros fichier peut être long).
// ─────────────────────────────────────────────────────────────────────────────
function timeoutFor(url: string): number | null {
  if (url.includes('/auth/v1/')) return 10_000;
  if (url.includes('/storage/v1/')) return null;
  return 25_000;
}

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const ms = timeoutFor(url);
  if (ms === null || typeof AbortController === 'undefined') return fetch(input, init);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Respecte un éventuel signal fourni par l'appelant (annulation manuelle).
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
