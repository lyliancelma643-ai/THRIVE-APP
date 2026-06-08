import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// On essaie de lire depuis les variables d'environnement (Next.js ou Expo),
// et on tombe sur la valeur réelle si aucune variable n'est définie.
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  'https://ircpewhmmcpghucnywis.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyY3Bld2htbWNwZ2h1Y255d2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTA1MzcsImV4cCI6MjA5NjQyNjUzN30.gpn07F43itKB1OHQQKgWhbVFnE3oP_RHd3L6scmNM1A';

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

export const supabase = supabaseClient;
