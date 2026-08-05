import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Brush, Check, RotateCcw, Trash2, X } from 'lucide-react'
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
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId
    strokesBeforeActiveRef.current = strokes
    activeStrokeRef.current = { points: [point], radius: BRUSH_RADII[brushSize] }
    onStrokesChange([...strokesBeforeActiveRef.current, activeStrokeRef.current])
  }

  const continueStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId || !activeStrokeRef.current) return
    const point = pointFromPointer(event)
    if (!point) return
    const previous = activeStrokeRef.current.points[activeStrokeRef.current.points.length - 1]
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0015) return
    event.preventDefault()
    const nextStroke = { ...activeStrokeRef.current, points: [...activeStrokeRef.current.points, point] }
    activeStrokeRef.current = nextStroke
    onStrokesChange([...strokesBeforeActiveRef.current, nextStroke])
  }

  const finishStroke = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activePointerRef.current = null
    activeStrokeRef.current = null
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
    <div className="cleanup-brush-sizes" role="group" aria-label="Cleanup brush size">
      {(Object.keys(BRUSH_RADII) as BrushSize[]).map((size) => <button key={size} type="button" className={brushSize === size ? 'active' : ''} aria-pressed={brushSize === size} onClick={() => setBrushSize(size)}>{size[0].toUpperCase() + size.slice(1)}</button>)}
    </div>
    <div ref={editorRef} className="visualizer-editor cleanup-brush-editor">
      <div ref={stageRef} className="entrance-image-stage cleanup-brush-stage" style={stageSize.width ? { width: stageSize.width, height: stageSize.height } : undefined} onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke}>
        <img src={imageSrc} alt={imageAlt} draggable={false} onLoad={(event) => { naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; updateStageSize() }} />
        {stageSize.width > 0 && <svg className="cleanup-brush-overlay" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} aria-hidden="true">
          <polygon className="cleanup-entrance-outline" points={outline} />
          {strokes.map((stroke, index) => stroke.points.length === 1
            ? <circle key={index} className="cleanup-brush-mark" cx={stroke.points[0].x * stageSize.width} cy={stroke.points[0].y * stageSize.height} r={stroke.radius * shortestDisplayEdge} />
            : <path key={index} className="cleanup-brush-mark" d={pathFor(stroke)} style={{ strokeWidth: stroke.radius * shortestDisplayEdge * 2 }} />)}
        </svg>}
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
