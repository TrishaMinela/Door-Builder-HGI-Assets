import { Check } from 'lucide-react'
import type { SideliteGlassOption } from '../data/fslGlass'
import { glassSelectionThumbnail } from '../data/glassOptions'

type Props = {
  title: string
  options: SideliteGlassOption[]
  selectedId: string
  onSelect: (id: string) => void
}

const variantLabel = (option: SideliteGlassOption) => option.name.split(/\s+[–-]\s+/)[1] ?? option.name

export function SideliteGlassOptionCard({ title, options, selectedId, onSelect }: Props) {
  const selectedOption = options.find((option) => option.id === selectedId)
  const displayOption = selectedOption ?? options[0]
  const selected = Boolean(selectedOption)
  const hasVariants = options.length > 1
  const isClic = title.toLowerCase().startsWith('clic')
  const image = glassSelectionThumbnail(displayOption.name)
    ?? displayOption.asset
    ?? (displayOption.id === 'clear-grids' ? '/assets/grid-options/Internal Grids.png' : '/assets/glass/thumbnails/Clear.png')

  return (
    <article className={`glass-choice-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="glass-card-main" onClick={() => onSelect(displayOption.id)}>
        <span className="option-visual">
          <img className={`glass-option-thumbnail${isClic ? ' clic-glass-thumbnail' : ''}`} src={image} alt={`${title} glass`} loading="lazy" decoding="async" />
        </span>
        <span className="option-copy">
          <strong>{title}</strong>
          {hasVariants && <span>{variantLabel(displayOption)}</span>}
        </span>
        <span className="check"><Check size={15} strokeWidth={3} /></span>
      </button>
      {hasVariants && <div className="glass-caming-options" role="group" aria-label={`${title} glass options`}>
        {options.map((option) => <button type="button" className={option.id === selectedId ? 'selected' : ''} aria-pressed={option.id === selectedId} title={variantLabel(option)} key={option.id} onClick={() => onSelect(option.id)}><span>{variantLabel(option)}</span></button>)}
      </div>}
    </article>
  )
}
