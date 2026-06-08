// Auth
export { useAuth } from './hooks/useAuth';
export { AuthProvider } from './providers/AuthProvider';

// Profile
export { useProfile } from './hooks/useProfile';
export type { UserProfile, UpdateProfilePayload } from './hooks/useProfile';

// Messaging
export { useMessages } from './hooks/useMessages';
export { useConversations } from './hooks/useConversations';

// Notifications
export { useNotifications } from './hooks/useNotifications';
export { NotificationService } from './services/NotificationService';

// Analytics
export { useAnalytics } from './hooks/useAnalytics';

// Supabase client
export { supabase } from './lib/supabase';

// Types
export type { Database } from './types/database';
