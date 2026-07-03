interface StarBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function StarBadge({ size = 'md', animate }: StarBadgeProps) {
  const sizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' }
  return (
    <span
      className={`inline-block ${sizes[size]} ${animate ? 'animate-star-burst' : ''}`}
      role="img"
      aria-label="Estrella"
    >
      ⭐
    </span>
  )
}

interface AngryFaceProps {
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function AngryFace({ size = 'md', animate }: AngryFaceProps) {
  const sizes = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' }
  return (
    <span
      className={`inline-block ${sizes[size]} ${animate ? 'animate-shake' : ''}`}
      role="img"
      aria-label="Cara enojada"
    >
      😤
    </span>
  )
}
