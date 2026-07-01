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
  onSelect: (option: GlassOption) => void
}

function optionLabel(option: GlassOption, fallback: string) {
  return option.name.includes(' - ') ? option.name.split(' - ')[1] : fallback
}

export function GlassOptionCard({ group, selectedId, onSelect }: Props) {
  const selectedOption = group.options.find((option) => option.id === selectedId)
  const displayOption = selectedOption ?? group.options[0]
  const selected = Boolean(selectedOption)
  const hasVariants = group.options.length > 1

  return (
    <article className={`glass-choice-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="glass-card-main" onClick={() => onSelect(displayOption)}>
        <span className="option-visual">
          <img className="glass-option-thumbnail" src={displayOption.thumbnailPath} alt={`${group.title} glass`} loading="lazy" decoding="async" />
        </span>
        <span className="option-copy">
          <strong>{group.title}</strong>
          {hasVariants && <span>{optionLabel(displayOption, group.title)}</span>}
        </span>
        <span className="check"><Check size={15} strokeWidth={3} /></span>
      </button>
      {hasVariants && <div className="glass-caming-options" role="group" aria-label={`${group.title} glass options`}>
        {group.options.map((option) => <button type="button" className={option.id === selectedId ? 'selected' : ''} aria-pressed={option.id === selectedId} title={optionLabel(option, group.title)} key={option.id} onClick={() => onSelect(option)}><span>{optionLabel(option, group.title)}</span></button>)}
      </div>}
    </article>
  )
}
