/// <reference path="./types/shims.d.ts" />

// Enums
export * from './enums/roles.enum';
export * from './enums/age-group.enum';
export * from './enums/program-status.enum';
export * from './enums/session-status.enum';

// Types
export * from './types/auth.types';
export * from './types/child.types';
export * from './types/family.types';
export * from './types/program.types';
export * from './types/user.types';

// Validation (Zod)
export * from './validation/family.schema';
export * from './validation/program.schema';
export * from './validation/user.schema';

// Supabase client
export { supabaseClient } from './lib/supabase';

// Hooks
export { useProfile } from './hooks/useProfile';
export type { UserProfile, UpdateProfilePayload } from './hooks/useProfile';
export { useMessages } from './hooks/useMessages';
export { useConversations } from './hooks/useConversations';
export { useAnalytics } from './hooks/useAnalytics';
export { usePrograms } from './hooks/usePrograms';
export { useSessions } from './hooks/useSessions';
export { useChildren } from './hooks/useChildren';
export { useFamily } from './hooks/useFamily';
export { useBadges } from './hooks/useBadges';
export { useQuestionnaires } from './hooks/useQuestionnaires';

// NB : NotificationService et useNotifications dépendent d'Expo / react-native.
// Côté mobile, les importer par sous-chemin :
//   import { NotificationService } from '@thrive/shared/src/services/NotificationService';
