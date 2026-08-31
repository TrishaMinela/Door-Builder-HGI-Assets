import type { ContactForm } from '../types'

type Props = {
  values: ContactForm
  errors: Partial<Record<keyof ContactForm, string>>
  onChange: (key: keyof ContactForm, value: string) => void
}

const fields: { key: keyof ContactForm; label: string; type?: string; placeholder: string; autoComplete: string; wide?: boolean; multiline?: boolean }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Jane Smith', autoComplete: 'name', wide: true },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 123-4567', autoComplete: 'tel' },
  { key: 'zip', label: 'ZIP code', placeholder: '44101', autoComplete: 'postal-code', wide: true },
  { key: 'notes', label: 'Notes', placeholder: 'Add any details you would like us to know.', autoComplete: 'off', wide: true, multiline: true },
]

export function QuoteForm({ values, errors, onChange }: Props) {
  return (
    <div className="quote-fields">
      {fields.map((field) => (
        <label key={field.key} className={field.wide ? 'field-wide' : ''}>
          <span>{field.label}</span>
          {field.multiline
            ? <textarea name={field.key} autoComplete={field.autoComplete} value={values[field.key]} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />
            : <input name={field.key} type={field.type ?? 'text'} autoComplete={field.autoComplete} value={values[field.key]} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />}
          {errors[field.key] && <small>{errors[field.key]}</small>}
        </label>
      ))}
    </div>
  )
}
