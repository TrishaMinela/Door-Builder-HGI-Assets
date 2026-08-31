import { doorConfigurationHingeOptionLabel, doorConfigurationLabel, doubleDoorLockPrepOption } from '../data/doorConfigurationRules'
import { hardwareDisplayName } from '../data/hardware'
import type { ContactForm, DoorConfiguration, GridConfiguration, SideliteGlassConfiguration } from '../types'

export type DoorBuilderSubmissionPayload = {
  submitted_at: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  postal_code: string
  notes: string
  door_configuration: string
  door_line: string
  door_style: string
  sidelite_placement: string
  sidelite_slab: string
  sidelite_glass: string
  main_door_glass: string
  door_finish_type: string
  door_finish_color: string
  jamb_type: string
  jamb_finish_type: string
  jamb_finish_color: string
  hardware: string
  lock_setup: string
  door_swing: string
  hinge_option: string
}

type SubmissionSource = {
  contact: ContactForm
  configuration: DoorConfiguration
  submittedAt?: string
}

const NOT_APPLICABLE = 'Not applicable'

function titleCase(value?: string | null) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : NOT_APPLICABLE
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

function readableDoorStyle(configuration: DoorConfiguration) {
  const code = configuration.style.code.trim()
  const name = configuration.style.name.trim()
  if (!name || name.toLowerCase().startsWith(code.toLowerCase())) return name || code
  return `${code} - ${name}`
}

function gridDetails(grid?: GridConfiguration | null) {
  if (!grid || grid.gridLocation === 'No Grids') return ''
  return [grid.gridLocation, grid.gridStyle, grid.gridPattern, grid.gridColor, grid.gridWidth].filter(Boolean).join(' / ')
}

function readableMainGlass(configuration: DoorConfiguration) {
  const glass = configuration.mainDoorGlass ?? configuration.glass
  if (!glass) return NOT_APPLICABLE
  const details = gridDetails(configuration.grid)
  return details ? `${glass.name} — ${details}` : glass.name
}

function readableSideliteGlass(glass?: SideliteGlassConfiguration | null) {
  if (!glass) return NOT_APPLICABLE
  const details = [glass.gridLocation, glass.gridStyle, glass.gridPattern, glass.gridColor, glass.gridWidth].filter(Boolean).join(' / ')
  return details ? `${glass.glass} — ${details}` : glass.glass
}

function readableSidelitePlacement(configuration: DoorConfiguration) {
  const placement = configuration.sidelitePlacement ?? configuration.sidelites
  if (placement === 'both-sides') return 'Sidelites on Both Sides'
  if (placement === 'hinge-side') return 'Sidelite on Left'
  if (placement === 'lock-side') return 'Sidelite on Right'
  return 'No Sidelites'
}

export function buildDoorBuilderSubmissionPayload({ contact, configuration, submittedAt }: SubmissionSource): DoorBuilderSubmissionPayload {
  const { firstName, lastName } = splitName(contact.fullName)
  const configurationType = configuration.doorConfigurationType ?? 'single'
  const hasSidelites = (configuration.sidelitePlacement ?? configuration.sidelites) !== 'none'
  const lockSetup = configurationType === 'single'
    ? NOT_APPLICABLE
    : doubleDoorLockPrepOption(configuration.doubleDoorLockPrep)?.name ?? NOT_APPLICABLE

  return {
    submitted_at: submittedAt ?? new Date().toISOString(),
    first_name: firstName,
    last_name: lastName,
    full_name: contact.fullName.trim(),
    email: contact.email.trim(),
    phone: contact.phone.trim(),
    postal_code: contact.zip.trim(),
    notes: contact.notes.trim(),
    door_configuration: doorConfigurationLabel(configurationType),
    door_line: configuration.doorLine?.trim() || configuration.product.doorType || NOT_APPLICABLE,
    door_style: readableDoorStyle(configuration),
    sidelite_placement: readableSidelitePlacement(configuration),
    sidelite_slab: hasSidelites ? configuration.sideliteStyle?.trim() || NOT_APPLICABLE : NOT_APPLICABLE,
    sidelite_glass: hasSidelites ? readableSideliteGlass(configuration.sideliteGlass) : NOT_APPLICABLE,
    main_door_glass: readableMainGlass(configuration),
    door_finish_type: titleCase(configuration.doorFinishType ?? configuration.finish.finishType),
    door_finish_color: configuration.doorFinishColor?.trim() || configuration.finish.name,
    jamb_type: titleCase(configuration.jambType),
    jamb_finish_type: titleCase(configuration.jambFinishType),
    jamb_finish_color: configuration.jambFinishColor?.trim() || NOT_APPLICABLE,
    hardware: hardwareDisplayName(configuration.hardware),
    lock_setup: lockSetup,
    door_swing: configuration.doorSwing.name,
    hinge_option: doorConfigurationHingeOptionLabel(configurationType) ?? NOT_APPLICABLE,
  }
}

export type SubmissionResult = { message: string }

export async function submitQuote(payload: DoorBuilderSubmissionPayload): Promise<SubmissionResult> {
  const response = await fetch('/api/submit-door-builder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error("We couldn't submit your information. Please try again.")
  return { message: 'Your information and door configuration were submitted successfully.' }
}
