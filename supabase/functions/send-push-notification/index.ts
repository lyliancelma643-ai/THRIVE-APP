import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushPayload {
  recipient_id: string
  title: string
  body: string
  data?: Record<string, unknown>
  type?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: PushPayload = await req.json()
    const { recipient_id, title, body, data = {}, type = 'manual' } = payload

    // Récupérer le token et les préférences du destinataire
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token, notifications_enabled, notification_prefs, full_name')
      .eq('id', recipient_id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
    }

    // Log dans notification_logs
    const { data: logEntry, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        recipient_id,
        type,
        title,
        body,
        data,
        status: 'pending',
      })
      .select()
      .single()

    if (logError) {
      console.error('Log error:', logError)
    }

    // Vérifier si les notifs sont activées
    if (!profile.notifications_enabled || !profile.expo_push_token) {
      // Mettre à jour le log comme skipped
      if (logEntry) {
        await supabase
          .from('notification_logs')
          .update({ status: 'failed', sent_at: new Date().toISOString() })
          .eq('id', logEntry.id)
      }
      return new Response(
        JSON.stringify({ skipped: true, reason: 'notifications_disabled_or_no_token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier les préférences par type
    const prefs = profile.notification_prefs || {}
    const typeMap: Record<string, string> = {
      message: 'messages',
      badge: 'badges',
      session: 'sessions',
      manual: 'manual',
    }
    const prefKey = typeMap[type]
    if (prefKey && prefs[prefKey] === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `preference_disabled_${prefKey}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Envoyer via Expo Push API
    const expoPayload = {
      to: profile.expo_push_token,
      title,
      body,
      data,
      sound: 'default',
      badge: 1,
    }

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(expoPayload),
    })

    const expoData = await expoRes.json()
    const ticket = expoData?.data
    const ticketId = ticket?.id
    const success = ticket?.status === 'ok'

    // Mettre à jour le log
    if (logEntry) {
      await supabase
        .from('notification_logs')
        .update({
          status: success ? 'sent' : 'failed',
          expo_ticket_id: ticketId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({ success, ticket }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-push-notification error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
