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

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
