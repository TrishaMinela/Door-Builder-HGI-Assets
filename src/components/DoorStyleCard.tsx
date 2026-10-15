import { useId, useRef } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import type { DoorStyle } from '../types'
import { doorStyleDisplayName } from '../data/productDisplayNames'
import { doorLineChoicesForStyle } from '../data/productCatalog'
import { DoorStyleThumbnail } from './DoorStyleThumbnail'

/** Browsing presentation only; all selection/compatibility stays in the builder. */
export function DoorStyleCard({ style, selected, onSelect }: {
  style: DoorStyle
  selected: boolean
  onSelect: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const details = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const name = doorStyleDisplayName(style)
  const materials = doorLineChoicesForStyle(style).map(line => line.name)
  const close = () => dialog.current?.close()

  return <article className={`option-card door-catalog-card door-image-card${selected ? ' selected' : ''}`}
    onClick={event => { if (!(event.target as Element).closest('button,dialog')) onSelect() }}>
    <button type="button" className="door-image-select" aria-label={`Select ${name}`} aria-pressed={selected} onClick={onSelect}>
      <span className="option-visual"><DoorStyleThumbnail style={style}/></span>
      {selected && <span className="door-image-check" aria-hidden="true"><Check size={18}/></span>}
    </button>
    <div className="option-copy door-image-actions">
      <button ref={details} type="button" className="door-details-trigger" aria-label={`View details for ${name}`} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>View details<ChevronRight size={15} aria-hidden="true"/></button>
    </div>
    <dialog ref={dialog} className="door-details-dialog" aria-labelledby={titleId}
      onClose={() => details.current?.focus({ preventScroll: true })}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}>
      <div className="door-details-header"><button type="button" autoFocus aria-label="Close door details" onClick={close}><X size={20}/></button></div>
      <div className="door-details-body">
        <img className="door-details-image" src={style.image} alt={name}/>
        <h2 id={titleId}>{name}</h2>
        {style.description && <p>{style.description}</p>}
        {materials.length > 0 && <dl><dt>Available materials</dt><dd>{materials.join(', ')}</dd></dl>}
      </div>
      <div className="door-details-actions"><button type="button" disabled={selected} onClick={() => { onSelect(); close() }}>{selected ? 'Selected' : 'Select this door'}</button></div>
    </dialog>
  </article>
}
