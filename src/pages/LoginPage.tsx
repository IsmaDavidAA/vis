import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { MESSAGES } from '../data/messages'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, isDemoMode } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-dvh paper-texture flex flex-col">
      <div className="halftone-bg px-6 py-6 text-center">
        <Link to="/" className="text-white/70 text-sm font-semibold hover:text-white">
          ← VIS
        </Link>
        <h1 className="text-2xl font-extrabold text-white mt-2">{MESSAGES.loginTitle}</h1>
        <p className="text-white/70 text-sm">{MESSAGES.loginSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-8 max-w-lg mx-auto w-full flex flex-col gap-5">
        {isDemoMode && (
          <Alert type="info" message="Modo demo activo — los datos se guardan en tu navegador." />
        )}
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

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
          placeholder="••••••••"
          required
        />

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <p className="text-center text-sm text-ink-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-bold text-forest hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  )
}
