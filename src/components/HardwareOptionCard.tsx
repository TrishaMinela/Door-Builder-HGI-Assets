import { Check } from 'lucide-react'
import { finishSwatchAssetUrl, hardwareCardAssetUrl } from '../data/hardware'
import type { HardwareOption } from '../types'

type Props = {
  options: HardwareOption[]
  selectedId: string
  onSelect: (option: HardwareOption) => void
}

export function HardwareOptionCard({ options, selectedId, onSelect }: Props) {
  const selectedOption = options.find((option) => option.id === selectedId)
  const displayOption = selectedOption ?? options[0]
  const selected = Boolean(selectedOption)

  return (
    <article className={`hardware-option-card ${selected ? 'selected' : ''}`}>
      <button type="button" className="hardware-card-main" onClick={() => onSelect(displayOption)}>
        <span className="option-visual"><img className="hardware-card-image" src={hardwareCardAssetUrl(displayOption)} alt="" loading="lazy" decoding="async" /></span>
        <span className="option-copy">
          <small>{displayOption.manufacturer}</small>
          <strong>{displayOption.style}</strong>
          <span>Choose an available finish below.</span>
        </span>
        <span className="check"><Check size={15} strokeWidth={3} /></span>
      </button>
      <div className="hardware-finish-options" role="group" aria-label={`${displayOption.manufacturer} ${displayOption.style} finish`}>
        {options.map((option) => <button type="button" className={option.id === selectedId ? 'selected' : ''} aria-pressed={option.id === selectedId} title={option.finish} key={option.id} onClick={() => onSelect(option)}><img src={finishSwatchAssetUrl(option.finish)} alt="" /><span>{option.finish}</span></button>)}
      </div>
    </article>
  )
}
