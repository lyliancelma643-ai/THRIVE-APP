import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { EventSubscription } from 'expo-modules-core';
import { supabaseClient as supabase } from '@thrive/shared';

// Configuration du comportement des notifications quand l'application est ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(async (token) => {
      setExpoPushToken(token);

      // Si un userId est fourni et qu'on a un token, on met à jour la base de données
      if (token && userId) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);
      }
    });

    // Écouteur quand une notification est reçue au premier plan
    notificationListener.current = Notifications.addNotificationReceivedListener((received) => {
      setNotification(received);
    });

    // Écouteur quand l'utilisateur tape sur la notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // TODO: Logique de navigation selon le type de notification (ex: router.push('/messages'))
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.warn('Push notifications : appareil physique requis.');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission notifications push refusée.');
    return undefined;
  }

  try {
    // projectId lu depuis app.json (extra.eas.projectId) — jamais en dur
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    // Ne pas logger la valeur du token (identifiant sensible de l'appareil)
    return data;
  } catch (e) {
    console.warn('Erreur récupération token push:', e);
    return undefined;
  }
}
