import { useEffect, useState } from 'react'
import { Bell, Link2, Unlink, ExternalLink, Copy, Check } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import {
  getTelegramBotUsername,
  getTelegramStartLink,
  notifyPartner,
} from '../lib/telegram'

const NOTIFY_EVENTS = [
  { icon: '📈', title: 'Progreso de métricas', desc: 'Al llegar al 50%, 70% o 100% del día' },
  { icon: '🏆', title: 'Día completo', desc: 'Cuando llena todas sus métricas' },
  { icon: '⭐', title: 'Meta cumplida', desc: 'Cuando un amigo confirma que cumpliste una meta' },
  { icon: '😤', title: 'Fail / vidas', desc: 'Cuando marca “No” o le quedan pocas vidas' },
  { icon: '🎁', title: 'Premio desbloqueado', desc: 'Qué figurita eligió tu pareja' },
  { icon: '🔥', title: 'Racha', desc: 'Hitos de racha (7, 14, 30 días)' },
  { icon: '⏰', title: 'Recordatorio diario', desc: 'Si aún no cerró el día (cron)' },
]

export function AlertsPage() {
  const { user, profile, isDemoMode, refreshProfile } = useAuth()
  const [linkCode, setLinkCode] = useState(profile?.telegram_link_code ?? '')
  const [partnerCode, setPartnerCode] = useState('')
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const botUsername = getTelegramBotUsername()
  const linked = Boolean(profile?.telegram_chat_id)
  const startLink = linkCode ? getTelegramStartLink(linkCode) : ''

  useEffect(() => {
    async function init() {
      if (!user || isDemoMode || !profile) return
      const code = await api.ensureTelegramLinkCode(user.id, profile.telegram_link_code)
      setLinkCode(code)
      if (profile.partner_user_id) {
        const partner = await api.getPartnerProfile(profile.partner_user_id)
        setPartnerName(partner?.display_name ?? 'Pareja')
      } else {
        setPartnerName(null)
      }
    }
    init()
  }, [user, profile, isDemoMode])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUnlinkTelegram = async () => {
    if (!user) return
    setBusy(true)
    const { error } = await api.unlinkTelegram(user.id)
    setBusy(false)
    if (error) setAlert({ type: 'error', message: error })
    else {
      await refreshProfile()
      setAlert({ type: 'success', message: 'Telegram desvinculado' })
    }
  }

  const handleToggleNotify = async () => {
    if (!user || !profile) return
    const next = !(profile.telegram_notify !== false)
    const { error } = await api.setTelegramNotify(user.id, next)
    if (error) setAlert({ type: 'error', message: error })
    else {
      await refreshProfile()
      setAlert({ type: 'success', message: next ? 'Avisos activados' : 'Avisos pausados' })
    }
  }

  const handleLinkPartner = async () => {
    if (!user || !partnerCode.trim()) return
    setBusy(true)
    const { error, partnerName: name } = await api.linkPartnerByCode(user.id, partnerCode)
    setBusy(false)
    if (error) {
      setAlert({ type: 'error', message: error })
      return
    }
    await refreshProfile()
    setPartnerName(name ?? 'Pareja')
    setPartnerCode('')
    await notifyPartner('partner_linked', {}, `partner_linked:${user.id}`)
    setAlert({ type: 'success', message: `Vinculado con ${name}` })
  }

  const handleUnlinkPartner = async () => {
    if (!user) return
    setBusy(true)
    await api.unlinkPartner(user.id, profile?.partner_user_id)
    setBusy(false)
    setPartnerName(null)
    await refreshProfile()
    setAlert({ type: 'info', message: 'Pareja desvinculada' })
  }

  if (isDemoMode) {
    return (
      <AppLayout>
        <Alert
          type="info"
          message="Las alertas de Telegram requieren Supabase. Configura tu .env y vuelve a entrar."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Alertas</h1>
          <p className="text-sm text-ink-muted">
            Telegram sin VPS: avisos a tu pareja cuando cumplas, falles o elijas premios.
          </p>
        </div>

        {alert && (
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}

        {!botUsername && (
          <Alert
            type="warning"
            message="Falta VITE_TELEGRAM_BOT_USERNAME en .env (nombre del bot sin @)."
          />
        )}

        {/* Connect Telegram */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-forest" />
            <h2 className="font-bold text-ink">1. Conectar Telegram</h2>
          </div>

          {linked ? (
            <div className="flex flex-col gap-3">
              <Alert
                type="success"
                message={`Vinculado${profile?.telegram_username ? ` (@${profile.telegram_username})` : ''}`}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleToggleNotify}>
                  {profile?.telegram_notify === false ? 'Activar avisos' : 'Pausar avisos'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleUnlinkTelegram} disabled={busy}>
                  <Unlink size={14} /> Desvincular
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Abre el bot y pulsa Start, o manda el código:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-paper-dark px-3 py-2 rounded-xl font-extrabold tracking-widest text-center">
                  {linkCode || '…'}
                </code>
                <Button size="sm" variant="secondary" onClick={() => handleCopy(linkCode)}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
              {startLink && (
                <a href={startLink} target="_blank" rel="noreferrer">
                  <Button fullWidth>
                    <ExternalLink size={16} /> Abrir bot en Telegram
                  </Button>
                </a>
              )}
              <p className="text-xs text-ink-muted">
                En el bot: <code>/start {linkCode}</code>
              </p>
              <Button size="sm" variant="ghost" onClick={() => refreshProfile()}>
                Ya lo vinculé — actualizar
              </Button>
            </div>
          )}
        </Card>

        {/* Partner */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={18} className="text-forest" />
            <h2 className="font-bold text-ink">2. Vincular pareja</h2>
          </div>
          <p className="text-xs text-ink-muted mb-3">
            Usa el código de compartir o el código de Telegram de la otra persona. Así se avisan entre ustedes.
          </p>

          {partnerName ? (
            <div className="flex flex-col gap-3">
              <Alert type="success" message={`Pareja: ${partnerName}`} />
              <Button size="sm" variant="ghost" onClick={handleUnlinkPartner} disabled={busy}>
                Desvincular pareja
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-ink-muted">Tu código (dale este a tu pareja):</p>
              <code className="bg-paper-dark px-3 py-2 rounded-xl font-extrabold tracking-widest text-center block">
                {profile?.share_code || linkCode || '—'}
              </code>
              <Input
                label="Código de tu pareja"
                placeholder="ABC123"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              />
              <Button onClick={handleLinkPartner} disabled={busy || partnerCode.length < 4}>
                Vincular
              </Button>
            </div>
          )}
        </Card>

        {/* What gets notified */}
        <Card>
          <h2 className="font-bold text-ink mb-3">Qué se notifica</h2>
          <div className="flex flex-col gap-2">
            {NOTIFY_EVENTS.map((e) => (
              <div key={e.title} className="flex items-start gap-2 py-1">
                <span className="text-lg">{e.icon}</span>
                <div>
                  <p className="text-sm font-bold text-ink">{e.title}</p>
                  <p className="text-xs text-ink-muted">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
