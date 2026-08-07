import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, Check, Crosshair, Download, ImagePlus, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react'
import { cloneEntranceCorners, EntranceSelector, INITIAL_ENTRANCE_CORNERS, isValidEntranceCorners, type EntranceCorners } from './EntranceSelector'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { ComposedPhotoPreview } from './ComposedPhotoPreview'
import { autoFitEntrance, type AutoFitResult } from './computerVision'
import { CleanupBrushEditor, type CleanupStroke } from './CleanupBrushEditor'
import { createBrushCleanup, type CleanupDiagnosticComponent } from './brushCleanup'
import { CleanupComparisonSlider } from './CleanupComparisonSlider'
import { FrameAreaEditor } from './FrameAreaEditor'
import { expandFrameCorners, recolorPhotoFrame, type FrameMaskCorrections, type FrameSides } from './frameRecolor'
import { completeEntranceBoundary, dividerJambQuads, initializeSideliteEdges, productLayers as createProductLayers, sideliteOpeningQuads, SideliteSelector, type SideliteEdges, type SideliteSide } from './SideliteSelector'

const MAX_PHOTO_SIZE = 15 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type SelectedPhoto = {
  file: File
  objectUrl: string
}

type Props = {
  onBack: () => void
  onReturnToReview?: () => void
  configuredDoorPreview: DoorPreviewProps
  configurationKey: string
}

function fileError(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type)) return 'Please choose a JPG, PNG, or WebP image.'
  if (file.size > MAX_PHOTO_SIZE) return 'That photo is larger than 15 MB. Please choose a smaller image.'
  return ''
}

