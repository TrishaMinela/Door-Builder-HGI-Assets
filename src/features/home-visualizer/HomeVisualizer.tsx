import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, Check, Crosshair, Eye, ImagePlus, Pencil, RefreshCw, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react'
import { cloneEntranceCorners, EntranceSelector, INITIAL_ENTRANCE_CORNERS, isValidEntranceCorners, type EntranceCorners } from './EntranceSelector'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { ComposedPhotoPreview } from './ComposedPhotoPreview'
import { autoCleanHardware, autoFitEntrance, type AutoFitResult, type CleanupProposal } from './computerVision'

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
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const [cleanupProposal, setCleanupProposal] = useState<(CleanupProposal & { cleanedUrl: string; maskUrl: string }) | null>(null)
  const [approvedCleanup, setApprovedCleanup] = useState<{ cleanedUrl: string; maskUrl: string } | null>(null)
  const cleanupUrlsRef = useRef(new Set<string>())
  const [doorSource, setDoorSource] = useState<DoorSourceState>({ url: '', width: 0, height: 0, error: '', ready: false })
  const updateDoorSource = useCallback((state: DoorSourceState) => setDoorSource(state), [])

  const resetPlacement = () => {
    setCorners(cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
    setPreviewMode('edit')
    setShowAfter(true)
    setAutoFitProposal(null)
    setAutoFitUndo(null)
    setAutoFitError('')
  }

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const clearCleanup = () => {
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    cleanupUrlsRef.current.clear()
    setCleanupProposal(null)
    setApprovedCleanup(null)
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
      setAutoFitProposal(await autoFitEntrance(photo.objectUrl, corners, options))
    } catch (reason) {
      setAutoFitError(reason instanceof Error ? reason.message : 'We couldn’t confidently find all four entrance edges. Move the corners closer to the opening and try again.')
    } finally {
      setAutoFitLoading(false)
    }
  }

  const runAutoClean = async (options: { wider?: boolean; radius?: 3 | 5 } = {}) => {
    if (!photo || cleanupLoading) return
    setCleanupLoading(true)
    setCleanupError('')
    if (cleanupProposal) {
      cleanupUrlsRef.current.delete(cleanupProposal.cleanedUrl); URL.revokeObjectURL(cleanupProposal.cleanedUrl)
      cleanupUrlsRef.current.delete(cleanupProposal.maskUrl); URL.revokeObjectURL(cleanupProposal.maskUrl)
      setCleanupProposal(null)
    }
    try {
      const result = await autoCleanHardware(photo.objectUrl, corners, options)
      const cleanedUrl = URL.createObjectURL(result.cleanedBlob)
      const maskUrl = URL.createObjectURL(result.maskBlob)
      cleanupUrlsRef.current.add(cleanedUrl); cleanupUrlsRef.current.add(maskUrl)
      setCleanupProposal({ ...result, cleanedUrl, maskUrl })
    } catch (reason) {
      setCleanupError(reason instanceof Error ? reason.message : 'We couldn’t confidently identify old hardware to remove.')
    } finally {
      setCleanupLoading(false)
    }
  }

  const applyCleanup = () => {
    if (!cleanupProposal) return
    if (approvedCleanup) {
      cleanupUrlsRef.current.delete(approvedCleanup.cleanedUrl); URL.revokeObjectURL(approvedCleanup.cleanedUrl)
      cleanupUrlsRef.current.delete(approvedCleanup.maskUrl); URL.revokeObjectURL(approvedCleanup.maskUrl)
    }
    setApprovedCleanup(cleanupProposal)
    setCleanupProposal(null)
    setCleanupError('')
    setShowAfter(true)
  }

  const cancelCleanupProposal = () => {
    if (!cleanupProposal) return
    cleanupUrlsRef.current.delete(cleanupProposal.cleanedUrl); URL.revokeObjectURL(cleanupProposal.cleanedUrl)
    cleanupUrlsRef.current.delete(cleanupProposal.maskUrl); URL.revokeObjectURL(cleanupProposal.maskUrl)
    setCleanupProposal(null)
    setCleanupError('')
  }

  const undoCleanup = () => {
    if (!approvedCleanup) return
    cleanupUrlsRef.current.delete(approvedCleanup.cleanedUrl); URL.revokeObjectURL(approvedCleanup.cleanedUrl)
    cleanupUrlsRef.current.delete(approvedCleanup.maskUrl); URL.revokeObjectURL(approvedCleanup.maskUrl)
    setApprovedCleanup(null)
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
              <p>Place the four corners along the inside edges of the existing entrance frame. Keep the home’s existing trim and threshold outside the selected area.</p>
              {configuredDoorPreview.sidelites && configuredDoorPreview.sidelites !== 'none' && <p>Include the complete inside opening containing the door and selected sidelites, but keep the outer trim outside the selected area.</p>}
            </div>
            <EntranceSelector
              key={photo.objectUrl}
              corners={corners}
              imageSrc={photo.objectUrl}
              imageAlt={`Uploaded entrance photo: ${photo.file.name}`}
              onCornersChange={setCorners}
              onReset={resetPlacement}
              proposedCorners={autoFitProposal?.corners}
              proposedDetectedEdges={autoFitProposal ? ['top', 'right', 'bottom', 'left'].map((edge) => autoFitProposal.detectedEdges[edge as keyof typeof autoFitProposal.detectedEdges]) : undefined}
            />
            <div className="auto-fit-controls">
              {!autoFitProposal ? <button type="button" className="visualizer-secondary-button" disabled={autoFitLoading} onClick={() => runAutoFit()}><Crosshair size={17} /> {autoFitLoading ? 'Refining Entrance Edges…' : 'Auto-Fit Entrance'}</button> : <>
                <button type="button" className="visualizer-apply-button auto-tool-apply" onClick={() => { setAutoFitUndo(cloneEntranceCorners(corners)); setCorners(autoFitProposal.corners); setAutoFitProposal(null); setAutoFitError('') }}><Check size={17} /> Apply Auto-Fit</button>
                <button type="button" className="visualizer-secondary-button" disabled={autoFitLoading} onClick={() => runAutoFit({ wider: true })}><Crosshair size={17} /> Try Wider Search</button>
                <button type="button" className="visualizer-secondary-button" onClick={() => setAutoFitProposal(null)}>Cancel</button>
              </>}
              {autoFitUndo && !autoFitProposal && <button type="button" className="visualizer-secondary-button" onClick={() => { setCorners(autoFitUndo); setAutoFitUndo(null) }}><RotateCcw size={17} /> Undo Auto-Fit</button>}
            </div>
            {autoFitProposal && <p className="auto-tool-result">Auto-Fit refined {autoFitProposal.detectedCount} of 4 edges. The remaining edges were kept from your manual placement.</p>}
            {import.meta.env.DEV && autoFitProposal && <details className="cv-diagnostics"><summary>Auto-Fit diagnostics</summary><div className="cv-diagnostic-stage"><img src={photo.objectUrl} alt="" /><svg viewBox={`0 0 ${autoFitProposal.diagnostics.width} ${autoFitProposal.diagnostics.height}`}>{autoFitProposal.diagnostics.bands.map((line, index) => <line key={`band-${index}`} className="cv-band" style={{ strokeWidth: autoFitProposal.diagnostics.bandWidth * 2 }} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}{autoFitProposal.diagnostics.segments.map((line, index) => <line key={`segment-${index}`} className="cv-segment" x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}{autoFitProposal.diagnostics.chosen.map((line, index) => <line key={`chosen-${index}`} className={`cv-chosen ${line.kind}`} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} />)}</svg></div>{(['top', 'right', 'bottom', 'left'] as const).map((edge) => <p key={edge}><strong>{edge[0].toUpperCase() + edge.slice(1)}: {autoFitProposal.detectedEdges[edge] ? 'Refined' : 'Preserved'}</strong> · confidence {autoFitProposal.diagnostics.confidence[edge].toFixed(2)} — {autoFitProposal.diagnostics.reasons[edge]}</p>)}</details>}
            {autoFitError && <div className="auto-tool-failure"><p className="visualizer-error" role="alert">{autoFitError}</p><button type="button" className="visualizer-secondary-button" disabled={autoFitLoading} onClick={() => runAutoFit({ wider: true })}><Crosshair size={17} /> Try Wider Search</button></div>}
            <button
              type="button"
              className="visualizer-apply-button"
              disabled={!doorSource.ready || Boolean(doorSource.error) || !isValidEntranceCorners(corners)}
              onClick={() => { setPreviewMode('composed'); setShowAfter(true) }}
            ><Eye size={18} /> Confirm Entrance Shape</button>
            {!doorSource.ready && !doorSource.error && <p className="visualizer-apply-status">Preparing the configured door source…</p>}
            {doorSource.error && <p className="visualizer-apply-status visualizer-apply-status-error">Resolve the configured door source error below before applying the door.</p>}
          </> : <>
            <ComposedPhotoPreview corners={corners} doorSourceUrl={doorSource.url} imageSrc={approvedCleanup?.cleanedUrl ?? photo.objectUrl} originalImageSrc={photo.objectUrl} imageAlt={`Uploaded entrance photo: ${photo.file.name}`} showAfter={showAfter} />
            {cleanupProposal && <section className="cleanup-comparison" aria-labelledby="cleanup-comparison-title">
              <h3 id="cleanup-comparison-title">{cleanupProposal.confidence === 'medium' ? 'Possible old hardware' : 'Review Proposed Cleanup'}</h3>
              <div className="cleanup-comparison-grid"><figure><img src={photo.objectUrl} alt="Untouched original entrance" /><figcaption>Original</figcaption></figure><figure><img src={cleanupProposal.cleanedUrl} alt="Proposed automatic hardware cleanup" /><figcaption>Proposed Cleanup</figcaption></figure><figure><img src={cleanupProposal.maskUrl} alt="Automatically generated hardware removal mask" /><figcaption>Removal Mask</figcaption></figure></div>
              <p className="auto-tool-result">{cleanupProposal.confidence === 'medium' ? 'A possible hardware remnant was found. Review the mask carefully before applying.' : 'A high-confidence hardware remnant was found.'}</p>
              <div className="cleanup-proposal-actions"><button type="button" className="visualizer-apply-button auto-tool-apply" onClick={applyCleanup}><Check size={17} /> Apply Cleanup</button><button type="button" className="visualizer-secondary-button" disabled={cleanupLoading} onClick={() => runAutoClean({ radius: 5 })}><RefreshCw size={17} /> Retry</button><button type="button" className="visualizer-secondary-button" disabled={cleanupLoading} onClick={() => runAutoClean({ wider: true })}><Crosshair size={17} /> Try Wider Search</button><button type="button" className="visualizer-secondary-button" onClick={cancelCleanupProposal}>Cancel</button></div>
              {import.meta.env.DEV && <details className="cv-diagnostics"><summary>Auto-Clean diagnostics</summary><div className="cv-diagnostic-stage"><img src={photo.objectUrl} alt="" /><svg viewBox={`0 0 ${cleanupProposal.diagnostics.width} ${cleanupProposal.diagnostics.height}`}>{cleanupProposal.diagnostics.zones.map((zone, index) => <polygon key={`zone-${index}`} className="cv-zone" points={zone.map((point) => `${point.x},${point.y}`).join(' ')} />)}{cleanupProposal.diagnostics.boxes.map((box, index) => <rect key={`box-${index}`} className={box === cleanupProposal.diagnostics.selectedBox ? 'cv-box selected' : 'cv-box'} x={box.x} y={box.y} width={box.width} height={box.height} />)}</svg></div>{cleanupProposal.diagnostics.boxes.slice(0, 20).map((box, index) => <p key={index}><strong>{box.score.toFixed(2)}:</strong> {box.reason} ({box.width}×{box.height})</p>)}</details>}
            </section>}
            {cleanupError && <div className="auto-tool-failure"><p className="visualizer-error" role="alert">{cleanupError}</p><button type="button" className="visualizer-secondary-button" disabled={cleanupLoading} onClick={() => runAutoClean({ wider: true })}><Crosshair size={17} /> Try Wider Search</button></div>}
            <div className="composed-preview-controls" role="group" aria-label="Composed photo controls">
              <button type="button" onClick={() => setPreviewMode('edit')}><Pencil size={17} /> Edit Entrance Shape</button>
              <button type="button" className={!showAfter ? 'active' : ''} aria-pressed={!showAfter} onClick={() => setShowAfter(false)}>Before</button>
              <button type="button" className={showAfter ? 'active' : ''} aria-pressed={showAfter} onClick={() => setShowAfter(true)}>After</button>
              <button type="button" onClick={resetPlacement}><RotateCcw size={17} /> Reset</button>
              <button type="button" disabled={cleanupLoading} onClick={() => runAutoClean()}><Sparkles size={17} /> {cleanupLoading ? 'Cleaning Hardware…' : 'Auto-Clean Old Hardware'}</button>
              {approvedCleanup && <button type="button" onClick={undoCleanup}><RotateCcw size={17} /> Undo Auto-Clean</button>}
              {approvedCleanup && <button type="button" onClick={undoCleanup}>Reset to Original Photo</button>}
            </div>
          </>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          {photo && <div className="visualizer-photo-actions">
            <button type="button" className="visualizer-secondary-button" onClick={openPicker}><RefreshCw size={17} /> Replace Photo</button>
            <button type="button" className="visualizer-remove-button" onClick={removePhoto}><Trash2 size={17} /> Remove Photo</button>
            <button type="button" className="visualizer-back-button visualizer-back-button-inline" onClick={onBack}><ArrowLeft size={17} /> Back to Door Builder</button>
          </div>}
        </section>

        <ConfiguredDoorSource configurationKey={configurationKey} previewProps={configuredDoorPreview} onStateChange={updateDoorSource} />

        {!photo && <button type="button" className="visualizer-back-button" onClick={onBack}><ArrowLeft size={17} /> Back to Door Builder</button>}
      </div>
    </main>
  )
}
