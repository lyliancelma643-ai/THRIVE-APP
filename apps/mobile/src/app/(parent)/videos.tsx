import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassButton, Pill, RADIUS, SPACING, ThemedText, TAB_BAR_INSET, VignetteImage, useTheme } from '../../design';
import { VIDEO_SESSIONS_ENABLED } from '../../lib/featureFlags';

// O · Séances vidéo « Bientôt disponible » (tant que VIDEO_SESSIONS_ENABLED est faux).
// Préférence « Me prévenir » : stockée sur l'appareil seulement.
// [À COMPLÉTER] synchro serveur de la préférence (aucune table/notification existante pour l'ouverture des vidéos).
// [À COMPLÉTER] liste « Ce qui viendra » : les titres des 13 séances vidéo n'existent pas encore côté données.
export const VIDEO_NOTIFY_KEY = 'thrive.videoNotify';

export default function VideosScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VIDEO_NOTIFY_KEY)
      .then((v) => setNotify(v === '1'))
      .catch(() => {});
  }, []);

  const toggle = (next: boolean) => {
    setNotify(next);
    AsyncStorage.setItem(VIDEO_NOTIFY_KEY, next ? '1' : '0').catch(() => {});
  };

  if (VIDEO_SESSIONS_ENABLED) {
    // [À COMPLÉTER] lecteur des séances vidéo (P, Q, R) : hors périmètre de ce lot.
    return null;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ padding: SPACING.space4, paddingTop: 72, paddingBottom: TAB_BAR_INSET + SPACING.space8 }}
    >
      <View
        style={{
          backgroundColor: colors.bgGrouped2,
          borderRadius: RADIUS.card,
          padding: SPACING.space5,
          alignItems: 'center',
          gap: SPACING.space3,
        }}
      >
        <VignetteImage
          id="ACT-1001"
          accessibilityLabel="Mascotte THRIVE avec la pellicule"
          style={{ width: 168, height: 168, borderRadius: RADIUS.card }}
        />
        <Pill label="En construction" tone="accent" />
        <ThemedText variant="title2" style={{ color: colors.label, textAlign: 'center' }} accessibilityRole="header">
          Les séances vidéo arrivent bientôt
        </ThemedText>
        <ThemedText variant="subheadline" style={{ color: colors.label2, textAlign: 'center' }}>
          On prépare les 13 séances de 20 minutes à vivre avec votre enfant. En attendant, les moments Maison sont là pour ce soir.
        </ThemedText>

        <View
          style={{
            alignSelf: 'stretch',
            minHeight: SPACING.rowMin,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: SPACING.space4,
            borderRadius: RADIUS.tile,
            backgroundColor: colors.bgGrouped3,
          }}
        >
          <ThemedText variant="body" style={{ color: colors.label, flex: 1 }}>Me prévenir à l’ouverture</ThemedText>
          <Switch
            value={notify}
            onValueChange={toggle}
            trackColor={{ true: colors.tint, false: colors.fill }}
            accessibilityRole="switch"
            accessibilityLabel="Me prévenir à l’ouverture des séances vidéo"
            accessibilityState={{ checked: notify }}
          />
        </View>

        <GlassButton
          label="Voir les moments de ce soir"
          icon="home"
          onPress={() => router.replace('/(parent)/maison')}
          accessibilityLabel="Retourner aux moments de ce soir"
        />
      </View>
    </ScrollView>
  );
}
