import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { MESSAGES } from '../data/messages'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, isDemoMode } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signUp(email, password, displayName)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/onboarding')
  }

  return (
    <div className="min-h-dvh paper-texture flex flex-col">
      <div className="halftone-bg px-6 py-6 text-center">
        <Link to="/" className="text-white/70 text-sm font-semibold hover:text-white">
          ← VIS
        </Link>
        <h1 className="text-2xl font-extrabold text-white mt-2">{MESSAGES.registerTitle}</h1>
        <p className="text-white/70 text-sm">{MESSAGES.registerSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-8 max-w-lg mx-auto w-full flex flex-col gap-5">
        {isDemoMode && (
          <Alert type="info" message="Modo demo — prueba la app sin configurar Supabase." />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <Input
          label="Tu nombre"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="¿Cómo te llaman?"
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          minLength={6}
          required
        />

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? 'Creando...' : 'Empezar mi Segunda Mitad'}
        </Button>

        <p className="text-center text-sm text-ink-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-bold text-forest hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
