import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendTelegramMessage, corsHeaders } from '../_shared/telegram.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!botToken) {
      return new Response(JSON.stringify({ error: 'Missing bot token' }), { status: 500 })
    }

    const update = await req.json()
    const message = update.message ?? update.edited_message
    if (!message?.text || !message.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const chatId = String(message.chat.id)
    const username = message.from?.username ?? null
    const text = String(message.text).trim()
    const admin = createClient(supabaseUrl, serviceKey)

    // /start LINKCODE or /start LINKCODE with payload
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/)
      const code = (parts[1] ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

      if (!code) {
        await sendTelegramMessage(
          botToken,
          chatId,
          '👋 Soy el bot de <b>VIS</b>.\n\nPara vincular tu cuenta:\n1. Abre la app VIS\n2. Ve a <b>Alertas</b>\n3. Toca el link o manda aquí el código que te da.',
        )
        return jsonOk()
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('user_id, display_name')
        .eq('telegram_link_code', code)
        .maybeSingle()

      if (!profile) {
        await sendTelegramMessage(
          botToken,
          chatId,
          '❌ Código no válido o expirado. Genera uno nuevo en VIS → Alertas.',
        )
        return jsonOk()
      }

      await admin
        .from('profiles')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          telegram_notify: true,
        })
        .eq('user_id', profile.user_id)

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ ¡Listo, <b>${escapeHtml(profile.display_name)}</b>!\n\nTu Telegram está vinculado a VIS.\nTe avisaré cuando tu pareja cumpla metas, elija premios o complete el día.\n\nComandos:\n/estado — tu resumen\n/silencio — pausar avisos\n/activar — reactivar avisos`,
      )
      return jsonOk()
    }

    if (text === '/silencio') {
      await admin
        .from('profiles')
        .update({ telegram_notify: false })
        .eq('telegram_chat_id', chatId)
      await sendTelegramMessage(botToken, chatId, '🔕 Avisos pausados. Usa /activar cuando quieras volver.')
      return jsonOk()
    }

    if (text === '/activar') {
      await admin
        .from('profiles')
        .update({ telegram_notify: true })
        .eq('telegram_chat_id', chatId)
      await sendTelegramMessage(botToken, chatId, '🔔 Avisos activados.')
      return jsonOk()
    }

    if (text === '/estado' || text === '/hoy') {
      const { data: profile } = await admin
        .from('profiles')
        .select('user_id, display_name')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (!profile) {
        await sendTelegramMessage(botToken, chatId, 'Primero vincula tu cuenta con /start CODIGO desde VIS.')
        return jsonOk()
      }

      const { data: stats } = await admin
        .from('user_stats')
        .select('total_points, streak, stars_earned, lives')
        .eq('user_id', profile.user_id)
        .maybeSingle()

      await sendTelegramMessage(
        botToken,
        chatId,
        `📊 <b>${escapeHtml(profile.display_name)}</b>\n` +
          `🏆 ${stats?.total_points ?? 0} pts\n` +
          `⭐ ${stats?.stars_earned ?? 0} estrellas\n` +
          `🔥 racha ${stats?.streak ?? 0}\n` +
          `❤️ vidas ${stats?.lives ?? 0}`,
      )
      return jsonOk()
    }

    await sendTelegramMessage(
      botToken,
      chatId,
      'Comandos: /start CODIGO · /estado · /silencio · /activar',
    )
    return jsonOk()
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

function jsonOk() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
