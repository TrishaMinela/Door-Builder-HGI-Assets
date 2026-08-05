import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Brush, Check, RotateCcw, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { EntranceCorners, Point } from './EntranceSelector'

export type CleanupStroke = {
  points: Point[]
  radius: number
}

type BrushSize = 'small' | 'medium' | 'large'

const BRUSH_RADII: Record<BrushSize, number> = { small: 0.006, medium: 0.012, large: 0.022 }
const CORNER_ORDER = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const

type Props = {
  corners: EntranceCorners
  imageAlt: string
  imageSrc: string
  strokes: CleanupStroke[]
  processing: boolean
  onStrokesChange: (strokes: CleanupStroke[]) => void
  onPreview: () => void
  onCancel: () => void
  onDone: () => void
}

export function CleanupBrushEditor({ corners, imageAlt, imageSrc, strokes, processing, onStrokesChange, onPreview, onCancel, onDone }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const activePointerRef = useRef<number | null>(null)
  const activeStrokeRef = useRef<CleanupStroke | null>(null)
  const strokesBeforeActiveRef = useRef<CleanupStroke[]>([])
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [brushSize, setBrushSize] = useState<BrushSize>('medium')
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => setZoom(1), [imageSrc])

  const updateStageSize = () => {
    const editor = editorRef.current
    const natural = naturalSizeRef.current
    if (!editor || !natural.width || !natural.height) return
    const bounds = editor.getBoundingClientRect()
    const scale = Math.min(bounds.width / natural.width, bounds.height / natural.height)
    setStageSize({ width: natural.width * scale, height: natural.height * scale })
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateStageSize)
    observer.observe(editor)
    return () => observer.disconnect()
  }, [])

  const pointFromPointer = (event: ReactPointerEvent): Point | null => {
    const stage = stageRef.current
    if (!stage) return null
    const bounds = stage.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) }
  }

  const startStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFromPointer(event)
    if (!point) return
    event.preventDefault()
    setCursorPoint(point)
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId
    strokesBeforeActiveRef.current = strokes
    activeStrokeRef.current = { points: [point], radius: BRUSH_RADII[brushSize] }
    onStrokesChange([...strokesBeforeActiveRef.current, activeStrokeRef.current])
  }

  const continueStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFromPointer(event)
    if (!point) return
    setCursorPoint(point)
    if (activePointerRef.current !== event.pointerId || !activeStrokeRef.current) return
    const previous = activeStrokeRef.current.points[activeStrokeRef.current.points.length - 1]
    if (!previous) return
    const shortestEdge = Math.max(1, Math.min(stageSize.width, stageSize.height))
    const pixelDistance = Math.hypot((point.x - previous.x) * stageSize.width, (point.y - previous.y) * stageSize.height)
    const spacing = Math.max(1, activeStrokeRef.current.radius * shortestEdge * 0.45)
    if (pixelDistance < spacing * 0.25) return
    event.preventDefault()
    const steps = Math.max(1, Math.ceil(pixelDistance / spacing))
    const interpolated = Array.from({ length: steps }, (_, index) => {
      const ratio = (index + 1) / steps
      return { x: previous.x + (point.x - previous.x) * ratio, y: previous.y + (point.y - previous.y) * ratio }
    })
    const nextStroke = { ...activeStrokeRef.current, points: [...activeStrokeRef.current.points, ...interpolated] }
    activeStrokeRef.current = nextStroke
    onStrokesChange([...strokesBeforeActiveRef.current, nextStroke])
  }

  const finishStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activePointerRef.current = null
    activeStrokeRef.current = null
    if (event.pointerType === 'touch') setCursorPoint(null)
  }

  const shortestDisplayEdge = Math.min(stageSize.width, stageSize.height)
  const pathFor = (stroke: CleanupStroke) => stroke.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x * stageSize.width} ${point.y * stageSize.height}`).join(' ')
  const bounds = {
    minX: Math.min(...CORNER_ORDER.map((id) => corners[id].x)) - 0.16,
    maxX: Math.max(...CORNER_ORDER.map((id) => corners[id].x)) + 0.16,
    minY: Math.min(...CORNER_ORDER.map((id) => corners[id].y)) - 0.16,
    maxY: Math.max(...CORNER_ORDER.map((id) => corners[id].y)) + 0.16,
  }
  const farFromEntrance = strokes.some((stroke) => stroke.points.some((point) => point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY))
  const outline = CORNER_ORDER.map((id) => `${corners[id].x * stageSize.width},${corners[id].y * stageSize.height}`).join(' ')

  return <section className="cleanup-brush-workspace" aria-labelledby="cleanup-brush-title">
    <div className="cleanup-brush-heading"><Brush size={22} aria-hidden="true" /><div><h3 id="cleanup-brush-title">Remove Old Door Details</h3><p>Brush over old hardware, reflections, or small details that should be removed from the original photo.</p></div></div>
    <p className="cleanup-region-guidance">Details inside the outlined door opening will be covered by the new door. Cleanup is applied only to details extending outside the opening.</p>
    <div className="cleanup-brush-sizes" role="group" aria-label="Cleanup brush size">
      {(Object.keys(BRUSH_RADII) as BrushSize[]).map((size) => <button key={size} type="button" className={brushSize === size ? 'active' : ''} aria-pressed={brushSize === size} onClick={() => setBrushSize(size)}>{size[0].toUpperCase() + size.slice(1)}</button>)}
    </div>
    <div ref={editorRef} className="visualizer-editor cleanup-brush-editor">
      <div ref={stageRef} className="entrance-image-stage cleanup-brush-stage" style={stageSize.width ? { width: stageSize.width, height: stageSize.height, transform: `scale(${zoom})` } : undefined} onPointerEnter={(event) => setCursorPoint(pointFromPointer(event))} onPointerLeave={() => setCursorPoint(null)} onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(1, Math.min(3, value + (event.deltaY < 0 ? .15 : -.15)))) }}>
        <img src={imageSrc} alt={imageAlt} draggable={false} onLoad={(event) => { naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; updateStageSize() }} />
        {stageSize.width > 0 && <svg className="cleanup-brush-overlay" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} aria-hidden="true">
          <polygon className="cleanup-entrance-outline" points={outline} />
          {strokes.map((stroke, index) => stroke.points.length === 1
            ? <circle key={index} className="cleanup-brush-dot" cx={stroke.points[0].x * stageSize.width} cy={stroke.points[0].y * stageSize.height} r={stroke.radius * shortestDisplayEdge} />
            : <path key={index} className="cleanup-brush-mark" d={pathFor(stroke)} style={{ strokeWidth: stroke.radius * shortestDisplayEdge * 2 }} />)}
        </svg>}
        {cursorPoint && stageSize.width > 0 && <span className="cleanup-brush-cursor" aria-hidden="true" style={{ left: cursorPoint.x * stageSize.width, top: cursorPoint.y * stageSize.height, width: BRUSH_RADII[brushSize] * shortestDisplayEdge * 2, height: BRUSH_RADII[brushSize] * shortestDisplayEdge * 2 }} />}
      </div>
      <div className="visualizer-zoom-controls" role="group" aria-label="Photo zoom controls">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .25))}><ZoomOut size={17} /></button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + .25))}><ZoomIn size={17} /></button>
        <button type="button" onClick={() => setZoom(1)}>Fit</button>
      </div>
    </div>
    {farFromEntrance && <p className="cleanup-brush-warning">Cleanup works best on small details near the doorway.</p>}
    <div className="cleanup-brush-actions">
      <button type="button" disabled={!strokes.length || processing} onClick={() => onStrokesChange(strokes.slice(0, -1))}><RotateCcw size={16} /> Undo Last Stroke</button>
      <button type="button" disabled={!strokes.length || processing} onClick={() => onStrokesChange([])}><Trash2 size={16} /> Clear Brush Marks</button>
      <button type="button" className="cleanup-preview-button" disabled={!strokes.length || processing} onClick={onPreview}><Check size={16} /> {processing ? 'Preparing Preview…' : 'Preview Cleanup'}</button>
      <button type="button" disabled={processing} onClick={onCancel}><X size={16} /> Cancel</button>
      <button type="button" disabled={processing} onClick={onDone}>Done</button>
    </div>
  </section>
}
