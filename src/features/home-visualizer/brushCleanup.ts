import type { CleanupStroke } from './CleanupBrushEditor'
import type { EntranceCorners, Point } from './EntranceSelector'
import { loadOpenCv } from './opencvLoader'

export type CleanupDiagnosticComponent = {
  method: 'directional-left-patch' | 'directional-right-patch' | 'telea-small-spot'
  destination: { x: number; y: number; width: number; height: number }
  source?: { x: number; y: number; width: number; height: number }
}

export type BrushCleanupResult = {
  cleanedBlob: Blob
  fullMaskBlob: Blob
  insideMaskBlob: Blob
  outsideMaskBlob: Blob
  width: number
  height: number
  components: CleanupDiagnosticComponent[]
}

type PixelComponent = { pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }

const UNSAFE_REPAIR_MESSAGE = 'This area could not be cleaned without distorting the surrounding trim. Try using a smaller brush closer to the unwanted detail.'

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The original house photo could not be loaded.'))
    image.src = src
  })
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The cleanup preview could not be encoded.')), 'image/png'))
}

function maskBlob(mask: Uint8Array, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')!
  const image = context.createImageData(width, height)
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index]
    image.data[index * 4] = value; image.data[index * 4 + 1] = value; image.data[index * 4 + 2] = value; image.data[index * 4 + 3] = 255
  }
  context.putImageData(image, 0, 0)
  return canvasBlob(canvas).finally(() => { canvas.width = canvas.height = 0 })
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]; const b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function componentsFor(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  const components: PixelComponent[] = []
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || visited[seed]) continue
    const queue = [seed]; visited[seed] = 1
    const component: PixelComponent = { pixels: [], minX: width, minY: height, maxX: 0, maxY: 0 }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const pixel = queue[cursor]; const x = pixel % width; const y = Math.floor(pixel / width)
      component.pixels.push(pixel); component.minX = Math.min(component.minX, x); component.maxX = Math.max(component.maxX, x); component.minY = Math.min(component.minY, y); component.maxY = Math.max(component.maxY, y)
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const nx = x + ox; const ny = y + oy; const next = ny * width + nx
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next] && !visited[next]) { visited[next] = 1; queue.push(next) }
      }
    }
    components.push(component)
  }
  return components
}

function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x; const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

function isCompactAndConsistent(component: PixelComponent, source: ImageData, mask: Uint8Array) {
  const width = component.maxX - component.minX + 1; const height = component.maxY - component.minY + 1
  const shortest = Math.min(source.width, source.height)
  if (Math.max(width, height) > shortest * .08 || component.pixels.length > source.width * source.height * .004 || Math.max(width / height, height / width) > 3.5) return false
  const values: number[] = []
  const margin = Math.max(3, Math.round(Math.min(width, height) * .35))
  for (let y = Math.max(0, component.minY - margin); y <= Math.min(source.height - 1, component.maxY + margin); y += 2) for (let x = Math.max(0, component.minX - margin); x <= Math.min(source.width - 1, component.maxX + margin); x += 2) {
    const pixel = y * source.width + x
    if (!mask[pixel]) values.push(.2126 * source.data[pixel * 4] + .7152 * source.data[pixel * 4 + 1] + .0722 * source.data[pixel * 4 + 2])
  }
  if (values.length < 8) return false
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) < 55
}

