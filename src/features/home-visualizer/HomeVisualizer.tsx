import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, Brush, Check, Crosshair, Eye, ImagePlus, Pencil, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react'
import { cloneEntranceCorners, EntranceSelector, INITIAL_ENTRANCE_CORNERS, isValidEntranceCorners, type EntranceCorners } from './EntranceSelector'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { ComposedPhotoPreview } from './ComposedPhotoPreview'
import { autoFitEntrance, type AutoFitResult } from './computerVision'
import { CleanupBrushEditor, type CleanupStroke } from './CleanupBrushEditor'
import { createBrushCleanup, type CleanupDiagnosticComponent } from './brushCleanup'

const MAX_PHOTO_SIZE = 15 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type SelectedPhoto = {
  file: File
  objectUrl: string
}

type Props = {
  onBack: () => void
  configuredDoorPreview: DoorPreviewProps
  configurationKey: string
}

function fileError(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type)) return 'Please choose a JPG, PNG, or WebP image.'
  if (file.size > MAX_PHOTO_SIZE) return 'That photo is larger than 15 MB. Please choose a smaller image.'
  return ''
}

export function HomeVisualizer({ onBack, configuredDoorPreview, configurationKey }: Props) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [corners, setCorners] = useState<EntranceCorners>(() => cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
  const [previewMode, setPreviewMode] = useState<'edit' | 'composed'>('edit')
  const [showAfter, setShowAfter] = useState(true)
  const [autoFitProposal, setAutoFitProposal] = useState<AutoFitResult | null>(null)
  const [autoFitUndo, setAutoFitUndo] = useState<EntranceCorners | null>(null)
  const [autoFitLoading, setAutoFitLoading] = useState(false)
  const [autoFitError, setAutoFitError] = useState('')
  const [autoFitFailureCorners, setAutoFitFailureCorners] = useState<EntranceCorners | null>(null)
  const [cornersChangedAfterAutoFitFailure, setCornersChangedAfterAutoFitFailure] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const [cleanupBrushOpen, setCleanupBrushOpen] = useState(false)
  const [cleanupStrokes, setCleanupStrokes] = useState<CleanupStroke[]>([])
  const cleanupStrokeSnapshotRef = useRef<CleanupStroke[]>([])
  const [cleanupProposal, setCleanupProposal] = useState<{ cleanedUrl: string; radius: 3 | 5; fullMaskUrl: string; insideMaskUrl: string; outsideMaskUrl: string; width: number; height: number; components: CleanupDiagnosticComponent[] } | null>(null)
  const [approvedCleanup, setApprovedCleanup] = useState<{ cleanedUrl: string; radius: 3 | 5 } | null>(null)
  const [cleanupPreviewMode, setCleanupPreviewMode] = useState<'original' | 'cleanup' | 'final'>('cleanup')
  const cleanupUrlsRef = useRef(new Set<string>())
  const [doorSource, setDoorSource] = useState<DoorSourceState>({ url: '', width: 0, height: 0, error: '', ready: false })
  const updateDoorSource = useCallback((state: DoorSourceState) => setDoorSource(state), [])

  const clearAutoFitFailure = () => {
    setAutoFitFailureCorners(null)
    setCornersChangedAfterAutoFitFailure(false)
  }

  const resetPlacement = () => {
    setCorners(cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
    setPreviewMode('edit')
    setShowAfter(true)
    setAutoFitProposal(null)
    setAutoFitUndo(null)
    setAutoFitError('')
    clearAutoFitFailure()
  }

  useEffect(() => {
    setAutoFitProposal(null)
    setAutoFitError('')
    clearAutoFitFailure()
  }, [configurationKey])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const clearCleanup = () => {
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    cleanupUrlsRef.current.clear()
    setCleanupProposal(null)
    setApprovedCleanup(null)
    setCleanupStrokes([])
    setCleanupBrushOpen(false)
    setCleanupError('')
  }

  const choosePhoto = (file?: File) => {
    if (!file) return
    const nextError = fileError(file)
    if (nextError) {
      setError(nextError)
      return
    }

    setError('')
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(file)
    objectUrlRef.current = objectUrl
    setPhoto({ file, objectUrl })
    clearCleanup()
    resetPlacement()
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
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setError('')
    setPhoto(null)
    clearCleanup()
    resetPlacement()
    if (inputRef.current) inputRef.current.value = ''
  }

  const runAutoFit = async (options: { wider?: boolean } = {}) => {
    if (!photo || autoFitLoading) return
    setAutoFitLoading(true)
    setAutoFitError('')
    setAutoFitProposal(null)
    try {
      const result = await autoFitEntrance(photo.objectUrl, corners, options)
      if (result.detectedCount < 1) {
        setAutoFitFailureCorners(cloneEntranceCorners(corners))
        setCornersChangedAfterAutoFitFailure(false)
        setAutoFitError('Move the four points closer to the exact inside corners of the door opening, then try Auto-Fit again. For difficult photos, a wider search will become available after you adjust the points.')
      } else {
        setAutoFitProposal(result)
        clearAutoFitFailure()
      }
    } catch {
      setAutoFitFailureCorners(cloneEntranceCorners(corners))
      setCornersChangedAfterAutoFitFailure(false)
      setAutoFitError('Move the four points closer to the exact inside corners of the door opening, then try Auto-Fit again. For difficult photos, a wider search will become available after you adjust the points.')
    } finally {
      setAutoFitLoading(false)
    }
  }

  const updateCorners = (nextCorners: EntranceCorners) => {
    setCorners(nextCorners)
    if (!autoFitFailureCorners || !isValidEntranceCorners(nextCorners)) return
    const changed = (Object.keys(nextCorners) as Array<keyof EntranceCorners>).some((id) =>
      Math.abs(nextCorners[id].x - autoFitFailureCorners[id].x) > 1e-7 || Math.abs(nextCorners[id].y - autoFitFailureCorners[id].y) > 1e-7)
    if (changed) setCornersChangedAfterAutoFitFailure(true)
  }

  const showWiderAutoFit = Boolean(autoFitFailureCorners && cornersChangedAfterAutoFitFailure && isValidEntranceCorners(corners) && !autoFitProposal)

  const leaveVisualizer = () => {
    clearAutoFitFailure()
    onBack()
  }

  const previewBrushCleanup = async (radius: 3 | 5 = 3) => {
    if (!photo || cleanupLoading) return
    setCleanupLoading(true)
    setCleanupError('')
    if (cleanupProposal) {
      ;[cleanupProposal.cleanedUrl, cleanupProposal.fullMaskUrl, cleanupProposal.insideMaskUrl, cleanupProposal.outsideMaskUrl].forEach((url) => { cleanupUrlsRef.current.delete(url); URL.revokeObjectURL(url) })
      setCleanupProposal(null)
    }
    try {
      const result = await createBrushCleanup(photo.objectUrl, cleanupStrokes, corners, radius)
      const cleanedUrl = URL.createObjectURL(result.cleanedBlob)
      const fullMaskUrl = URL.createObjectURL(result.fullMaskBlob)
      const insideMaskUrl = URL.createObjectURL(result.insideMaskBlob)
      const outsideMaskUrl = URL.createObjectURL(result.outsideMaskBlob)
      ;[cleanedUrl, fullMaskUrl, insideMaskUrl, outsideMaskUrl].forEach((url) => cleanupUrlsRef.current.add(url))
      setCleanupProposal({ cleanedUrl, radius, fullMaskUrl, insideMaskUrl, outsideMaskUrl, width: result.width, height: result.height, components: result.components })
      setCleanupPreviewMode('cleanup')
    } catch (reason) {
      setCleanupError(reason instanceof Error ? reason.message : 'The cleanup preview could not be created.')
    } finally {
      setCleanupLoading(false)
    }
  }

  const applyCleanup = () => {
    if (!cleanupProposal) return
    if (approvedCleanup) {
      cleanupUrlsRef.current.delete(approvedCleanup.cleanedUrl); URL.revokeObjectURL(approvedCleanup.cleanedUrl)
    }
    setApprovedCleanup({ cleanedUrl: cleanupProposal.cleanedUrl, radius: cleanupProposal.radius })
    ;[cleanupProposal.fullMaskUrl, cleanupProposal.insideMaskUrl, cleanupProposal.outsideMaskUrl].forEach((url) => { cleanupUrlsRef.current.delete(url); URL.revokeObjectURL(url) })
    setCleanupProposal(null)
    setCleanupBrushOpen(false)
    setCleanupError('')
    setShowAfter(true)
  }

  const cancelCleanupProposal = () => {
    if (!cleanupProposal) return
    ;[cleanupProposal.cleanedUrl, cleanupProposal.fullMaskUrl, cleanupProposal.insideMaskUrl, cleanupProposal.outsideMaskUrl].forEach((url) => { cleanupUrlsRef.current.delete(url); URL.revokeObjectURL(url) })
    setCleanupProposal(null)
    setCleanupError('')
  }

  const undoCleanup = () => {
    if (!approvedCleanup) return
    cleanupUrlsRef.current.delete(approvedCleanup.cleanedUrl); URL.revokeObjectURL(approvedCleanup.cleanedUrl)
    setApprovedCleanup(null)
    setShowAfter(true)
  }

  const openCleanupBrush = () => {
    cleanupStrokeSnapshotRef.current = cleanupStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) }))
    setCleanupBrushOpen(true)
    setCleanupError('')
  }

  const closeCleanupBrush = (restoreSnapshot: boolean) => {
    cancelCleanupProposal()
    if (restoreSnapshot) setCleanupStrokes(cleanupStrokeSnapshotRef.current)
    setCleanupBrushOpen(false)
    setCleanupError('')
  }

  const resetCleanupToOriginal = () => {
    clearCleanup()
    setShowAfter(true)
  }

  return (
    <main className="visualizer-page">
      <div className="visualizer-shell">
        <div className="visualizer-heading">
          <span>View on Your Home</span>
          <h1>See your entry in context</h1>
          <p>Add a photo of your entrance to prepare the workspace for your configured door.</p>
        </div>

        <section className="visualizer-card" aria-labelledby="visualizer-photo-title">
          <div className="visualizer-card-heading">
            <div>
              <span>Step 1</span>
              <h2 id="visualizer-photo-title">Add your house photo</h2>
            </div>
            {photo && <span className="visualizer-photo-ready"><Check size={15} /> Photo ready</span>}
          </div>

          {!photo ? <>
            <div className="photo-guidance">
              <p>For the best result, stand near the center of the entrance and include the complete door, frame, threshold, sidelights, and transom. Slightly angled photos are supported, but avoid extreme side angles, wide-angle distortion, heavy shadows, and objects blocking the entrance.</p>
              <ul>
                <li><Check size={15} /> Include the entire entrance</li>
                <li><Check size={15} /> Keep the camera near the center</li>
                <li><Check size={15} /> Avoid objects blocking the door</li>
                <li><Check size={15} /> Use a clear, well-lit photo</li>
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
              <small>JPG, PNG, or WebP · Maximum 15 MB</small>
              <span className="photo-picker-button"><Upload size={17} /> Choose Photo</span>
            </div>
          </> : previewMode === 'edit' ? <>
            <div className="entrance-placement-instructions">
              <Crosshair className="entrance-placement-icon" size={24} aria-hidden="true" />
              <div>
                <h3>Outline the Exact Door Opening</h3>
                <p>Place each corner directly on the inside corner of the existing door frame. Include only the door opening being replaced.</p>
                <p className="entrance-placement-note">Keep the exterior trim, jamb, and threshold outside the outlined area. Accurate corner placement gives Auto-Fit and the final visualization the best result.</p>
              </div>
            </div>
            <p className="entrance-editor-direction"><Crosshair size={15} aria-hidden="true" /> Position the four points on the inside corners shown in the photo.</p>
            <EntranceSelector
              key={photo.objectUrl}
              corners={corners}
              imageSrc={photo.objectUrl}
              imageAlt={`Uploaded entrance photo: ${photo.file.name}`}
              onCornersChange={updateCorners}
              onReset={resetPlacement}
              proposedCorners={autoFitProposal?.corners}
              proposedDetectedEdges={autoFitProposal ? ['top', 'right', 'bottom', 'left'].map((edge) => autoFitProposal.detectedEdges[edge as keyof typeof autoFitProposal.detectedEdges]) : undefined}
            />
            <div className="auto-fit-controls">
              {!autoFitProposal ? <button type="button" className="visualizer-secondary-button" disabled={autoFitLoading} onClick={() => runAutoFit()}><Crosshair size={17} /> {autoFitLoading ? 'Refining Entrance Edges…' : 'Auto-Fit Entrance'}</button> : <>
                <button type="button" className="visualizer-apply-button auto-tool-apply" onClick={() => { setAutoFitUndo(cloneEntranceCorners(corners)); setCorners(autoFitProposal.corners); setAutoFitProposal(null); setAutoFitError(''); clearAutoFitFailure() }}><Check size={17} /> Apply Auto-Fit</button>
                <button type="button" className="visualizer-secondary-button" onClick={() => setAutoFitProposal(null)}>Cancel</button>
              </>}
              {showWiderAutoFit && <button type="button" className="visualizer-secondary-button" disabled={autoFitLoading} onClick={() => runAutoFit({ wider: true })}><Crosshair size={17} /> Try Wider Search</button>}
              {autoFitUndo && !autoFitProposal && <button type="button" className="visualizer-secondary-button" onClick={() => { setCorners(autoFitUndo); setAutoFitUndo(null) }}><RotateCcw size={17} /> Undo Auto-Fit</button>}
            </div>
            {autoFitProposal && <p className="auto-tool-result">Auto-Fit refined {autoFitProposal.detectedCount} of 4 edges. The remaining edges were kept from your manual placement.</p>}
            {autoFitError && <p className="visualizer-error" role="alert">{autoFitError}</p>}
            <button
              type="button"
              className="visualizer-apply-button"
              disabled={!doorSource.ready || Boolean(doorSource.error) || !isValidEntranceCorners(corners)}
              onClick={() => { setPreviewMode('composed'); setShowAfter(true) }}
            ><Eye size={18} /> Confirm Entrance Shape</button>
            {!doorSource.ready && !doorSource.error && <p className="visualizer-apply-status">Preparing the configured door source…</p>}
            {doorSource.error && <p className="visualizer-apply-status visualizer-apply-status-error">Resolve the configured door source error below before applying the door.</p>}
          </> : <>
            <div className="entrance-placement-instructions">
              <Crosshair className="entrance-placement-icon" size={24} aria-hidden="true" />
              <div>
                <h3>Outline the Exact Door Opening</h3>
                <p>Place each corner directly on the inside corner of the existing door frame. Include only the door opening being replaced.</p>
                <p className="entrance-placement-note">Keep the exterior trim, jamb, and threshold outside the outlined area. Accurate corner placement gives Auto-Fit and the final visualization the best result.</p>
              </div>
            </div>
            {cleanupBrushOpen ? <>
              {!cleanupProposal ? <CleanupBrushEditor corners={corners} imageSrc={photo.objectUrl} imageAlt={`Untouched uploaded entrance photo: ${photo.file.name}`} strokes={cleanupStrokes} processing={cleanupLoading} onStrokesChange={(strokes) => { setCleanupStrokes(strokes); cancelCleanupProposal() }} onPreview={() => previewBrushCleanup(3)} onCancel={() => closeCleanupBrush(true)} onDone={() => closeCleanupBrush(false)} /> : <section className="cleanup-preview-workspace" aria-labelledby="cleanup-preview-title">
                <div className="cleanup-brush-heading"><Brush size={22} aria-hidden="true" /><div><h3 id="cleanup-preview-title">Review Cleanup</h3><p>Details inside the outlined door opening will be covered by the new door. Cleanup is applied only to details extending outside the opening.</p></div></div>
                <div className="cleanup-preview-toolbar" role="group" aria-label="Cleanup preview view">
                  <button type="button" className={cleanupPreviewMode === 'original' ? 'active' : ''} aria-pressed={cleanupPreviewMode === 'original'} onClick={() => setCleanupPreviewMode('original')}>Original</button>
                  <button type="button" className={cleanupPreviewMode === 'cleanup' ? 'active' : ''} aria-pressed={cleanupPreviewMode === 'cleanup'} onClick={() => setCleanupPreviewMode('cleanup')}>Cleanup Preview</button>
                  <button type="button" className={cleanupPreviewMode === 'final' ? 'active' : ''} aria-pressed={cleanupPreviewMode === 'final'} onClick={() => setCleanupPreviewMode('final')}>Final Preview</button>
                </div>
                <ComposedPhotoPreview corners={corners} doorSourceUrl={doorSource.url} imageSrc={cleanupProposal.cleanedUrl} originalImageSrc={photo.objectUrl} imageAlt={`${cleanupPreviewMode === 'original' ? 'Original' : cleanupPreviewMode === 'cleanup' ? 'Cleaned' : 'Final'} entrance preview`} showAfter displayMode={cleanupPreviewMode} />
                <p className="cleanup-quality-note">This tool works best for small details near the doorway. The original photo is never overwritten during preview.</p>
                <div className="cleanup-proposal-actions"><button type="button" className="visualizer-apply-button auto-tool-apply" onClick={applyCleanup}><Check size={17} /> Apply Cleanup</button><button type="button" className="visualizer-secondary-button" onClick={cancelCleanupProposal}><Pencil size={17} /> Edit Brush Marks</button><button type="button" className="visualizer-secondary-button" onClick={() => closeCleanupBrush(true)}>Cancel</button></div>
                {import.meta.env.DEV && <details className="cleanup-diagnostics"><summary>Cleanup diagnostics</summary><div className="cleanup-diagnostic-masks"><figure><img src={cleanupProposal.fullMaskUrl} alt="Full brush mask" /><figcaption>Full mask</figcaption></figure><figure><img src={cleanupProposal.insideMaskUrl} alt="Inside-opening brush mask" /><figcaption>Inside mask</figcaption></figure><figure><img src={cleanupProposal.outsideMaskUrl} alt="Outside-opening brush mask" /><figcaption>Outside mask</figcaption></figure></div><div className="cleanup-diagnostic-stage"><img src={cleanupProposal.cleanedUrl} alt="Cleanup repair diagnostic" /><svg viewBox={`0 0 ${cleanupProposal.width} ${cleanupProposal.height}`} aria-hidden="true">{cleanupProposal.components.map((component, index) => <g key={index}>{component.source && <rect className="cleanup-source-box" {...component.source} />}<rect className="cleanup-destination-box" {...component.destination} /></g>)}</svg></div><ul>{cleanupProposal.components.map((component, index) => <li key={index}>Component {index + 1}: {component.method}</li>)}</ul></details>}
              </section>}
              {cleanupError && <p className="visualizer-error" role="alert">{cleanupError}</p>}
            </> : <>
              <ComposedPhotoPreview corners={corners} doorSourceUrl={doorSource.url} imageSrc={approvedCleanup?.cleanedUrl ?? photo.objectUrl} originalImageSrc={photo.objectUrl} imageAlt={`Uploaded entrance photo: ${photo.file.name}`} showAfter={showAfter} />
              <div className="cleanup-tool-intro"><Brush size={21} aria-hidden="true" /><div><strong>Remove Old Door Details</strong><p>Brush over old hardware, reflections, or small details that should be removed from the original photo.</p></div><button type="button" onClick={openCleanupBrush}>{approvedCleanup ? 'Edit Cleanup' : 'Remove Old Door Details'}</button></div>
              <div className="composed-preview-controls" role="group" aria-label="Composed photo controls">
                <button type="button" onClick={() => setPreviewMode('edit')}><Pencil size={17} /> Edit Entrance Shape</button>
                <button type="button" className={!showAfter ? 'active' : ''} aria-pressed={!showAfter} onClick={() => setShowAfter(false)}>Before</button>
                <button type="button" className={showAfter ? 'active' : ''} aria-pressed={showAfter} onClick={() => setShowAfter(true)}>After</button>
                <button type="button" onClick={resetPlacement}><RotateCcw size={17} /> Reset</button>
                {approvedCleanup && <button type="button" onClick={undoCleanup}><RotateCcw size={17} /> Undo Applied Cleanup</button>}
                {(approvedCleanup || cleanupStrokes.length > 0) && <button type="button" onClick={resetCleanupToOriginal}>Reset to Original Photo</button>}
              </div>
            </>}
          </>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          {photo && <div className="visualizer-photo-actions">
            <button type="button" className="visualizer-secondary-button" onClick={openPicker}><RefreshCw size={17} /> Replace Photo</button>
            <button type="button" className="visualizer-remove-button" onClick={removePhoto}><Trash2 size={17} /> Remove Photo</button>
            <button type="button" className="visualizer-back-button visualizer-back-button-inline" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back to Door Builder</button>
          </div>}
        </section>

        <ConfiguredDoorSource configurationKey={configurationKey} previewProps={configuredDoorPreview} onStateChange={updateDoorSource} />

        {!photo && <button type="button" className="visualizer-back-button" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back to Door Builder</button>}
      </div>
    </main>
  )
}
