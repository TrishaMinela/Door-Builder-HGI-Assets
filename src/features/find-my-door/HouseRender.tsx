import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
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
  onProgress?: (status: 'working' | 'ready' | 'error') => void
}

export function HouseRender({ photoUrl, resolved, showResult, onProgress }: Props) {
  const [doorSource, setDoorSource] = useState<DoorSourceState>({ url: '', width: 0, height: 0, error: '', ready: false })
  const [image, setImage] = useState('')
  const [status, setStatus] = useState<'working' | 'ready' | 'error'>('working')
  const [message, setMessage] = useState('Placing this door on your photo. This usually takes a minute or two.')
  const [attempt, setAttempt] = useState(0)
  const cache = useRef(new Map<string, string>())
  const detection = useRef<EntranceDetection | null>(null)
  const resolvedRef = useRef(resolved)
  const onProgressRef = useRef(onProgress)
  resolvedRef.current = resolved
  onProgressRef.current = onProgress

  useEffect(() => {
    const controller = new AbortController()
    detection.current = null
    void detectEntranceStructure(photoUrl, controller.signal).then((found) => { detection.current = found }).catch(() => undefined)
    return () => controller.abort()
  }, [photoUrl])

  useEffect(() => {
    const current = resolvedRef.current
    const cached = cache.current.get(current.cacheKey)
    if (cached) {
      setImage(cached)
      setStatus('ready')
      setMessage('')
      onProgressRef.current?.('ready')
      return
    }
    if (!doorSource.ready || !doorSource.url || doorSource.error) {
      if (doorSource.error) {
        setStatus('error')
        setMessage('We couldn’t prepare this door. Please try again.')
        onProgressRef.current?.('error')
      }
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 170_000)
    setImage('')
    setStatus('working')
    setMessage('Placing this door on your photo. This usually takes a minute or two.')
    onProgressRef.current?.('working')
    void generateAiVisualization({
      photoUrl,
      productReferenceUrl: doorSource.url,
      configuration: current.configuration,
      jambFinish: current.finish,
      glassFrameFinish: current.preview.glassFrameFinish ?? null,
      entranceDetection: detection.current,
      fitStrategy: 'use-selected-product',
      signal: controller.signal,
    }).then((result) => {
      if (cancelled) return
      cache.current.set(current.cacheKey, result.image)
      setImage(result.image)
      setStatus('ready')
      setMessage('')
      onProgressRef.current?.('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      const timedOut = controller.signal.aborted
      const friendly = error instanceof AiVisualizationError ? error.userMessage : timedOut ? 'Your visualization took too long to complete. Please try again.' : 'We couldn’t place the door on that photo. Please try again.'
      setStatus('error')
      setMessage(friendly)
      onProgressRef.current?.('error')
    }).finally(() => window.clearTimeout(timer))
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer) }
  }, [attempt, doorSource.error, doorSource.ready, doorSource.url, photoUrl, resolved.cacheKey])

  return <>
    <ConfiguredDoorSource configurationKey={resolved.cacheKey} previewProps={resolved.preview} onStateChange={setDoorSource} />
    {showResult && <div className="find-door-result-visual">
      {image ? <img src={image} alt={`${resolved.title} rendered on your home`} /> : <DoorPreview {...resolved.preview} view="Exterior" showViewToggle={false} />}
      {status !== 'ready' && <p className={status === 'error' ? 'find-door-note find-door-note-error' : 'find-door-note'} role="status">{message}</p>}
      {status === 'error' && <button type="button" className="find-door-secondary" onClick={() => { doorSource.retry?.(); setAttempt((value) => value + 1) }}><RefreshCw size={16} /> Try the photo again</button>}
    </div>}
  </>
}
