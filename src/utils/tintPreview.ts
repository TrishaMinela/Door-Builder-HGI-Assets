type Rgb = {
  r: number
  g: number
  b: number
}

const tintCache = new Map<string, Promise<string>>()
const TINT_ALGORITHM_VERSION = 'v21-inset-glass-masks'
const BACKGROUND_ALPHA_THRESHOLD = 8
const FORCE_DEBUG_RED_IN_DEV = false

type TintOptions = {
  preserveGlass?: boolean
  finishType?: 'paint' | 'stain'
  glassMask?: 'ca' | 'full-lite' | 'three-quarter-lite' | 'half-lite' | 'small-oval'
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
  const inLowerGlass = nx >= 0.477 && nx <= 0.561 && ny >= 0.249 && ny <= 0.675
  const archX = (nx - 0.519) / 0.042
  const archY = (ny - 0.249) / 0.045
  const inUpperArch = ny <= 0.249 && archX * archX + archY * archY <= 1

  return inLowerGlass || inUpperArch
}

function isPreviewGlassPixel(mask: TintOptions['glassMask'], x: number, y: number, width: number, height: number) {
  if (!mask) return false
  if (mask === 'ca') return isCaGlassPixel(x, y, width, height)

  const nx = x / width
  const ny = y / height

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
) {
  const { width, height, data: originalData } = originalImageData
  const materialMask = new ImageData(width, height)
  const detailLayer = new ImageData(width, height)
  const preservedLayer = new ImageData(width, height)

  for (let index = 0; index < originalData.length; index += 4) {
    const pixelIndex = index / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const alpha = originalData[index + 3]
    const insideBounds = x >= doorBounds.minX && x <= doorBounds.maxX && y >= doorBounds.minY && y <= doorBounds.maxY
    const isGlass = glassMask ? isPreviewGlassPixel(glassMask, x, y, width, height) : false
    const isMaterial = alpha >= BACKGROUND_ALPHA_THRESHOLD && insideBounds && !isGlass

    if (isMaterial) {
      materialMask.data[index] = 255
      materialMask.data[index + 1] = 255
      materialMask.data[index + 2] = 255
      materialMask.data[index + 3] = alpha

      detailLayer.data[index] = originalData[index]
      detailLayer.data[index + 1] = originalData[index + 1]
      detailLayer.data[index + 2] = originalData[index + 2]
      detailLayer.data[index + 3] = alpha
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

  const preservedCanvas = document.createElement('canvas')
  preservedCanvas.width = width
  preservedCanvas.height = height
  preservedCanvas.getContext('2d')?.putImageData(preservedLayer, 0, 0)

  context.clearRect(0, 0, width, height)
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
  context.fillRect(0, 0, width, height)
  context.globalCompositeOperation = 'destination-in'
  context.drawImage(maskCanvas, 0, 0)

  const isStain = finishType === 'stain'
  context.globalCompositeOperation = 'multiply'
  context.globalAlpha = isStain ? 0.42 : 0.24
  context.drawImage(detailCanvas, 0, 0)
  context.globalCompositeOperation = 'screen'
  context.globalAlpha = isStain ? 0.1 : 0.07
  context.drawImage(detailCanvas, 0, 0)

  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 1
  context.drawImage(preservedCanvas, 0, 0)
}

export async function tintDoorPreviewAsset(src: string, hexColor?: string | null, options: TintOptions = {}) {
  const color = hexColor ? parseHexColor(hexColor) : null
  if (!color) return src
  const outputColor = import.meta.env.DEV && FORCE_DEBUG_RED_IN_DEV ? { r: 255, g: 0, b: 0 } : color

  const cacheKey = `${TINT_ALGORITHM_VERSION}|${src}|${hexColor}|${options.preserveGlass ? 'glass' : 'solid'}|${options.finishType ?? 'paint'}|${options.glassMask ?? 'auto'}`
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

  const tinted = loadPreviewImage(src).then((image) => {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) return src

    context.drawImage(image, 0, 0)
    const originalImageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const originalData = originalImageData.data
    const doorBounds = getDoorContentBounds(originalData, canvas.width, canvas.height)

    renderDetailOverlay(context, originalImageData, outputColor, options.finishType, doorBounds, options.glassMask)
    const output = canvas.toDataURL('image/png')

    if (import.meta.env.DEV) {
      console.info('[door-preview-tint:done]', {
        src,
        hexColor,
        preserveGlass: Boolean(options.preserveGlass),
        forceDebugRed: FORCE_DEBUG_RED_IN_DEV,
        doorBounds,
        glassMask: options.glassMask ?? null,
        dataUrlLength: output.length,
      })
    }

    return output
  }).catch(() => src)

  tintCache.set(cacheKey, tinted)
  return tinted
}
