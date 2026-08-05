import { useEffect, useRef, useState } from 'react'
import type { EntranceCorners } from './EntranceSelector'
import { PerspectiveDoorCanvas } from './PerspectiveDoorCanvas'

type Props = {
  corners: EntranceCorners
  doorSourceUrl: string
  imageAlt: string
  imageSrc: string
  originalImageSrc: string
  showAfter: boolean
}

export function ComposedPhotoPreview({ corners, doorSourceUrl, imageAlt, imageSrc, originalImageSrc, showAfter }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })

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

  return <div ref={editorRef} className="visualizer-editor composed-photo-editor" aria-label="Configured door applied to house photo">
    <div className="entrance-image-stage composed-photo-stage" style={stageSize.width ? { width: stageSize.width, height: stageSize.height } : undefined}>
      <img src={showAfter ? imageSrc : originalImageSrc} alt={imageAlt} onLoad={(event) => {
        naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
        updateStageSize()
      }} />
      {stageSize.width > 0 && <PerspectiveDoorCanvas corners={corners} doorSourceUrl={doorSourceUrl} photoWidth={naturalSizeRef.current.width} photoHeight={naturalSizeRef.current.height} visible={showAfter} />}
    </div>
  </div>
}
