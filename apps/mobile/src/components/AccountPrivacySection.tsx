import React, { useState } from 'react';
import { View, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabaseClient as supabase } from '@thrive/shared';
import { LEGAL } from '../services/legal';
import { List, ListRow, Section, SectionFooter, SectionHeader, type IconName } from '../design';
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

function LinkRow({ label, url, glyph, color }: { label: string; url: string; glyph: IconName; color: 'sysTeal' | 'sysBlue' | 'sysIndigo' }) {
  if (!url) return null;
  // Pages web : navigateur in-app ; mailto:/tel: restent sur Linking.
  return (
    <ListRow
      glyph={glyph}
      iconColor={color}
      title={label}
      accessibilityLabel={label}
      onPress={() => (/^https?:\/\//i.test(url) ? WebBrowser.openBrowserAsync(url) : Linking.openURL(url))}
    />
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
    <>
      <SectionHeader small title="Données · hébergées au Canada" />
      <Section>
        <List>
          <LinkRow label="Confidentialité · Loi 25" url={LEGAL.privacy} glyph="document" color="sysTeal" />
          <LinkRow label="Conditions d’utilisation" url={LEGAL.terms} glyph="book" color="sysBlue" />
          <LinkRow label="Aide et contact" url={LEGAL.support} glyph="info" color="sysIndigo" />
          {deleting ? (
            <View style={{ minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : (
            <ListRow title="Supprimer mon compte et mes données" destructive last onPress={confirmDeletion} />
          )}
        </List>
        <SectionFooter>Le courriel et le mot de passe se changent avec ton coach ou l’équipe THRIVE.</SectionFooter>
      </Section>
    </>
  );
}
