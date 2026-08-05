import { isValidEntranceCorners, type CornerId, type EntranceCorners, type Point } from './EntranceSelector'
import { loadOpenCv } from './opencvLoader'

type EdgeName = 'top' | 'right' | 'bottom' | 'left'
type PixelLine = { a: Point; b: Point; score: number; source: 'gradient-fit' | 'manual' }
type DiagnosticLine = { a: Point; b: Point; kind: string }
type DiagnosticBox = { x: number; y: number; width: number; height: number; score: number; reason: string }

export type AutoFitResult = {
  corners: EntranceCorners
  detectedEdges: Record<EdgeName, boolean>
  detectedCount: number
  diagnostics: {
    width: number
    height: number
    bandWidth: number
    bands: DiagnosticLine[]
    segments: DiagnosticLine[]
    chosen: DiagnosticLine[]
    confidence: Record<EdgeName, number>
    reasons: Record<EdgeName, string>
  }
}

export type CleanupProposal = {
  cleanedBlob: Blob
  maskBlob: Blob
  confidence: 'high' | 'medium'
  score: number
  diagnostics: {
    width: number
    height: number
    zones: Point[][]
    boxes: DiagnosticBox[]
    selectedBox: DiagnosticBox
    widerSearch: boolean
  }
}

const EDGE_NAMES: EdgeName[] = ['top', 'right', 'bottom', 'left']
const EDGE_IDS: [CornerId, CornerId][] = [['topLeft', 'topRight'], ['topRight', 'bottomRight'], ['bottomRight', 'bottomLeft'], ['bottomLeft', 'topLeft']]

async function imageCanvas(src: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('The original house photo could not be loaded.'))
    element.src = src
  })
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The house photo could not be processed.')
  context.drawImage(image, 0, 0)
  return canvas
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The processed photo could not be encoded.')), 'image/png'))
}

function pixelCorners(corners: EntranceCorners, width: number, height: number): EntranceCorners {
  return Object.fromEntries(Object.entries(corners).map(([id, point]) => [id, { x: point.x * width, y: point.y * height }])) as EntranceCorners
}

function distanceToLine(point: Point, line: Pick<PixelLine, 'a' | 'b'>) {
  const dx = line.b.x - line.a.x
  const dy = line.b.y - line.a.y
  const length = Math.hypot(dx, dy)
  return length ? Math.abs(dy * point.x - dx * point.y + line.b.x * line.a.y - line.b.y * line.a.x) / length : Number.POSITIVE_INFINITY
}

function lineIntersection(first: PixelLine, second: PixelLine): Point | null {
  const x1 = first.a.x; const y1 = first.a.y; const x2 = first.b.x; const y2 = first.b.y
  const x3 = second.a.x; const y3 = second.a.y; const x4 = second.b.x; const y4 = second.b.y
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denominator) < 1e-7) return null
  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator,
  }
}

function pcaLine(points: Point[], reference: PixelLine): PixelLine | null {
  if (points.length < 12) return null
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 })
  let xx = 0; let xy = 0; let yy = 0
  points.forEach((point) => { const x = point.x - center.x; const y = point.y - center.y; xx += x * x; xy += x * y; yy += y * y })
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy)
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  let minimum = Number.POSITIVE_INFINITY; let maximum = Number.NEGATIVE_INFINITY
  points.forEach((point) => { const projection = (point.x - center.x) * direction.x + (point.y - center.y) * direction.y; minimum = Math.min(minimum, projection); maximum = Math.max(maximum, projection) })
  const a = { x: center.x + direction.x * minimum, y: center.y + direction.y * minimum }
  const b = { x: center.x + direction.x * maximum, y: center.y + direction.y * maximum }
  const referenceX = reference.b.x - reference.a.x; const referenceY = reference.b.y - reference.a.y
  const similarity = Math.abs((direction.x * referenceX + direction.y * referenceY) / Math.max(1, Math.hypot(referenceX, referenceY)))
  if (similarity < Math.cos(Math.PI / 5)) return null
  return { a, b, score: 0, source: 'gradient-fit' }
}

