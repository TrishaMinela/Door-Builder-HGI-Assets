import { useRef, type ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  eyebrow?: string
  selected: boolean
  onClick: () => void
  visual?: ReactNode
  badge?: ReactNode
  className?: string
  fullName?: string
}

export function OptionCard({ title, description, eyebrow, selected, onClick, visual, badge, className = '', fullName }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const content = <>
    {visual !== undefined && <span className="option-visual">
      {visual}
      {badge && <span className="option-badge">{badge}</span>}
    </span>}
    <span className="option-copy">
      {eyebrow && <small>{eyebrow}</small>}
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </span>
  </>
  const cardClass = `option-card ${className} ${selected ? 'selected' : ''}`.trim()
  if (fullName && fullName !== title) return (
    <div className={cardClass} onClick={event => { if (event.target === event.currentTarget) onClick() }}>
      <button type="button" className="option-card-select" aria-pressed={selected} onClick={onClick}>{content}</button>
      <button type="button" className="option-card-info" aria-label={`Full product name for ${title}`} onClick={() => dialog.current?.showModal()}>i</button>
      <dialog ref={dialog} className="option-name-dialog" aria-label="Full product name">
        <p>{fullName}</p>
        <button type="button" onClick={() => dialog.current?.close()}>Close</button>
      </dialog>
    </div>
  )
  return (
    <button type="button" className={cardClass} aria-pressed={selected} onClick={onClick}>{content}</button>
  )
}
