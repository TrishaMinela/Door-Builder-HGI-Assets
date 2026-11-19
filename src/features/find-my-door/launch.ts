import type { ContactForm } from '../../types'
import { saveDoorBuilderDraft, type DoorBuilderDraftConfiguration } from '../../utils/doorBuilderDraft'

export const FIND_MY_DOOR_LAUNCH_KEY = 'hgi-find-my-door-launch'
export const FIND_MY_DOOR_CONTACT_KEY = 'hgi-find-my-door-contact'

export type FindMyDoorLaunch = { contact: ContactForm }

function emptyContact(): ContactForm {
  return { fullName: '', email: '', phone: '', zip: '', notes: '' }
}

function readContact(value: string | null): ContactForm {
  if (!value) return emptyContact()
  try {
    const parsed = JSON.parse(value) as Partial<ContactForm>
    const contact = emptyContact()
    for (const key of Object.keys(contact) as (keyof ContactForm)[]) {
      if (typeof parsed[key] === 'string') contact[key] = parsed[key]
    }
    return contact
  } catch {
    return emptyContact()
  }
}

/** Read on builder startup. Clear from an effect so a development double-render still sees the flag. */
export function readFindMyDoorLaunch(): FindMyDoorLaunch | null {
  try {
    if (sessionStorage.getItem(FIND_MY_DOOR_LAUNCH_KEY) !== '1') return null
    return { contact: readContact(sessionStorage.getItem(FIND_MY_DOOR_CONTACT_KEY)) }
  } catch {
    return null
  }
}

export function clearFindMyDoorLaunch() {
  try {
    sessionStorage.removeItem(FIND_MY_DOOR_LAUNCH_KEY)
    sessionStorage.removeItem(FIND_MY_DOOR_CONTACT_KEY)
  } catch {
    // Storage may be blocked. The in-memory launch still opens the builder.
  }
}

export function findMyDoorHref(dealerSlug: string | null) {
  return dealerSlug ? `/findmydoor?dealer=${encodeURIComponent(dealerSlug)}` : '/findmydoor'
}

export function launchBuilder(draft: DoorBuilderDraftConfiguration, contact: ContactForm, dealerSlug: string | null) {
  saveDoorBuilderDraft(draft)
  sessionStorage.setItem(FIND_MY_DOOR_LAUNCH_KEY, '1')
  sessionStorage.setItem(FIND_MY_DOOR_CONTACT_KEY, JSON.stringify(contact))
  window.location.assign(dealerSlug ? `/${dealerSlug}` : '/')
}
