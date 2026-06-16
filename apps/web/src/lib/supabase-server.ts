import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://kkdcgzvdmipmrgkawnky.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZGNnenZkbWlwbXJna2F3bmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDMxNzcsImV4cCI6MjA5NzExOTE3N30.fI0EzwqjGpfWvBMhtk2qW8pETcDkWDmpbuRw9RpdAi4';

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
