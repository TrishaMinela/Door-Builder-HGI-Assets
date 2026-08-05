import { useCallback, useEffect, useRef, useState, type RefObject, type WheelEvent as ReactWheelEvent } from 'react'

type Size = { width: number; height: number }

export function usePhotoZoom(editorRef: RefObject<HTMLDivElement | null>, stageSize: Size) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef(pan)
  const pendingRef = useRef<{ delta: number; x: number; y: number } | null>(null)
  const frameRef = useRef<number | null>(null)

  const commit = useCallback((nextZoom: number, requestedPan: { x: number; y: number }) => {
    const editor = editorRef.current
    const bounds = editor?.getBoundingClientRect()
    const clampedZoom = Math.max(1, Math.min(4, nextZoom))
    const maxX = bounds ? Math.max(0, (stageSize.width * clampedZoom - bounds.width) / 2) : 0
    const maxY = bounds ? Math.max(0, (stageSize.height * clampedZoom - bounds.height) / 2) : 0
    const nextPan = { x: Math.max(-maxX, Math.min(maxX, requestedPan.x)), y: Math.max(-maxY, Math.min(maxY, requestedPan.y)) }
    zoomRef.current = clampedZoom; panRef.current = nextPan
    setZoom(clampedZoom); setPan(nextPan)
  }, [editorRef, stageSize.height, stageSize.width])

  const resetZoom = useCallback(() => commit(1, { x: 0, y: 0 }), [commit])
  const zoomBy = useCallback((amount: number) => {
    const next = Math.max(1, Math.min(4, zoomRef.current + amount))
    const ratio = next / zoomRef.current
    commit(next, { x: panRef.current.x * ratio, y: panRef.current.y * ratio })
  }, [commit])

  const onWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    const editor = editorRef.current
    if (!editor) return
    const isPinch = event.ctrlKey || event.metaKey
    const isMouseWheel = event.deltaMode !== 0 || Math.abs(event.deltaY) >= 40
    if (!isPinch && !isMouseWheel) return // Preserve ordinary two-finger page scrolling.
    event.preventDefault()
    const bounds = editor.getBoundingClientRect()
    const modeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1
    const normalized = Math.max(-80, Math.min(80, event.deltaY * modeScale))
    const pending = pendingRef.current ?? { delta: 0, x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 }
    pending.delta += normalized
    pending.x = event.clientX - bounds.left - bounds.width / 2
    pending.y = event.clientY - bounds.top - bounds.height / 2
    pendingRef.current = pending
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const queued = pendingRef.current; pendingRef.current = null
      if (!queued) return
      const oldZoom = zoomRef.current
      const change = Math.max(-.06, Math.min(.06, -queued.delta * .001))
      const nextZoom = Math.max(1, Math.min(4, oldZoom + change))
      const ratio = nextZoom / oldZoom
      commit(nextZoom, {
        x: queued.x - (queued.x - panRef.current.x) * ratio,
        y: queued.y - (queued.y - panRef.current.y) * ratio,
      })
    })
  }, [commit, editorRef])

  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }, [])
  useEffect(() => { if (zoomRef.current > 1) commit(zoomRef.current, panRef.current) }, [commit])

  return { zoom, pan, onWheel, zoomIn: () => zoomBy(.1), zoomOut: () => zoomBy(-.1), resetZoom }
}
