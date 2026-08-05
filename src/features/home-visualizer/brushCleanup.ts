import type { CleanupStroke } from './CleanupBrushEditor'
import { loadOpenCv } from './opencvLoader'

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

export async function createBrushCleanup(imageSrc: string, strokes: CleanupStroke[], radius: 3 | 5 = 3) {
  if (!strokes.length) throw new Error('Brush over at least one detail before previewing cleanup.')
  const image = await loadImage(imageSrc)
  const sourceCanvas = document.createElement('canvas')
  const maskCanvas = document.createElement('canvas')
  sourceCanvas.width = maskCanvas.width = image.naturalWidth
  sourceCanvas.height = maskCanvas.height = image.naturalHeight
  const sourceContext = sourceCanvas.getContext('2d')
  const maskContext = maskCanvas.getContext('2d')
  if (!sourceContext || !maskContext) throw new Error('The cleanup preview could not be prepared.')
  sourceContext.drawImage(image, 0, 0)
  maskContext.fillStyle = '#000'
  maskContext.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  maskContext.strokeStyle = '#fff'
  maskContext.fillStyle = '#fff'
  maskContext.lineCap = 'round'
  maskContext.lineJoin = 'round'
  const shorterEdge = Math.min(maskCanvas.width, maskCanvas.height)
  strokes.forEach((stroke) => {
    const brushRadius = Math.max(1, stroke.radius * shorterEdge)
    maskContext.lineWidth = brushRadius * 2
    if (stroke.points.length === 1) {
      maskContext.beginPath()
      maskContext.arc(stroke.points[0].x * maskCanvas.width, stroke.points[0].y * maskCanvas.height, brushRadius, 0, Math.PI * 2)
      maskContext.fill()
      return
    }
    maskContext.beginPath()
    stroke.points.forEach((point, index) => index ? maskContext.lineTo(point.x * maskCanvas.width, point.y * maskCanvas.height) : maskContext.moveTo(point.x * maskCanvas.width, point.y * maskCanvas.height))
    maskContext.stroke()
  })

  const cv = await loadOpenCv()
  const resources: any[] = []
  const outputCanvas = document.createElement('canvas')
  try {
    const source = cv.imread(sourceCanvas); resources.push(source)
    const rgb = new cv.Mat(); resources.push(rgb); cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB)
    const maskRgba = cv.imread(maskCanvas); resources.push(maskRgba)
    const mask = new cv.Mat(); resources.push(mask); cv.cvtColor(maskRgba, mask, cv.COLOR_RGBA2GRAY)
    const cleaned = new cv.Mat(); resources.push(cleaned)
    cv.inpaint(rgb, mask, cleaned, radius, cv.INPAINT_TELEA)
    cv.imshow(outputCanvas, cleaned)
    return await canvasBlob(outputCanvas)
  } finally {
    resources.reverse().forEach((resource) => resource.delete?.())
    sourceCanvas.width = sourceCanvas.height = 0
    maskCanvas.width = maskCanvas.height = 0
    outputCanvas.width = outputCanvas.height = 0
  }
}
