import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabaseClient as supabase } from '@thrive/shared';

// Configuration du comportement des notifications quand l'application est ouverte
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

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
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      setNotification(notification);
    });

    // Écouteur quand l'utilisateur tape sur la notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      console.log('Notification response:', response);
      // TODO: Logique de navigation selon le type de notification (ex: router.push('/messages'))
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission not granted to get push token for push notification!');
      return;
    }
    
    try {
      const projectId = 'your-project-id'; // Normalement repris automatiquement si configuré dans app.json
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.log('Erreur récupération token push:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
