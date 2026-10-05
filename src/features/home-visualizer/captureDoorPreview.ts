const CAPTURE_SCALE = 2
const SETTLE_INTERVAL = 120
const MAX_SETTLE_ATTEMPTS = 30

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function cssImageUrl(value: string) {
  const match = value.match(/^url\(["']?(.*?)["']?\)$/)
  return match?.[1] ?? ''
}

function loadCaptureImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`A masked preview asset could not be loaded: ${source}`))
    image.src = source
  })
}

async function materializeMaskedLayers(root: HTMLElement) {
  const restorers: (() => void)[] = []
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((element) => {
    const style = window.getComputedStyle(element)
    return cssImageUrl(style.maskImage) || cssImageUrl(style.webkitMaskImage)
  })

  for (const element of candidates) {
    const style = window.getComputedStyle(element)
    const maskSource = cssImageUrl(style.maskImage) || cssImageUrl(style.webkitMaskImage)
    if (!maskSource) continue
    const width = Math.max(1, Math.round(element.offsetWidth))
    const height = Math.max(1, Math.round(element.offsetHeight))
    const canvas = document.createElement('canvas')
    canvas.width = width * CAPTURE_SCALE
    canvas.height = height * CAPTURE_SCALE
    const context = canvas.getContext('2d')
    if (!context) continue
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.scale(CAPTURE_SCALE, CAPTURE_SCALE)

    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth) {
      context.drawImage(element, 0, 0, width, height)
    } else {
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        context.fillStyle = style.backgroundColor
        context.fillRect(0, 0, width, height)
      }
      const backgroundSource = cssImageUrl(style.backgroundImage)
      if (backgroundSource) {
        const background = await loadCaptureImage(backgroundSource)
        context.drawImage(background, 0, 0, width, height)
      }
    }

    const mask = await loadCaptureImage(maskSource)
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(mask, 0, 0, width, height)
    context.globalCompositeOperation = 'source-over'
    const rasterized = canvas.toDataURL('image/png')
    canvas.width = 0
    canvas.height = 0

    const originalStyle = element.getAttribute('style')
    const originalSource = element instanceof HTMLImageElement ? element.getAttribute('src') : null
    if (element instanceof HTMLImageElement) {
      element.src = rasterized
    } else {
      element.style.backgroundColor = 'transparent'
      element.style.backgroundImage = `url("${rasterized}")`
      element.style.backgroundSize = '100% 100%'
      element.style.backgroundPosition = '0 0'
      element.style.backgroundRepeat = 'no-repeat'
    }
    element.style.maskImage = 'none'
    element.style.webkitMaskImage = 'none'
    restorers.push(() => {
      if (originalStyle === null) element.removeAttribute('style')
      else element.setAttribute('style', originalStyle)
      if (element instanceof HTMLImageElement && originalSource !== null) element.src = originalSource
    })
  }

  await nextFrame()
  return () => restorers.reverse().forEach((restore) => restore())
}

type SurfaceStack = {
  detail: HTMLImageElement
  finish: HTMLElement
}

function captureSurfaceStacks(root: HTMLElement): SurfaceStack[] {
  const stacks: SurfaceStack[] = []
  root.querySelectorAll<HTMLElement>('.door').forEach((door) => {
    const finish = door.querySelector<HTMLElement>(':scope > .door-finish-layer')
    const detail = door.querySelector<HTMLImageElement>(':scope > .door-detail-image')
    if (finish && detail) stacks.push({ finish, detail })
  })
  root.querySelectorAll<HTMLElement>('.door-frame-sidelite-slot').forEach((slot) => {
    const finish = slot.querySelector<HTMLElement>(':scope > .door-frame-sidelite-finish')
    const detail = slot.querySelector<HTMLImageElement>(':scope > .door-frame-sidelite-detail')
    if (finish && detail) stacks.push({ finish, detail })
  })
  return stacks
}

/** Resolve the CSS finish/detail stack into one capture-only bitmap. The live
 * preview uses mix-blend-mode:multiply, which html2canvas does not reproduce;
 * leaving the light detail image separate therefore washes dark finishes out. */