function directionalPatch(component: PixelComponent, side: 'left' | 'right', corners: EntranceCorners, source: ImageData, output: ImageData, fullMask: Uint8Array) {
  const edgeA = side === 'left' ? corners.topLeft : corners.topRight
  const edgeB = side === 'left' ? corners.bottomLeft : corners.bottomRight
  const dx = (edgeB.x - edgeA.x) * source.width; const dy = (edgeB.y - edgeA.y) * source.height; const length = Math.hypot(dx, dy) || 1
  const normal = side === 'left' ? { x: -dy / length, y: dx / length } : { x: dy / length, y: -dx / length }
  const projectedSpan = Math.abs(normal.x) * (component.maxX - component.minX + 1) + Math.abs(normal.y) * (component.maxY - component.minY + 1)
  let chosenOffset = 0
  for (let offset = Math.ceil(projectedSpan + 4); offset <= Math.ceil(projectedSpan + Math.min(64, Math.min(source.width, source.height) * .06)); offset += 2) {
    let valid = 0; let tested = 0
    for (let index = 0; index < component.pixels.length; index += Math.max(1, Math.floor(component.pixels.length / 160))) {
      const pixel = component.pixels[index]; const x = pixel % source.width; const y = Math.floor(pixel / source.width)
      const sx = Math.round(x + normal.x * offset); const sy = Math.round(y + normal.y * offset); tested += 1
      if (sx >= 0 && sx < source.width && sy >= 0 && sy < source.height && !fullMask[sy * source.width + sx]) valid += 1
    }
    if (tested && valid / tested >= .94) { chosenOffset = offset; break }
  }
  if (!chosenOffset) return null
  const boundary = new Set<number>()
  component.pixels.forEach((pixel) => {
    const x = pixel % source.width; const y = Math.floor(pixel / source.width)
    const sx = Math.round(x + normal.x * chosenOffset); const sy = Math.round(y + normal.y * chosenOffset)
    if (sx < 0 || sx >= source.width || sy < 0 || sy >= source.height) return
    const sample = (sy * source.width + sx) * 4; const destination = pixel * 4
    if (!fullMask[pixel - 1] || !fullMask[pixel + 1] || !fullMask[pixel - source.width] || !fullMask[pixel + source.width]) boundary.add(pixel)
    const alpha = boundary.has(pixel) ? .72 : 1
    for (let channel = 0; channel < 3; channel += 1) output.data[destination + channel] = Math.round(source.data[destination + channel] * (1 - alpha) + source.data[sample + channel] * alpha)
  })
  const sourceX = Math.round(component.minX + normal.x * chosenOffset); const sourceY = Math.round(component.minY + normal.y * chosenOffset)
  return { x: sourceX, y: sourceY, width: component.maxX - component.minX + 1, height: component.maxY - component.minY + 1 }
}

