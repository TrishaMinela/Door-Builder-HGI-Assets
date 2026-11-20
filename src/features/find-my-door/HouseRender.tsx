import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { CleanupComparisonSlider } from '../home-visualizer/CleanupComparisonSlider'
import { ConfiguredDoorSource, type DoorSourceState } from '../home-visualizer/ConfiguredDoorSource'
import { AiVisualizationError, generateAiVisualization } from '../home-visualizer/aiVisualization'
import { detectEntranceStructure } from '../home-visualizer/entranceDetection'
import type { EntranceDetection } from '../home-visualizer/entranceFitStrategy'
import { houseImageGeneration, houseImages } from './houseImageCache'
import type { ResolvedRecommendation } from './resolveRecommendation'

type Props = {
  photoUrl: string
  resolved: ResolvedRecommendation
  showHouse: boolean
  onProgress?: (status: 'idle' | 'working' | 'ready' | 'error') => void
}

export type HouseRenderHandle = { seeOnHouse: () => void }

const emptySource: DoorSourceState = { url: '', width: 0, height: 0, error: '', ready: false }

function liveKey(photo: string, doorKey: string) {
  return `${photo}\u0000${doorKey}`
}

async function snapshotDoor(url: string) {
  const blob = await fetch(url).then((response) => response.blob())
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('We couldn’t prepare this door. Try again.'))
    reader.readAsDataURL(blob)
  })
}

function failureMessage(error: unknown, aborted: boolean) {
  if (aborted) return 'That took too long. Choose On my house to try again.'
  if (error instanceof AiVisualizationError) return error.userMessage
  if (error instanceof Error && error.message) return error.message
  return 'We couldn’t place the door on your photo. Choose On my house to try again.'
}

function waitForDoorSource(doorKey: string, sourceDoorRef: { current: string }, sourceRef: { current: DoorSourceState }, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const started = performance.now()
    const check = () => {
      if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
      const latest = sourceRef.current
      if (sourceDoorRef.current === doorKey && latest.ready && latest.url) { resolve(latest.url); return }
      if (sourceDoorRef.current === doorKey && latest.error && performance.now() - started > 1000) { reject(new Error(latest.error)); return }
      if (performance.now() - started > 30_000) { reject(new Error('We couldn’t prepare this door. Try again.')); return }
      window.setTimeout(check, 200)
    }
    check()
  })
}

export const HouseRender = forwardRef<HouseRenderHandle, Props>(function HouseRender({ photoUrl, resolved, showHouse, onProgress }, ref) {
  const [doorSource, setDoorSource] = useState<DoorSourceState>(emptySource)
  const [live, setLive] = useState<{ key: string; status: 'idle' | 'working' | 'ready' | 'error'; message: string }>({ key: '', status: 'idle', message: '' })
  const detection = useRef<EntranceDetection | null>(null)
  const sourceRef = useRef(doorSource)
  const sourceDoorRef = useRef(resolved.cacheKey)
  const resolvedRef = useRef(resolved)
  const photoRef = useRef(photoUrl)
  const onProgressRef = useRef(onProgress)
  sourceRef.current = doorSource
  resolvedRef.current = resolved
  photoRef.current = photoUrl
  onProgressRef.current = onProgress

  const images = houseImages(photoUrl)
  const doorKey = resolved.cacheKey
  const cached = images.get(doorKey) ?? ''
  const key = liveKey(photoUrl, doorKey)
  const status = cached ? 'ready' : live.key === key ? live.status : 'idle'
  const message = !cached && live.key === key ? live.message : ''

  useEffect(() => {
    const controller = new AbortController()
    detection.current = null
    void detectEntranceStructure(photoUrl, controller.signal).then((found) => { detection.current = found }).catch(() => undefined)
    return () => controller.abort()
  }, [photoUrl])

  useEffect(() => { onProgressRef.current?.(status) }, [status])

  const seeOnHouse = useCallback(() => {
    const photo = photoRef.current
    const current = resolvedRef.current
    const activeDoor = current.cacheKey
    const store = houseImages(photo)
    const saved = store.get(activeDoor)
    const activeKey = liveKey(photo, activeDoor)
    if (saved) {
      setLive({ key: activeKey, status: 'ready', message: '' })
      return
    }
    const decision = store.begin(activeDoor)
    if (decision === 'inflight') {
      setLive({ key: activeKey, status: 'working', message: '' })
      return
    }
    const started = houseImageGeneration()
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 170_000)
    const configuration = current.configuration
    const finish = current.finish
    const glassFrameFinish = current.preview.glassFrameFinish ?? null
    const entranceDetection = detection.current
    setLive({ key: activeKey, status: 'working', message: '' })
    void (async () => {
      try {
        let sourceUrl = sourceDoorRef.current === activeDoor && sourceRef.current.ready ? sourceRef.current.url : ''
        if (!sourceUrl) {
          if (sourceRef.current.error) sourceRef.current.retry?.()
          sourceUrl = await waitForDoorSource(activeDoor, sourceDoorRef, sourceRef, controller.signal)
        }
        const productReferenceUrl = await snapshotDoor(sourceUrl)
        if (houseImageGeneration() !== started) return
        const result = await generateAiVisualization({
          photoUrl: photo,
          productReferenceUrl,
          configuration,
          jambFinish: finish,
          glassFrameFinish,
          entranceDetection,
          fitStrategy: 'use-selected-product',
          signal: controller.signal,
        })
        if (houseImageGeneration() !== started) return
        houseImages(photo).fulfill(activeDoor, result.image)
        if (photoRef.current === photo && resolvedRef.current.cacheKey === activeDoor) setLive({ key: activeKey, status: 'ready', message: '' })
      } catch (error) {
        if (houseImageGeneration() === started) houseImages(photo).fail(activeDoor)
        if (photoRef.current !== photo || resolvedRef.current.cacheKey !== activeDoor) return
        setLive({ key: activeKey, status: 'error', message: failureMessage(error, controller.signal.aborted) })
      } finally {
        window.clearTimeout(timeout)
      }
    })()
  }, [])

  useImperativeHandle(ref, () => ({ seeOnHouse }), [seeOnHouse])

  return <>
    <ConfiguredDoorSource configurationKey={doorKey} previewProps={resolved.preview} onStateChange={(state) => { sourceDoorRef.current = resolvedRef.current.cacheKey; setDoorSource(state) }} />
    {showHouse && status === 'ready' && cached && <CleanupComparisonSlider originalSrc={photoUrl} cleanupSrc={cached} imageAlt={`${resolved.title} on your house`} originalLabel="Before" resultLabel="After" ariaLabel="Before and after comparison of your house and this door" visible />}
    {showHouse && status === 'working' && <div className="find-door-house-status" role="status"><span className="find-door-progress" /><p>Placing this door on your photo.</p></div>}
    {showHouse && status === 'error' && <div className="find-door-house-status" role="alert"><p className="find-door-note find-door-note-error">{message}</p><button type="button" className="find-door-quiet" onClick={seeOnHouse}>Try again</button></div>}
  </>
})
