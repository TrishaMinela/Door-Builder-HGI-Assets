import { useEffect, useRef } from 'react'
import type { EntranceCorners, Point } from './EntranceSelector'

type Props = {
  corners: EntranceCorners
  doorSourceUrl: string
  photoHeight: number
  photoWidth: number
  visible: boolean
  sourceRect?: { x: number; y: number; width: number; height: number }
  diagnosticName?: string
  flipX?: boolean
}

type Matrix = [number, number, number, number, number, number, number, number, number]
// Product layers tuck beneath the adjacent jamb/frame mask. Four source-photo
// pixels is enough to cover rasterized edge fringes without visibly enlarging
// the configured slab or sidelites.
const EDGE_OVERLAP_PX = 6
const SUPERSAMPLE_SCALE = 4
const MAX_SUPERSAMPLED_PIXELS = 12_000_000
const MAX_TEMPORARY_CANVAS_DIMENSION = 4096
const VISIBLE_ALPHA_THRESHOLD = 20
const OPAQUE_PRODUCT_THRESHOLD = .015
const MATTE_EXTRUSION_RADIUS = 4

function extrudeTransparentEdgeColors(source: ImageData) {
  const original = new Uint8ClampedArray(source.data)
  let transparentWhiteMattePixels = 0
  let extrudedPixels = 0
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    const offset = (y * source.width + x) * 4
    if (original[offset + 3] >= 245) continue
    if (original[offset] > 240 && original[offset + 1] > 240 && original[offset + 2] > 240) transparentWhiteMattePixels += 1
    let nearestOffset = -1; let nearestDistance = Number.POSITIVE_INFINITY
    for (let dy = -MATTE_EXTRUSION_RADIUS; dy <= MATTE_EXTRUSION_RADIUS; dy += 1) for (let dx = -MATTE_EXTRUSION_RADIUS; dx <= MATTE_EXTRUSION_RADIUS; dx += 1) {
      const distance = dx * dx + dy * dy
      if (!distance || distance >= nearestDistance) continue
      const px = x + dx; const py = y + dy
      if (px < 0 || px >= source.width || py < 0 || py >= source.height) continue
      const candidate = (py * source.width + px) * 4
      if (original[candidate + 3] < 245) continue
      nearestOffset = candidate; nearestDistance = distance
    }
    if (nearestOffset < 0) continue
    source.data[offset] = original[nearestOffset]
    source.data[offset + 1] = original[nearestOffset + 1]
    source.data[offset + 2] = original[nearestOffset + 2]
    // Preserve authored alpha; only hidden RGB is extruded for safe interpolation.
    extrudedPixels += 1
  }
  return { transparentWhiteMattePixels, extrudedPixels }
}

function reportUnexpectedWhiteEdgePixels(source: ImageData, left: number, top: number, width: number, height: number, name: string) {
  if (!import.meta.env.DEV) return
  const edgeBand = Math.max(1, Math.round(Math.min(width, height) * .025))
  let opaqueEdgePixels = 0
  let nearlyWhiteEdgePixels = 0
  for (let y = Math.max(0, top); y < Math.min(source.height, top + height); y += 1) {
    for (let x = Math.max(0, left); x < Math.min(source.width, left + width); x += 1) {
      if (x >= left + edgeBand && x < left + width - edgeBand) continue
      const offset = (y * source.width + x) * 4
      if (source.data[offset + 3] < 245) continue
      opaqueEdgePixels += 1
      if (source.data[offset] > 242 && source.data[offset + 1] > 242 && source.data[offset + 2] > 242) nearlyWhiteEdgePixels += 1
    }
  }
  // Glass inserts are intentionally ignored because they sit inside the source;
  // this diagnostic only examines the vertical product-edge bands where strips occur.
  if (opaqueEdgePixels && nearlyWhiteEdgePixels / opaqueEdgePixels > .2) console.warn('[home-visualizer:unexpected-white-edge]', { layer: name, nearlyWhiteEdgePixels, opaqueEdgePixels })
}

