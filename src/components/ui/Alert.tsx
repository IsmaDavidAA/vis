import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  onClose?: () => void
  icon?: ReactNode
}

const styles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
  warning: 'bg-amber-50 border-amber-400 text-amber-800',
}

const defaultIcons = {
  success: '⭐',
  error: '😤',
  info: '💡',
  warning: '⚠️',
}

export function Alert({ type, message, onClose, icon }: AlertProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl cartoon-border-sm
        animate-slide-up ${styles[type]}
      `}
      role="alert"
    >
      <span className="text-2xl shrink-0">{icon ?? defaultIcons[type]}</span>
      <p className="flex-1 text-sm font-bold">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer">
          <X size={18} />
        </button>
      )}
    </div>
  )
}
