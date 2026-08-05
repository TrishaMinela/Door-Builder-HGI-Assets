import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { usePhotoZoom } from './usePhotoZoom'

type Props = {
  originalSrc: string
  cleanupSrc: string
  imageAlt: string
}

export function CleanupComparisonSlider({ originalSrc, cleanupSrc, imageAlt }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const activePointerRef = useRef<number | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [position, setPosition] = useState(50)
  const { zoom, pan, onWheel, zoomIn, zoomOut, resetZoom } = usePhotoZoom(editorRef, stageSize)

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

  useEffect(() => { setPosition(50); resetZoom() }, [originalSrc, cleanupSrc, resetZoom])

  const positionFromPointer = (event: ReactPointerEvent) => {
    const stage = stageRef.current
    if (!stage) return
    const bounds = stage.getBoundingClientRect()
    if (!bounds.width) return
    setPosition(Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)))
  }

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId
    positionFromPointer(event)
  }

  const continueDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    positionFromPointer(event)
  }

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    activePointerRef.current = null
  }

  const adjustFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft') setPosition((value) => Math.max(0, value - 2))
    else if (event.key === 'ArrowRight') setPosition((value) => Math.min(100, value + 2))
    else if (event.key === 'Home') setPosition(0)
    else if (event.key === 'End') setPosition(100)
    else return
    event.preventDefault()
  }

  return <div ref={editorRef} className="visualizer-editor cleanup-comparison-editor" aria-label="Cleanup before and after comparison">
    <div ref={stageRef} className="entrance-image-stage cleanup-comparison-stage" style={stageSize.width ? { width: stageSize.width, height: stageSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined} onWheel={onWheel}>
      <img className="cleanup-comparison-original" src={originalSrc} alt={imageAlt} draggable={false} onLoad={(event) => { naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; updateStageSize() }} />
      <img className="cleanup-comparison-proposed" src={cleanupSrc} alt="" draggable={false} style={{ clipPath: `inset(0 0 0 ${position}%)` }} />
      <span className="cleanup-comparison-label cleanup-comparison-label-original">Original</span>
      <span className="cleanup-comparison-label cleanup-comparison-label-proposed">Cleanup Preview</span>
      <span className="cleanup-comparison-divider" aria-hidden="true" style={{ left: `${position}%` }} />
      <button
        type="button"
        className="cleanup-comparison-handle"
        role="slider"
        aria-label="Drag to compare the original photo with the cleanup preview."
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        style={{ left: `${position}%` }}
        onPointerDown={beginDrag}
        onPointerMove={continueDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={adjustFromKeyboard}
      ><span aria-hidden="true">‹ ›</span></button>
    </div>
    <div className="visualizer-zoom-controls" role="group" aria-label="Photo zoom controls">
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={zoomOut}><ZoomOut size={17} /></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 4} onClick={zoomIn}><ZoomIn size={17} /></button>
      <button type="button" onClick={resetZoom}>Reset Zoom</button>
    </div>
  </div>
}
