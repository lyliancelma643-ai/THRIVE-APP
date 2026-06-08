// Auth moved to apps

// Profile
export { useProfile } from './hooks/useProfile';
export type { UserProfile, UpdateProfilePayload } from './hooks/useProfile';

// Messaging
export { useMessages } from './hooks/useMessages';
export { useConversations } from './hooks/useConversations';

// Analytics
export { useAnalytics } from './hooks/useAnalytics';

// Supabase client
export { supabaseClient, supabase } from './lib/supabase';

// Types
export type { Database } from './types/database';