export function HomeVisualizer({ onBack, onReturnToReview, configuredDoorPreview, configurationKey }: Props) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [corners, setCorners] = useState<EntranceCorners>(() => cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
  const [wizardStep, setWizardStep] = useState(0)
  const [sideliteEdges, setSideliteEdges] = useState<SideliteEdges>({})
  const [photoSideliteSide, setPhotoSideliteSide] = useState<SideliteSide|'both'|'none'|null>(null)
  const [flipDoorOrientation, setFlipDoorOrientation] = useState(false)
  const [downloadPreparing, setDownloadPreparing] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [showPlacementGuidance, setShowPlacementGuidance] = useState(false)
  const placementGuidanceButtonRef = useRef<HTMLButtonElement>(null)
  const compositeExporterRef = useRef<(() => Promise<Blob>) | null>(null)
  const [autoFitProposal, setAutoFitProposal] = useState<AutoFitResult | null>(null)
  const [autoFitUndo, setAutoFitUndo] = useState<EntranceCorners | null>(null)
  const [autoFitLoading, setAutoFitLoading] = useState(false)
  const [autoFitError, setAutoFitError] = useState('')
  const autoFitAnimationRef = useRef<number | null>(null)
  const [autoFitFailureCorners, setAutoFitFailureCorners] = useState<EntranceCorners | null>(null)
  const [cornersChangedAfterAutoFitFailure, setCornersChangedAfterAutoFitFailure] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const [cleanupStrokes, setCleanupStrokes] = useState<CleanupStroke[]>([])
  const [cleanupProposal, setCleanupProposal] = useState<{ cleanedUrl: string; radius: 3 | 5; components: CleanupDiagnosticComponent[] } | null>(null)
  const [cleanupSampleCenters, setCleanupSampleCenters] = useState<Array<{ x: number; y: number }>>([])
  const [cleanupSampleAdjusting, setCleanupSampleAdjusting] = useState(false)
  const [approvedCleanup, setApprovedCleanup] = useState<{ cleanedUrl: string; radius: 3 | 5 } | null>(null)
  const cleanupUrlsRef = useRef(new Set<string>())
  const [doorSource, setDoorSource] = useState<DoorSourceState>({ url: '', width: 0, height: 0, error: '', ready: false })
  const [outerFrame, setOuterFrame] = useState<EntranceCorners>(() => expandFrameCorners(INITIAL_ENTRANCE_CORNERS))
  const [frameSides, setFrameSides] = useState<FrameSides>({ top: true, left: true, right: true, bottom: false })
  const [frameCorrections, setFrameCorrections] = useState<FrameMaskCorrections>({ add: [], remove: [] })
  const [frameConfirmed, setFrameConfirmed] = useState(false)
  const [recoloredFrameUrl, setRecoloredFrameUrl] = useState('')
  const frameUrlRef = useRef('')
  const activeJambFinish = configuredDoorPreview.jambFinish ?? configuredDoorPreview.finish
  const hingeSide: SideliteSide = configuredDoorPreview.doorSwing?.id.startsWith('R') ? 'right' : 'left'
  const configuredSideliteSides = useMemo<SideliteSide[]>(() => configuredDoorPreview.sidelites === 'both-sides' ? ['left', 'right'] : configuredDoorPreview.sidelites === 'hinge-side' ? [hingeSide] : configuredDoorPreview.sidelites === 'lock-side' ? [hingeSide === 'left' ? 'right' : 'left'] : [], [configuredDoorPreview.sidelites, hingeSide])
  const visualizerProgressSteps = useMemo(() => configuredSideliteSides.length ? [{label:'Door',step:0},{label:'Sidelites',step:1},{label:'Frame',step:2}] : [{label:'Door',step:0},{label:'Frame',step:2}], [configuredSideliteSides.length])
  const photoSideliteSides = useMemo<SideliteSide[]>(() => photoSideliteSide==='both'?['left','right']:photoSideliteSide==='left'||photoSideliteSide==='right'?[photoSideliteSide]:[], [photoSideliteSide])
  const entranceBoundary = useMemo(() => completeEntranceBoundary(corners, sideliteEdges), [corners, sideliteEdges])
  const sideliteOpenings = useMemo(() => sideliteOpeningQuads(sideliteEdges), [sideliteEdges])
  const dividerQuads = useMemo(() => dividerJambQuads(corners, sideliteEdges), [corners, sideliteEdges])
  const visualizerProductLayers = useMemo(() => createProductLayers(corners, sideliteEdges, configuredSideliteSides, flipDoorOrientation), [corners, sideliteEdges, configuredSideliteSides, flipDoorOrientation])
  const updateDoorSource = useCallback((state: DoorSourceState) => setDoorSource(state), [])
  const setCompositeExporter = useCallback((exporter: (() => Promise<Blob>) | null) => { compositeExporterRef.current = exporter }, [])

  const downloadVisualization = async () => {
    if (downloadPreparing || !compositeExporterRef.current) return
    setDownloadPreparing(true);setDownloadError('')
    try {
      const blob=await compositeExporterRef.current();const url=URL.createObjectURL(blob);const link=document.createElement('a');const date=new Date().toISOString().slice(0,10)
      link.href=url;link.download=`home-guard-door-visualization-${date}.jpg`;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch (reason) { setDownloadError(reason instanceof Error?reason.message:'The completed photo could not be downloaded.') }
    finally { setDownloadPreparing(false) }
  }

  useEffect(()=>{if(!showPlacementGuidance)return;placementGuidanceButtonRef.current?.focus();const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setShowPlacementGuidance(false)};document.addEventListener('keydown',onKeyDown);return()=>document.removeEventListener('keydown',onKeyDown)},[showPlacementGuidance])

  const clearAutoFitFailure = () => {
    setAutoFitFailureCorners(null)
    setCornersChangedAfterAutoFitFailure(false)
  }

  const resetPlacement = () => {
    setCorners(cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
    setWizardStep(0)
    setSideliteEdges({})
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===0?'none':null)
    setFlipDoorOrientation(false)
    setAutoFitProposal(null)
    setAutoFitUndo(null)
    setAutoFitError('')
    clearAutoFitFailure()
    setOuterFrame(expandFrameCorners(INITIAL_ENTRANCE_CORNERS)); setFrameConfirmed(false); setFrameCorrections({ add: [], remove: [] })
  }

  useEffect(() => {
    setAutoFitProposal(null)
    setAutoFitError('')
    clearAutoFitFailure()
    setSideliteEdges({})
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===0?'none':null)
    setFlipDoorOrientation(false)
  }, [configurationKey, configuredSideliteSides.length])

  useEffect(() => () => {
    if(autoFitAnimationRef.current!==null)cancelAnimationFrame(autoFitAnimationRef.current)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current)
  }, [])

  const clearRecoloredFrame = () => { if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current); frameUrlRef.current = ''; setRecoloredFrameUrl('') }

  const resetFrameArea = () => { clearRecoloredFrame(); setOuterFrame(expandFrameCorners(entranceBoundary)); setFrameSides({ top: true, left: true, right: true, bottom: false }); setFrameCorrections({ add: [], remove: [] }); setFrameConfirmed(false) }

  useEffect(() => {
    if (!photo || !frameConfirmed) { clearRecoloredFrame(); return }
    let cancelled = false
    const base = approvedCleanup?.cleanedUrl ?? photo.objectUrl
    void recolorPhotoFrame(base, entranceBoundary, outerFrame, frameSides, frameCorrections, activeJambFinish.color, configuredDoorPreview.jambType === 'clad' ? 'clad' : activeJambFinish.finishType, [corners, ...sideliteOpenings]).then((blob) => {
      if (cancelled) return
      clearRecoloredFrame(); const url = URL.createObjectURL(blob); frameUrlRef.current = url; setRecoloredFrameUrl(url)
    }).catch(() => { if (!cancelled) clearRecoloredFrame() })
    return () => { cancelled = true }
  }, [photo, approvedCleanup?.cleanedUrl, frameConfirmed, outerFrame, frameSides, frameCorrections, activeJambFinish.id, configuredDoorPreview.jambType, entranceBoundary, corners, sideliteOpenings])

  const clearCleanup = () => {
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    cleanupUrlsRef.current.clear()
    setCleanupProposal(null)
    setApprovedCleanup(null)
    setCleanupStrokes([])
    setCleanupError('')
    setCleanupSampleCenters([]); setCleanupSampleAdjusting(false)
    clearRecoloredFrame()
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
    setShowPlacementGuidance(true)
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
    setShowPlacementGuidance(false)
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
        setAutoFitError('Move the four points closer to the door boundary, then try Auto-Fit again. The points may be slightly inside or outside. For difficult photos, a wider search will become available after you adjust them.')
      } else {
        if(import.meta.env.DEV)console.debug('[home-visualizer:auto-fit-local-diagnostics]',result.diagnostics)
        setAutoFitProposal(result)
        clearAutoFitFailure()
      }
    } catch {
      setAutoFitFailureCorners(cloneEntranceCorners(corners))
      setCornersChangedAfterAutoFitFailure(false)
      setAutoFitError('Move the four points closer to the door boundary, then try Auto-Fit again. The points may be slightly inside or outside. For difficult photos, a wider search will become available after you adjust them.')
    } finally {
      setAutoFitLoading(false)
    }
  }

  const updateCorners = (nextCorners: EntranceCorners) => {
    setAutoFitProposal(null)
    setCorners(nextCorners)
    setSideliteEdges(initializeSideliteEdges(nextCorners, photoSideliteSides)); clearCleanup()
    setOuterFrame(expandFrameCorners(nextCorners)); setFrameConfirmed(false); setFrameCorrections({ add: [], remove: [] }); clearRecoloredFrame()
    if (!autoFitFailureCorners || !isValidEntranceCorners(nextCorners)) return
    const changed = (Object.keys(nextCorners) as Array<keyof EntranceCorners>).some((id) =>
      Math.abs(nextCorners[id].x - autoFitFailureCorners[id].x) > 1e-7 || Math.abs(nextCorners[id].y - autoFitFailureCorners[id].y) > 1e-7)
    if (changed) setCornersChangedAfterAutoFitFailure(true)
  }

  const showWiderAutoFit=Boolean(autoFitFailureCorners&&cornersChangedAfterAutoFitFailure&&isValidEntranceCorners(corners)&&!autoFitProposal)
  const applyAutoFitProposal=()=>{if(!autoFitProposal)return;if(autoFitAnimationRef.current!==null)cancelAnimationFrame(autoFitAnimationRef.current);const from=cloneEntranceCorners(corners),proposed=cloneEntranceCorners(autoFitProposal.corners),started=performance.now();setAutoFitUndo(from);setAutoFitProposal(null);clearAutoFitFailure();const animate=(now:number)=>{const elapsed=Math.min(1,(now-started)/250),progress=1-Math.pow(1-elapsed,3),next=Object.fromEntries((Object.keys(from) as Array<keyof EntranceCorners>).map(id=>[id,{x:from[id].x+(proposed[id].x-from[id].x)*progress,y:from[id].y+(proposed[id].y-from[id].y)*progress}])) as EntranceCorners;setCorners(next);if(elapsed<1)autoFitAnimationRef.current=requestAnimationFrame(animate);else{autoFitAnimationRef.current=null;updateCorners(proposed)}};autoFitAnimationRef.current=requestAnimationFrame(animate)}


  const leaveVisualizer = () => {
    clearAutoFitFailure()
    onBack()
  }

  const previewBrushCleanup = async (radius: 3 | 5 = 3, sampleCenters = cleanupSampleCenters) => {
    if (!photo || cleanupLoading) return
    setCleanupLoading(true)
    setCleanupError('')
    if (cleanupProposal) {
      cleanupUrlsRef.current.delete(cleanupProposal.cleanedUrl); URL.revokeObjectURL(cleanupProposal.cleanedUrl)
      setCleanupProposal(null)
    }
    try {
      const result = await createBrushCleanup(photo.objectUrl, cleanupStrokes, entranceBoundary, radius, sampleCenters)
      const cleanedUrl = URL.createObjectURL(result.cleanedBlob)
      cleanupUrlsRef.current.add(cleanedUrl)
      const automaticCenters = result.components.map((component) => component.source ? ({ x: Math.max(0, Math.min(1, (component.source.x + component.source.width / 2) / result.width)), y: Math.max(0, Math.min(1, (component.source.y + component.source.height / 2) / result.height)) }) : ({ x: .5, y: .5 }))
      if (!sampleCenters.length) setCleanupSampleCenters(automaticCenters)
      setCleanupProposal({ cleanedUrl, radius, components: result.components }); setCleanupSampleAdjusting(false)
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
    clearRecoloredFrame()
    setApprovedCleanup({ cleanedUrl: cleanupProposal.cleanedUrl, radius: cleanupProposal.radius })
    setCleanupProposal(null)
    setCleanupError('')
    setWizardStep(4)
  }

  const cancelCleanupProposal = () => {
    if (!cleanupProposal) return
    cleanupUrlsRef.current.delete(cleanupProposal.cleanedUrl); URL.revokeObjectURL(cleanupProposal.cleanedUrl)
    setCleanupProposal(null)
    setCleanupSampleAdjusting(false)
    setCleanupError('')
  }

  return (
    <main className="visualizer-page">
      {showPlacementGuidance&&<div className="entryway-guidance-backdrop" role="presentation"><div className="entryway-guidance-dialog visualizer-placement-dialog" role="dialog" aria-modal="true" aria-labelledby="visualizer-placement-guidance-title" aria-describedby="visualizer-placement-guidance-description"><span>Before Auto-Fit</span><h2 id="visualizer-placement-guidance-title">Place the Four Points First</h2><p id="visualizer-placement-guidance-description">Roughly place each point near a corner of the existing door slab. It is okay if a point is slightly inside or outside the true edge.</p><p className="entryway-guidance-note">Once the points are close, click <strong>Auto-Fit Door</strong>. Auto-Fit searches both sides of each rough edge and proposes the nearest supported boundary.</p><div className="entryway-guidance-actions"><button ref={placementGuidanceButtonRef} type="button" className="entryway-guidance-start" onClick={()=>setShowPlacementGuidance(false)}>Start Placing Points <Crosshair size={17}/></button></div></div></div>}
      <div className="visualizer-shell">
        <div className="visualizer-heading">
          <span>View on Your Home</span>
          <h1>See your entry in context</h1>
          <p>Add a photo of your entrance to prepare the workspace for your configured door.</p>
        </div>

        <section className="visualizer-card" aria-labelledby="visualizer-photo-title">
          <div className="visualizer-card-heading">
            <div>
              <span>{photo ? 'Guided visualizer' : 'Step 1'}</span>
              <h2 id="visualizer-photo-title">{photo ? ['Door Placement','Sidelite Placement','Frame Selection','Cleanup','Completed Visualization'][wizardStep] : 'Add your house photo'}</h2>
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
          </> : <>
            {wizardStep<4&&<ol className="visualizer-progress" aria-label="Visualizer progress" style={{gridTemplateColumns:`repeat(${visualizerProgressSteps.length},minmax(0,1fr))`}}>{visualizerProgressSteps.map(({label,step},index)=><li key={label} className={wizardStep===step?'active':wizardStep>step?'complete':''}><span>{index+1}</span>{label}</li>)}</ol>}
            {wizardStep===0&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>Position the Existing Door</h3><p>Place the four points on the inside corners of the existing door slab. Keep the surrounding frame and threshold outside the selected shape.</p></div></div>
              <EntranceSelector key={photo.objectUrl} corners={corners} proposedCorners={autoFitProposal?.corners} proposedDetectedEdges={autoFitProposal?['top','right','bottom','left'].map(edge=>autoFitProposal.detectedEdges[edge as keyof typeof autoFitProposal.detectedEdges]):undefined} imageSrc={photo.objectUrl} imageAlt={`Uploaded entrance photo: ${photo.file.name}`} onCornersChange={updateCorners} onReset={resetPlacement} showToolbar={false}/>
              <div className="wizard-secondary"><button type="button" onClick={()=>runAutoFit()} disabled={autoFitLoading||Boolean(autoFitProposal)}><Crosshair size={17}/> {autoFitLoading?'Refining Door…':'Auto-Fit Door'}</button>{showWiderAutoFit&&<button type="button" onClick={()=>runAutoFit({wider:true})} disabled={autoFitLoading}>Try Wider Search</button>}{autoFitUndo&&<button type="button" onClick={()=>{updateCorners(autoFitUndo);setAutoFitUndo(null)}}><RotateCcw size={17}/> Undo Auto-Fit</button>}</div>{autoFitProposal&&<><p className="auto-tool-result">Auto-Fit made small adjustments to {autoFitProposal.detectedCount} of 4 door edges. Review the result before applying.</p><div className="auto-fit-controls"><button type="button" className="visualizer-apply-button auto-tool-apply" onClick={applyAutoFitProposal}>Apply Adjustments</button><button type="button" onClick={()=>setAutoFitProposal(null)}>Cancel</button></div></>}{autoFitError&&<p className="visualizer-error">{autoFitError}</p>}
              <div className="wizard-navigation"><button type="button" onClick={leaveVisualizer}><ArrowLeft size={17}/> Back</button><button type="button" className="wizard-continue" disabled={!doorSource.ready||!isValidEntranceCorners(corners)} onClick={()=>{if(configuredSideliteSides.length===2){setPhotoSideliteSide('both');if(!sideliteEdges.left||!sideliteEdges.right)setSideliteEdges(initializeSideliteEdges(corners,['left','right']));setWizardStep(1)}else if(configuredSideliteSides.length===1){setWizardStep(1)}else{setPhotoSideliteSide('none');setSideliteEdges({});setOuterFrame(expandFrameCorners(corners));setWizardStep(2)}}}>Continue</button></div>
            </>}
            {wizardStep===1&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>{configuredSideliteSides.length===1&&!photoSideliteSide?'Where Is the Sidelite?':configuredSideliteSides.length===1?'Position the Sidelite Opening':'Position Both Sidelite Openings'}</h3><p>{configuredSideliteSides.length===1&&!photoSideliteSide?'Tap the side where the sidelite appears in your uploaded photo.':configuredSideliteSides.length===1?'Place the four points on the inside corners of the sidelite opening.':'Place each set of points on the inside corners of its sidelite opening.'}</p>{photoSideliteSide&&<p className="entrance-placement-note">{configuredSideliteSides.length===1?'Leave the vertical jamb between the door and sidelite outside the selected sidelite area. It will be colored during the Frame step.':'Keep both divider jambs outside the sidelite selections.'}</p>}</div></div>
              <SideliteSelector imageSrc={photo.objectUrl} door={corners} edges={sideliteEdges} sides={photoSideliteSides} showSideChoice={configuredSideliteSides.length===1&&!photoSideliteSide} onChooseSide={(side)=>{setPhotoSideliteSide(side);setSideliteEdges(initializeSideliteEdges(corners,[side]));setFrameConfirmed(false);clearCleanup()}} onChange={(edges)=>{setSideliteEdges(edges);setFrameConfirmed(false);clearCleanup()}}/>
              {configuredSideliteSides.length===1&&photoSideliteSide&&<div className="wizard-secondary"><button type="button" onClick={()=>{const opposite=photoSideliteSide==='left'?'right':'left';setPhotoSideliteSide(opposite);setSideliteEdges(initializeSideliteEdges(corners,[opposite]));setFrameConfirmed(false);clearCleanup()}}>Switch Sidelite Side</button></div>}
              <div className="wizard-navigation"><button type="button" onClick={()=>setWizardStep(0)}><ArrowLeft size={17}/> Back</button><button type="button" className="wizard-continue" disabled={configuredSideliteSides.length===1&&!photoSideliteSide} onClick={()=>{setOuterFrame(expandFrameCorners(completeEntranceBoundary(corners,sideliteEdges)));setWizardStep(2)}}>Continue</button></div>
            </>}
            {wizardStep===2&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>Select the Complete Frame</h3><p>Move the four outside points to surround the visible frame around the door and sidelites.</p><p className="entrance-placement-note">The highlighted area will receive your selected Timber Frame or Clad Wrap color.</p></div></div>
              <p className="frame-wizard-summary">Frame Finish: {configuredDoorPreview.jambType==='clad'?'Clad Wrap':'Timber Frame'} — {activeJambFinish.name}</p>
              <FrameAreaEditor imageSrc={photo.objectUrl} inner={entranceBoundary} outer={outerFrame} sides={frameSides} corrections={frameCorrections} dividers={dividerQuads} wizardMode onOuterChange={setOuterFrame} onSidesChange={setFrameSides} onCorrectionsChange={setFrameCorrections} onReset={resetFrameArea} onConfirm={()=>{}}/>
              <div className="wizard-navigation"><button type="button" onClick={()=>setWizardStep(configuredSideliteSides.length?1:0)}><ArrowLeft size={17}/> Back</button><button type="button" className="wizard-continue" onClick={()=>{setFrameConfirmed(true);setWizardStep(4)}}>Finish Visualization</button></div>
            </>}
            {wizardStep===4&&<section className="visualizer-final-result" aria-labelledby="visualizer-final-title"><div className="visualizer-final-heading"><span>Visualization complete</span><h2 id="visualizer-final-title">Your new entrance</h2></div><ComposedPhotoPreview corners={entranceBoundary} productLayers={visualizerProductLayers} doorSourceUrl={doorSource.url} imageSrc={recoloredFrameUrl||approvedCleanup?.cleanedUrl||photo.objectUrl} originalImageSrc={photo.objectUrl} imageAlt={`Completed visualization: ${photo.file.name}`} showAfter displayMode="final" showZoomControls={false} beforeAfter onExporterReady={setCompositeExporter}/><div className="visualizer-final-actions"><button type="button" className="visualizer-download-button" aria-label="Download completed home visualization photo" disabled={downloadPreparing} onClick={downloadVisualization}><Download size={18}/>{downloadPreparing?'Preparing Photo…':'Download Photo'}</button><button type="button" className="visualizer-review-button" aria-label="Return to the previous visualizer step" onClick={()=>setWizardStep(2)}>Return to Previous Step</button></div><div className="visualizer-final-text-actions"><button type="button" onClick={onReturnToReview??onBack}>Return to Review</button><button type="button" onClick={()=>setFlipDoorOrientation(value=>!value)}>Hardware on the wrong side? Flip Door Orientation</button></div><span className="visualizer-download-status" role="status" aria-live="polite">{downloadPreparing?'Preparing your full-resolution photo.':''}</span>{downloadError&&<p className="visualizer-error" role="alert">{downloadError}</p>}</section>}
          </>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          {photo && wizardStep !== 4 && <div className="visualizer-photo-actions">
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