export async function createBrushCleanup(imageSrc: string, strokes: CleanupStroke[], corners: EntranceCorners, radius: 3 | 5 = 3): Promise<BrushCleanupResult> {
  if (!strokes.length) throw new Error('Brush over at least one detail before previewing cleanup.')
  const image = await loadImage(imageSrc)
  const width = image.naturalWidth; const height = image.naturalHeight
  const sourceCanvas = document.createElement('canvas'); const maskCanvas = document.createElement('canvas'); const outputCanvas = document.createElement('canvas')
  sourceCanvas.width = maskCanvas.width = outputCanvas.width = width; sourceCanvas.height = maskCanvas.height = outputCanvas.height = height
  const sourceContext = sourceCanvas.getContext('2d'); const maskContext = maskCanvas.getContext('2d'); const outputContext = outputCanvas.getContext('2d')
  if (!sourceContext || !maskContext || !outputContext) throw new Error('The cleanup preview could not be prepared.')
  sourceContext.drawImage(image, 0, 0); const sourceData = sourceContext.getImageData(0, 0, width, height); const outputData = new ImageData(new Uint8ClampedArray(sourceData.data), width, height)
  maskContext.fillStyle = '#000'; maskContext.fillRect(0, 0, width, height); maskContext.fillStyle = '#fff'
  const shorterEdge = Math.min(width, height)
  strokes.forEach((stroke) => {
    const brushRadius = Math.max(1, stroke.radius * shorterEdge)
    const stamp = (point: Point) => { maskContext.beginPath(); maskContext.arc(point.x * width, point.y * height, brushRadius + (radius === 5 ? 2 : 0), 0, Math.PI * 2); maskContext.fill() }
    stamp(stroke.points[0])
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1]; const point = stroke.points[index]; const distance = Math.hypot((point.x - previous.x) * width, (point.y - previous.y) * height)
      const steps = Math.max(1, Math.ceil(distance / Math.max(1, brushRadius * .45)))
      for (let step = 1; step <= steps; step += 1) stamp({ x: previous.x + (point.x - previous.x) * step / steps, y: previous.y + (point.y - previous.y) * step / steps })
    }
  })
  const rgba = maskContext.getImageData(0, 0, width, height).data
  const fullMask = new Uint8Array(width * height); const insideMask = new Uint8Array(width * height); const outsideMask = new Uint8Array(width * height)
  const polygon = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
  for (let index = 0; index < fullMask.length; index += 1) if (rgba[index * 4] > 127) {
    fullMask[index] = 255
    const point = { x: (index % width + .5) / width, y: (Math.floor(index / width) + .5) / height }
    if (pointInPolygon(point, polygon)) insideMask[index] = 255; else outsideMask[index] = 255
  }

  const components = componentsFor(outsideMask, width, height)
  const diagnostics: CleanupDiagnosticComponent[] = []
  const teleaComponents: PixelComponent[] = []
  for (const component of components) {
    const center = { x: (component.minX + component.maxX) / 2 / width, y: (component.minY + component.maxY) / 2 / height }
    const leftDistance = distanceToSegment(center, corners.topLeft, corners.bottomLeft) * Math.min(width, height)
    const rightDistance = distanceToSegment(center, corners.topRight, corners.bottomRight) * Math.min(width, height)
    const maxNearDistance = Math.max(28, Math.min(width, height) * .055)
    const side = leftDistance <= rightDistance ? 'left' : 'right'
    const nearSide = Math.min(leftDistance, rightDistance) <= maxNearDistance
    const box = { x: component.minX, y: component.minY, width: component.maxX - component.minX + 1, height: component.maxY - component.minY + 1 }
    if (nearSide) {
      const source = directionalPatch(component, side, corners, sourceData, outputData, fullMask)
      if (!source) throw new Error(UNSAFE_REPAIR_MESSAGE)
      diagnostics.push({ method: side === 'left' ? 'directional-left-patch' : 'directional-right-patch', destination: box, source })
    } else if (isCompactAndConsistent(component, sourceData, fullMask)) {
      teleaComponents.push(component); diagnostics.push({ method: 'telea-small-spot', destination: box })
    } else throw new Error(UNSAFE_REPAIR_MESSAGE)
  }

  const resources: any[] = []
  try {
    if (teleaComponents.length) {
      const teleaMaskCanvas = document.createElement('canvas'); teleaMaskCanvas.width = width; teleaMaskCanvas.height = height
      const context = teleaMaskCanvas.getContext('2d')!; const maskImage = context.createImageData(width, height)
      teleaComponents.forEach((component) => component.pixels.forEach((pixel) => { maskImage.data[pixel * 4] = maskImage.data[pixel * 4 + 1] = maskImage.data[pixel * 4 + 2] = maskImage.data[pixel * 4 + 3] = 255 }))
      context.putImageData(maskImage, 0, 0)
      const cv = await loadOpenCv(); const source = cv.imread(sourceCanvas); resources.push(source)
      const rgb = new cv.Mat(); resources.push(rgb); cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB)
      const maskRgba = cv.imread(teleaMaskCanvas); resources.push(maskRgba)
      const mask = new cv.Mat(); resources.push(mask); cv.cvtColor(maskRgba, mask, cv.COLOR_RGBA2GRAY)
      const cleaned = new cv.Mat(); resources.push(cleaned); cv.inpaint(rgb, mask, cleaned, radius, cv.INPAINT_TELEA)
      const cleanedCanvas = document.createElement('canvas'); cv.imshow(cleanedCanvas, cleaned); const cleanedData = cleanedCanvas.getContext('2d')!.getImageData(0, 0, width, height)
      teleaComponents.forEach((component) => component.pixels.forEach((pixel) => { for (let channel = 0; channel < 3; channel += 1) outputData.data[pixel * 4 + channel] = cleanedData.data[pixel * 4 + channel] }))
      teleaMaskCanvas.width = teleaMaskCanvas.height = cleanedCanvas.width = cleanedCanvas.height = 0
    }
    outputContext.putImageData(outputData, 0, 0)
    const [cleanedBlob, fullMaskBlob, insideMaskBlob, outsideMaskBlob] = await Promise.all([canvasBlob(outputCanvas), maskBlob(fullMask, width, height), maskBlob(insideMask, width, height), maskBlob(outsideMask, width, height)])
    return { cleanedBlob, fullMaskBlob, insideMaskBlob, outsideMaskBlob, width, height, components: diagnostics }
  } finally {
    resources.reverse().forEach((resource) => resource.delete?.())
    sourceCanvas.width = sourceCanvas.height = maskCanvas.width = maskCanvas.height = outputCanvas.width = outputCanvas.height = 0
  }
}
