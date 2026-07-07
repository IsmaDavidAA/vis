import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface ConfirmDeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmPhrase: string
  busy?: boolean
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmPhrase,
  busy = false,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  const normalized = typed.trim().toLowerCase()
  const expected = confirmPhrase.trim().toLowerCase()
  const canConfirm = normalized === expected && !busy

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border-2 border-red-300">
          <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 leading-snug">{message}</p>
        </div>

        <p className="text-xs text-ink-muted">
          Para confirmar, escribe exactamente:{' '}
          <code className="font-bold text-ink bg-paper-dark px-1.5 py-0.5 rounded">
            {confirmPhrase}
          </code>
        </p>

        <Input
          label="Confirmación"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmPhrase}
          autoComplete="off"
          autoFocus
        />

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {busy ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
