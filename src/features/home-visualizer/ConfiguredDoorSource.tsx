import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { DoorPreview, type DoorPreviewProps } from '../../components/DoorPreview'
import { captureFinalDoorPreview } from './captureDoorPreview'

type Props = {
  configurationKey: string
  onStateChange?: (state: DoorSourceState) => void
  previewProps: DoorPreviewProps
}

type CaptureState = {
  url: string
  width: number
  height: number
}

export type DoorSourceState = CaptureState & { error: string; ready: boolean; retry?: () => void }
const MAX_SOURCE_CAPTURE_ATTEMPTS = 3
const waitForLayout = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export function ConfiguredDoorSource({ configurationKey, onStateChange, previewProps }: Props) {
  const captureRootRef = useRef<HTMLDivElement>(null)
  const outputUrlRef = useRef<string | null>(null)
  const captureRunRef = useRef(0)
  const [retry, setRetry] = useState(0)
  const [capture, setCapture] = useState<CaptureState | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = ++captureRunRef.current
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current)
      outputUrlRef.current = null
    }
    setCapture(null)
    setLoading(true)
    setError('')

    const captureCurrentDoor = async () => {
      try {
        const root = captureRootRef.current
        if (!root) throw new Error('The configured door preview is unavailable.')
        let result: Awaited<ReturnType<typeof captureFinalDoorPreview>> | null = null
        let lastError: unknown = null
        for (let attempt = 1; attempt <= MAX_SOURCE_CAPTURE_ATTEMPTS; attempt += 1) {
          await waitForLayout()
          try {
            result = await captureFinalDoorPreview(root, { frameMode: 'visible' })
            break
          } catch (reason) {
            lastError = reason
            if (import.meta.env.DEV) console.warn('CONFIGURED_DOOR_SOURCE_DEBUG', { attempt, maximumAttempts: MAX_SOURCE_CAPTURE_ATTEMPTS, outcome: 'retry', reason })
          }
        }
        if (!result) throw lastError instanceof Error ? lastError : new Error('The configured door source could not be prepared.')
        if (captureRunRef.current !== run) return
        const url = URL.createObjectURL(result.blob)
        outputUrlRef.current = url
        setCapture({ url, width: result.width, height: result.height })
      } catch (reason) {
        if (captureRunRef.current !== run) return
        setCapture(null)
        if (import.meta.env.DEV) console.error('CONFIGURED_DOOR_SOURCE_DEBUG', { outcome: 'failed-after-retries', reason })
        setError('We couldn’t prepare your configured door. Please retry rendering.')
      } finally {
        if (captureRunRef.current === run) setLoading(false)
      }
    }

    void captureCurrentDoor()
    return () => { captureRunRef.current += 1 }
  }, [configurationKey, retry])

  useEffect(() => () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
  }, [])

  useEffect(() => {
    onStateChange?.({
      url: capture?.url ?? '',
      width: capture?.width ?? 0,
      height: capture?.height ?? 0,
      error,
      ready: Boolean(capture && !loading && !error),
      retry: () => setRetry((value) => value + 1),
    })
  }, [capture, error, loading, onStateChange])

  return <><section className="configured-door-source" aria-labelledby="configured-door-source-title" hidden>
    <div className="configured-door-source-heading">
      <div>
        <span>Development Preview</span>
        <h2 id="configured-door-source-title">Configured Door Source</h2>
      </div>
      {capture && <small>{capture.width} × {capture.height} PNG</small>}
    </div>
    <div className="configured-door-checkerboard">
      {loading && <p role="status">Preparing your configured exterior door…</p>}
      {!loading && capture && <img src={capture.url} alt="Flattened transparent source of the configured exterior door" />}
      {!loading && error && <div className="configured-door-source-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} /> Retry</button>
      </div>}
    </div>
  </section><div className="configured-door-capture-host visualizer-door-source" ref={captureRootRef} aria-hidden="true"><DoorPreview {...previewProps} view="Exterior" showViewToggle={false} compact={false} sharedComparisonCanvas={false} /></div></>
}
