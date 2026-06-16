type Rgb = {
  r: number
  g: number
  b: number
}

const tintCache = new Map<string, Promise<string>>()

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

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function isLikelyGlassPixel(red: number, green: number, blue: number, alpha: number) {
  if (alpha < 16) return true

  const coolBlueGlass = blue > red + 8 && blue > green + 4 && Math.max(red, green, blue) > 120
  const faintTranslucentGlass = alpha < 235 && red > 180 && green > 180 && blue > 180

  return coolBlueGlass || faintTranslucentGlass
}

export async function tintDoorPreviewAsset(src: string, hexColor?: string | null) {
  const color = hexColor ? parseHexColor(hexColor) : null
  if (!color) return src

  const cacheKey = `${src}|${hexColor}`
  const cached = tintCache.get(cacheKey)
  if (cached) return cached

  const tinted = loadPreviewImage(src).then((image) => {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) return src

    context.drawImage(image, 0, 0)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const { data } = imageData

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const alpha = data[index + 3]

      if (isLikelyGlassPixel(red, green, blue, alpha)) continue

      const luma = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
      const shade = 0.45 + luma * 0.85

      data[index] = clamp(color.r * shade)
      data[index + 1] = clamp(color.g * shade)
      data[index + 2] = clamp(color.b * shade)
      data[index + 3] = alpha
    }

    context.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  }).catch(() => src)

  tintCache.set(cacheKey, tinted)
  return tinted
}
