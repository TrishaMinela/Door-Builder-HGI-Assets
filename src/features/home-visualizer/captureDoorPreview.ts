const CAPTURE_SCALE = 2
const SETTLE_INTERVAL = 120
const MAX_SETTLE_ATTEMPTS = 30

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function alphaCoverage(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { nonTransparentPixelCount: 0, coverageRatio: 0 }
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let nonTransparentPixelCount = 0
  for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] > 0) nonTransparentPixelCount += 1
  return { nonTransparentPixelCount, coverageRatio: nonTransparentPixelCount / Math.max(1, canvas.width * canvas.height) }
}

function cssUrl(value: string) {
  return value.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? ''
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`A configured door layer could not be rendered: ${src}`))
    image.src = src
  })
}

async function loadSvgImage(element: SVGSVGElement) {
  const markup = new XMLSerializer().serializeToString(element)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    return await loadCanvasImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function renderDoorLayers(frame: HTMLElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width * CAPTURE_SCALE
  canvas.height = height * CAPTURE_SCALE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser could not create the configured door image.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  const frameBounds = frame.getBoundingClientRect()
  const candidates = Array.from(frame.querySelectorAll<HTMLElement | SVGSVGElement>('*')).filter((element) => {
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
    if (element instanceof HTMLImageElement) return element.complete && element.naturalWidth > 0
    if (element instanceof SVGSVGElement) return true
    const color = style.backgroundColor
    return color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' || element.classList.contains('door-frame-sidelite-clear-glass')
  })

  for (const element of candidates) {
    const bounds = element.getBoundingClientRect()
    const x = (bounds.left - frameBounds.left) * CAPTURE_SCALE
    const y = (bounds.top - frameBounds.top) * CAPTURE_SCALE
    const layerWidth = bounds.width * CAPTURE_SCALE
    const layerHeight = bounds.height * CAPTURE_SCALE
    if (layerWidth <= 0 || layerHeight <= 0) continue
    const style = window.getComputedStyle(element)
    const layer = document.createElement('canvas')
    layer.width = canvas.width
    layer.height = canvas.height
    const layerContext = layer.getContext('2d')
    if (!layerContext) continue
    layerContext.imageSmoothingEnabled = true
    layerContext.imageSmoothingQuality = 'high'
    if (element instanceof HTMLImageElement) {
      const matrix = style.transform === 'none' ? null : new DOMMatrix(style.transform)
      if (matrix && matrix.a < 0) {
        layerContext.save()
        layerContext.translate(x + layerWidth, y)
        layerContext.scale(-1, 1)
        layerContext.drawImage(element, 0, 0, layerWidth, layerHeight)
        layerContext.restore()
      } else layerContext.drawImage(element, x, y, layerWidth, layerHeight)
    } else if (element instanceof SVGSVGElement) {
      const svgImage = await loadSvgImage(element)
      layerContext.drawImage(svgImage, x, y, layerWidth, layerHeight)
    }
    else {
      layerContext.fillStyle = element.classList.contains('door-frame-sidelite-clear-glass') ? '#dce9ed' : style.backgroundColor
      layerContext.fillRect(x, y, layerWidth, layerHeight)
    }
    const maskSource = element instanceof HTMLElement ? cssUrl(style.maskImage || style.getPropertyValue('-webkit-mask-image')) : ''
    if (maskSource) {
      const mask = await loadCanvasImage(maskSource)
      layerContext.globalCompositeOperation = 'destination-in'
      layerContext.drawImage(mask, x, y, layerWidth, layerHeight)
      layerContext.globalCompositeOperation = 'source-over'
    }
    const blendMode = style.mixBlendMode
    context.globalCompositeOperation = blendMode === 'multiply' || blendMode === 'screen' || blendMode === 'overlay' ? blendMode : 'source-over'
    context.globalAlpha = Math.max(0, Math.min(1, Number(style.opacity) || 1))
    context.drawImage(layer, 0, 0)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    layer.width = 0
    layer.height = 0
  }
  return canvas
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
  const captureStartTime = performance.now()
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

  const sourceBounds = frame.getBoundingClientRect()
  const sourceStyle = window.getComputedStyle(frame)
  const sourceImages = Array.from(frame.querySelectorAll('img'))
  if (!sourceBounds.width || !sourceBounds.height) throw new Error('The configured door source has no measurable layout dimensions.')

  const canvas = await renderDoorLayers(frame, width, height)
  const coverage = alphaCoverage(canvas)
  if (import.meta.env.DEV) console.debug('CONFIGURED_DOOR_SOURCE_DEBUG', {
    viewportWidth: window.innerWidth,
    isMobile: window.matchMedia('(max-width: 767px)').matches,
    sourceElementWidth: sourceBounds.width,
    sourceElementHeight: sourceBounds.height,
    logicalWidth: width,
    logicalHeight: height,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    devicePixelRatio: window.devicePixelRatio,
    imageAssets: sourceImages.length,
    loadedImageAssets: sourceImages.filter((asset) => asset.complete && asset.naturalWidth > 0 && asset.naturalHeight > 0).length,
    nonTransparentPixelCount: coverage.nonTransparentPixelCount,
    sourceCoverageRatio: coverage.coverageRatio,
    captureStartTime,
    captureReadyTime: performance.now(),
    doorPreviewReady: sourceImages.every((asset) => asset.complete && asset.naturalWidth > 0 && asset.naturalHeight > 0),
    sourceMounted: frame.isConnected,
    display: sourceStyle.display,
    visibility: sourceStyle.visibility,
    contentVisibility: sourceStyle.contentVisibility,
  })
  if (!coverage.nonTransparentPixelCount || coverage.coverageRatio < .0001) {
    canvas.width = 0
    canvas.height = 0
    throw new Error('The configured door source rendered empty.')
  }
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
