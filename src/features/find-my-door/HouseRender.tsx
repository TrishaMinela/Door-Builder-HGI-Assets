import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DoorPreview } from '../../components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../home-visualizer/ConfiguredDoorSource'
import { AiVisualizationError, generateAiVisualization } from '../home-visualizer/aiVisualization'
import { detectEntranceStructure } from '../home-visualizer/entranceDetection'
import type { EntranceDetection } from '../home-visualizer/entranceFitStrategy'
import type { ResolvedRecommendation } from './resolveRecommendation'

type Props = {
  photoUrl: string
  resolved: ResolvedRecommendation
  showResult: boolean
  onProgress?: (status: 'idle' | 'working' | 'ready' | 'error') => void
}

const emptySource: DoorSourceState = { url: '', width: 0, height: 0, error: '', ready: false }

async function snapshotDoor(url: string) {
  const blob = await fetch(url).then((response) => response.blob())
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('We couldn’t prepare this door. Press See this on my house to try again.'))
    reader.readAsDataURL(blob)
  })
}

function failureMessage(error: unknown, aborted: boolean) {
  if (aborted) return 'Your visualization took too long to complete. Press See this on my house to try again.'
  if (error instanceof AiVisualizationError) return error.userMessage
  if (error instanceof Error && error.message) return error.message.includes('See this on my house') ? error.message : `${error.message} Press See this on my house to try again.`
  return 'We couldn’t place the door on your photo. Press See this on my house to try again.'
}

export function HouseRender({ photoUrl, resolved, showResult, onProgress }: Props) {
  const [doorSource, setDoorSource] = useState<DoorSourceState>(emptySource)
  const [image, setImage] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'ready' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const cache = useRef(new Map<string, string>())
  const detection = useRef<EntranceDetection | null>(null)
  const sourceRef = useRef(doorSource)
  const resolvedRef = useRef(resolved)
  const runRef = useRef(0)
  const onProgressRef = useRef(onProgress)
  sourceRef.current = doorSource
  resolvedRef.current = resolved
  onProgressRef.current = onProgress

  useEffect(() => {
    const controller = new AbortController()
    detection.current = null
    void detectEntranceStructure(photoUrl, controller.signal).then((found) => { detection.current = found }).catch(() => undefined)
    return () => controller.abort()
  }, [photoUrl])

  useEffect(() => {
    runRef.current += 1
    const cached = cache.current.get(resolved.cacheKey)
    setImage(cached ?? '')
    setStatus(cached ? 'ready' : 'idle')
    setMessage('')
    onProgressRef.current?.(cached ? 'ready' : 'idle')
  }, [photoUrl, resolved.cacheKey])

  const seeOnHouse = async () => {
    const request = ++runRef.current
    const current = resolvedRef.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 170_000)
    setStatus('working')
    setMessage('Placing this door on your house. This usually takes a minute or two.')
    onProgressRef.current?.('working')
    try {
      if (sourceRef.current.error) sourceRef.current.retry?.()
      const source = await new Promise<DoorSourceState>((resolve, reject) => {
        const started = performance.now()
        let settled = false
        const finish = (settle: () => void) => { if (settled) return; settled = true; settle() }
        const check = () => {
          if (settled) return
          if (request !== runRef.current || controller.signal.aborted) { finish(() => reject(new DOMException('Aborted', 'AbortError'))); return }
          const latest = sourceRef.current
          if (latest.ready && latest.url) { finish(() => resolve(latest)); return }
          if (latest.error && performance.now() - started > 1000) { finish(() => reject(new Error(latest.error))); return }
          if (performance.now() - started > 30_000) { finish(() => reject(new Error('We couldn’t prepare this door. Press See this on my house to try again.'))); return }
          window.setTimeout(check, 200)
        }
        check()
      })
      if (request !== runRef.current) return
      const productReferenceUrl = await snapshotDoor(source.url)
      if (request !== runRef.current) return
      const result = await generateAiVisualization({
        photoUrl,
        productReferenceUrl,
        configuration: current.configuration,
        jambFinish: current.finish,
        glassFrameFinish: current.preview.glassFrameFinish ?? null,
        entranceDetection: detection.current,
        fitStrategy: 'use-selected-product',
        signal: controller.signal,
      })
      if (request !== runRef.current) return
      cache.current.set(current.cacheKey, result.image)
      setImage(result.image)
      setStatus('ready')
      setMessage('')
      onProgressRef.current?.('ready')
    } catch (error) {
      if (request !== runRef.current) return
      setStatus('error')
      setMessage(failureMessage(error, controller.signal.aborted))
      onProgressRef.current?.('error')
    } finally {
      window.clearTimeout(timeout)
    }
  }

  return <>
    <ConfiguredDoorSource configurationKey={resolved.cacheKey} previewProps={resolved.preview} onStateChange={setDoorSource} />
    {showResult && <div className="find-door-result-visual">
      {image && status === 'ready'
        ? <img src={image} alt={`${resolved.title} rendered on your home`} />
        : <DoorPreview {...resolved.preview} view="Exterior" showViewToggle={false} />}
      {status === 'working' && <div className="find-door-house-loading" role="status"><Loader2 className="find-door-spin" aria-hidden="true" /><span>{message}</span></div>}
      {status === 'error' && <p className="find-door-note find-door-note-error" role="alert">{message}</p>}
      <button type="button" className="find-door-house-button" onClick={() => void seeOnHouse()} disabled={status === 'working'}>See this on my house</button>
    </div>}
  </>
}
