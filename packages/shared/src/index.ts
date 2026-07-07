// NB : pas de référence à shims.d.ts ici — le shim (modules Expo déclarés en
// ambiant) écraserait les vrais types react-native/expo-notifications quand
// l'app mobile compile ce package depuis les sources. Il reste chargé par le
// build de ce package uniquement (via tsconfig "include": ["src"]).

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

// Types générés depuis le schéma Supabase (typage bout-en-bout des queries)
export type { Database, Json } from './types/database';

// Validation (Zod)
export * from './validation/family.schema';
export * from './validation/program.schema';
export * from './validation/user.schema';

// Supabase client
export { supabaseClient } from './lib/supabase';

// Hooks
export { useAuth } from './hooks/useAuth';
export type { AuthUser } from './hooks/useAuth';
export { useProfile } from './hooks/useProfile';
export type { UserProfile, UpdateProfilePayload } from './hooks/useProfile';
export { useMessages } from './hooks/useMessages';
export { useConversations } from './hooks/useConversations';
export { useAnalytics } from './hooks/useAnalytics';
export { usePrograms } from './hooks/usePrograms';
export { useSessions } from './hooks/useSessions';
export { useChildren } from './hooks/useChildren';
export { useFamily } from './hooks/useFamily';
export { useBadges, useChildBadges } from './hooks/useBadges';
export type { Badge, ChildBadge } from './hooks/useBadges';
export { useQuestionnaires } from './hooks/useQuestionnaires';

// NB : NotificationService et useNotifications dépendent d'Expo / react-native.
// Ils ne sont PAS exportés ici (l'index est consommé par le web) — côté mobile,
// les importer par sous-chemin :
//   import { NotificationService } from '@thrive/shared/services/NotificationService';
//   import { useNotifications } from '@thrive/shared/hooks/useNotifications';
