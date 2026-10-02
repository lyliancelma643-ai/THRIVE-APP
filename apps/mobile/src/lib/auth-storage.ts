import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lu par packages/shared/src/lib/supabase.ts à la création du client.
(globalThis as { __THRIVE_AUTH_STORAGE__?: unknown }).__THRIVE_AUTH_STORAGE__ = AsyncStorage;
