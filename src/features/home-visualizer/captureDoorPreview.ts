const CAPTURE_SCALE = 2
const SETTLE_INTERVAL = 120
const MAX_SETTLE_ATTEMPTS = 30

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

async function waitForRenderedAssets(root: HTMLElement) {
  let previousMarkup = ''
  let stablePasses = 0

  for (let attempt = 0; attempt < MAX_SETTLE_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, SETTLE_INTERVAL))
    await nextFrame()
    const images = Array.from(root.querySelectorAll('img'))
    const pending = images.some((image) => !image.complete)
    const failed = images.find((image) => image.complete && image.naturalWidth === 0)
    if (failed) throw new Error(`A configured door asset could not be loaded: ${failed.currentSrc || failed.src}`)
    if (pending) continue

    await Promise.all(images.map((image) => image.decode().catch(() => {
      if (!image.naturalWidth) throw new Error(`A configured door asset could not be decoded: ${image.currentSrc || image.src}`)
    })))

    const markup = root.innerHTML
    stablePasses = markup === previousMarkup ? stablePasses + 1 : 0
    previousMarkup = markup
    if (stablePasses >= 2) return
  }

  throw new Error('The configured door assets did not finish loading. Please retry.')
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('A configured door asset could not be read.'))
    reader.readAsDataURL(blob)
  })
}

async function assetAsDataUrl(url: string, cache: Map<string, Promise<string>>) {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  const absoluteUrl = new URL(url, window.location.href).href
  const cached = cache.get(absoluteUrl)
  if (cached) return cached
  const request = fetch(absoluteUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`A configured door asset could not be fetched: ${url}`)
      return response.blob()
    })
    .then(blobToDataUrl)
  cache.set(absoluteUrl, request)
  return request
}

async function inlineCssUrls(value: string, cache: Map<string, Promise<string>>) {
  const matches = Array.from(value.matchAll(/url\(["']?([^"')]+)["']?\)/g))
  let inlined = value
  for (const match of matches) {
    const source = match[1]
    const dataUrl = await assetAsDataUrl(source, cache)
    inlined = inlined.replace(match[0], `url("${dataUrl}")`)
  }
  return inlined
}

async function cloneWithComputedStyles(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))]
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  const assetCache = new Map<string, Promise<string>>()

  await Promise.all(sourceNodes.map(async (sourceNode, index) => {
    const cloneNode = cloneNodes[index]
    const computed = window.getComputedStyle(sourceNode)
    const declarations: string[] = []
    for (const property of Array.from(computed)) {
      const value = await inlineCssUrls(computed.getPropertyValue(property), assetCache)
      declarations.push(`${property}:${value};`)
    }
    cloneNode.setAttribute('style', declarations.join(''))
    if (sourceNode instanceof HTMLImageElement && cloneNode instanceof HTMLImageElement) {
      cloneNode.src = await assetAsDataUrl(sourceNode.currentSrc || sourceNode.src, assetCache)
      cloneNode.removeAttribute('srcset')
    }
  }))

  clone.style.transform = 'none'
  clone.style.transformOrigin = 'top left'
  return clone
}

export type CapturedDoorSource = {
  blob: Blob
  width: number
  height: number
}

function trimTransparentPixels(source: HTMLCanvasElement) {
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('The configured door image could not be inspected.')
  const pixels = context.getImageData(0, 0, source.width, source.height)
  let left = source.width
  let top = source.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      if (pixels.data[(y * pixels.width + x) * 4 + 3] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < left || bottom < top) throw new Error('The configured door source rendered empty.')
  const width = right - left + 1
  const height = bottom - top + 1
  if (left === 0 && top === 0 && width === source.width && height === source.height) return source
  const trimmed = document.createElement('canvas')
  trimmed.width = width
  trimmed.height = height
  const trimmedContext = trimmed.getContext('2d')
  if (!trimmedContext) throw new Error('The configured door image could not be trimmed.')
  trimmedContext.drawImage(source, left, top, width, height, 0, 0, width, height)
  source.width = 0
  source.height = 0
  return trimmed
}

type CaptureDoorPreviewOptions = {
  frameMode?: 'opening-only' | 'hidden' | 'visible'
  mimeType?: 'image/png' | 'image/webp'
  targetHeight?: number
  quality?: number
}

export async function captureDoorPreview(previewRoot: HTMLElement, options: CaptureDoorPreviewOptions = {}): Promise<CapturedDoorSource> {
  await waitForRenderedAssets(previewRoot)
  const frameMode = options.frameMode ?? 'opening-only'
  const frame = previewRoot.querySelector<HTMLElement>(`.door-frame[data-frame="${frameMode}"]`)
  if (!frame) throw new Error(`The configured ${frameMode} door assembly is unavailable.`)
  const mappedDoor = frame.querySelector('.mapped-preview-door')
  if (mappedDoor && !mappedDoor.querySelector('.door-finish-layer')) {
    throw new Error('The configured slab or finish asset did not finish loading. Please retry.')
  }
  const sidelites = Array.from(frame.querySelectorAll<HTMLElement>('.door-frame-sidelite-slot'))
    .filter((slot) => Boolean(slot.querySelector('.door-frame-sidelite')))
  if (sidelites.some((slot) => !slot.querySelector('.door-frame-sidelite-finish'))) {
    throw new Error('A configured sidelite finish asset did not finish loading. Please retry.')
  }

  const width = Math.ceil(Number.parseFloat(frame.style.width) || frame.offsetWidth)
  const height = Math.ceil(Number.parseFloat(frame.style.height) || frame.offsetHeight)
  if (!width || !height) throw new Error('The configured door assembly has invalid dimensions.')

  const clone = await cloneWithComputedStyles(frame)
  const serialized = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:transparent">${serialized}</div></foreignObject></svg>`
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width * CAPTURE_SCALE
  canvas.height = height * CAPTURE_SCALE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser could not create the configured door image.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.scale(CAPTURE_SCALE, CAPTURE_SCALE)
  context.drawImage(image, 0, 0, width, height)
  let outputCanvas = trimTransparentPixels(canvas)
  if (options.targetHeight && outputCanvas.height !== options.targetHeight) {
    const resized = document.createElement('canvas')
    resized.height = options.targetHeight
    resized.width = Math.max(1, Math.round(outputCanvas.width * options.targetHeight / outputCanvas.height))
    const resizedContext = resized.getContext('2d')
    if (!resizedContext) throw new Error('The configured door image could not be resized.')
    resizedContext.imageSmoothingEnabled = true
    resizedContext.imageSmoothingQuality = 'high'
    resizedContext.drawImage(outputCanvas, 0, 0, resized.width, resized.height)
    outputCanvas.width = 0
    outputCanvas.height = 0
    outputCanvas = resized
  }
  const mimeType = options.mimeType ?? 'image/png'
  const blob = await new Promise<Blob>((resolve, reject) => outputCanvas.toBlob((output) => output ? resolve(output) : reject(new Error('The configured door image could not be encoded.')), mimeType, options.quality))
  const output = { blob, width: outputCanvas.width, height: outputCanvas.height }
  outputCanvas.width = 0
  outputCanvas.height = 0
  return output
}
