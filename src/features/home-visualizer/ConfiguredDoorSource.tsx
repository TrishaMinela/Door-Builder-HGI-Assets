import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { DoorPreview, type DoorPreviewProps } from '../../components/DoorPreview'
import { captureFinalDoorPreview } from './captureDoorPreview'
import { cacheEntranceImage, getCachedEntranceImage } from './renderCache'

type Props = {
  configurationKey: string
  onStateChange?: (state: DoorSourceState) => void
  previewProps: DoorPreviewProps
}

type CaptureState = {
  configurationKey: string
  url: string
  width: number
  height: number
}

export type DoorSourceState = Omit<CaptureState, 'configurationKey'> & { error: string; ready: boolean; retry?: () => void }
const MAX_SOURCE_CAPTURE_ATTEMPTS = 3
const ENTRANCE_CAPTURE_PIPELINE_VERSION = 'resolved-material-multiply-v5'
const waitForLayout = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export function ConfiguredDoorSource({ configurationKey, onStateChange, previewProps }: Props) {
  const frameMode = 'visible'
  const captureKey = `${ENTRANCE_CAPTURE_PIPELINE_VERSION}:${frameMode}:${configurationKey}`
  const captureRootRef = useRef<HTMLDivElement>(null)
  const outputUrlRef = useRef<string | null>(null)
  const captureRunRef = useRef(0)
  const failedAttemptRef = useRef('')
  const [retry, setRetry] = useState(0)
  const [capture, setCapture] = useState<CaptureState | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [readyConfigurationKey, setReadyConfigurationKey] = useState('')
  const retryCapture = useCallback(() => {
    setReadyConfigurationKey('')
    setRetry(value => value + 1)
  }, [])
  const updateRenderReadiness = useCallback((state: { ready: boolean; configurationKey: string }) => {
    setReadyConfigurationKey(state.ready ? state.configurationKey : '')
  }, [])

  useEffect(() => {
    const attempt = `${captureKey}:${retry}`
    if (failedAttemptRef.current === attempt) return
    const run = ++captureRunRef.current
    setLoading(true)
    setError('')
    const fail = () => {
      if (captureRunRef.current !== run) return
      window.clearTimeout(timer)
      failedAttemptRef.current = attempt
      captureRunRef.current += 1
      setCapture(null)
      setLoading(false)
      setError('We couldn’t prepare your configured door. Please retry rendering.')
    }
    // Covers both asset readiness and capture itself; neither may silently hang.
    const timer = window.setTimeout(fail, 30_000)

    const captureCurrentDoor = async () => {
      try {
        const cached = getCachedEntranceImage(captureKey)
        if (cached) {
          const url = URL.createObjectURL(cached.blob)
          if (captureRunRef.current !== run) { URL.revokeObjectURL(url); return }
          if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
          outputUrlRef.current = url
          setCapture({ configurationKey: captureKey, url, width: cached.width, height: cached.height })
          return
        }
        if (readyConfigurationKey !== configurationKey) return
        await waitForLayout()
        const root = captureRootRef.current
        if (!root) throw new Error('The configured door preview is unavailable.')
        let result: Awaited<ReturnType<typeof captureFinalDoorPreview>> | null = null
        let lastError: unknown = null
        for (let attempt = 1; attempt <= MAX_SOURCE_CAPTURE_ATTEMPTS; attempt += 1) {
          await waitForLayout()
          if (captureRunRef.current !== run) return
          try {
            // AI always uses the complete configured jamb/profile reference.
            result = await captureFinalDoorPreview(root, {
              frameMode,
              preserveCanonicalFrameBounds: true,
              expectedConfigurationKey: configurationKey,
            })
            break
          } catch (reason) {
            lastError = reason
            if (import.meta.env.DEV) console.warn('CONFIGURED_DOOR_SOURCE_DEBUG', { attempt, maximumAttempts: MAX_SOURCE_CAPTURE_ATTEMPTS, outcome: 'retry', reason })
          }
        }
        if (!result) throw lastError instanceof Error ? lastError : new Error('The configured door source could not be prepared.')
        if (captureRunRef.current !== run) return
        cacheEntranceImage(captureKey, result)
        const url = URL.createObjectURL(result.blob)
        if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
        outputUrlRef.current = url
        setCapture({ configurationKey: captureKey, url, width: result.width, height: result.height })
      } catch (reason) {
        if (captureRunRef.current !== run) return
        if (import.meta.env.DEV) console.error('CONFIGURED_DOOR_SOURCE_DEBUG', { outcome: 'failed-after-retries', reason })
        fail()
      } finally {
        if (captureRunRef.current === run && (readyConfigurationKey === configurationKey || getCachedEntranceImage(captureKey))) {
          window.clearTimeout(timer)
          setLoading(false)
        }
      }
    }

    void captureCurrentDoor()
    return () => { window.clearTimeout(timer); captureRunRef.current += 1 }
  }, [captureKey, configurationKey, readyConfigurationKey, retry, frameMode])

  useEffect(() => () => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current)
  }, [])

  useEffect(() => {
    onStateChange?.({
      url: capture?.url ?? '',
      width: capture?.width ?? 0,
      height: capture?.height ?? 0,
      error,
      ready: Boolean(capture && capture.configurationKey === captureKey && !loading && !error),
      retry: retryCapture,
    })
  }, [capture, captureKey, error, loading, onStateChange, retryCapture])

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
        <button type="button" onClick={retryCapture}><RefreshCw size={16} /> Retry</button>
      </div>}
    </div>
  </section><div className="configured-door-capture-host visualizer-door-source" ref={captureRootRef} aria-hidden="true"><DoorPreview key={retry} {...previewProps} renderConfigurationKey={configurationKey} onRenderReadinessChange={updateRenderReadiness} view="Exterior" showViewToggle={false} compact={false} sharedComparisonCanvas={false} /></div></>
}
