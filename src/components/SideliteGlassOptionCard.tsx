import type { SideliteGlassOption } from '../data/fslGlass'
import { glassSelectionThumbnail } from '../data/glassOptions'

type Props = {
  groupKey: string
  title: string
  options: SideliteGlassOption[]
  selectedId: string
  onSelect: (group: { key: string; title: string; options: SideliteGlassOption[] }) => void
}

export function SideliteGlassOptionCard({ groupKey, title, options, selectedId, onSelect }: Props) {
  const selectedOption = options.find((option) => option.id === selectedId)
  const displayOption = selectedOption ?? options[0]
  const selected = Boolean(selectedOption)
  const isClic = title.toLowerCase().startsWith('clic')
  const image = glassSelectionThumbnail(displayOption.name)
    ?? displayOption.asset
    ?? (displayOption.id === 'clear-grids' ? '/assets/grid-options/Internal Grids.png' : '/assets/glass/thumbnails/Clear-option.png')

  return (
    <article className={`glass-choice-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="glass-card-main" onClick={() => onSelect({ key: groupKey, title, options })}>
        <span className="option-visual">
          <img className={`glass-option-thumbnail${isClic ? ' clic-glass-thumbnail' : ''}`} src={image} alt={`${title} glass`} loading="lazy" decoding="async" />
        </span>
        <span className="option-copy">
          <strong>{title}</strong>
        </span>
      </button>
    </article>
  )
}
