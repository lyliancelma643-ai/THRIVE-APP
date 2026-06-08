import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '../supabaseClient'

// Configuration globale des notifs
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export class NotificationService {
  /**
   * Demande la permission et enregistre le token Expo push.
   * Retourne le token ou null si refusé / non dispo.
   */
  static async registerForPushNotifications(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device')
      return null
    }

    // Android: canal de notification
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'THRIVE Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied')
      return null
    }

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data

    // Sauvegarder dans Supabase
    await supabase
      .from('profiles')
      .update({ expo_push_token: token, notifications_enabled: true })
      .eq('id', userId)

    return token
  }

  /**
   * Planifie une notification locale (pour les rappels séances).
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: Record<string, unknown>
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    })
    return id
  }

  /**
   * Annule une notification planifiée.
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  }

  /**
   * Annule toutes les notifications planifiées.
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  /**
   * Remet le badge de l'app à zéro.
   */
  static async resetBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0)
  }

  /**
   * Écoute les notifications reçues en foreground.
   */
  static addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(handler)
  }

  /**
   * Écoute les taps sur les notifications.
   */
  static addNotificationResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(handler)
  }
}
