/** Craftsman Divided Lites is one glass artwork, not a grid-color choice.
 * Its muntins are the light ridges in that file. Stained and painted doors
 * recolor those ridges to the slab finish. The clear panes stay as authored. */

export const DIVIDED_LITE_GLASS_ID = 'cr14-divided-lites'

const RIDGE_OFFSET = 7
const RIDGE_SCORE = 1.6
const LIGHTNESS_PIVOT = 234

function parseHex(color: string) {
  const match = /^#([\da-f]{6})$/i.exec(color)
  if (!match) return null
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16))
}

function contiguous(indexes: number[]) {
  const groups: number[][] = []
  for (const index of indexes) {
    const last = groups[groups.length - 1]
    if (last && index - last[last.length - 1] <= 1) last.push(index)
    else groups.push([index])
  }
  return groups
}

function expanded(groups: number[][]) {
  const indexes = new Set<number>()
  for (const group of groups) {
    for (const index of group) {
      indexes.add(index - 1)
      indexes.add(index)
      indexes.add(index + 1)
    }
  }
  return indexes
}

/** Returns true when muntin pixels were recolored. A missing grid leaves the artwork unchanged. */
export function recolorDividedLiteMuntinPixels(data: Uint8ClampedArray, width: number, height: number, color: string) {
  const target = parseHex(color)
  if (!target) return false
  const count = width * height
  const lightness = new Float32Array(count)
  const alpha = new Uint8Array(count)
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4
    alpha[index] = data[offset + 3]
    lightness[index] = (data[offset] + data[offset + 1] + data[offset + 2]) / 3
    if (alpha[index] <= 100) continue
    const x = index % width
    const y = Math.floor(index / width)
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
  if (right - left < RIDGE_OFFSET * 4 || bottom - top < RIDGE_OFFSET * 4) return false

  const vertical: number[] = []
  for (let x = left + RIDGE_OFFSET; x <= right - RIDGE_OFFSET; x += 1) {
    let score = 0
    let samples = 0
    for (let y = top + 2; y < bottom; y += 1) {
      const index = y * width + x
      if (alpha[index] < 200) continue
      score += lightness[index] - Math.max(lightness[index - RIDGE_OFFSET], lightness[index + RIDGE_OFFSET])
      samples += 1
    }
    if (samples && score / samples > RIDGE_SCORE) vertical.push(x)
  }
  const horizontal: number[] = []
  for (let y = top + RIDGE_OFFSET; y <= bottom - RIDGE_OFFSET; y += 1) {
    let score = 0
    let samples = 0
    const row = y * width
    for (let x = left + 2; x < right; x += 1) {
      const index = row + x
      if (alpha[index] < 200) continue
      score += lightness[index] - Math.max(lightness[index - RIDGE_OFFSET * width], lightness[index + RIDGE_OFFSET * width])
      samples += 1
    }
    if (samples && score / samples > RIDGE_SCORE) horizontal.push(y)
  }
  const verticalBands = contiguous(vertical)
  const horizontalBands = contiguous(horizontal)
  // Craftsman Divided Lites is two vertical bars and one horizontal bar.
  if (verticalBands.length < 2 || horizontalBands.length < 1) return false
  const verticalIndexes = expanded(verticalBands)
  const horizontalIndexes = expanded(horizontalBands)

  let painted = 0
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!verticalIndexes.has(x) && !horizontalIndexes.has(y)) continue
      const index = y * width + x
      if (alpha[index] < 16) continue
      const offset = index * 4
      const lift = (lightness[index] - LIGHTNESS_PIVOT) * 0.7
      data[offset] = Math.max(0, Math.min(255, Math.round(target[0] + lift)))
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(target[1] + lift)))
      data[offset + 2] = Math.max(0, Math.min(255, Math.round(target[2] + lift)))
      painted += 1
    }
  }
  return painted > 0
}

export function dividedLiteMuntinArtwork(image: HTMLImageElement, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !canvas.width || !canvas.height) return null
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  if (!recolorDividedLiteMuntinPixels(pixels.data, canvas.width, canvas.height, color)) return null
  context.putImageData(pixels, 0, 0)
  return canvas
}