export async function autoFitEntrance(imageSrc: string, corners: EntranceCorners, options: { wider?: boolean } = {}): Promise<AutoFitResult> {
  const canvas = await imageCanvas(imageSrc)
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('The house photo could not be analyzed.')
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data
    const gray = new Float32Array(canvas.width * canvas.height)
    for (let pixel = 0, offset = 0; pixel < gray.length; pixel += 1, offset += 4) gray[pixel] = rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114
    const current = pixelCorners(corners, canvas.width, canvas.height)
    const manualLines = EDGE_IDS.map(([start, end]) => ({ a: current[start], b: current[end], score: 0, source: 'manual' as const }))
    const shorter = Math.min(canvas.width, canvas.height)
    const band = options.wider ? Math.max(16, Math.min(70, shorter * 0.045)) : Math.max(8, Math.min(35, shorter * 0.02))
    const movementLimit = options.wider ? Math.min(60, shorter * 0.04) : Math.min(30, shorter * 0.02)
    const sampleGray = (x: number, y: number) => {
      const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)))
      const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)))
      return gray[py * canvas.width + px]
    }
    const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0 }
    const angleDifference = (first: PixelLine, second: PixelLine) => {
      const dot = (first.b.x - first.a.x) * (second.b.x - second.a.x) + (first.b.y - first.a.y) * (second.b.y - second.a.y)
      const lengths = Math.hypot(first.b.x - first.a.x, first.b.y - first.a.y) * Math.hypot(second.b.x - second.a.x, second.b.y - second.a.y)
      return Math.acos(Math.max(-1, Math.min(1, Math.abs(dot / Math.max(1, lengths)))))
    }
    const fitRobustLine = (points: Point[], reference: PixelLine) => {
      if (points.length < 10) return null
      let best: Point[] = []
      const threshold = Math.max(1.5, Math.min(4, band * 0.12))
      for (let iteration = 0; iteration < 90; iteration += 1) {
        const first = points[(iteration * 17) % points.length]
        const second = points[(iteration * 37 + 7) % points.length]
        if (Math.hypot(second.x - first.x, second.y - first.y) < 4) continue
        const candidate: PixelLine = { a: first, b: second, score: 0, source: 'gradient-fit' }
        if (angleDifference(candidate, reference) > (options.wider ? 0.16 : 0.1)) continue
        const inliers = points.filter((point) => distanceToLine(point, candidate) <= threshold)
        if (inliers.length > best.length) best = inliers
      }
      const fitted = pcaLine(best, reference)
      return fitted ? { ...fitted, source: 'gradient-fit' as const, inliers: best } : null
    }

    const sampleDiagnostics: DiagnosticLine[] = []
    const refinements = manualLines.map((manual, edgeIndex) => {
      const dx = manual.b.x - manual.a.x; const dy = manual.b.y - manual.a.y; const length = Math.hypot(dx, dy)
      const direction = { x: dx / length, y: dy / length }; const normal = { x: -direction.y, y: direction.x }
      const sampleCount = Math.max(30, Math.min(80, Math.round(length / 12)))
      const candidates: Array<Point & { strength: number; offset: number }> = []
      for (let index = 0; index < sampleCount; index += 1) {
        const ratio = (index + 0.5) / sampleCount
        const origin = { x: manual.a.x + dx * ratio, y: manual.a.y + dy * ratio }
        let best: (Point & { strength: number; offset: number; value: number }) | null = null
        // Polygon edges run clockwise, so this normal points into the opening.
        // On the bottom edge, negative offsets move down toward porch/step lines.
        const minimumOffset = edgeIndex === 2 && !options.wider ? -band * 0.3 : -band
        const maximumOffset = band
        for (let offset = minimumOffset; offset <= maximumOffset; offset += 1) {
          const point = { x: origin.x + normal.x * offset, y: origin.y + normal.y * offset }
          if (point.x < 2 || point.x >= canvas.width - 2 || point.y < 2 || point.y >= canvas.height - 2) continue
          const strength = Math.abs(sampleGray(point.x + normal.x * 1.5, point.y + normal.y * 1.5) - sampleGray(point.x - normal.x * 1.5, point.y - normal.y * 1.5))
          const downwardPenalty = edgeIndex === 2 && offset < 0 ? Math.abs(offset) * 1.4 : 0
          const value = strength - Math.abs(offset) * (options.wider ? 0.12 : 0.22) - downwardPenalty
          if (!best || value > best.value) best = { ...point, strength, offset, value }
        }
        if (best) candidates.push(best)
      }
      const strengths = candidates.map((point) => point.strength)
      const strengthFloor = Math.max(10, median(strengths) * 0.65)
      const usable = candidates.filter((point) => point.strength >= strengthFloor)
      const offsetMedian = median(usable.map((point) => point.offset))
      const offsetMad = median(usable.map((point) => Math.abs(point.offset - offsetMedian)))
      const consistent = usable.filter((point) => Math.abs(point.offset - offsetMedian) <= Math.max(3, offsetMad * 2.8))
      consistent.forEach((point) => sampleDiagnostics.push({ a: { x: point.x - normal.x * 2, y: point.y - normal.y * 2 }, b: { x: point.x + normal.x * 2, y: point.y + normal.y * 2 }, kind: EDGE_NAMES[edgeIndex] }))
      const fitted = fitRobustLine(consistent, manual)
      if (!fitted) return { line: manual, confidence: 0, refined: false, reason: `${consistent.length}/${sampleCount} consistent gradient samples; insufficient line support` }
      const residual = median(fitted.inliers.map((point) => distanceToLine(point, fitted)))
      const movement = (distanceToLine(manual.a, fitted) + distanceToLine(manual.b, fitted)) / 2
      const angleDelta = angleDifference(fitted, manual)
      const support = fitted.inliers.length / sampleCount
      const strengthScore = Math.min(1, median(fitted.inliers.map((point) => {
        const match = consistent.find((candidate) => candidate.x === point.x && candidate.y === point.y)
        return match?.strength ?? 0
      })) / 45)
      const residualScore = Math.max(0, 1 - residual / Math.max(2, band * 0.18))
      const consistencyScore = Math.max(0, 1 - offsetMad / Math.max(3, band * 0.25))
      const angleScore = Math.max(0, 1 - angleDelta / (options.wider ? 0.16 : 0.1))
      const movementScore = Math.max(0, 1 - movement / Math.max(1, movementLimit))
      const confidence = support * 0.3 + strengthScore * 0.2 + residualScore * 0.18 + consistencyScore * 0.14 + angleScore * 0.1 + movementScore * 0.08
      const required = options.wider ? 0.55 : 0.6
      const refined = confidence >= required && movement <= movementLimit && fitted.inliers.length >= Math.max(12, sampleCount * 0.38)
      return { line: refined ? fitted : manual, confidence, refined, reason: refined ? `${fitted.inliers.length}/${sampleCount} samples, ${movement.toFixed(1)}px movement, ${residual.toFixed(1)}px residual` : `preserved: confidence ${confidence.toFixed(2)}, movement ${movement.toFixed(1)}px, ${fitted.inliers.length}/${sampleCount} inliers` }
    })

    const confidence = {} as Record<EdgeName, number>
    const reasons = {} as Record<EdgeName, string>
    const detectedEdges = {} as Record<EdgeName, boolean>
    const chosen = refinements.map((result, index) => { const name = EDGE_NAMES[index]; confidence[name] = result.confidence; detectedEdges[name] = result.refined; reasons[name] = result.reason; return result.line })
    const detectedCount = EDGE_NAMES.filter((name) => detectedEdges[name]).length
    const [top, right, bottom, left] = chosen
    const intersections = [lineIntersection(top, left), lineIntersection(top, right), lineIntersection(bottom, right), lineIntersection(bottom, left)]
    if (intersections.some((point) => !point)) return { corners, detectedEdges: { top: false, right: false, bottom: false, left: false }, detectedCount: 0, diagnostics: { width: canvas.width, height: canvas.height, bandWidth: band, bands: manualLines.map((line) => ({ a: line.a, b: line.b, kind: 'band' })), segments: sampleDiagnostics, chosen: manualLines.map((line) => ({ a: line.a, b: line.b, kind: 'manual' })), confidence, reasons } }
    const points = intersections as Point[]
    const proposed: EntranceCorners = {
      topLeft: { x: points[0].x / canvas.width, y: points[0].y / canvas.height }, topRight: { x: points[1].x / canvas.width, y: points[1].y / canvas.height },
      bottomRight: { x: points[2].x / canvas.width, y: points[2].y / canvas.height }, bottomLeft: { x: points[3].x / canvas.width, y: points[3].y / canvas.height },
    }
    const ids = Object.keys(proposed) as CornerId[]
    const cornerLimit = options.wider ? 80 : 40
    const area = Math.abs(points.reduce((sum, point, index) => sum + point.x * points[(index + 1) % 4].y - points[(index + 1) % 4].x * point.y, 0)) / 2
    if (!isValidEntranceCorners(proposed) || area < canvas.width * canvas.height * 0.01 || ids.some((id) => Math.hypot((proposed[id].x - corners[id].x) * canvas.width, (proposed[id].y - corners[id].y) * canvas.height) > cornerLimit)) {
      EDGE_NAMES.forEach((name) => { detectedEdges[name] = false; reasons[name] = `preserved: combined refined shape failed safety validation` })
      return { corners, detectedEdges, detectedCount: 0, diagnostics: { width: canvas.width, height: canvas.height, bandWidth: band, bands: manualLines.map((line) => ({ a: line.a, b: line.b, kind: 'band' })), segments: sampleDiagnostics, chosen: manualLines.map((line) => ({ a: line.a, b: line.b, kind: 'manual' })), confidence, reasons } }
    }
    return {
      corners: proposed, detectedEdges, detectedCount,
      diagnostics: {
        width: canvas.width, height: canvas.height, bandWidth: band, bands: manualLines.map((line) => ({ a: line.a, b: line.b, kind: 'band' })),
        segments: sampleDiagnostics.slice(0, 320),
        chosen: chosen.map((line, index) => ({ a: line.a, b: line.b, kind: detectedEdges[EDGE_NAMES[index]] ? 'detected' : 'manual' })), confidence, reasons,
      },
    }
  } finally {
    canvas.width = 0; canvas.height = 0
  }
}