function tightAlphaBounds(source: ImageData, sourceRect: { x: number; y: number; width: number; height: number }) {
  const initialLeft=Math.max(0,Math.floor(sourceRect.x*source.width)),initialTop=Math.max(0,Math.floor(sourceRect.y*source.height)),initialRight=Math.min(source.width-1,Math.ceil((sourceRect.x+sourceRect.width)*source.width)-1),initialBottom=Math.min(source.height-1,Math.ceil((sourceRect.y+sourceRect.height)*source.height)-1)
  let left=initialRight,top=initialBottom,right=initialLeft,bottom=initialTop
  for(let y=initialTop;y<=initialBottom;y+=1){for(let x=initialLeft;x<=initialRight;x+=1){if(source.data[(y*source.width+x)*4+3]<=VISIBLE_ALPHA_THRESHOLD)continue;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
  if(right<left||bottom<top)return{left:initialLeft,top:initialTop,width:initialRight-initialLeft+1,height:initialBottom-initialTop+1}
  return{left,top,width:right-left+1,height:bottom-top+1}
}

function lineIntersection(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point) {
  const firstX = firstEnd.x - firstStart.x
  const firstY = firstEnd.y - firstStart.y
  const secondX = secondEnd.x - secondStart.x
  const secondY = secondEnd.y - secondStart.y
  const denominator = firstX * secondY - firstY * secondX
  if (Math.abs(denominator) < 1e-8) return null
  const offsetX = secondStart.x - firstStart.x
  const offsetY = secondStart.y - firstStart.y
  const ratio = (offsetX * secondY - offsetY * secondX) / denominator
  return { x: firstStart.x + ratio * firstX, y: firstStart.y + ratio * firstY }
}

function overscanQuadrilateral(points: Point[], overlap: number) {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]
    return area + point.x * next.y - next.x * point.y
  }, 0)
  const orientation = signedArea >= 0 ? 1 : -1
  const offsetEdges = points.map((point, index) => {
    const next = points[(index + 1) % points.length]
    const edgeX = next.x - point.x
    const edgeY = next.y - point.y
    const length = Math.hypot(edgeX, edgeY)
    if (!length) return { start: point, end: next }
    const normalX = edgeY / length * orientation * overlap
    const normalY = -edgeX / length * orientation * overlap
    return {
      start: { x: point.x + normalX, y: point.y + normalY },
      end: { x: next.x + normalX, y: next.y + normalY },
    }
  })
  return points.map((point, index) => {
    const previous = offsetEdges[(index + offsetEdges.length - 1) % offsetEdges.length]
    const current = offsetEdges[index]
    const intersection = lineIntersection(previous.start, previous.end, current.start, current.end)
    if (!intersection) return current.start
    // Prevent an extreme perspective corner from creating a visible miter spike.
    const distance = Math.hypot(intersection.x - point.x, intersection.y - point.y)
    const maximumDistance = overlap * 2.5
    if (distance <= maximumDistance) return intersection
    return {
      x: point.x + (intersection.x - point.x) / distance * maximumDistance,
      y: point.y + (intersection.y - point.y) / distance * maximumDistance,
    }
  })
}

function squareToQuadrilateral([topLeft, topRight, bottomRight, bottomLeft]: Point[]): Matrix | null {
  const dx1 = topRight.x - bottomRight.x
  const dx2 = bottomLeft.x - bottomRight.x
  const dx3 = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x
  const dy1 = topRight.y - bottomRight.y
  const dy2 = bottomLeft.y - bottomRight.y
  const dy3 = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y
  const denominator = dx1 * dy2 - dx2 * dy1
  if (Math.abs(denominator) < 1e-8) return null
  const projectiveX = (dx3 * dy2 - dx2 * dy3) / denominator
  const projectiveY = (dx1 * dy3 - dx3 * dy1) / denominator
  return [
    topRight.x - topLeft.x + projectiveX * topRight.x,
    bottomLeft.x - topLeft.x + projectiveY * bottomLeft.x,
    topLeft.x,
    topRight.y - topLeft.y + projectiveX * topRight.y,
    bottomLeft.y - topLeft.y + projectiveY * bottomLeft.y,
    topLeft.y,
    projectiveX,
    projectiveY,
    1,
  ]
}

function invert(matrix: Matrix): Matrix | null {
  const [a, b, c, d, e, f, g, h, i] = matrix
  const A = e * i - f * h
  const B = c * h - b * i
  const C = b * f - c * e
  const D = f * g - d * i
  const E = a * i - c * g
  const F = c * d - a * f
  const G = d * h - e * g
  const H = b * g - a * h
  const I = a * e - b * d
  const determinant = a * A + b * D + c * G
  if (Math.abs(determinant) < 1e-8) return null
  return [A / determinant, B / determinant, C / determinant, D / determinant, E / determinant, F / determinant, G / determinant, H / determinant, I / determinant]
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The configured door source could not be loaded.'))
    image.src = src
  })
}

