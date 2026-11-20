const US_ZIP_PATTERN = /^(\d{5})(?:-\d{4})?$/

/**
 * Accept a 5-digit US ZIP or ZIP+4 and return the 5-digit form.
 * The result is a string, so leading zeros stay intact.
 * Returns null when the value is not a US ZIP.
 */
export function normalizeUsZip(value: string): string | null {
  const match = US_ZIP_PATTERN.exec(value.trim())
  return match ? match[1] : null
}

/**
 * Main HGI submissions store the 5-digit ZIP.
 * A dealer-slug submission keeps the trimmed customer value, including ZIP+4.
 */
export function postalCodeForSubmission(zip: string, dealerSlug: string | null | undefined): string {
  const trimmed = zip.trim()
  if (dealerSlug) return trimmed
  return normalizeUsZip(trimmed) ?? trimmed
}
