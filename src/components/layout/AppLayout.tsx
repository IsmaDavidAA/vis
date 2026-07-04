import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, Gift, Bell, LogOut } from 'lucide-react'
import { LifeBar, PointsBar } from '../ui/LifeBar'
import { useAuth } from '../../context/AuthContext'

export function Header() {
  const { stats, profile } = useAuth()

  return (
    <header className="app-bar sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-extrabold text-forest tracking-tight">VIS</h1>
            {profile && (
              <p className="text-xs text-ink-muted font-semibold">{profile.display_name}</p>
            )}
          </div>
          <PointsBar points={stats.total_points} streak={stats.streak} />
        </div>
        <LifeBar current={stats.lives} max={stats.max_lives} />
      </div>
    </header>
  )
}

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Inicio' },
  { to: '/metrics', icon: BarChart3, label: 'Métricas' },
  { to: '/prizes', icon: Gift, label: 'Premios' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
]

export function BottomNav() {
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <nav className="app-bar-bottom fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all
                ${active ? 'bg-forest text-white' : 'text-ink-muted hover:text-forest'}
              `}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-ink-muted hover:text-forest cursor-pointer"
        >
          <LogOut size={22} />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </div>
    </nav>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh paper-texture pb-20">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  )
}
