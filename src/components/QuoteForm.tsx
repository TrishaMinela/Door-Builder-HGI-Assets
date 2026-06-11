import type { ContactForm } from '../types'

type Props = {
  values: ContactForm
  errors: Partial<Record<keyof ContactForm, string>>
  onChange: (key: keyof ContactForm, value: string) => void
}

const fields: { key: keyof ContactForm; label: string; type?: string; placeholder: string; wide?: boolean }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Jane Smith', wide: true },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 123-4567' },
  { key: 'zip', label: 'ZIP code', placeholder: '44101', wide: true },
]

export function QuoteForm({ values, errors, onChange }: Props) {
  return (
    <div className="quote-fields">
      {fields.map((field) => (
        <label key={field.key} className={field.wide ? 'field-wide' : ''}>
          <span>{field.label}</span>
          <input type={field.type ?? 'text'} value={values[field.key]} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />
          {errors[field.key] && <small>{errors[field.key]}</small>}
        </label>
      ))}
    </div>
  )
}
