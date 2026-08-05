import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { EntranceCorners } from './EntranceSelector'
import { PerspectiveDoorCanvas } from './PerspectiveDoorCanvas'

type Props = {
  corners: EntranceCorners
  doorSourceUrl: string
  imageAlt: string
  imageSrc: string
  originalImageSrc: string
  showAfter: boolean
  displayMode?: 'original' | 'cleanup' | 'final'
}

export function ComposedPhotoPreview({ corners, doorSourceUrl, imageAlt, imageSrc, originalImageSrc, showAfter, displayMode }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)

  useEffect(() => setZoom(1), [originalImageSrc])

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

  const showOriginal = displayMode ? displayMode === 'original' : !showAfter
  const showDoor = displayMode ? displayMode === 'final' : showAfter

  return <div ref={editorRef} className="visualizer-editor composed-photo-editor" aria-label="Configured door applied to house photo">
    <div className="entrance-image-stage composed-photo-stage" style={stageSize.width ? { width: stageSize.width, height: stageSize.height, transform: `scale(${zoom})` } : undefined} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(1, Math.min(3, value + (event.deltaY < 0 ? .15 : -.15)))) }}>
      <img src={showOriginal ? originalImageSrc : imageSrc} alt={imageAlt} onLoad={(event) => {
        naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
        updateStageSize()
      }} />
      {stageSize.width > 0 && <PerspectiveDoorCanvas corners={corners} doorSourceUrl={doorSourceUrl} photoWidth={naturalSizeRef.current.width} photoHeight={naturalSizeRef.current.height} visible={showDoor} />}
    </div>
    <div className="visualizer-zoom-controls" role="group" aria-label="Photo zoom controls">
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .25))}><ZoomOut size={17} /></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + .25))}><ZoomIn size={17} /></button>
      <button type="button" onClick={() => setZoom(1)}>Fit</button>
    </div>
  </div>
}
