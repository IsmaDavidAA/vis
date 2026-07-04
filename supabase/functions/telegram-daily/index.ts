import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendTelegramMessage, corsHeaders } from '../_shared/telegram.ts'

/**
 * Cron diario: recuerda a quien no ha marcado nada hoy,
 * y avisa a la pareja del progreso parcial.
 * Programar en Dashboard → Edge Functions → Schedules
 * o con pg_cron llamando a esta función.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  // Optional: protect with a secret header for cron
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const header = req.headers.get('x-cron-secret')
    if (header !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Missing bot token' }), { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const today = new Date().toISOString().slice(0, 10)

  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, display_name, telegram_chat_id, telegram_notify, partner_user_id')
    .eq('telegram_notify', true)
    .not('telegram_chat_id', 'is', null)

  let sent = 0

  for (const profile of profiles ?? []) {
    const eventKey = `daily_reminder:${today}`
    const { error: logError } = await admin.from('notification_log').insert({
      user_id: profile.user_id,
      event_key: eventKey,
    })
    if (logError?.code === '23505') continue

    const { count: metricCount } = await admin
      .from('user_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
      .eq('active', true)

    const { data: entries } = await admin
      .from('metric_entries')
      .select('metric_id, value')
      .eq('user_id', profile.user_id)
      .eq('date', today)

    const doneToday = (entries ?? []).filter((e) => e.value >= 1).length
    const total = metricCount ?? 0

    if (total === 0) continue
    if (doneToday >= total) continue

    const percent = Math.round((doneToday / total) * 100)
    const msg =
      `⏰ <b>Recordatorio VIS</b>\n\n` +
      `Hola ${escapeHtml(profile.display_name)}, hoy vas al <b>${percent}%</b> ` +
      `(${doneToday}/${total} métricas).\n\n` +
      `Cierra el día. Diciembre se construye ahora.`

    const result = await sendTelegramMessage(botToken, profile.telegram_chat_id, msg)
    if (result.ok) sent++

    // Partner nudge if progress is low
    if (profile.partner_user_id && percent < 50) {
      const { data: partner } = await admin
        .from('profiles')
        .select('telegram_chat_id, telegram_notify')
        .eq('user_id', profile.partner_user_id)
        .maybeSingle()

      if (partner?.telegram_chat_id && partner.telegram_notify !== false) {
        const partnerKey = `daily_partner_nudge:${today}:${profile.user_id}`
        const { error: pLog } = await admin.from('notification_log').insert({
          user_id: profile.user_id,
          event_key: partnerKey,
        })
        if (!pLog) {
          await sendTelegramMessage(
            botToken,
            partner.telegram_chat_id,
            `👀 <b>${escapeHtml(profile.display_name)}</b> aún va al ${percent}% hoy. Un empujoncito no estaría mal.`,
          )
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