export function PerspectiveDoorCanvas({ corners, doorSourceUrl, photoHeight, photoWidth, visible, sourceRect = { x: 0, y: 0, width: 1, height: 1 }, diagnosticName = 'configured-door', flipX = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderRunRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photoWidth || !photoHeight || !doorSourceUrl) return
    const run = ++renderRunRef.current
    canvas.dataset.renderReady = 'false'
    const outputWidth = photoWidth
    const outputHeight = photoHeight
    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext('2d')
    if (context) {
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.clearRect(0, 0, outputWidth, outputHeight)
    }

    const render = async () => {
      const sourceImage = await loadImage(doorSourceUrl)
      if (renderRunRef.current !== run) return
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = sourceImage.naturalWidth
      sourceCanvas.height = sourceImage.naturalHeight
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
      const outputContext = canvas.getContext('2d')
      if (!sourceContext || !outputContext) return
      sourceContext.imageSmoothingEnabled = true
      sourceContext.imageSmoothingQuality = 'high'
      outputContext.imageSmoothingEnabled = true
      outputContext.imageSmoothingQuality = 'high'
      sourceContext.drawImage(sourceImage, 0, 0)
      const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
      const matteDiagnostics = extrudeTransparentEdgeColors(source)
      const tightSource=tightAlphaBounds(source,sourceRect)
      const sourceLeft=tightSource.left
      const sourceTop=tightSource.top
      const sourceSpanWidth=tightSource.width
      const sourceSpanHeight=tightSource.height
      reportUnexpectedWhiteEdgePixels(source, Math.round(sourceLeft), Math.round(sourceTop), Math.round(sourceSpanWidth), Math.round(sourceSpanHeight), diagnosticName)
      if (import.meta.env.DEV) console.debug('[home-visualizer:transparent-edge-extrusion]', { layer: diagnosticName, radius: MATTE_EXTRUSION_RADIUS, ...matteDiagnostics })
      const confirmedPoints = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
        .map(({ x, y }) => ({ x: x * outputWidth, y: y * outputHeight }))
      const targetPoints = overscanQuadrilateral(confirmedPoints, EDGE_OVERLAP_PX)
      const minX = Math.max(0, Math.floor(Math.min(...targetPoints.map((point) => point.x)) - 1))
      const maxX = Math.min(outputWidth, Math.ceil(Math.max(...targetPoints.map((point) => point.x)) + 1))
      const minY = Math.max(0, Math.floor(Math.min(...targetPoints.map((point) => point.y)) - 1))
      const maxY = Math.min(outputHeight, Math.ceil(Math.max(...targetPoints.map((point) => point.y)) + 1))
      const regionWidth = Math.max(1, maxX - minX)
      const regionHeight = Math.max(1, maxY - minY)
      const regionPixels = regionWidth * regionHeight
      let supersampleScale = SUPERSAMPLE_SCALE
      while (supersampleScale > 1 && (regionPixels * supersampleScale * supersampleScale > MAX_SUPERSAMPLED_PIXELS || regionWidth * supersampleScale > MAX_TEMPORARY_CANVAS_DIMENSION || regionHeight * supersampleScale > MAX_TEMPORARY_CANVAS_DIMENSION)) supersampleScale -= 1
      const renderWidth = regionWidth * supersampleScale
      const renderHeight = regionHeight * supersampleScale
      const renderPoints = targetPoints.map((point) => ({
        x: (point.x - minX) * supersampleScale,
        y: (point.y - minY) * supersampleScale,
      }))
      if (import.meta.env.DEV) console.debug('[home-visualizer:warp-resolution]', { layer: diagnosticName, regionWidth, regionHeight, supersampleScale, renderWidth, renderHeight, maximumTemporaryPixels: MAX_SUPERSAMPLED_PIXELS, maximumTemporaryDimension: MAX_TEMPORARY_CANVAS_DIMENSION })
      const forward = squareToQuadrilateral(renderPoints)
      const inverse = forward ? invert(forward) : null
      if (!inverse) return

      const warped = outputContext.createImageData(renderWidth, renderHeight)
      const [a, b, c, d, e, f, g, h, i] = inverse

      for (let y = 0; y < renderHeight; y += 1) {
        for (let x = 0; x < renderWidth; x += 1) {
          const denominator = g * x + h * y + i
          if (Math.abs(denominator) < 1e-8) continue
          const unitX = (a * x + b * y + c) / denominator
          const unitY = (d * x + e * y + f) / denominator
          if (unitX < 0 || unitX > 1 || unitY < 0 || unitY > 1) continue
          // Convert the normalized crop to its exact half-open source-pixel interval.
          // Sampling from first pixel through last pixel keeps interpolation out of
          // the transparent mullion columns that separate authored product regions.
          const sourceX = Math.min(source.width - 1, Math.max(0, sourceLeft + (flipX ? 1 - unitX : unitX) * Math.max(0, sourceSpanWidth - 1)))
          const sourceY = Math.min(source.height - 1, Math.max(0, sourceTop + unitY * Math.max(0, sourceSpanHeight - 1)))
          const x0 = Math.floor(sourceX)
          const y0 = Math.floor(sourceY)
          const x1 = Math.min(source.width - 1, x0 + 1)
          const y1 = Math.min(source.height - 1, y0 + 1)
          const fractionX = sourceX - x0
          const fractionY = sourceY - y0
          const offset00 = (y0 * source.width + x0) * 4
          const offset10 = (y0 * source.width + x1) * 4
          const offset01 = (y1 * source.width + x0) * 4
          const offset11 = (y1 * source.width + x1) * 4
          const weight00 = (1 - fractionX) * (1 - fractionY)
          const weight10 = fractionX * (1 - fractionY)
          const weight01 = (1 - fractionX) * fractionY
          const weight11 = fractionX * fractionY
          const alpha00 = source.data[offset00 + 3] / 255
          const alpha10 = source.data[offset10 + 3] / 255
          const alpha01 = source.data[offset01 + 3] / 255
          const alpha11 = source.data[offset11 + 3] / 255
          const alphaWeight00 = weight00 * alpha00
          const alphaWeight10 = weight10 * alpha10
          const alphaWeight01 = weight01 * alpha01
          const alphaWeight11 = weight11 * alpha11
          const targetOffset = (y * renderWidth + x) * 4
          const sampledAlpha = alphaWeight00 + alphaWeight10 + alphaWeight01 + alphaWeight11
          // The configured slab and sidelites must fully replace the photographed
          // product. Promote authored product pixels to full coverage while keeping
          // the lowest alpha samples as a smooth supersampled outer-edge transition.
          if (sampledAlpha > .001) {
            warped.data[targetOffset] = (source.data[offset00] * alphaWeight00 + source.data[offset10] * alphaWeight10 + source.data[offset01] * alphaWeight01 + source.data[offset11] * alphaWeight11) / sampledAlpha
            warped.data[targetOffset + 1] = (source.data[offset00 + 1] * alphaWeight00 + source.data[offset10 + 1] * alphaWeight10 + source.data[offset01 + 1] * alphaWeight01 + source.data[offset11 + 1] * alphaWeight11) / sampledAlpha
            warped.data[targetOffset + 2] = (source.data[offset00 + 2] * alphaWeight00 + source.data[offset10 + 2] * alphaWeight10 + source.data[offset01 + 2] * alphaWeight01 + source.data[offset11 + 2] * alphaWeight11) / sampledAlpha
            warped.data[targetOffset + 3] = Math.min(1,sampledAlpha/OPAQUE_PRODUCT_THRESHOLD)*255
          }
        }
      }
      if (renderRunRef.current === run) {
        const supersampledCanvas = document.createElement('canvas')
        supersampledCanvas.width = renderWidth
        supersampledCanvas.height = renderHeight
        const supersampledContext = supersampledCanvas.getContext('2d')
        if (supersampledContext) {
          supersampledContext.putImageData(warped, 0, 0)
          outputContext.drawImage(supersampledCanvas, 0, 0, renderWidth, renderHeight, minX, minY, regionWidth, regionHeight)
          canvas.dataset.renderReady = 'true'
          if (import.meta.env.DEV) {
            const renderedRegion = outputContext.getImageData(minX, minY, regionWidth, regionHeight)
            reportUnexpectedWhiteEdgePixels(renderedRegion, 0, 0, regionWidth, regionHeight, `${diagnosticName}-warped`)
          }
        }
        supersampledCanvas.width = 0
        supersampledCanvas.height = 0
      }
      sourceCanvas.width = 0
      sourceCanvas.height = 0
    }

    void render().catch((reason) => {
      if (renderRunRef.current !== run) return
      canvas.dataset.renderReady = 'error'
      if (import.meta.env.DEV) console.error('[home-visualizer:door-warp-error]', { layer: diagnosticName, reason })
    })
    return () => { renderRunRef.current += 1 }
  }, [corners, diagnosticName, doorSourceUrl, flipX, photoHeight, photoWidth, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height])

  return <canvas ref={canvasRef} className="perspective-door-canvas" style={{ opacity: visible ? 1 : 0 }} aria-hidden="true" />
}
