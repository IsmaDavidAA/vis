import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendTelegramMessage, corsHeaders } from '../_shared/telegram.ts'

type NotifyType =
  | 'metrics_progress'
  | 'metrics_complete'
  | 'goal_completed'
  | 'goal_fail'
  | 'prize_collected'
  | 'streak'
  | 'lives_low'
  | 'partner_linked'
  | 'custom'

interface NotifyBody {
  type: NotifyType
  payload?: Record<string, unknown>
  event_key?: string
  /** If true, also notify the actor (self). Default: only partner */
  notify_self?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    if (!botToken) {
      return json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json()) as NotifyBody
    if (!body?.type) return json({ error: 'Missing type' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: actor } = await admin
      .from('profiles')
      .select('user_id, display_name, partner_user_id, telegram_chat_id, telegram_notify')
      .eq('user_id', user.id)
      .single()

    if (!actor) return json({ error: 'Profile not found' }, 404)

    const message = buildMessage(body.type, actor.display_name, body.payload ?? {})
    if (!message) return json({ error: 'Unknown type' }, 400)

    const eventKey =
      body.event_key ??
      `${body.type}:${new Date().toISOString().slice(0, 10)}:${JSON.stringify(body.payload ?? {})}`

    // Dedupe
    const { error: logError } = await admin.from('notification_log').insert({
      user_id: user.id,
      event_key: eventKey,
    })
    if (logError) {
      // unique violation = already sent
      if (logError.code === '23505') {
        return json({ ok: true, skipped: true })
      }
      console.error(logError)
    }

    const sent: string[] = []

    // Notify partner
    if (actor.partner_user_id) {
      const { data: partner } = await admin
        .from('profiles')
        .select('telegram_chat_id, telegram_notify, display_name')
        .eq('user_id', actor.partner_user_id)
        .maybeSingle()

      if (partner?.telegram_chat_id && partner.telegram_notify !== false) {
        const result = await sendTelegramMessage(botToken, partner.telegram_chat_id, message)
        if (result.ok) sent.push('partner')
      }
    }

    // Optional self notify
    if (body.notify_self && actor.telegram_chat_id && actor.telegram_notify !== false) {
      const result = await sendTelegramMessage(botToken, actor.telegram_chat_id, message)
      if (result.ok) sent.push('self')
    }

    return json({ ok: true, sent })
  } catch (err) {
    console.error(err)
    return json({ error: String(err) }, 500)
  }
})

function buildMessage(
  type: NotifyType,
  name: string,
  payload: Record<string, unknown>,
): string | null {
  const n = escapeHtml(name)
  const percent = Number(payload.percent ?? 0)
  const title = escapeHtml(String(payload.title ?? payload.goal_title ?? payload.prize_title ?? ''))
  const streak = Number(payload.streak ?? 0)
  const lives = Number(payload.lives ?? 0)

  switch (type) {
    case 'metrics_progress':
      return `📈 <b>${n}</b> va al <b>${percent}%</b> de sus métricas de hoy.`
    case 'metrics_complete':
      return `🏆 <b>${n}</b> completó <b>todas</b> sus métricas de hoy. ¡Día cerrado!`
    case 'goal_completed':
      return `⭐ <b>${n}</b> cumplió una meta:\n→ ${title || 'Meta del día'}`
    case 'goal_fail':
      return `😤 <b>${n}</b> marcó un fail${title ? ` en: ${title}` : ''}.\nVidas restantes: ${lives}`
    case 'prize_collected':
      return `🎁 <b>${n}</b> desbloqueó un premio:\n→ <b>${title}</b>\n\n${escapeHtml(String(payload.description ?? 'Premio doble — a cobrar.'))}`
    case 'streak':
      return `🔥 <b>${n}</b> lleva una racha de <b>${streak} días</b>.`
    case 'lives_low':
      return `⚠️ <b>${n}</b> se quedó con solo <b>${lives}</b> vida(s).`
    case 'partner_linked':
      return `🤝 <b>${n}</b> se vinculó contigo como pareja en VIS. ¡A competir con cariño!`
    case 'custom':
      return escapeHtml(String(payload.message ?? ''))
    default:
      return null
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
