import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Récupérer le token Expo
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token, notifications_enabled')
      .eq('id', user_id)
      .single()

    if (!profile?.expo_push_token || !profile.notifications_enabled) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    // Envoyer via Expo
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high',
      }),
    })

    const result = await res.json()

    // Logger le résultat
    await supabase.from('push_notification_logs').update({
      status: result.data?.status === 'ok' ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    }).eq('user_id', user_id).eq('status', 'pending')

    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
