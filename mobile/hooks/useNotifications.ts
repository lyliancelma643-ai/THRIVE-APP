import { useState, useEffect, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function useNotifications() {
  const { user } = useAuth()
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const registerToken = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    setPermissionGranted(true)

    const tokenData = await Notifications.getExpoPushTokenAsync()
    if (user && tokenData.data) {
      await supabase
        .from('profiles')
        .update({ expo_push_token: tokenData.data, notifications_enabled: true })
        .eq('id', user.id)
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'THRIVE',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
  }, [user])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('push_notification_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setUnreadCount(data?.filter((n) => n.status === 'sent').length || 0)
  }, [user])

  useEffect(() => {
    registerToken()
    loadNotifications()
  }, [registerToken, loadNotifications])

  return { permissionGranted, notifications, unreadCount, reload: loadNotifications }
}
