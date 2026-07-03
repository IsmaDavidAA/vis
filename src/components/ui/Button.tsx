import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-forest text-white hover:bg-forest-light active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  secondary: 'bg-white text-ink hover:bg-paper-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  ghost: 'bg-transparent text-ink hover:bg-paper-dark border-transparent shadow-none',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg font-bold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-bold
        cartoon-border transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0
        ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
