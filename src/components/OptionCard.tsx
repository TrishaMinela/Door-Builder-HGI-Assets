import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  eyebrow?: string
  selected: boolean
  onClick: () => void
  visual?: ReactNode
  badge?: ReactNode
  className?: string
}

export function OptionCard({ title, description, eyebrow, selected, onClick, visual, badge, className = '' }: Props) {
  return (
    <button type="button" className={`option-card ${className} ${selected ? 'selected' : ''}`.trim()} onClick={onClick}>
      {visual !== undefined && <span className="option-visual">
        {visual}
        {badge && <span className="option-badge">{badge}</span>}
      </span>}
      <span className="option-copy">
        {eyebrow && <small>{eyebrow}</small>}
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className="check"><Check size={15} strokeWidth={3} /></span>
    </button>
  )
}