async function resolveSurfaceMaterialBlends(root: HTMLElement) {
  const restorers: (() => void)[] = []
  for (const { finish, detail } of captureSurfaceStacks(root)) {
    const finishStyle = window.getComputedStyle(finish)
    const detailStyle = window.getComputedStyle(detail)
    if (detailStyle.mixBlendMode !== 'multiply') continue
    const finishSource = cssImageUrl(finishStyle.backgroundImage)
    if (!finishSource || !detail.complete || !detail.naturalWidth) continue
    const width = Math.max(1, Math.round(finish.offsetWidth))
    const height = Math.max(1, Math.round(finish.offsetHeight))
    const finishImage = await loadCaptureImage(finishSource)
    const canvas = document.createElement('canvas')
    canvas.width = width * CAPTURE_SCALE
    canvas.height = height * CAPTURE_SCALE
    const context = canvas.getContext('2d')
    if (!context) continue
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.scale(CAPTURE_SCALE, CAPTURE_SCALE)

    context.filter = finishStyle.filter === 'none' ? 'none' : finishStyle.filter
    context.drawImage(finishImage, 0, 0, width, height)
    context.filter = detailStyle.filter === 'none' ? 'none' : detailStyle.filter
    context.globalCompositeOperation = 'multiply'
    context.globalAlpha = Math.max(0, Math.min(1, Number.parseFloat(detailStyle.opacity) || 0))
    context.drawImage(detail, 0, 0, width, height)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.filter = 'none'

    const resolved = canvas.toDataURL('image/png')
    canvas.width = 0
    canvas.height = 0
    const originalFinishStyle = finish.getAttribute('style')
    const originalDetailStyle = detail.getAttribute('style')
    finish.style.backgroundColor = 'transparent'
    finish.style.backgroundImage = `url("${resolved}")`
    finish.style.backgroundSize = '100% 100%'
    finish.style.backgroundPosition = '0 0'
    finish.style.backgroundRepeat = 'no-repeat'
    finish.style.mixBlendMode = 'normal'
    finish.style.opacity = '1'
    finish.style.filter = 'none'
    detail.style.display = 'none'
    restorers.push(() => {
      if (originalFinishStyle === null) finish.removeAttribute('style')
      else finish.setAttribute('style', originalFinishStyle)
      if (originalDetailStyle === null) detail.removeAttribute('style')
      else detail.setAttribute('style', originalDetailStyle)
    })
  }
  await nextFrame()
  return () => restorers.reverse().forEach((restore) => restore())
}

function parseInsetClipPath(value: string) {
  const match = value.match(/^inset\(\s*([\d.]+)%\s+([\d.]+)%\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i)
  if (!match) return null
  return { top: Number(match[1]), right: Number(match[2]), bottom: Number(match[3]), left: Number(match[4]) }
}

/** html2canvas does not consistently preserve percentage inset clip paths on
 * transformed images. Flatten those layers before capture so partial hardware
 * (for example DDLLKP knob-only artwork) is identical to DoorPreview. */
async function materializeClippedImages(root: HTMLElement) {
  const restorers: (() => void)[] = []
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img')).filter((image) => {
    const style = window.getComputedStyle(image)
    return Boolean(parseInsetClipPath(image.style.clipPath || image.style.getPropertyValue('-webkit-clip-path') || style.clipPath || style.getPropertyValue('-webkit-clip-path')))
  })

  for (const image of images) {
    const style = window.getComputedStyle(image)
    const inset = parseInsetClipPath(image.style.clipPath || image.style.getPropertyValue('-webkit-clip-path') || style.clipPath || style.getPropertyValue('-webkit-clip-path'))
    if (!inset || !image.complete || !image.naturalWidth) continue
    const width = Math.max(1, Math.round(image.offsetWidth))
    const height = Math.max(1, Math.round(image.offsetHeight))
    const canvas = document.createElement('canvas')
    canvas.width = width * CAPTURE_SCALE
    canvas.height = height * CAPTURE_SCALE
    const context = canvas.getContext('2d')
    if (!context) continue
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.scale(CAPTURE_SCALE, CAPTURE_SCALE)
    const clipX = width * inset.left / 100
    const clipY = height * inset.top / 100
    const clipWidth = width * (100 - inset.left - inset.right) / 100
    const clipHeight = height * (100 - inset.top - inset.bottom) / 100
    context.beginPath()
    context.rect(clipX, clipY, clipWidth, clipHeight)
    context.clip()
    context.drawImage(image, 0, 0, width, height)
    const rasterized = canvas.toDataURL('image/png')
    canvas.width = 0
    canvas.height = 0

    const originalStyle = image.getAttribute('style')
    const originalSource = image.getAttribute('src')
    image.src = rasterized
    image.style.clipPath = 'none'
    image.style.setProperty('-webkit-clip-path', 'none')
    await image.decode()
    restorers.push(() => {
      if (originalStyle === null) image.removeAttribute('style')
      else image.setAttribute('style', originalStyle)
      if (originalSource !== null) image.src = originalSource
    })
  }

  await nextFrame()
  return () => restorers.reverse().forEach((restore) => restore())
}

