import { Pencil } from 'lucide-react'

export type ConfigurationEditArea = 'door-style' | 'sidelites' | 'door-finish' | 'glass-type' | 'hardware'

export function ConfigurationEditActions({ onEdit, hasGlass, visualizer = false }: {
  onEdit: (area: ConfigurationEditArea) => void
  hasGlass: boolean
  visualizer?: boolean
}) {
  const actions: { area: ConfigurationEditArea; label: string }[] = [
    { area: 'door-style', label: 'Door' },
    { area: 'sidelites', label: 'Sidelites' },
    { area: 'door-finish', label: 'Color' },
    { area: 'glass-type', label: 'Glass' },
    { area: 'hardware', label: 'Hardware' },
  ]
  return <section className={`configuration-edit-actions${visualizer ? ' configuration-edit-actions-visualizer' : ''}`} aria-label="Edit Configuration">
    <h3>{visualizer ? 'Edit your design' : 'Edit Configuration'}</h3>
    <div>{actions.map(({ area, label }) => <button type="button" key={area}
      aria-label={`Edit ${label}`} disabled={area === 'glass-type' && !hasGlass}
      title={area === 'glass-type' && !hasGlass ? 'This door style has no glass selection' : undefined}
      onClick={() => onEdit(area)}>{visualizer && <span className="configuration-edit-icon" aria-hidden="true"><Pencil size={12} strokeWidth={2} /></span>}{label}</button>)}</div>
  </section>
}
