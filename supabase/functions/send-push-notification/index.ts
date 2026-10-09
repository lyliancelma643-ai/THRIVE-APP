import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSentry, captureError } from "../_shared/sentry.ts";
import { constantTimeEqual } from "../_shared/billing_core.ts";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(withSentry("send-push-notification", async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Autorisation : service_role (jobs, webhooks DB) ou compte ADMIN/SUPER_ADMIN.
    // verify_jwt seul ne suffit pas : n'importe quel parent connecté pouvait
    // envoyer une notification au texte libre à n'importe quel utilisateur.
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
    // Comparaison à temps constant (audit P2-6) ; clé absente → jamais égale.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const isServiceRole = serviceKey.length > 0 && constantTimeEqual(token, serviceKey)
    if (!isServiceRole) {
      const { data: caller, error } = await supabase.auth.getUser(token)
      const role = caller?.user?.app_metadata?.role
      if (error || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
      }
    }

    const { user_id, title, body, data } = await req.json()

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
        // Loi 25 : aucun extrait de message ne transite par Expo/APNs/FCM.
        title: data?.conversation_id ? 'Nouveau message de votre coach' : title,
        body: data?.conversation_id ? undefined : body,
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
    await captureError(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}))