function alphaCoverage(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { nonTransparentPixelCount: 0, coverageRatio: 0 }
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let nonTransparentPixelCount = 0
  for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] > 0) nonTransparentPixelCount += 1
  return { nonTransparentPixelCount, coverageRatio: nonTransparentPixelCount / Math.max(1, canvas.width * canvas.height) }
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
  /**
   * Keep the complete DoorFrame canvas instead of trimming transparent pixels.
   * Visualizer source rectangles are expressed in this canonical coordinate
   * system, so changing its bounds would make them sample the wrong pixels.
   */
  preserveCanonicalFrameBounds?: boolean
  expectedConfigurationKey?: string
}

async function waitForSemanticReadiness(root: HTMLElement, expectedConfigurationKey?: string) {
  if (!expectedConfigurationKey) return
  for (let attempt = 0; attempt < MAX_SETTLE_ATTEMPTS; attempt += 1) {
    const scene = root.querySelector<HTMLElement>('.preview-scene')
    if (scene?.dataset.renderConfigurationKey === expectedConfigurationKey && scene.dataset.renderSemanticallyReady === 'true') return
    await new Promise((resolve) => window.setTimeout(resolve, SETTLE_INTERVAL))
  }
  throw new Error('The configured door layers did not become ready for the current configuration.')
}

function assertSemanticReadiness(root: HTMLElement, expectedConfigurationKey?: string) {
  if (!expectedConfigurationKey) return
  const scene = root.querySelector<HTMLElement>('.preview-scene')
  if (scene?.dataset.renderConfigurationKey !== expectedConfigurationKey || scene.dataset.renderSemanticallyReady !== 'true') {
    throw new Error('The door configuration changed while its rendered snapshot was being captured.')
  }
}

export async function captureFinalDoorPreview(previewRoot: HTMLElement, options: CaptureDoorPreviewOptions = {}): Promise<CapturedDoorSource> {
  const captureStartTime = performance.now()
  await waitForSemanticReadiness(previewRoot, options.expectedConfigurationKey)
  await waitForRenderedAssets(previewRoot)
  await waitForSemanticReadiness(previewRoot, options.expectedConfigurationKey)
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

  // PDF/export captures retain the safe surrounding scene and trim it. The
  // visualizer instead needs the exact, untrimmed DoorFrame bounds because its
  // product-layer source rectangles use the same canonical entrance geometry.
  const captureTarget = options.preserveCanonicalFrameBounds
    ? frame
    : previewRoot.querySelector<HTMLElement>('.preview-scene') ?? frame
  const width = Math.ceil(Number.parseFloat(captureTarget.style.width) || captureTarget.offsetWidth)
  const height = Math.ceil(Number.parseFloat(captureTarget.style.height) || captureTarget.offsetHeight)
  if (!width || !height) throw new Error('The configured door assembly has invalid dimensions.')

  const sourceBounds = captureTarget.getBoundingClientRect()
  const sourceStyle = window.getComputedStyle(captureTarget)
  const sourceImages = Array.from(captureTarget.querySelectorAll('img'))
  if (!sourceBounds.width || !sourceBounds.height) throw new Error('The configured door source has no measurable layout dimensions.')

  // Flatten the completed DoorPreview DOM itself. This deliberately avoids a
  // second export-only compositor making independent decisions about masks,
  // finishes, spacing, hardware, or frame geometry.
  const { default: html2canvas } = await import('html2canvas')
  let restoreMaskedLayers = () => {}
  let restoreSurfaceMaterialBlends = () => {}
  let restoreClippedImages = () => {}
  let canvas: HTMLCanvasElement
  try {
    restoreMaskedLayers = await materializeMaskedLayers(captureTarget)
    restoreSurfaceMaterialBlends = await resolveSurfaceMaterialBlends(captureTarget)
    restoreClippedImages = await materializeClippedImages(captureTarget)
    canvas = await html2canvas(captureTarget, {
      backgroundColor: null,
      logging: false,
      scale: CAPTURE_SCALE,
      useCORS: true,
      width,
      height,
    })
  } finally {
    restoreClippedImages()
    restoreSurfaceMaterialBlends()
    restoreMaskedLayers()
  }
  assertSemanticReadiness(previewRoot, options.expectedConfigurationKey)
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
  let outputCanvas = options.preserveCanonicalFrameBounds ? canvas : trimTransparentPixels(canvas)
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

// Retained for non-PDF callers while all final-door consumers migrate to the
// explicit single-source capture API above.
export const captureDoorPreview = captureFinalDoorPreview
