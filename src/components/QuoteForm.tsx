import type { ContactForm } from '../types'

type TextField = 'fullName' | 'email' | 'phone' | 'zip'

type Props = {
  values: ContactForm
  errors: Partial<Record<keyof ContactForm, string>>
  onChange: (key: keyof ContactForm, value: string) => void
}

const fields: { key: TextField; label: string; type?: string; placeholder: string; autoComplete: string; wide?: boolean }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Jane Smith', autoComplete: 'name', wide: true },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '(555) 123-4567', autoComplete: 'tel' },
  { key: 'zip', label: 'ZIP code', placeholder: '44101', autoComplete: 'postal-code', wide: true },
]
const notesField = { key: 'notes' as const, label: 'Notes', placeholder: 'Add any details you would like us to know.', autoComplete: 'off' }

export function QuoteForm({ values, errors, onChange }: Props) {
  const answer = values.workingWithDealer === 'yes' || values.workingWithDealer === 'no' ? values.workingWithDealer : ''
  const chooseDealer = (next: 'yes' | 'no') => {
    onChange('workingWithDealer', next)
    if (next !== 'yes') onChange('dealerName', '')
  }

  return (
    <div className="quote-fields">
      {fields.map((field) => (
        <label key={field.key} className={field.wide ? 'field-wide' : ''}>
          <span>{field.label}</span>
          <input name={field.key} type={field.type ?? 'text'} autoComplete={field.autoComplete} value={values[field.key]} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} aria-invalid={!!errors[field.key]} />
          {errors[field.key] && <small>{errors[field.key]}</small>}
        </label>
      ))}
      <div className="field-wide dealer-question">
        <span id="working-with-dealer-label">Are you currently working with a dealer?</span>
        <div className="dealer-choice" role="radiogroup" aria-labelledby="working-with-dealer-label">
          {(['yes', 'no'] as const).map((option) => (
            <label key={option} className={answer === option ? 'active' : ''}>
              <input type="radio" name="workingWithDealer" value={option} checked={answer === option} onChange={() => chooseDealer(option)} />
              {option === 'yes' ? 'Yes' : 'No'}
            </label>
          ))}
        </div>
      </div>
      {answer === 'yes' && (
        <label className="field-wide" htmlFor="dealer-name">
          <span>Dealer name</span>
          <input id="dealer-name" name="dealerName" autoComplete="organization" value={values.dealerName ?? ''} placeholder="Name of dealer" onChange={(e) => onChange('dealerName', e.target.value)} />
        </label>
      )}
      <label className="field-wide">
        <span>{notesField.label}</span>
        <textarea name={notesField.key} autoComplete={notesField.autoComplete} value={values.notes} placeholder={notesField.placeholder} onChange={(e) => onChange(notesField.key, e.target.value)} aria-invalid={!!errors.notes} />
        {errors.notes && <small>{errors.notes}</small>}
      </label>
    </div>
  )
}
