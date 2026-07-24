import { Check } from 'lucide-react'
import type { GlassOption } from '../types'

type GlassOptionGroup = {
  key: string
  title: string
  options: GlassOption[]
}

type Props = {
  group: GlassOptionGroup
  selectedId: string
  onSelect: (group: GlassOptionGroup) => void
}

export function GlassOptionCard({ group, selectedId, onSelect }: Props) {
  const selectedOption = group.options.find((option) => option.id === selectedId)
  const displayOption = selectedOption ?? group.options[0]
  const selected = Boolean(selectedOption)

  return (
    <article className={`glass-choice-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="glass-card-main" onClick={() => onSelect(group)}>
        <span className="option-visual">
          {displayOption.thumbnailPath && <img className="glass-option-thumbnail" src={displayOption.thumbnailPath} alt={`${group.title} glass`} loading="lazy" decoding="async" />}
        </span>
        <span className="option-copy">
          <strong>{group.title}</strong>
        </span>
        <span className="check"><Check size={15} strokeWidth={3} /></span>
      </button>
    </article>
  )
}
