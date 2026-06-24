type Rgb = {
  r: number
  g: number
  b: number
}

const tintCache = new Map<string, Promise<string>>()
const TINT_ALGORITHM_VERSION = 'v61-subtle-satin-clear-coat'
const BACKGROUND_ALPHA_THRESHOLD = 8
const FORCE_DEBUG_RED_IN_DEV = false

type TintOptions = {
  preserveGlass?: boolean
  finishType?: 'paint' | 'stain'
  glassMask?: 'ca' | 'craftsman-lite' | 'full-lite' | 'three-quarter-lite' | 'half-lite' | 'small-oval' | 'stacked-three-lite'
  tintMask?: string
}

function parseHexColor(hex: string): Rgb | null {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function mixChannel(a: number, b: number, amount: number) {
  return a + (b - a) * amount
}

function loadPreviewImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function getDoorContentBounds(data: Uint8ClampedArray, width: number, height: number) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const alpha = data[index + 3]
      const max = Math.max(red, green, blue)
      const min = Math.min(red, green, blue)
      const saturation = max === 0 ? 0 : (max - min) / max
      const isVisibleDetail = alpha >= BACKGROUND_ALPHA_THRESHOLD && (max < 242 || saturation > 0.04)

      if (isVisibleDetail) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 }
  }

  return {
    minX: Math.max(0, minX - 3),
    minY: Math.max(0, minY - 3),
    maxX: Math.min(width - 1, maxX + 3),
    maxY: Math.min(height - 1, maxY + 3),
  }
}

function isCaGlassPixel(x: number, y: number, width: number, height: number) {
  const nx = x / width
  const ny = y / height
  const inLowerGlass = nx >= 0.472 && nx <= 0.552 && ny >= 0.225 && ny <= 0.67
  const archX = (nx - 0.512) / 0.04
  const archY = (ny - 0.225) / 0.038
  const inUpperArch = ny <= 0.225 && archX * archX + archY * archY <= 1

  return inLowerGlass || inUpperArch
}

function isPreviewGlassPixel(mask: TintOptions['glassMask'], x: number, y: number, width: number, height: number) {
  if (!mask) return false
  if (mask === 'ca') return isCaGlassPixel(x, y, width, height)

  const nx = x / width
  const ny = y / height

  if (mask === 'stacked-three-lite') {
    const inGlassColumn = nx >= 0.445 && nx <= 0.575
    const inTopLite = ny >= 0.125 && ny <= 0.245
    const inMiddleLite = ny >= 0.414 && ny <= 0.536
    const inBottomLite = ny >= 0.722 && ny <= 0.85
    return inGlassColumn && (inTopLite || inMiddleLite || inBottomLite)
  }
  if (mask === 'craftsman-lite') {
    return nx >= 0.375 && nx <= 0.647 && ny >= 0.12 && ny <= 0.282
  }
  if (mask === 'full-lite') {
    return nx >= 0.375 && nx <= 0.625 && ny >= 0.135 && ny <= 0.88
  }
  if (mask === 'three-quarter-lite') {
    return nx >= 0.375 && nx <= 0.625 && ny >= 0.135 && ny <= 0.68
  }
  if (mask === 'half-lite') {
    return nx >= 0.375 && nx <= 0.625 && ny >= 0.125 && ny <= 0.535
  }

  const ovalX = (nx - 0.5) / 0.082
  const ovalY = (ny - 0.382) / 0.208
  return ovalX * ovalX + ovalY * ovalY <= 1
}

