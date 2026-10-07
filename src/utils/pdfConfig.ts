export const configurationPdfName = 'Home Guard Door Configuration.pdf'

/** Keep each component readable and safe across desktop filesystems. */
export function sanitizePdfFilenameValue(value: unknown): string {
  if (typeof value !== 'string' || /^(undefined|null|\[object Object\])$/i.test(value.trim())) return ''
  const clean = value.normalize('NFKC').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  let result = ''
  for (const character of clean) {
    if (new TextEncoder().encode(result + character).length > 80) break
    result += character
  }
  return result.replace(/-+$/g, '')
}

export function configurationPdfDownloadName(
  style: { name?: unknown; code?: unknown } | null | undefined,
  finish: { name?: unknown; id?: unknown } | null | undefined,
  downloadedAt = new Date(),
): string {
  const styleName = sanitizePdfFilenameValue(style?.name) || sanitizePdfFilenameValue(style?.code) || 'Configuration'
  const colorName = sanitizePdfFilenameValue(finish?.name) || sanitizePdfFilenameValue(finish?.id) || 'Configuration'
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = `${downloadedAt.getFullYear()}${pad(downloadedAt.getMonth() + 1)}${pad(downloadedAt.getDate())}-${pad(downloadedAt.getHours())}${pad(downloadedAt.getMinutes())}`
  return `HGI-Door-${styleName}-${colorName}-${timestamp}.pdf`
}
