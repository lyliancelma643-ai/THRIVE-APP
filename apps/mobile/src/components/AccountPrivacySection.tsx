import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabaseClient as supabase } from '@thrive/shared';
import { LEGAL } from '../services/legal';
import { useEntitlement } from '../hooks/useEntitlement';
import { deletionSubscriptionWarning } from '../services/subscription-logic';

// ─────────────────────────────────────────────────────────────────────────────
// Section « Confidentialité et compte » des écrans Profil.
//   • Liens vers la politique de confidentialité, les conditions et l'aide
//     (Apple 5.1.1(i) : politique accessible dans l'app).
//   • Suppression du compte initiée DEPUIS l'app (Apple 5.1.1(v), Google Play
//     « Account deletion ») : la demande est enregistrée par l'edge function
//     request-account-deletion, puis exécutée par admin-delete-user (cascade
//     complète). Le délai annoncé doit correspondre au processus réel.
// ─────────────────────────────────────────────────────────────────────────────

// Délai figé, identique à la politique de confidentialité (§6) : ne pas le
// modifier sans mettre les deux à jour.
const DELETION_DELAY = '30 jours';

function LinkRow({ label, url }: { label: string; url: string }) {
  if (!url) return null;
  return (
    <Pressable
      className="flex-row justify-between items-center py-4 border-b border-gray-100"
      // Pages web : navigateur in-app ; mailto:/tel: restent sur Linking.
      onPress={() => (/^https?:\/\//i.test(url) ? WebBrowser.openBrowserAsync(url) : Linking.openURL(url))}
      accessibilityRole="link"
    >
      <Text className="text-base">{label}</Text>
      <Text className="text-gray-400 text-lg">›</Text>
    </Pressable>
  );
}

export function AccountPrivacySection() {
  const ent = useEntitlement();
  const [deleting, setDeleting] = useState(false);

  const submitDeletion = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-account-deletion', {
        body: { reason: 'in_app_mobile' },
      });
      if (error) throw error;
      Alert.alert(
        'Demande enregistrée',
        (data?.message ? `${data.message}\n\n` : '') +
          `Votre compte et les données associées (profil, famille, enfants, bilans, messages) seront supprimés dans un délai de ${DELETION_DELAY}.`,
      );
    } catch {
      Alert.alert(
        'Demande impossible',
        'Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeletion = () => {
    const warning = ent.isSubscribed ? deletionSubscriptionWarning(ent.store, ent.willRenew, Platform.OS) : null;
    Alert.alert(
      'Supprimer mon compte et mes données ?',
      `Votre compte et toutes les données associées (profil, famille, enfants, bilans, messages) seront définitivement supprimés dans un délai de ${DELETION_DELAY}. Cette action est irréversible.${warning ? `\n\n${warning}` : ''}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer mon compte et mes données', style: 'destructive', onPress: submitDeletion },
      ],
    );
  };

  return (
    <View className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100 mb-4">
      <Text className="text-gray-500 text-sm pt-5 pb-1">Confidentialité et compte</Text>
      <LinkRow label="Politique de confidentialité" url={LEGAL.privacy} />
      <LinkRow label="Conditions d’utilisation" url={LEGAL.terms} />
      <LinkRow label="Aide et contact" url={LEGAL.support} />
      <Pressable
        className="py-4"
        onPress={confirmDeletion}
        disabled={deleting}
        accessibilityRole="button"
      >
        {deleting ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-base font-semibold text-red-600">Supprimer mon compte et mes données</Text>
        )}
      </Pressable>
    </View>
  );
}