function renderDetailOverlay(
  context: CanvasRenderingContext2D,
  originalImageData: ImageData,
  color: Rgb,
  finishType: TintOptions['finishType'],
  doorBounds: ReturnType<typeof getDoorContentBounds>,
  glassMask: TintOptions['glassMask'],
  tintMaskData?: Uint8ClampedArray,
) {
  const { width, height, data: originalData } = originalImageData
  const materialMask = new ImageData(width, height)
  const detailLayer = new ImageData(width, height)
  const stainLayer = new ImageData(width, height)
  const preservedLayer = new ImageData(width, height)
  const isStain = finishType === 'stain'

  for (let index = 0; index < originalData.length; index += 4) {
    const pixelIndex = index / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const alpha = originalData[index + 3]
    const insideBounds = x >= doorBounds.minX && x <= doorBounds.maxX && y >= doorBounds.minY && y <= doorBounds.maxY
    const maskBrightness = tintMaskData
      ? (tintMaskData[index] + tintMaskData[index + 1] + tintMaskData[index + 2]) / 3
      : null
    const maskMarksWood = maskBrightness !== null && tintMaskData![index + 3] >= BACKGROUND_ALPHA_THRESHOLD && maskBrightness >= 128
    const isGlass = tintMaskData ? !maskMarksWood : glassMask ? isPreviewGlassPixel(glassMask, x, y, width, height) : false
    const isMaterial = alpha >= BACKGROUND_ALPHA_THRESHOLD && insideBounds && !isGlass

    if (isMaterial) {
      materialMask.data[index] = 255
      materialMask.data[index + 1] = 255
      materialMask.data[index + 2] = 255
      materialMask.data[index + 3] = alpha

      const sourceLuma = (originalData[index] * 0.299) + (originalData[index + 1] * 0.587) + (originalData[index + 2] * 0.114)
      const detailValue = clampChannel(255 - (255 - sourceLuma) * 1.65)

      // The source slabs are intentionally very light. If we multiply the raw
      // pale pixels into the finish color, panel depth and grain nearly vanish.
      // Use the source luminance as a strengthened detail map so the finished
      // door keeps the same readable embossing, shadows, and wood texture.
      detailLayer.data[index] = detailValue
      detailLayer.data[index + 1] = detailValue
      detailLayer.data[index + 2] = detailValue
      detailLayer.data[index + 3] = alpha

      if (isStain) {
        const normalizedLuma = Math.max(0, Math.min(1, (sourceLuma - 72) / 184))
        const highlightAmount = normalizedLuma
        const woodWave = (
          Math.sin((x - doorBounds.minX) * 0.13 + y * 0.031)
          + Math.sin((x - doorBounds.minX) * 0.049 - y * 0.022)
          + Math.sin(x * 0.017 + y * 0.009)
        ) / 3
        const verticalPosition = (x - doorBounds.minX) / Math.max(1, doorBounds.maxX - doorBounds.minX)
        const flowingGrain = (
          Math.sin(verticalPosition * 54 + y * 0.018 + Math.sin(y * 0.011) * 1.8)
          + Math.sin(verticalPosition * 93 + y * 0.009)
          + Math.sin(verticalPosition * 147 - y * 0.006)
        ) / 3
        const fineGrain = (
          Math.sin((x - doorBounds.minX) * 0.42 + y * 0.024)
          + Math.sin((x - doorBounds.minX) * 0.31 - y * 0.017)
        ) / 2
        const subtleGrain = woodWave * 0.018 + flowingGrain * 0.035 + fineGrain * 0.012
        const sourceTexture = ((sourceLuma - 214) / 255) * 0.08
        const sourceShadow = (1 - normalizedLuma) * 0.12
        const panelHighlight = Math.max(0, highlightAmount - 0.86) * 0.035
        const tone = Math.max(0.82, Math.min(1.07, 0.985 + subtleGrain + sourceTexture + panelHighlight - sourceShadow))
        const red = color.r * tone
        const green = color.g * tone
        const blue = color.b * tone

        stainLayer.data[index] = clampChannel(red)
        stainLayer.data[index + 1] = clampChannel(green)
        stainLayer.data[index + 2] = clampChannel(blue)
        stainLayer.data[index + 3] = alpha
      }
    } else if (alpha >= BACKGROUND_ALPHA_THRESHOLD && isGlass) {
      preservedLayer.data[index] = originalData[index]
      preservedLayer.data[index + 1] = originalData[index + 1]
      preservedLayer.data[index + 2] = originalData[index + 2]
      preservedLayer.data[index + 3] = alpha
    }
  }

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = width
  maskCanvas.height = height
  maskCanvas.getContext('2d')?.putImageData(materialMask, 0, 0)

  const detailCanvas = document.createElement('canvas')
  detailCanvas.width = width
  detailCanvas.height = height
  detailCanvas.getContext('2d')?.putImageData(detailLayer, 0, 0)

  const stainCanvas = document.createElement('canvas')
  stainCanvas.width = width
  stainCanvas.height = height
  stainCanvas.getContext('2d')?.putImageData(stainLayer, 0, 0)

  const preservedCanvas = document.createElement('canvas')
  preservedCanvas.width = width
  preservedCanvas.height = height
  preservedCanvas.getContext('2d')?.putImageData(preservedLayer, 0, 0)

  const glossCanvas = document.createElement('canvas')
  glossCanvas.width = width
  glossCanvas.height = height
  const glossContext = glossCanvas.getContext('2d')

  if (glossContext) {
    const verticalSheen = glossContext.createLinearGradient(doorBounds.minX, 0, doorBounds.maxX, 0)
    verticalSheen.addColorStop(0, 'rgba(255, 255, 255, 0)')
    verticalSheen.addColorStop(0.34, 'rgba(255, 255, 255, 0.08)')
    verticalSheen.addColorStop(0.47, 'rgba(255, 255, 255, 0.025)')
    verticalSheen.addColorStop(0.7, 'rgba(255, 255, 255, 0.055)')
    verticalSheen.addColorStop(1, 'rgba(255, 255, 255, 0)')
    glossContext.fillStyle = verticalSheen
    glossContext.fillRect(doorBounds.minX, doorBounds.minY, doorBounds.maxX - doorBounds.minX, doorBounds.maxY - doorBounds.minY)

    const panelGlint = glossContext.createRadialGradient(
      width * 0.58,
      height * 0.22,
      width * 0.02,
      width * 0.58,
      height * 0.22,
      width * 0.3,
    )
    panelGlint.addColorStop(0, 'rgba(255, 255, 255, 0.075)')
    panelGlint.addColorStop(0.55, 'rgba(255, 255, 255, 0.025)')
    panelGlint.addColorStop(1, 'rgba(255, 255, 255, 0)')
    glossContext.fillStyle = panelGlint
    glossContext.fillRect(doorBounds.minX, doorBounds.minY, doorBounds.maxX - doorBounds.minX, doorBounds.maxY - doorBounds.minY)

    glossContext.globalCompositeOperation = 'destination-in'
    glossContext.drawImage(maskCanvas, 0, 0)
  }

  context.clearRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1

  if (isStain) {
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    context.fillRect(0, 0, width, height)
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(maskCanvas, 0, 0)

    context.globalCompositeOperation = 'multiply'
    context.globalAlpha = 0.96
    context.drawImage(detailCanvas, 0, 0)
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = 0.025
    context.drawImage(detailCanvas, 0, 0)
    context.globalAlpha = 0.045
    context.drawImage(glossCanvas, 0, 0)
    context.globalCompositeOperation = 'multiply'
    context.globalAlpha = 0.035
    context.drawImage(detailCanvas, 0, 0)
  } else {
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    context.fillRect(0, 0, width, height)
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(maskCanvas, 0, 0)

    context.globalCompositeOperation = 'multiply'
    context.globalAlpha = 1
    context.drawImage(detailCanvas, 0, 0)
    context.globalAlpha = 0.1
    context.drawImage(detailCanvas, 0, 0)
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = 0.035
    context.drawImage(glossCanvas, 0, 0)
  }

  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  context.drawImage(preservedCanvas, 0, 0)
}