function straddlingEdgeZone(edgeStart: Point, edgeEnd: Point, center: Point, inside: number, outside: number, startRatio = 0.2, endRatio = 0.88) {
  const dx = edgeEnd.x - edgeStart.x; const dy = edgeEnd.y - edgeStart.y
  let normal = { x: -dy / Math.max(1, Math.hypot(dx, dy)), y: dx / Math.max(1, Math.hypot(dx, dy)) }
  const midpoint = { x: (edgeStart.x + edgeEnd.x) / 2, y: (edgeStart.y + edgeEnd.y) / 2 }
  if ((center.x - midpoint.x) * normal.x + (center.y - midpoint.y) * normal.y > 0) normal = { x: -normal.x, y: -normal.y }
  const at = (ratio: number) => ({ x: edgeStart.x + dx * ratio, y: edgeStart.y + dy * ratio })
  const start = at(startRatio); const end = at(endRatio)
  return [{ x: start.x - normal.x * inside, y: start.y - normal.y * inside }, { x: end.x - normal.x * inside, y: end.y - normal.y * inside }, { x: end.x + normal.x * outside, y: end.y + normal.y * outside }, { x: start.x + normal.x * outside, y: start.y + normal.y * outside }]
}

export async function autoCleanHardware(imageSrc: string, corners: EntranceCorners, options: { wider?: boolean; radius?: 3 | 5 } = {}): Promise<CleanupProposal> {
  const cv = await loadOpenCv()
  const canvas = await imageCanvas(imageSrc)
  const resources: any[] = []
  try {
    const source = cv.imread(canvas); resources.push(source)
    const rgb = new cv.Mat(); const gray = new cv.Mat(); resources.push(rgb, gray)
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB); cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY)
    const localMean = new cv.Mat(); const grayContrast = new cv.Mat(); const contrastMask = new cv.Mat(); resources.push(localMean, grayContrast, contrastMask)
    cv.GaussianBlur(gray, localMean, new cv.Size(17, 17), 0); cv.absdiff(gray, localMean, grayContrast); cv.threshold(grayContrast, contrastMask, options.wider ? 15 : 19, 255, cv.THRESH_BINARY)
    const adaptive = new cv.Mat(); resources.push(adaptive); cv.adaptiveThreshold(gray, adaptive, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 5)
    const colorMean = new cv.Mat(); const colorDifference = new cv.Mat(); const colorContrast = new cv.Mat(); resources.push(colorMean, colorDifference, colorContrast)
    cv.GaussianBlur(rgb, colorMean, new cv.Size(17, 17), 0); cv.absdiff(rgb, colorMean, colorDifference); cv.cvtColor(colorDifference, colorContrast, cv.COLOR_RGB2GRAY); cv.threshold(colorContrast, colorContrast, options.wider ? 13 : 17, 255, cv.THRESH_BINARY)
    const edges = new cv.Mat(); resources.push(edges); cv.Canny(gray, edges, 42, 130, 3, true)
    const combined = new cv.Mat(); resources.push(combined); cv.bitwise_or(contrastMask, adaptive, combined); cv.bitwise_or(combined, colorContrast, combined); cv.bitwise_or(combined, edges, combined)

    const current = pixelCorners(corners, canvas.width, canvas.height)
    const center = { x: (current.topLeft.x + current.topRight.x + current.bottomRight.x + current.bottomLeft.x) / 4, y: (current.topLeft.y + current.topRight.y + current.bottomRight.y + current.bottomLeft.y) / 4 }
    const openingWidth = (Math.hypot(current.topRight.x - current.topLeft.x, current.topRight.y - current.topLeft.y) + Math.hypot(current.bottomRight.x - current.bottomLeft.x, current.bottomRight.y - current.bottomLeft.y)) / 2
    const entranceHeight = (Math.hypot(current.bottomLeft.x - current.topLeft.x, current.bottomLeft.y - current.topLeft.y) + Math.hypot(current.bottomRight.x - current.topRight.x, current.bottomRight.y - current.topRight.y)) / 2
    const nominalTotal = openingWidth * (options.wider ? 0.27 : 0.19)
    const totalDepth = Math.max(20, Math.min(options.wider ? 128 : 96, nominalTotal))
    const inside = totalDepth * (4 / 19); const outside = totalDepth - inside
    const zones = [straddlingEdgeZone(current.topLeft, current.bottomLeft, center, inside, outside), straddlingEdgeZone(current.topRight, current.bottomRight, center, inside, outside)]
    const zoneMask = cv.Mat.zeros(source.rows, source.cols, cv.CV_8UC1); resources.push(zoneMask)
    zones.forEach((zone) => {
      const points = cv.matFromArray(4, 1, cv.CV_32SC2, zone.flatMap((point) => [Math.round(point.x), Math.round(point.y)])); const vector = new cv.MatVector(); resources.push(points, vector); vector.push_back(points); cv.fillPoly(zoneMask, vector, new cv.Scalar(255))
    })
    cv.bitwise_and(combined, zoneMask, combined)
    const closeSize = Math.max(3, Math.min(9, Math.round(Math.min(canvas.width, canvas.height) / 450) * 2 + 1))
    const closeKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(closeSize, closeSize)); resources.push(closeKernel); cv.morphologyEx(combined, combined, cv.MORPH_CLOSE, closeKernel)
    const contours = new cv.MatVector(); const hierarchy = new cv.Mat(); resources.push(contours, hierarchy); cv.findContours(combined, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    const boxes: DiagnosticBox[] = []
    let best: { contour: any; score: number; box: DiagnosticBox } | null = null
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index); const area = cv.contourArea(contour); const rect = cv.boundingRect(contour)
      const aspect = Math.max(rect.width / Math.max(1, rect.height), rect.height / Math.max(1, rect.width)); const fill = area / Math.max(1, rect.width * rect.height)
      const boxCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      const edgeDistance = Math.min(distanceToLine(boxCenter, { a: current.topLeft, b: current.bottomLeft }), distanceToLine(boxCenter, { a: current.topRight, b: current.bottomRight }))
      const vertical = rect.height >= rect.width
      const compact = aspect <= 3.5 && area >= 8 && fill >= 0.07
      const elongated = vertical && aspect <= 10 && rect.width >= 3 && rect.height <= entranceHeight * 0.55 && area >= 14 && fill >= 0.035
      const structural = rect.height > entranceHeight * 0.62 || (Math.min(rect.width, rect.height) <= 2 && Math.max(rect.width, rect.height) > entranceHeight * 0.2) || edgeDistance > totalDepth * 0.9
      let reason = compact ? 'compact hardware profile' : elongated ? 'vertical handleset profile' : 'shape did not match hardware profiles'
      if (structural) reason = 'rejected as probable trim or structural line'
      const contrastRegion = grayContrast.roi(rect)
      const contrastValue = cv.mean(contrastRegion)[0]
      contrastRegion.delete()
      const proximity = Math.max(0, 1 - edgeDistance / Math.max(1, totalDepth))
      const sizeScore = Math.min(1.5, area / Math.max(25, openingWidth * 0.12))
      const score = structural || (!compact && !elongated) ? 0 : proximity * 1.8 + Math.min(1.5, contrastValue / 22) + sizeScore + Math.min(1, fill * (compact ? 2.5 : 5)) + (elongated ? 0.45 : 0.2)
      const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, score, reason }; if (boxes.length < 400) boxes.push(box)
      if (score > 0 && (!best || score > best.score)) { best?.contour.delete(); best = { contour, score, box } } else contour.delete()
    }
    const mediumThreshold = options.wider ? 1.35 : 1.55; const highThreshold = 3.1
    if (!best || best.score < mediumThreshold) { best?.contour.delete(); throw new Error('No reliable old hardware was found near the confirmed entrance edges. The new door may already cover the original hardware, or you can try a wider search.') }
    const removalMask = cv.Mat.zeros(source.rows, source.cols, cv.CV_8UC1); resources.push(removalMask)
    const selected = new cv.MatVector(); resources.push(selected); selected.push_back(best.contour); cv.drawContours(removalMask, selected, 0, new cv.Scalar(255), -1); best.contour.delete()
    const shorterImageEdge = Math.min(canvas.width, canvas.height)
    const dilationSize = shorterImageEdge < 1000 ? 5 : shorterImageEdge < 2200 ? 7 : 9
    const dilation = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(dilationSize, dilationSize)); resources.push(dilation); cv.dilate(removalMask, removalMask, dilation)
    const cleaned = new cv.Mat(); resources.push(cleaned); cv.inpaint(rgb, removalMask, cleaned, options.radius ?? 3, cv.INPAINT_TELEA)
    const cleanedCanvas = document.createElement('canvas'); const maskCanvas = document.createElement('canvas'); cv.imshow(cleanedCanvas, cleaned); cv.imshow(maskCanvas, removalMask)
    const [cleanedBlob, maskBlob] = await Promise.all([canvasBlob(cleanedCanvas), canvasBlob(maskCanvas)]); cleanedCanvas.width = 0; cleanedCanvas.height = 0; maskCanvas.width = 0; maskCanvas.height = 0
    const diagnosticBoxes = boxes.includes(best.box) ? boxes : [best.box, ...boxes.slice(0, 399)]
    return { cleanedBlob, maskBlob, confidence: best.score >= highThreshold ? 'high' : 'medium', score: best.score, diagnostics: { width: canvas.width, height: canvas.height, zones, boxes: diagnosticBoxes, selectedBox: best.box, widerSearch: Boolean(options.wider) } }
  } finally {
    resources.reverse().forEach((resource) => resource.delete?.())
    canvas.width = 0; canvas.height = 0
  }
}
