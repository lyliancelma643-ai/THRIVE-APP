import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ircpewhmmcpghucnywis.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyY3Bld2htbWNwZ2h1Y255d2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTA1MzcsImV4cCI6MjA5NjQyNjUzN30.gpn07F43itKB1OHQQKgWhbVFnE3oP_RHd3L6scmNM1A';

export function createServerClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Export direct pour usage simple côté serveur
export const supabaseServer = createServerClient();
