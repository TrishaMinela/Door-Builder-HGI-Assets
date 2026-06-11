import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  eyebrow?: string
  selected: boolean
  onClick: () => void
  visual: ReactNode
}

export function OptionCard({ title, description, eyebrow, selected, onClick, visual }: Props) {
  return (
    <button type="button" className={`option-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="option-visual">{visual}</span>
      <span className="option-copy">
        {eyebrow && <small>{eyebrow}</small>}
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className="check"><Check size={15} strokeWidth={3} /></span>
    </button>
  )
}
