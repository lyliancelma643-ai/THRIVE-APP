import { Platform, Share } from 'react-native';

/**
 * « Copier la phrase » : presse-papiers du navigateur sur le web ; sur mobile, expo-clipboard n'est pas installé
 * dans l'app, on ouvre donc la feuille de partage du système (qui propose « Copier »).
 */
export async function copyPhrase(text: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    if (Platform.OS === 'web') {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
      if (nav?.clipboard) {
        await nav.clipboard.writeText(text);
        return 'copied';
      }
      return 'failed';
    }
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Retire les guillemets français déjà présents pour ne jamais les doubler à l'affichage. */
export function stripQuotes(text: string): string {
  return text.replace(/^\s*«\s*/, '').replace(/\s*»\s*$/, '');
}
