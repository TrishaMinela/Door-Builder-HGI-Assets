import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, Download, FileText, ImagePlus, RefreshCw, Upload } from 'lucide-react'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { ConfigurationEditActions, type ConfigurationEditArea } from '../../components/ConfigurationEditActions'
import type { DoorConfiguration } from '../../types'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { CleanupComparisonSlider } from './CleanupComparisonSlider'
import { AiVisualizationError, generateAiVisualization, type AiVisualizationFailure } from './aiVisualization'
import { AiGenerationLoading, EntranceDetectionLoading, useAiGenerationLoading, useEntranceDetectionLoading } from './AiGenerationLoading'
import { detectEntranceStructure } from './entranceDetection'
import { boundedStage, validateVisualizationImage } from './visualizationLifecycle'
import { detectionForManualStructure, evaluateEntranceCompatibility, MANUAL_ENTRANCE_OPTIONS, type EntranceDetection, type EntranceFitStrategy, type ExistingEntranceStructure } from './entranceFitStrategy'

// Original uploads are decoded locally; only the budgeted normalized image is
// sent to the API. Retain a resource guard without rejecting normal 48MP files.
const MAX_PHOTO_SIZE = 50 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'])
const SUPPORTED_PHOTO_EXTENSIONS = /\.(?:jpe?g|png|webp|avif|heic|heif)$/i
const HEIC_PHOTO_TYPES = new Set(['image/heic', 'image/heif'])

type SelectedPhoto = {
  file: File
  objectUrl: string
  originalFormat: string
  originalByteSize: number
  originalMimeType: string
}

type Props = {
  active?: boolean
  onEditConfiguration?: (area: ConfigurationEditArea) => void
  onBack: () => void
  onReturnToReview?: () => void
  onDownloadPdf?: () => Promise<void>
  configuredDoorPreview: DoorPreviewProps
  configurationKey: string
  doorConfiguration: DoorConfiguration | null
}

function fileError(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type.toLowerCase()) && !SUPPORTED_PHOTO_EXTENSIONS.test(file.name)) return 'Please choose a JPG, PNG, WebP, AVIF, HEIC, or HEIF image.'
  if (file.size > MAX_PHOTO_SIZE) return 'That photo is larger than 50 MB. Please choose a smaller image.'
  return ''
}

function isHeicPhoto(file: File) {
  return HEIC_PHOTO_TYPES.has(file.type.toLowerCase()) || /\.(?:heic|heif)$/i.test(file.name)
}

export async function normalizePhoto(file: File, actualFormat?: string) {
  if (!isHeicPhoto(file) && actualFormat !== 'heif') return file
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: .94 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], file.name.replace(/\.(?:heic|heif)$/i, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified })
}

async function detectedImageFormat(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const ascii = String.fromCharCode(...bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (pngSignature.every((value, index) => bytes[index] === value)) return 'png'
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp'
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12).toLowerCase()
    if (brand.startsWith('avi')) return 'avif'
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'heif'
  }
  return 'unknown'
}

