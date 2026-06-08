import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export interface NotificationLog {
  id: string
  recipient_id: string
  type: 'message' | 'badge' | 'session' | 'manual'
  title: string
  body: string
  data: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_at: string
}

export interface NotificationPrefs {
  messages: boolean
  badges: boolean
  sessions: boolean
}

interface UseNotificationsReturn {
  notifications: NotificationLog[]
  unreadCount: number
  prefs: NotificationPrefs
  loading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  updatePrefs: (newPrefs: Partial<NotificationPrefs>) => Promise<void>
  registerPushToken: (token: string) => Promise<void>
  sendManualNotification: (recipientId: string, title: string, body: string, data?: Record<string, unknown>) => Promise<void>
}

const DEFAULT_PREFS: NotificationPrefs = { messages: true, badges: true, sessions: true }

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.sent_at).length

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const [{ data: logs, error: logsErr }, { data: profile, error: profileErr }] =
        await Promise.all([
          supabase
            .from('notification_logs')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('profiles')
            .select('notification_prefs')
            .eq('id', userId)
            .single(),
        ])

      if (logsErr) throw logsErr
      if (profileErr) throw profileErr

      setNotifications(logs || [])
      setPrefs({ ...DEFAULT_PREFS, ...(profile?.notification_prefs || {}) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updatePrefs = useCallback(async (newPrefs: Partial<NotificationPrefs>) => {
    setError(null)
    try {
      const merged = { ...prefs, ...newPrefs }
      const { error: err } = await supabase
        .from('profiles')
        .update({ notification_prefs: merged })
        .eq('id', userId)
      if (err) throw err
      setPrefs(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur mise à jour préférences')
    }
  }, [userId, prefs])

  const registerPushToken = useCallback(async (token: string) => {
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ expo_push_token: token, notifications_enabled: true })
        .eq('id', userId)
      if (err) throw err
    } catch (e) {
      console.error('registerPushToken error:', e)
    }
  }, [userId])

  const sendManualNotification = useCallback(async (
    recipientId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {}
  ) => {
    setError(null)
    try {
      const { error: err } = await supabase.functions.invoke('send-push-notification', {
        body: { recipient_id: recipientId, title, body, data, type: 'manual' },
      })
      if (err) throw err
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
      throw e
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    prefs,
    loading,
    error,
    fetchNotifications,
    updatePrefs,
    registerPushToken,
    sendManualNotification,
  }
}
