import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Move, RotateCcw, ScanLine } from 'lucide-react'

type CornerId = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
type Point = { x: number; y: number }
type Corners = Record<CornerId, Point>
type InteractionMode = 'edit' | 'move'

const CORNER_ORDER: CornerId[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
const INITIAL_CORNERS: Corners = {
  topLeft: { x: 0.35, y: 0.14 },
  topRight: { x: 0.65, y: 0.14 },
  bottomRight: { x: 0.68, y: 0.9 },
  bottomLeft: { x: 0.32, y: 0.9 },
}
const MIN_SEPARATION = 0.025

type DragState =
  | { kind: 'corner'; corner: CornerId; pointerId: number }
  | { kind: 'selection'; pointerId: number; startPointer: Point; startCorners: Corners }

type Props = {
  imageAlt: string
  imageSrc: string
}

const cloneCorners = (corners: Corners): Corners => ({
  topLeft: { ...corners.topLeft },
  topRight: { ...corners.topRight },
  bottomRight: { ...corners.bottomRight },
  bottomLeft: { ...corners.bottomLeft },
})

function cross(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
}

function isValidCorners(corners: Corners) {
  const points = CORNER_ORDER.map((id) => corners[id])
  if (points.some(({ x, y }) => x < 0 || x > 1 || y < 0 || y > 1)) return false
  if (corners.topLeft.x + MIN_SEPARATION >= corners.topRight.x) return false
  if (corners.bottomLeft.x + MIN_SEPARATION >= corners.bottomRight.x) return false
  if (corners.topLeft.y + MIN_SEPARATION >= corners.bottomLeft.y) return false
  if (corners.topRight.y + MIN_SEPARATION >= corners.bottomRight.y) return false

  const turns = points.map((point, index) => cross(point, points[(index + 1) % points.length], points[(index + 2) % points.length]))
  return turns.every((turn) => turn > 0.0001) || turns.every((turn) => turn < -0.0001)
}

export function EntranceSelector({ imageAlt, imageSrc }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const dragRef = useRef<DragState | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [corners, setCorners] = useState<Corners>(() => cloneCorners(INITIAL_CORNERS))
  const [mode, setMode] = useState<InteractionMode>('edit')

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

  const normalizedPointer = (event: ReactPointerEvent): Point | null => {
    const stage = stageRef.current
    if (!stage) return null
    const bounds = stage.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    }
  }

  const beginCornerDrag = (corner: CornerId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'edit') return
    event.preventDefault()
    stageRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'corner', corner, pointerId: event.pointerId }
  }

  const beginSelectionDrag = (event: ReactPointerEvent<SVGPolygonElement>) => {
    if (mode !== 'move') return
    const startPointer = normalizedPointer(event)
    if (!startPointer) return
    event.preventDefault()
    stageRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'selection', pointerId: event.pointerId, startPointer, startCorners: cloneCorners(corners) }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const pointer = normalizedPointer(event)
    if (!pointer) return
    event.preventDefault()

    if (drag.kind === 'corner') {
      setCorners((current) => {
        const candidate = { ...current, [drag.corner]: pointer }
        return isValidCorners(candidate) ? candidate : current
      })
      return
    }

    const requestedX = pointer.x - drag.startPointer.x
    const requestedY = pointer.y - drag.startPointer.y
    const originalPoints = CORNER_ORDER.map((id) => drag.startCorners[id])
    const minX = Math.min(...originalPoints.map(({ x }) => x))
    const maxX = Math.max(...originalPoints.map(({ x }) => x))
    const minY = Math.min(...originalPoints.map(({ y }) => y))
    const maxY = Math.max(...originalPoints.map(({ y }) => y))
    const deltaX = Math.min(1 - maxX, Math.max(-minX, requestedX))
    const deltaY = Math.min(1 - maxY, Math.max(-minY, requestedY))
    const candidate = Object.fromEntries(CORNER_ORDER.map((id) => [id, {
      x: drag.startCorners[id].x + deltaX,
      y: drag.startCorners[id].y + deltaY,
    }])) as Corners
    if (isValidCorners(candidate)) setCorners(candidate)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId)
    dragRef.current = null
  }

  const polygonPoints = CORNER_ORDER.map((id) => `${corners[id].x * 100},${corners[id].y * 100}`).join(' ')

  return <>
    <div className="entrance-selector-toolbar" role="group" aria-label="Entrance placement tools">
      <button type="button" className={mode === 'edit' ? 'active' : ''} aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}><ScanLine size={17} /> Edit Entrance</button>
      <button type="button" className={mode === 'move' ? 'active' : ''} aria-pressed={mode === 'move'} onClick={() => setMode('move')}><Move size={17} /> Move Selection</button>
      <button type="button" onClick={() => setCorners(cloneCorners(INITIAL_CORNERS))}><RotateCcw size={17} /> Reset Placement</button>
    </div>
    <p className="entrance-selector-help">{mode === 'edit' ? 'Drag a corner to outline the complete entrance opening.' : 'Drag inside the highlighted area to move the complete selection.'}</p>
    <div ref={editorRef} className="visualizer-editor" aria-label="House photo entrance editor">
      <div
        ref={stageRef}
        className={`entrance-image-stage entrance-image-stage-${mode}`}
        style={stageSize.width ? { width: stageSize.width, height: stageSize.height } : undefined}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          onLoad={(event) => {
            naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
            updateStageSize()
          }}
        />
        <svg className="entrance-selection-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon className={`entrance-selection-polygon ${mode === 'move' ? 'move-enabled' : ''}`} points={polygonPoints} onPointerDown={beginSelectionDrag} />
        </svg>
        {CORNER_ORDER.map((id) => <button
          type="button"
          key={id}
          className="entrance-corner-handle"
          style={{ left: `${corners[id].x * 100}%`, top: `${corners[id].y * 100}%` }}
          aria-label={`Move ${id.replace(/([A-Z])/g, ' $1').toLowerCase()} corner`}
          onPointerDown={(event) => beginCornerDrag(id, event)}
          disabled={mode !== 'edit'}
        />)}
      </div>
    </div>
  </>
}