export function HomeVisualizer({ active = true, onEditConfiguration, onBack, onReturnToReview, onDownloadPdf, configuredDoorPreview, configurationKey, doorConfiguration }: Props) {
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<AiVisualizationFailure | null>(null)
  const [entranceDetection, setEntranceDetection] = useState<EntranceDetection | null>(null)
  const [entranceDetectionLoading, setEntranceDetectionLoading] = useState(false)
  const [entranceDetectionError, setEntranceDetectionError] = useState<AiVisualizationFailure | null>(null)
  const [manualEntranceStructure, setManualEntranceStructure] = useState<ExistingEntranceStructure>('unknown')
  const detectionAbortRef = useRef<AbortController | null>(null)
  const autoCompatibilityGenerationKeyRef = useRef('')
  const [aiResult, setAiResult] = useState<{ image: string; key: string; strategy: EntranceFitStrategy; attemptId: number; requestId: string } | null>(null)
  const entranceDetectionLoadingExperience = useEntranceDetectionLoading(entranceDetectionLoading, Boolean(entranceDetection), Boolean(entranceDetectionError))
  const aiRequestIdRef = useRef(0)
  const aiPendingRef = useRef(false)
  const aiAbortRef = useRef<AbortController | null>(null)
  const photoChoiceRef = useRef(0)
  const displayWaitRef = useRef<{ attemptId: number; resolve: () => void; reject: (error: Error) => void } | null>(null)
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [photoPreparing, setPhotoPreparing] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const aiLoadingExperience = useAiGenerationLoading(aiGenerating, showResult ? aiResult?.image ?? '' : '', aiError?.userMessage ?? '')
  const [downloadError, setDownloadError] = useState('')
  const [pdfDownloadPreparing, setPdfDownloadPreparing] = useState(false)
  const incompatibilityDialogRef = useRef<HTMLDivElement>(null)
  const [doorSource, setDoorSource] = useState<DoorSourceState>({ url: '', width: 0, height: 0, error: '', ready: false })
  const entranceCompatibility = useMemo(() => entranceDetection && doorConfiguration ? evaluateEntranceCompatibility(entranceDetection, doorConfiguration) : null, [entranceDetection, doorConfiguration])
  const showIncompatibilityModal = active && Boolean(photo) && Boolean(entranceCompatibility && entranceCompatibility.status !== 'good-fit')

  useEffect(() => {
    if (!showIncompatibilityModal) return
    const dialog = incompatibilityDialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    const backgroundElements = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== dialog.parentElement).map(element => ({ element, inert: element.inert }))
    backgroundElements.forEach(({ element }) => { element.inert = true })
    document.body.style.overflow = 'hidden'
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
    buttons[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return }
      if (event.key === 'Tab') {
        event.preventDefault()
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus()
      }
    }
    const onFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) buttons[0]?.focus()
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.body.style.overflow = previousOverflow
      backgroundElements.forEach(({ element, inert }) => { element.inert = inert })
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocus)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [showIncompatibilityModal])
  const updateDoorSource = useCallback((state: DoorSourceState) => setDoorSource(state), [])
  const invalidateAiResult = () => {
    aiRequestIdRef.current += 1
    aiAbortRef.current?.abort()
    aiAbortRef.current = null
    aiPendingRef.current = false
    setAiGenerating(false)
    setAiResult(null)
    setAiError(null)
    displayWaitRef.current = null
  }

  const runEntranceDetection = useCallback(async () => {
    if (!photo || entranceDetectionLoading) return
    detectionAbortRef.current?.abort()
    const controller = new AbortController()
    detectionAbortRef.current = controller
    setEntranceDetectionLoading(true); setEntranceDetectionError(null); setEntranceDetection(null); setManualEntranceStructure('unknown'); autoCompatibilityGenerationKeyRef.current = ''
    try {
      const detected = await detectEntranceStructure(photo.objectUrl, controller.signal)
      if (controller.signal.aborted) return
      setEntranceDetection(detected)
    } catch (reason) {
      if (controller.signal.aborted || detectionAbortRef.current !== controller) return
      setEntranceDetectionError(reason instanceof AiVisualizationError ? reason : { userMessage: 'We could not detect the entrance. Please retry or identify the entrance structure below.', errorCode: 'ENTRANCE_DETECTION_FAILED', requestId: '' })
    } finally {
      if (detectionAbortRef.current === controller) { detectionAbortRef.current = null; setEntranceDetectionLoading(false) }
    }
  }, [photo, entranceDetectionLoading, doorConfiguration])

  useEffect(() => {
    if (active && photo && !photoPreparing && !entranceDetection && !entranceDetectionError && !entranceDetectionLoading) void runEntranceDetection()
  }, [active, photo, photoPreparing, entranceDetection, entranceDetectionError, entranceDetectionLoading, runEntranceDetection])

  useEffect(() => () => detectionAbortRef.current?.abort(), [])

  const runAiVisualization = async (strategyOverride?: EntranceFitStrategy) => {
    if (!active || photoPreparing || entranceCompatibility?.status !== 'good-fit' || !photo || !doorConfiguration || !doorSource.ready || !doorSource.url || aiPendingRef.current) return
    const activeStrategy = strategyOverride ?? 'use-selected-product'
    const requestKey = JSON.stringify({ configurationKey, corners: 'automatic', fitStrategy: activeStrategy, photo: `${photo.file.name}:${photo.file.size}:${photo.file.lastModified}` })
    const requestId = ++aiRequestIdRef.current
    aiPendingRef.current = true
    const controller = new AbortController()
    aiAbortRef.current = controller
    setAiGenerating(true)
    setAiError(null)
    setAiResult(null)
    setShowResult(false)
    let responseRequestId = ''
    // Also bounds normalization, response-body delivery and any browser stalls.
    const deadline = window.setTimeout(() => {
      if (requestId !== aiRequestIdRef.current) return
      aiRequestIdRef.current += 1
      controller.abort()
      aiPendingRef.current = false
      setAiGenerating(false)
      setAiResult(null)
      setAiError(new AiVisualizationError('The visualization took too long. Please try again.', 'VISUALIZATION_TIMEOUT', responseRequestId))
    }, 190_000)
    try {
      const result = await generateAiVisualization({
        photoUrl: photo.objectUrl,
        productReferenceUrl: doorSource.url,
        corners: undefined,
        configuration: doorConfiguration,
        jambFinish: configuredDoorPreview.jambFinish,
        glassFrameFinish: configuredDoorPreview.glassFrameFinish,
        entranceDetection,
        fitStrategy: activeStrategy,
        uploadMetadata: { mimeType: photo.originalMimeType, format: photo.originalFormat, byteSize: photo.originalByteSize },
        signal: controller.signal,
        onResponseRequestId: id => { if (requestId === aiRequestIdRef.current) responseRequestId = id },
      })
      responseRequestId = result.requestId
      await validateVisualizationImage(photo.objectUrl, controller.signal, new AiVisualizationError('Your photo could not be loaded for comparison. Please retry or replace the photo.', 'ORIGINAL_IMAGE_FAILED', responseRequestId))
      if (requestId === aiRequestIdRef.current) {
        // Wait for the real comparison elements too, not just a preloaded Image.
        const displayed = new Promise<void>((resolve, reject) => { displayWaitRef.current = { attemptId: requestId, resolve, reject } })
        setAiResult({ image: result.image, key: requestKey, strategy: activeStrategy, attemptId: requestId, requestId: responseRequestId })
        await boundedStage(displayed, controller.signal, 20_000, new AiVisualizationError('The comparison images could not be displayed. Please try again.', 'COMPARISON_IMAGE_TIMEOUT', responseRequestId))
        if (requestId !== aiRequestIdRef.current) return
        setShowResult(true)
      }
    } catch (reason) {
      if (requestId === aiRequestIdRef.current) {
        controller.abort()
        setAiResult(null)
        setShowResult(false)
        setAiError(reason instanceof AiVisualizationError ? reason : { userMessage: reason instanceof Error ? reason.message : 'The AI visualization could not be created. Please try again.', errorCode: 'UNKNOWN_ERROR', requestId: responseRequestId })
      }
    } finally {
      window.clearTimeout(deadline)
      if (displayWaitRef.current?.attemptId === requestId) displayWaitRef.current = null
      if (requestId === aiRequestIdRef.current) { aiPendingRef.current = false; aiAbortRef.current = null; setAiGenerating(false) }
    }
  }

  useEffect(() => {
    if (!active || photoPreparing || entranceCompatibility?.status !== 'good-fit' || !photo || !entranceDetection || !doorSource.ready || !doorSource.url || aiPendingRef.current || aiGenerating || aiResult || aiError) return
    const key = JSON.stringify({ photo: `${photo.file.name}:${photo.file.size}:${photo.file.lastModified}`, configurationKey, detection: entranceDetection })
    if (autoCompatibilityGenerationKeyRef.current === key) return
    autoCompatibilityGenerationKeyRef.current = key
    void runAiVisualization('use-selected-product')
  }, [active, photoPreparing, entranceCompatibility?.status, photo, entranceDetection, doorSource.ready, doorSource.url, aiGenerating, aiResult, aiError, configurationKey])

  const comparisonReady = useCallback(() => {
    if (aiResult?.attemptId === aiRequestIdRef.current && displayWaitRef.current?.attemptId === aiResult.attemptId) displayWaitRef.current.resolve()
  }, [aiResult])
  const comparisonFailed = useCallback(() => {
    if (!aiResult || aiResult.attemptId !== aiRequestIdRef.current) return
    const failure = new AiVisualizationError('The comparison image could not be loaded. Please try again.', 'COMPARISON_IMAGE_FAILED', aiResult.requestId)
    if (displayWaitRef.current?.attemptId === aiResult.attemptId) displayWaitRef.current.reject(failure)
    else { setAiResult(null); setShowResult(false); setAiError(failure) }
  }, [aiResult])

  const retryReference = () => {
    invalidateAiResult()
    setShowResult(false)
    autoCompatibilityGenerationKeyRef.current = ''
    doorSource.retry?.()
  }

  const selectManualEntranceStructure = (structure: ExistingEntranceStructure) => {
    setManualEntranceStructure(structure)
    if (structure === 'unknown') { setEntranceDetection(null); return }
    const manualDetection = detectionForManualStructure(structure)
    setEntranceDetectionError(null); setEntranceDetection(manualDetection); autoCompatibilityGenerationKeyRef.current = ''
  }

  const downloadConfigurationPdf = async () => {
    if (!onDownloadPdf || pdfDownloadPreparing) return
    setPdfDownloadPreparing(true);setDownloadError('')
    try { await onDownloadPdf() }
    catch (reason) { setDownloadError(reason instanceof Error ? reason.message : 'The configuration PDF could not be downloaded.') }
    finally { setPdfDownloadPreparing(false) }
  }

  const downloadAiVisualization = () => {
    if (!aiResult) return
    const link = document.createElement('a')
    link.href = aiResult.image
    link.download = `home-guard-ai-visualization-${new Date().toISOString().slice(0, 10)}.jpg`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  useEffect(() => {
    invalidateAiResult()
    setShowResult(false)
    setDoorSource({ url: '', width: 0, height: 0, error: '', ready: false })
    // The photo analysis belongs to the photo, not the product being edited.
    // Compatibility is derived above from that analysis and the latest product.
    autoCompatibilityGenerationKeyRef.current = ''
  }, [configurationKey])
  useEffect(() => {
    if (!active) {
      photoChoiceRef.current += 1
      setPhotoPreparing(false)
      // Keep completed results when merely leaving/re-entering. An interrupted
      // candidate must not masquerade as a retained completed visualization.
      if (aiPendingRef.current) {
        aiRequestIdRef.current += 1
        setAiResult(null); setShowResult(false); setAiError(null)
        displayWaitRef.current = null
      }
      aiAbortRef.current?.abort(); aiPendingRef.current = false; setAiGenerating(false)
      detectionAbortRef.current?.abort(); detectionAbortRef.current = null; setEntranceDetectionLoading(false)
      setDoorSource({ url: '', width: 0, height: 0, error: '', ready: false })
      autoCompatibilityGenerationKeyRef.current = ''
    }
  }, [active])
  useEffect(() => () => {
    photoChoiceRef.current += 1
    aiRequestIdRef.current += 1
    aiAbortRef.current?.abort()
    detectionAbortRef.current?.abort()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])
  const choosePhoto = async (file?: File) => {
    if (!file) return
    const nextError = fileError(file)
    if (nextError) {
      setError(nextError)
      return
    }

    setError('')
    const choice = ++photoChoiceRef.current
    setPhotoPreparing(true)
    invalidateAiResult()
    setShowResult(false)
    detectionAbortRef.current?.abort()
    let displayFile: File
    let originalFormat = 'unknown'
    try {
      originalFormat = await detectedImageFormat(file)
      displayFile = await normalizePhoto(file, originalFormat)
    } catch (reason) {
      if (choice !== photoChoiceRef.current) return
      setPhotoPreparing(false)
      console.error('[home-visualizer:photo-conversion]', reason)
      setError('That HEIC photo could not be opened. Please try another photo.')
      return
    }
    if (choice !== photoChoiceRef.current) return
    setPhotoPreparing(false)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(displayFile)
    objectUrlRef.current = objectUrl
    setPhoto({ file: displayFile, objectUrl, originalFormat, originalByteSize: file.size, originalMimeType: file.type })
    invalidateAiResult()
    detectionAbortRef.current?.abort(); detectionAbortRef.current = null
    setEntranceDetection(null); setEntranceDetectionError(null); setEntranceDetectionLoading(false); setManualEntranceStructure('unknown'); autoCompatibilityGenerationKeyRef.current = ''
    setShowResult(false)
  }

  const openPicker = () => {
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => choosePhoto(event.target.files?.[0])

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    choosePhoto(event.dataTransfer.files?.[0])
  }

  const removePhoto = () => {
    photoChoiceRef.current += 1
    setPhotoPreparing(false)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setError('')
    setPhoto(null)
    invalidateAiResult()
    detectionAbortRef.current?.abort(); detectionAbortRef.current = null
    setEntranceDetection(null); setEntranceDetectionError(null); setEntranceDetectionLoading(false); autoCompatibilityGenerationKeyRef.current = ''
    setShowResult(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const leaveVisualizer = () => onBack()
  const returnFromFinal = () => setShowResult(false)
  const editToolbar = onEditConfiguration && <ConfigurationEditActions visualizer headingLevel={showResult ? 3 : 2} onEdit={onEditConfiguration} hasGlass={Boolean(configuredDoorPreview.glass || configuredDoorPreview.sideliteGlassSrc)} />
  if (!active) return null
  return (
    <main className="visualizer-page">
      <div className="visualizer-shell">
        <div className="visualizer-heading">
          <h1>See your entry in context</h1>
          <p>Add a photo of your entrance to prepare the workspace for your configured door.</p>
        </div>

        <section className="visualizer-card" aria-labelledby={!photo ? 'visualizer-photo-title' : undefined} aria-label={photo ? 'Home visualization' : undefined}>
          {!photo && <div className="visualizer-card-heading"><div><h2 id="visualizer-photo-title">Add your house photo</h2></div></div>}

          {!photo ? <>
            <div className="photo-guidance">
              <div className="photo-guidance-heading"><span>Photo guidance</span><h3>For the best preview</h3><p>A straight, complete photo of your entrance produces the most accurate visualization.</p></div>
              <ul>
                <li><Check size={15} /> Stand as centered in front of the entrance as possible.</li>
                <li><Check size={15} /> Include the complete door, sidelites, and frame.</li>
                <li><Check size={15} /> Avoid extreme side angles.</li>
                <li><Check size={15} /> Keep the entire threshold visible.</li>
                <li><Check size={15} /> Avoid objects blocking the entrance.</li>
              </ul>
            </div>

            <div
              className="photo-drop-zone"
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openPicker()
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <span className="photo-drop-icon"><ImagePlus size={30} /></span>
              <strong>Upload a photo of your entrance</strong>
              <span>Drag and drop or choose a file</span>
              <small>JPG, PNG, WebP, AVIF, or HEIC · Maximum 50 MB</small>
              <span className="photo-picker-button"><Upload size={17} /> Choose Photo</span>
            </div>
          </> : <>
{!showResult && <>{editToolbar}<div className="ai-photo-placement-area"><div className="visualizer-editor ai-automatic-photo"><img src={photo.objectUrl} alt={'Uploaded entrance photo: ' + photo.file.name}/></div><EntranceDetectionLoading state={entranceDetectionLoadingExperience}/><AiGenerationLoading state={aiLoadingExperience}/></div>
              {entranceCompatibility?.status === 'good-fit' && !aiGenerating && !aiResult && !doorSource.ready && <div className="visualizer-source-loading" role={doorSource.error ? 'alert' : 'status'}>
                {doorSource.error ? <><p>{doorSource.error}</p><button type="button" onClick={retryReference}><RefreshCw size={16}/> Retry configured door</button></> : <p>Preparing your configured exterior door…</p>}
              </div>}
              {!entranceDetectionLoading&&!entranceCompatibility&&<section className="ai-fit-strategy" aria-labelledby="ai-fit-strategy-title">
                <div className="ai-fit-strategy-heading"><div><span>Entrance compatibility</span><h3 id="ai-fit-strategy-title">Help us identify the opening</h3></div></div>
                {entranceDetection&&!entranceCompatibility&&<p className="ai-detection-summary">We couldn't confidently identify the entrance structure. Please identify it below or retry the analysis.</p>}
                {entranceDetectionError&&<div className="ai-detection-error" role="alert"><p>{entranceDetectionError.userMessage}</p>{import.meta.env.DEV&&<small>{entranceDetectionError.errorCode}{entranceDetectionError.requestId?` · Reference: ${entranceDetectionError.requestId.slice(0,8)}`:''}</small>}<button type="button" onClick={()=>void runEntranceDetection()}>Retry detection</button></div>}
                {!entranceDetectionLoading&&!entranceCompatibility&&<label className="ai-manual-entrance"><span>What does the existing entrance have?</span><select value={manualEntranceStructure} onChange={event=>selectManualEntranceStructure(event.target.value as ExistingEntranceStructure)}><option value="unknown">Choose the existing structure</option>{MANUAL_ENTRANCE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
              </section>}
              {aiError&&<div className="visualizer-error ai-visualizer-error" role="alert"><div><p>{aiError.userMessage}</p>{aiError.requestId&&<small title={aiError.requestId}>Reference: {aiError.requestId.slice(0,8)}</small>}{import.meta.env.DEV&&<small>Error code: {aiError.errorCode}</small>}</div><button type="button" disabled={aiGenerating} onClick={()=>void runAiVisualization()}>Try Again</button></div>}
</>}
            {aiResult&&<section className="visualizer-final-result" aria-labelledby="visualizer-final-title" hidden={!showResult}>
              <div className="visualizer-final-heading"><h2 id="visualizer-final-title">Your new entrance</h2></div>
              {editToolbar}
              <div className="ai-photo-result-area"><CleanupComparisonSlider key={aiResult.attemptId} originalSrc={photo.objectUrl} cleanupSrc={aiResult.image} imageAlt={'AI visualization: ' + photo.file.name} originalLabel="Original" resultLabel="AI Result" ariaLabel="Original photo and AI visualization comparison" onReady={comparisonReady} onError={comparisonFailed} visible={showResult}/><AiGenerationLoading state={aiLoadingExperience}/></div>
              <div className="visualizer-final-actions"><button type="button" className="visualizer-download-button" aria-label="Download completed home visualization photo" disabled={!aiResult} onClick={downloadAiVisualization}><Download size={18}/>Download Photo</button>{onDownloadPdf&&<button type="button" className="visualizer-download-button" aria-label="Download configured door PDF" disabled={pdfDownloadPreparing} onClick={downloadConfigurationPdf}><FileText size={18}/>{pdfDownloadPreparing?'Preparing PDF…':'Download Configuration PDF'}</button>}<button type="button" className="visualizer-review-button" aria-label="Return to the previous visualizer step" onClick={returnFromFinal}>Return to Previous Step</button></div>
              <span className="visualizer-download-status" role="status" aria-live="polite">{aiGenerating?'Creating your AI visualization. This may take a moment.':pdfDownloadPreparing?'Preparing your configuration PDF.':''}</span>{downloadError&&<p className="visualizer-error" role="alert">{downloadError}</p>}
            </section>}
          </>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          <div className="visualizer-card-navigation">
            <button type="button" className="visualizer-card-back" aria-label="Back" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back</button>
            {photo && <button type="button" className="visualizer-card-replace" aria-label="Replace uploaded house photo" onClick={openPicker}><RefreshCw size={17} /> Replace Photo</button>}
          </div>
        </section>

        <ConfiguredDoorSource key={configurationKey} configurationKey={configurationKey} previewProps={configuredDoorPreview} onStateChange={updateDoorSource} />
      </div>
      {showIncompatibilityModal&&createPortal(<div className="builder-typography ai-incompatibility-backdrop"><div ref={incompatibilityDialogRef} className="ai-incompatibility-modal" role="dialog" aria-modal="true" aria-labelledby="ai-incompatibility-title" aria-describedby="ai-incompatibility-description"><h2 id="ai-incompatibility-title">This door configuration doesn’t match your entrance</h2><div id="ai-incompatibility-description"><p>{entranceCompatibility?.detectedSummary} {entranceCompatibility?.selectedSummary}</p><p>Choose a different photo or review your door configuration to continue.</p><p>If this seems wrong, the photo may be too far away, poorly lit, or unclear for accurate AI detection.</p></div><div className="ai-incompatibility-actions"><button type="button" className="ai-incompatibility-change-photo" onClick={removePhoto}>Change Photo</button><button type="button" className="ai-incompatibility-review" onClick={onReturnToReview??onBack}>Review Configuration</button></div></div></div>,document.body)}
    </main>
  )
}
