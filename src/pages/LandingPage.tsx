import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { MESSAGES } from '../data/messages'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-dvh paper-texture flex flex-col">
      <div className="halftone-bg px-6 py-8 text-center">
        <h1 className="text-4xl font-extrabold text-white mb-1">VIS</h1>
        <p className="text-white/70 text-sm font-semibold">Tu segunda mitad, con dirección</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-lg mx-auto w-full gap-8">
        <div className="animate-slide-up">
          <p className="font-serif text-2xl font-bold text-ink leading-relaxed mb-4">
            {MESSAGES.mostPeople}
          </p>
          <p className="font-serif text-3xl font-bold text-forest mb-6">
            {MESSAGES.notYou}
          </p>
          <p className="text-ink-muted leading-relaxed">
            {MESSAGES.welcome}
          </p>
        </div>

        <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {user ? (
            <Link to="/dashboard">
              <Button fullWidth size="lg">Ir al dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button fullWidth size="lg">{MESSAGES.doJuly}</Button>
              </Link>
              <Link to="/login">
                <Button fullWidth size="lg" variant="secondary">
                  Ya tengo cuenta
                </Button>
              </Link>
        </>
          )}
        </div>

        <p className="text-center text-xs text-ink-muted italic">
          {MESSAGES.notPerfect}
        </p>
      </div>
    </div>
  )
}
