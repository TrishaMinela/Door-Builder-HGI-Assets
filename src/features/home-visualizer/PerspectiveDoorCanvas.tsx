import { useEffect, useRef } from 'react'
import type { EntranceCorners, Point } from './EntranceSelector'

type Props = {
  corners: EntranceCorners
  doorSourceUrl: string
  height: number
  visible: boolean
  width: number
}

type Matrix = [number, number, number, number, number, number, number, number, number]

const MAX_WORKING_EDGE = 1600

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

export function PerspectiveDoorCanvas({ corners, doorSourceUrl, height, visible, width }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderRunRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !width || !height || !doorSourceUrl) return
    const run = ++renderRunRef.current
    const workingScale = Math.min(window.devicePixelRatio || 1, MAX_WORKING_EDGE / Math.max(width, height))
    const outputWidth = Math.max(1, Math.round(width * workingScale))
    const outputHeight = Math.max(1, Math.round(height * workingScale))
    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, outputWidth, outputHeight)

    const render = async () => {
      const sourceImage = await loadImage(doorSourceUrl)
      if (renderRunRef.current !== run) return
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = sourceImage.naturalWidth
      sourceCanvas.height = sourceImage.naturalHeight
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
      const outputContext = canvas.getContext('2d')
      if (!sourceContext || !outputContext) return
      sourceContext.drawImage(sourceImage, 0, 0)
      const source = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
      const targetPoints = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
        .map(({ x, y }) => ({ x: x * outputWidth, y: y * outputHeight }))
      const forward = squareToQuadrilateral(targetPoints)
      const inverse = forward ? invert(forward) : null
      if (!inverse) return

      const minX = Math.max(0, Math.floor(Math.min(...targetPoints.map((point) => point.x))))
      const maxX = Math.min(outputWidth - 1, Math.ceil(Math.max(...targetPoints.map((point) => point.x))))
      const minY = Math.max(0, Math.floor(Math.min(...targetPoints.map((point) => point.y))))
      const maxY = Math.min(outputHeight - 1, Math.ceil(Math.max(...targetPoints.map((point) => point.y))))
      const warped = outputContext.createImageData(outputWidth, outputHeight)
      const [a, b, c, d, e, f, g, h, i] = inverse

      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const denominator = g * x + h * y + i
          if (Math.abs(denominator) < 1e-8) continue
          const unitX = (a * x + b * y + c) / denominator
          const unitY = (d * x + e * y + f) / denominator
          if (unitX < 0 || unitX > 1 || unitY < 0 || unitY > 1) continue
          const sourceX = Math.min(source.width - 1, Math.max(0, Math.round(unitX * (source.width - 1))))
          const sourceY = Math.min(source.height - 1, Math.max(0, Math.round(unitY * (source.height - 1))))
          const sourceOffset = (sourceY * source.width + sourceX) * 4
          const targetOffset = (y * outputWidth + x) * 4
          warped.data[targetOffset] = source.data[sourceOffset]
          warped.data[targetOffset + 1] = source.data[sourceOffset + 1]
          warped.data[targetOffset + 2] = source.data[sourceOffset + 2]
          warped.data[targetOffset + 3] = source.data[sourceOffset + 3]
        }
      }
      if (renderRunRef.current === run) outputContext.putImageData(warped, 0, 0)
      sourceCanvas.width = 0
      sourceCanvas.height = 0
    }

    void render()
    return () => { renderRunRef.current += 1 }
  }, [corners, doorSourceUrl, height, width])

  return <canvas ref={canvasRef} className="perspective-door-canvas" style={{ opacity: visible ? 1 : 0 }} aria-hidden="true" />
}
