export type VisualizationImageSource = string | Blob

export type SaveVisualizationResult =
  | { method: 'download'; filename: string }
  | { method: 'share'; filename: string }
  | { method: 'cancelled'; filename: string }
  | { method: 'fallback'; filename: string; imageUrl: string; revoke: () => void }

type SaveEnvironment = {
  navigator: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & Partial<Pick<Navigator, 'share' | 'canShare'>>
  document: Pick<Document, 'createElement' | 'body'>
  fetch: typeof fetch
  createObjectURL: typeof URL.createObjectURL
  revokeObjectURL: typeof URL.revokeObjectURL
  scheduleCleanup: (callback: () => void, delay: number) => unknown
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function defaultEnvironment(): SaveEnvironment {
  return {
    navigator: window.navigator,
    document: window.document,
    fetch: window.fetch.bind(window),
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
    scheduleCleanup: window.setTimeout.bind(window),
  }
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

function assertSupportedImage(blob: Blob) {
  const mimeType = blob.type.toLowerCase()
  if (!IMAGE_MIME_TYPES.has(mimeType) || blob.size === 0) {
    throw new Error('The completed visualization image is unavailable. Please try generating it again.')
  }
}

export function imageDataUrlToBlob(source: string) {
  const match = source.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!match) throw new Error('The completed visualization image could not be read.')
  const decoded = globalThis.atob(match[2].replace(/\s/g, ''))
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index)
  const blob = new Blob([bytes], { type: match[1].toLowerCase() })
  assertSupportedImage(blob)
  return blob
}

export async function visualizationSourceToBlob(
  source: VisualizationImageSource,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
) {
  if (source instanceof Blob) {
    assertSupportedImage(source)
    return source
  }
  if (source.startsWith('data:')) return imageDataUrlToBlob(source)

  let response: Response
  try {
    response = await fetchImpl(source, { credentials: 'omit', mode: 'cors' })
  } catch {
    throw new Error('The completed visualization could not be downloaded from its image host.')
  }
  if (!response.ok) throw new Error('The completed visualization is no longer available. Please generate it again.')
  const blob = await response.blob()
  assertSupportedImage(blob)
  return blob
}

function isMobileSaveContext(navigatorObject: SaveEnvironment['navigator']) {
  return navigatorObject.maxTouchPoints > 0 && /Android|iPad|iPhone|iPod|Mobile/i.test(navigatorObject.userAgent)
}

function isShareCancellation(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function saveVisualizationImage(
  source: VisualizationImageSource,
  options: { filenameBase?: string; environment?: SaveEnvironment } = {},
): Promise<SaveVisualizationResult> {
  const environment = options.environment ?? defaultEnvironment()
  const blob = await visualizationSourceToBlob(source, environment.fetch)
  const filename = `${options.filenameBase ?? 'hgi-door-visualization'}.${extensionForMimeType(blob.type)}`
  const file = new File([blob], filename, { type: blob.type, lastModified: Date.now() })

  if (isMobileSaveContext(environment.navigator)) {
    const sharePayload = { files: [file], title: 'HGI Door Visualization' }
    if (environment.navigator.share && environment.navigator.canShare?.(sharePayload)) {
      try {
        await environment.navigator.share(sharePayload)
        return { method: 'share', filename }
      } catch (error) {
        if (isShareCancellation(error)) return { method: 'cancelled', filename }
        // Fall through to the on-page touch-and-hold save experience.
      }
    }

    const imageUrl = environment.createObjectURL(blob)
    let revoked = false
    return {
      method: 'fallback',
      filename,
      imageUrl,
      revoke: () => {
        if (revoked) return
        revoked = true
        environment.revokeObjectURL(imageUrl)
      },
    }
  }

  const objectUrl = environment.createObjectURL(blob)
  try {
    const link = environment.document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.rel = 'noopener'
    environment.document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // Delay cleanup until the browser has consumed the synthetic click.
    environment.scheduleCleanup(() => environment.revokeObjectURL(objectUrl), 30_000)
  }
  return { method: 'download', filename }
}
