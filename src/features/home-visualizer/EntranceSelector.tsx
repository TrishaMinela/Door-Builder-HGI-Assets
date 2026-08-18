import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Move, RotateCcw, ScanLine, ZoomIn, ZoomOut } from 'lucide-react'
import { usePhotoZoom } from './usePhotoZoom'
import { emptySnapState, freeDragWithMagneticSnap, type SnapGuides, type SnapState } from './magneticSnap'

export type CornerId = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
export type Point = { x: number; y: number }
export type EntranceCorners = Record<CornerId, Point>
type InteractionMode = 'edit' | 'move'

const CORNER_ORDER: CornerId[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
const MAGNIFIER_ZOOM = 3
const MAGNIFIER_SIZE = 264
const MOBILE_MAGNIFIER_SIZE = 180
export const INITIAL_ENTRANCE_CORNERS: EntranceCorners = {
  topLeft: { x: 0.35, y: 0.35 },
  topRight: { x: 0.65, y: 0.35 },
  bottomRight: { x: 0.65, y: 0.65 },
  bottomLeft: { x: 0.35, y: 0.65 },
}
const MIN_SEPARATION = 0.025

type DragState =
  | { kind: 'corner'; corner: CornerId; pointerId: number }
  | { kind: 'selection'; pointerId: number; startPointer: Point; startCorners: EntranceCorners }

type Props = {
  corners: EntranceCorners
  imageAlt: string
  imageSrc: string
  onCornersChange: (corners: EntranceCorners) => void
  onReset: () => void
  proposedCorners?: EntranceCorners | null
  proposedDetectedEdges?: boolean[]
  showToolbar?: boolean
  highlightHandles?: boolean
  onAlignmentReadyChange?: (ready: boolean) => void
}

export const cloneEntranceCorners = (corners: EntranceCorners): EntranceCorners => ({
  topLeft: { ...corners.topLeft },
  topRight: { ...corners.topRight },
  bottomRight: { ...corners.bottomRight },
  bottomLeft: { ...corners.bottomLeft },
})

function cross(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
}

export function isValidEntranceCorners(corners: EntranceCorners) {
  const points = CORNER_ORDER.map((id) => corners[id])
  if (points.some(({ x, y }) => x < 0 || x > 1 || y < 0 || y > 1)) return false
  if (corners.topLeft.x + MIN_SEPARATION >= corners.topRight.x) return false
  if (corners.bottomLeft.x + MIN_SEPARATION >= corners.bottomRight.x) return false
  if (corners.topLeft.y + MIN_SEPARATION >= corners.bottomLeft.y) return false
  if (corners.topRight.y + MIN_SEPARATION >= corners.bottomRight.y) return false

  const turns = points.map((point, index) => cross(point, points[(index + 1) % points.length], points[(index + 2) % points.length]))
  return turns.every((turn) => turn > 0.0001) || turns.every((turn) => turn < -0.0001)
}

export function EntranceSelector({ corners, imageAlt, imageSrc, onCornersChange, onReset, proposedCorners, proposedDetectedEdges, showToolbar = true, highlightHandles = false, onAlignmentReadyChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const dragRef = useRef<DragState | null>(null)
  const magnifierDragRef = useRef<number | null>(null)
  const pendingCornersRef=useRef<EntranceCorners|null>(null)
  const cornerFrameRef=useRef<number|null>(null)
  const snapRef = useRef<SnapState>(emptySnapState())
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [mode, setMode] = useState<InteractionMode>('edit')
  const [activeCorner, setActiveCorner] = useState<CornerId | null>(null)
  const [magnifierPosition, setMagnifierPosition] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? { x: .17, y: .78 } : { x: .17, y: .5 })
  const [snapGuides,setSnapGuides]=useState<SnapGuides>({})
  const [alignedEdges,setAlignedEdges]=useState<Set<number>>(()=>new Set())
  const magnifierSize=typeof window!=='undefined'&&window.matchMedia('(max-width: 767px)').matches?MOBILE_MAGNIFIER_SIZE:MAGNIFIER_SIZE
  const alignmentReady=CORNER_ORDER.every((_id,index)=>alignedEdges.has(index)||alignedEdges.has((index+3)%4))
  useEffect(()=>onAlignmentReadyChange?.(alignmentReady),[alignmentReady,onAlignmentReadyChange])
  const { zoom, pan, isPanning, onWheel, beginPan, movePan, endPan, zoomIn, zoomOut, resetZoom } = usePhotoZoom(editorRef, stageSize)
  useEffect(resetZoom, [imageSrc, resetZoom])
  useEffect(()=>()=>{if(cornerFrameRef.current!==null)cancelAnimationFrame(cornerFrameRef.current)},[])

  const scheduleCornersChange=(nextCorners:EntranceCorners)=>{
    pendingCornersRef.current=nextCorners
    if(cornerFrameRef.current!==null)return
    cornerFrameRef.current=requestAnimationFrame(()=>{
      cornerFrameRef.current=null
      const pending=pendingCornersRef.current
      pendingCornersRef.current=null
      if(pending)onCornersChange(pending)
    })
  }

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

  const normalizedPointer = (event: Pick<ReactPointerEvent,'clientX'|'clientY'>): Point | null => {
    const stage = stageRef.current
    if (!stage) return null
    const bounds = stage.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    const point = {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    }
    return point
  }

  const beginCornerDrag = (corner: CornerId, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'edit') return
    event.preventDefault()
    stageRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'corner', corner, pointerId: event.pointerId }
    snapRef.current=emptySnapState()
    setActiveCorner(corner)
  }

  const beginSelectionDrag = (event: ReactPointerEvent<SVGPolygonElement>) => {
    if (mode !== 'move') return
    const startPointer = normalizedPointer(event)
    if (!startPointer) return
    event.preventDefault()
    stageRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'selection', pointerId: event.pointerId, startPointer, startCorners: cloneEntranceCorners(corners) }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const pointer = normalizedPointer(event)
    if (!pointer) return
    event.preventDefault()

    if (drag.kind === 'corner') {
      const snapped=freeDragWithMagneticSnap(corners,drag.corner,pointer,stageSize,snapRef.current,event.shiftKey);snapRef.current=snapped.state;setSnapGuides(snapped.guides);setAlignedEdges(current=>{const next=new Set(current),cornerIndex=CORNER_ORDER.indexOf(drag.corner),previousEdge=(cornerIndex+3)%4;next.delete(cornerIndex);next.delete(previousEdge);if(snapped.state.primary==='previous')next.add(previousEdge);if(snapped.state.primary==='next')next.add(cornerIndex);if(snapped.state.secondary){next.add(previousEdge);next.add(cornerIndex)}return next})
      const candidate = { ...corners, [drag.corner]: snapped.point }
      if (isValidEntranceCorners(candidate)) {
        scheduleCornersChange(candidate)
      }
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
    }])) as EntranceCorners
    if (isValidEntranceCorners(candidate)) scheduleCornersChange(candidate)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId)
    dragRef.current = null
    if(pendingCornersRef.current){if(cornerFrameRef.current!==null)cancelAnimationFrame(cornerFrameRef.current);cornerFrameRef.current=null;const pending=pendingCornersRef.current;pendingCornersRef.current=null;onCornersChange(pending)}
    snapRef.current=emptySnapState();setSnapGuides({})
  }

  const moveMagnifier = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (magnifierDragRef.current !== event.pointerId) return
    const editor = editorRef.current
    if (!editor) return
    const bounds = editor.getBoundingClientRect()
    const insetX = Math.min(.45, magnifierSize / 2 / Math.max(1, bounds.width))
    const insetY = Math.min(.45, magnifierSize / 2 / Math.max(1, bounds.height))
    setMagnifierPosition({
      x: Math.max(insetX, Math.min(1 - insetX, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(insetY, Math.min(1 - insetY, (event.clientY - bounds.top) / bounds.height)),
    })
  }

  const endMagnifierDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (magnifierDragRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    magnifierDragRef.current = null
  }

  const polygonPoints = CORNER_ORDER.map((id) => `${corners[id].x * stageSize.width},${corners[id].y * stageSize.height}`).join(' ')
  const proposedPolygonPoints = proposedCorners ? CORNER_ORDER.map((id) => `${proposedCorners[id].x * stageSize.width},${proposedCorners[id].y * stageSize.height}`).join(' ') : ''

  return <>
    {showToolbar && <div className="entrance-selector-toolbar" role="group" aria-label="Entrance placement tools">
      <button type="button" className={mode === 'edit' ? 'active' : ''} aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}><ScanLine size={17} /> Edit Entrance</button>
      <button type="button" className={mode === 'move' ? 'active' : ''} aria-pressed={mode === 'move'} onClick={() => setMode('move')}><Move size={17} /> Move Selection</button>
      <button type="button" onClick={onReset}><RotateCcw size={17} /> Reset Placement</button>
    </div>}
    {showToolbar && <p className="entrance-selector-help">{mode === 'edit' ? 'Drag a corner to outline the complete entrance opening.' : 'Drag inside the highlighted area to move the complete selection.'}</p>}
    <div ref={editorRef} className="visualizer-editor" aria-label="House photo entrance editor">
      {activeCorner && stageSize.width > 0 && <button
        type="button"
        className="entrance-point-magnifier"
        aria-label="Drag to move the corner magnifier"
        style={{
          width: magnifierSize,
          height: magnifierSize,
          left: `${magnifierPosition.x * 100}%`,
          top: `${magnifierPosition.y * 100}%`,
          bottom: 'auto',
          backgroundImage: `url(${JSON.stringify(imageSrc)})`,
          backgroundSize: `${stageSize.width * MAGNIFIER_ZOOM}px ${stageSize.height * MAGNIFIER_ZOOM}px`,
          backgroundPosition: `${magnifierSize / 2 - corners[activeCorner].x * stageSize.width * MAGNIFIER_ZOOM}px ${magnifierSize / 2 - corners[activeCorner].y * stageSize.height * MAGNIFIER_ZOOM}px`,
        }}
        onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); magnifierDragRef.current = event.pointerId }}
        onPointerMove={moveMagnifier}
        onPointerUp={endMagnifierDrag}
        onPointerCancel={endMagnifierDrag}
        onKeyDown={(event) => {
          if (event.key.startsWith('Arrow')) event.preventDefault()
          const step = event.shiftKey ? .06 : .025
          if (event.key === 'ArrowLeft') setMagnifierPosition((value) => ({ ...value, x: Math.max(.08, value.x - step) }))
          if (event.key === 'ArrowRight') setMagnifierPosition((value) => ({ ...value, x: Math.min(.92, value.x + step) }))
          if (event.key === 'ArrowUp') setMagnifierPosition((value) => ({ ...value, y: Math.max(.08, value.y - step) }))
          if (event.key === 'ArrowDown') setMagnifierPosition((value) => ({ ...value, y: Math.min(.92, value.y + step) }))
        }}
      ><span className="entrance-magnifier-zoom">3×</span><span className="entrance-magnifier-move"><Move size={13}/></span><i /></button>}
      <div
        ref={stageRef}
        className={`entrance-image-stage entrance-image-stage-${mode} ${zoom > 1 ? 'photo-pan-enabled' : ''} ${isPanning ? 'photo-panning' : ''}`}
        style={stageSize.width ? { width: stageSize.width, height: stageSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined}
        onPointerDown={(event) => {
          const target = event.target as Element
          if (!target.closest('button, .entrance-selection-polygon.move-enabled')) beginPan(event)
        }}
        onPointerMove={(event) => { if (!movePan(event)) moveDrag(event) }}
        onPointerUp={(event) => { endPan(event); endDrag(event) }}
        onPointerCancel={(event) => { endPan(event); endDrag(event) }}
        onWheel={onWheel}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          onLoad={(event) => {
            naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
            updateStageSize()
          }}
        />
        {stageSize.width > 0 && <svg className="entrance-selection-svg" viewBox={`0 0 ${stageSize.width} ${stageSize.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {snapGuides.x!==undefined&&<line className="magnetic-snap-guide" x1={snapGuides.x*stageSize.width} y1="0" x2={snapGuides.x*stageSize.width} y2={stageSize.height}/>}
          {snapGuides.y!==undefined&&<line className="magnetic-snap-guide" x1="0" y1={snapGuides.y*stageSize.height} x2={stageSize.width} y2={snapGuides.y*stageSize.height}/>}
          {snapGuides.line&&<line className="magnetic-snap-guide" x1={snapGuides.line[0].x*stageSize.width} y1={snapGuides.line[0].y*stageSize.height} x2={snapGuides.line[1].x*stageSize.width} y2={snapGuides.line[1].y*stageSize.height}/>}
          <polygon className={`entrance-selection-polygon ${mode === 'move' ? 'move-enabled' : ''}`} points={polygonPoints} onPointerDown={beginSelectionDrag} />
          {CORNER_ORDER.map((id,index)=>{const nextId=CORNER_ORDER[(index+1)%CORNER_ORDER.length];return <line key={`edge-${id}`} className={`entrance-connection-edge ${alignedEdges.has(index)?'aligned':''}`} x1={corners[id].x*stageSize.width} y1={corners[id].y*stageSize.height} x2={corners[nextId].x*stageSize.width} y2={corners[nextId].y*stageSize.height}/>})}
          {proposedCorners && <>
            <polygon className="entrance-selection-proposal-fill" points={proposedPolygonPoints} />
            {CORNER_ORDER.map((id, index) => {
              const nextId = CORNER_ORDER[(index + 1) % CORNER_ORDER.length]
              return <line key={id} className={`entrance-selection-proposal-edge ${proposedDetectedEdges?.[index] ? 'detected' : 'manual'}`} x1={proposedCorners[id].x * stageSize.width} y1={proposedCorners[id].y * stageSize.height} x2={proposedCorners[nextId].x * stageSize.width} y2={proposedCorners[nextId].y * stageSize.height} />
            })}
          </>}
        </svg>}
        {CORNER_ORDER.map((id) => <button
          type="button"
          key={id}
          className={`entrance-corner-handle ${highlightHandles?'guidance-pulse':''} ${alignedEdges.has(CORNER_ORDER.indexOf(id))||alignedEdges.has((CORNER_ORDER.indexOf(id)+3)%4)?'aligned':''}`}
          style={{ left: `${corners[id].x * 100}%`, top: `${corners[id].y * 100}%` }}
          aria-label={`Move ${id.replace(/([A-Z])/g, ' $1').toLowerCase()} corner`}
          onPointerDown={(event) => beginCornerDrag(id, event)}
          disabled={mode !== 'edit'}
        />)}
      </div>
      <div className="visualizer-zoom-controls" role="group" aria-label="Uploaded photo zoom controls">
        <button type="button" aria-label="Zoom uploaded photo out" disabled={zoom <= 1} onClick={zoomOut}><ZoomOut size={17} /></button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom uploaded photo in" disabled={zoom >= 4} onClick={zoomIn}><ZoomIn size={17} /></button>
        <button type="button" onClick={resetZoom}>Reset Zoom</button>
      </div>
    </div>
    <div className="visualizer-zoom-controls mobile-external-zoom-controls" role="group" aria-label="Uploaded photo zoom controls">
      <button type="button" aria-label="Zoom uploaded photo out" disabled={zoom <= 1} onClick={zoomOut}><ZoomOut size={17} /></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom uploaded photo in" disabled={zoom >= 4} onClick={zoomIn}><ZoomIn size={17} /></button>
      <button type="button" onClick={resetZoom}>Reset Zoom</button>
    </div>
  </>
}