export async function tintDoorPreviewAsset(src: string, hexColor?: string | null, options: TintOptions = {}) {
  const color = hexColor ? parseHexColor(hexColor) : null
  if (!color) return src
  const outputColor = import.meta.env.DEV && FORCE_DEBUG_RED_IN_DEV ? { r: 255, g: 0, b: 0 } : color

  const cacheKey = `${TINT_ALGORITHM_VERSION}|${src}|${hexColor}|${options.preserveGlass ? 'glass' : 'solid'}|${options.finishType ?? 'paint'}|${options.tintMask ?? options.glassMask ?? 'auto'}`
  const cached = tintCache.get(cacheKey)
  if (cached) return cached

  if (import.meta.env.DEV) {
    console.info('[door-preview-tint:start]', {
      src,
      hexColor,
      preserveGlass: Boolean(options.preserveGlass),
      forceDebugRed: FORCE_DEBUG_RED_IN_DEV,
    })
  }

  const tintMaskPromise = options.tintMask
    ? loadPreviewImage(options.tintMask).catch(() => null)
    : Promise.resolve(null)

  const tinted = Promise.all([loadPreviewImage(src), tintMaskPromise]).then(([image, tintMaskImage]) => {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) return src

    context.drawImage(image, 0, 0)
    const originalImageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const originalData = originalImageData.data
    const doorBounds = getDoorContentBounds(originalData, canvas.width, canvas.height)
    let tintMaskData: Uint8ClampedArray | undefined

    if (tintMaskImage) {
      const tintMaskCanvas = document.createElement('canvas')
      tintMaskCanvas.width = canvas.width
      tintMaskCanvas.height = canvas.height
      const tintMaskContext = tintMaskCanvas.getContext('2d')
      tintMaskContext?.drawImage(tintMaskImage, 0, 0, canvas.width, canvas.height)
      tintMaskData = tintMaskContext?.getImageData(0, 0, canvas.width, canvas.height).data
    }

    renderDetailOverlay(context, originalImageData, outputColor, options.finishType, doorBounds, options.glassMask, tintMaskData)
    const output = canvas.toDataURL('image/png')

    if (import.meta.env.DEV) {
      console.info('[door-preview-tint:done]', {
        src,
        hexColor,
        preserveGlass: Boolean(options.preserveGlass),
        forceDebugRed: FORCE_DEBUG_RED_IN_DEV,
        doorBounds,
        tintMask: options.tintMask ?? null,
        glassMask: options.glassMask ?? null,
        dataUrlLength: output.length,
      })
    }

    return output
  }).catch(() => src)

  tintCache.set(cacheKey, tinted)
  return tinted
}
