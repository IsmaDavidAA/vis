import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ label, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-xl bg-white text-ink
          cartoon-border-sm placeholder:text-ink-muted/50
          focus:outline-none focus:ring-2 focus:ring-forest-light/50
          transition-shadow ${className}
        `}
        {...props}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function TextArea({ label, hint, className = '', id, ...props }: TextAreaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-ink">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-xl bg-white text-ink min-h-[100px] resize-y
          cartoon-border-sm placeholder:text-ink-muted/50
          focus:outline-none focus:ring-2 focus:ring-forest-light/50
          transition-shadow ${className}
        `}
        {...props}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
