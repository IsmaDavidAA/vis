# VIS — Bot de Telegram (sin VPS)

Notificaciones a la pareja vía Telegram usando **Supabase Edge Functions**. No hace falta servidor propio.

## Eventos que se notifican

| Evento | Cuándo |
|--------|--------|
| Progreso 50% / 70% | Al marcar métricas del día |
| Día completo (100%) | Todas las métricas cumplidas |
| Meta cumplida | Botón “Cumplí” |
| Fail / vidas bajas | Botón “No” o ≤2 vidas |
| Premio desbloqueado | Elige una figurita (título + descripción) |
| Racha 7 / 14 / 30 | Al cumplir metas |
| Pareja vinculada | Al conectar códigos |
| Recordatorio diario | Cron (Edge Function `telegram-daily`) |

## 1. Crear el bot

1. Abre [@BotFather](https://t.me/BotFather) en Telegram.
2. `/newbot` → nombre y username (ej. `vis_segunda_mitad_bot`).
3. Copia el **token**.

## 2. SQL en Supabase

SQL Editor → ejecuta [`supabase/migrations/002_telegram.sql`](../supabase/migrations/002_telegram.sql).

## 3. Secrets en Supabase

**Project Settings → Edge Functions → Secrets** (o CLI):

| Secret | Valor |
|--------|--------|
| `TELEGRAM_BOT_TOKEN` | Token de BotFather |
| `CRON_SECRET` | (opcional) string largo para proteger el cron |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya existen en el runtime de Edge Functions.

## 4. Desplegar funciones

Con [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref adwmdjqqysnivtjudrhm

supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy telegram-notify
supabase functions deploy telegram-daily --no-verify-jwt
```

`telegram-webhook` y `telegram-daily` van **sin** JWT de usuario (Telegram y el cron no mandan sesión).

## 5. Webhook de Telegram

Sustituye `TU_PROJECT_REF` y el token:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://adwmdjqqysnivtjudrhm.supabase.co/functions/v1/telegram-webhook"
```

Comprueba:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 6. Frontend (.env)

```env
VITE_TELEGRAM_BOT_USERNAME=vis_segunda_mitad_bot
```

(Sin `@`. También en GitHub Actions secrets si despliegas Pages.)

## 7. Uso en la app

1. Ambos entran a **Alertas**.
2. Cada uno abre el bot (link o `/start CODIGO`).
3. Cada uno pega el **código de la otra persona** (share code o código Telegram) en “Vincular pareja”.
4. Al cumplir métricas / metas / premios, la pareja recibe el mensaje en Telegram.

## 8. Cron diario (opcional)

En Supabase Dashboard → **Edge Functions → Schedules**, o con `pg_cron`:

- Función: `telegram-daily`
- Horario: ej. `0 21 * * *` (UTC) → ajusta a tu zona
- Header: `x-cron-secret: <CRON_SECRET>` si lo configuraste

## Comandos del bot

| Comando | Efecto |
|---------|--------|
| `/start CODIGO` | Vincula cuenta VIS |
| `/estado` | Puntos, estrellas, racha, vidas |
| `/silencio` | Pausa avisos |
| `/activar` | Reactiva avisos |

## Arquitectura

```
VIS (Pages) → supabase.functions.invoke('telegram-notify')
                    ↓
            Edge Function (service role)
                    ↓
            Lee partner.telegram_chat_id
                    ↓
            api.telegram.org/sendMessage
```

Webhook:

```
Telegram → telegram-webhook → guarda telegram_chat_id en profiles
```
