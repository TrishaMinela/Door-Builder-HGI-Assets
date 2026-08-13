import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, Check, Crosshair, Download, ImagePlus, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react'
import { cloneEntranceCorners, EntranceSelector, INITIAL_ENTRANCE_CORNERS, isValidEntranceCorners, type CornerId, type EntranceCorners } from './EntranceSelector'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { ComposedPhotoPreview } from './ComposedPhotoPreview'
import { autoFitEntrance, type AutoFitResult } from './computerVision'
import { CleanupBrushEditor, type CleanupStroke } from './CleanupBrushEditor'
import { createBrushCleanup, type CleanupDiagnosticComponent } from './brushCleanup'
import { CleanupComparisonSlider } from './CleanupComparisonSlider'
import { FrameAreaEditor } from './FrameAreaEditor'
import { AUTO_FRAME_MARGIN_PX, createAutomaticFrame, expandFrameCorners, recolorPhotoFrame, type FrameMaskCorrections, type FrameSides } from './frameRecolor'
import { completeEntranceBoundary, dividerJambQuads, initializeSideliteEdges, productLayers as createProductLayers, sideliteOpeningQuads, SideliteSelector, type SideliteEdges, type SideliteSide } from './SideliteSelector'
import { AutoFitGuidanceModal } from './AutoFitGuidanceModal'

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
  const [hasSeenAutoFitGuidance, setHasSeenAutoFitGuidance] = useState(false)
  const [showAutoFitGuidance, setShowAutoFitGuidance] = useState(false)
  const [autoFitUnableToImprove, setAutoFitUnableToImprove] = useState(false)
  const [autoFitAlreadyAligned, setAutoFitAlreadyAligned] = useState(false)
  const [highlightAutoFitHandles, setHighlightAutoFitHandles] = useState(false)
  const handleHighlightTimerRef = useRef<number | null>(null)
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
  const [framePlacementMode, setFramePlacementMode] = useState<'automatic'|'manual'>('automatic')
  const [frameBaseDisplaySize, setFrameBaseDisplaySize] = useState({width:0,height:0})
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
  const dividerJambs = useMemo(() => dividerJambQuads(corners,sideliteEdges),[corners,sideliteEdges])
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
    setAutoFitProposal(null)
    setShowAutoFitGuidance(false)
    setAutoFitUnableToImprove(false)
    setAutoFitAlreadyAligned(false)
    setHighlightAutoFitHandles(false)
    if (handleHighlightTimerRef.current !== null) window.clearTimeout(handleHighlightTimerRef.current)
    handleHighlightTimerRef.current = null
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
    setOuterFrame(expandFrameCorners(INITIAL_ENTRANCE_CORNERS)); setFramePlacementMode('automatic');setFrameBaseDisplaySize({width:0,height:0});setFrameConfirmed(false); setFrameCorrections({ add: [], remove: [] })
  }

  useEffect(() => {
    setHasSeenAutoFitGuidance(false)
    setAutoFitProposal(null)
    setAutoFitError('')
    clearAutoFitFailure()
    setSideliteEdges({})
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===0?'none':null)
    setFlipDoorOrientation(false)
  }, [configurationKey, configuredSideliteSides.length])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current)
    if (handleHighlightTimerRef.current !== null) window.clearTimeout(handleHighlightTimerRef.current)
  }, [])

  const clearRecoloredFrame = () => { if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current); frameUrlRef.current = ''; setRecoloredFrameUrl('') }

  const automaticFrame=useMemo(()=>frameBaseDisplaySize.width?createAutomaticFrame(entranceBoundary,frameBaseDisplaySize):expandFrameCorners(entranceBoundary),[entranceBoundary,frameBaseDisplaySize])
  const resetFrameArea = () => { clearRecoloredFrame(); setFramePlacementMode('automatic');setOuterFrame(automaticFrame); setFrameSides({ top: true, left: true, right: true, bottom: false }); setFrameCorrections({ add: [], remove: [] }); setFrameConfirmed(true) }

  useEffect(()=>{if(framePlacementMode!=='automatic')return;setOuterFrame(automaticFrame);setFrameConfirmed(true);setFrameCorrections({add:[],remove:[]})},[automaticFrame,framePlacementMode])
  useEffect(()=>{if(!import.meta.env.DEV||!photo||!frameBaseDisplaySize.width)return;const normalizedMargin={x:AUTO_FRAME_MARGIN_PX/frameBaseDisplaySize.width,y:AUTO_FRAME_MARGIN_PX/frameBaseDisplaySize.height};console.debug('[home-visualizer:automatic-frame]',{doorPolygon:corners,leftSidelitePolygon:sideliteEdges.left?sideliteOpenings[0]??null:null,rightSidelitePolygon:sideliteEdges.right?sideliteOpenings[sideliteEdges.left?1:0]??null:null,assemblyEnvelope:entranceBoundary,displayMarginPx:AUTO_FRAME_MARGIN_PX,sourceEquivalentNormalized:normalizedMargin,outerFramePolygon:outerFrame,framePlacementMode,dividerJambRegions:dividerJambs,frameMaskOpenings:[corners,...sideliteOpenings]})},[photo,corners,sideliteEdges,sideliteOpenings,entranceBoundary,frameBaseDisplaySize,outerFrame,framePlacementMode,dividerJambs])

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
    setHasSeenAutoFitGuidance(false)
    setShowAutoFitGuidance(false)
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
    setHasSeenAutoFitGuidance(false)
    setShowAutoFitGuidance(false)
    setShowPlacementGuidance(false)
    clearCleanup()
    resetPlacement()
    if (inputRef.current) inputRef.current.value = ''
  }

  const runAutoFit = async (wider=false) => {
    if (!photo || autoFitLoading) return
    setAutoFitLoading(true)
    setAutoFitError('')
    setAutoFitProposal(null)
    setAutoFitUnableToImprove(false)
    setAutoFitAlreadyAligned(false)
    try {
      const result = await autoFitEntrance(photo.objectUrl, corners,{wider})
      if (import.meta.env.DEV) console.debug('[home-visualizer:autoFitResult]', { success: result.detectedCount > 0, refinedEdgeCount: result.detectedCount, averageMovement: result.averageMovement, geometryValid: isValidEntranceCorners(result.corners), outcome: result.detectedCount > 0 ? 'proposal' : result.alreadyAligned ? 'already-aligned' : 'failure', proposedPoints: result.corners, edgeDiagnostics: result.diagnostics })
      if(result.detectedCount>0){setAutoFitProposal(result);setShowAutoFitGuidance(false);setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(false);setAutoFitError('Auto-Fit refined the door outline.')}
      else if(result.alreadyAligned){setAutoFitError('');setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(true)}
      else{setAutoFitError('');setAutoFitAlreadyAligned(false);setAutoFitUnableToImprove(true)}
    } catch (reason) {
      if(import.meta.env.DEV)console.error('[home-visualizer:auto-fit-error]',reason)
      setAutoFitError('')
      setAutoFitAlreadyAligned(false)
      setAutoFitUnableToImprove(true)
      if (import.meta.env.DEV) console.debug('[home-visualizer:autoFitResult]', { success: false, confidence: null, failureStage: 'processing-error', proposedPoints: null })
    } finally {
      setAutoFitLoading(false)
    }
  }

  const updateCorners = (nextCorners: EntranceCorners) => {
    setCorners(nextCorners)
    setSideliteEdges(initializeSideliteEdges(nextCorners, photoSideliteSides)); clearCleanup()
    if(framePlacementMode==='automatic'){setOuterFrame(frameBaseDisplaySize.width?createAutomaticFrame(completeEntranceBoundary(nextCorners,initializeSideliteEdges(nextCorners,photoSideliteSides)),frameBaseDisplaySize):expandFrameCorners(nextCorners));setFrameCorrections({ add: [], remove: [] })} clearRecoloredFrame()
  }

  const updateManualCorners=(nextCorners:EntranceCorners)=>{
    const moved=(Object.keys(nextCorners) as CornerId[]).filter(id=>Math.abs(nextCorners[id].x-corners[id].x)>1e-7||Math.abs(nextCorners[id].y-corners[id].y)>1e-7)
    if(moved.length){setAutoFitProposal(null);setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(false)}
    updateCorners(nextCorners)
  }
  const applyAutoFit=()=>{if(!autoFitProposal)return;setAutoFitUndo(cloneEntranceCorners(corners));const next=cloneEntranceCorners(autoFitProposal.corners);setAutoFitProposal(null);setShowAutoFitGuidance(false);setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(false);setAutoFitError('');updateCorners(next)}

  const requestAutoFit = () => {
    if (autoFitLoading) return
    if (!hasSeenAutoFitGuidance) { setShowAutoFitGuidance(true); return }
    void runAutoFit(false)
  }

  const acknowledgeAndRunAutoFit = () => {
    setHasSeenAutoFitGuidance(true)
    setShowAutoFitGuidance(false)
    void runAutoFit(false)
  }

  const continueFromDoorPlacement = () => {
    if (configuredSideliteSides.length === 2) {
      setPhotoSideliteSide('both')
      if (!sideliteEdges.left || !sideliteEdges.right) setSideliteEdges(initializeSideliteEdges(corners, ['left', 'right']))
      setWizardStep(1)
    } else if (configuredSideliteSides.length === 1) {
      setWizardStep(1)
    } else {
      setPhotoSideliteSide('none')
      setSideliteEdges({})
      if(framePlacementMode==='automatic')setOuterFrame(frameBaseDisplaySize.width?createAutomaticFrame(corners,frameBaseDisplaySize):expandFrameCorners(corners))
      setWizardStep(2)
    }
  }


  const adjustAutoFitPoints = () => {
    setHasSeenAutoFitGuidance(true)
    setShowAutoFitGuidance(false)
    setHighlightAutoFitHandles(true)
    if (handleHighlightTimerRef.current !== null) window.clearTimeout(handleHighlightTimerRef.current)
    handleHighlightTimerRef.current = window.setTimeout(() => setHighlightAutoFitHandles(false), 1800)
  }


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
      {showPlacementGuidance&&<div className="entryway-guidance-backdrop" role="presentation"><div className="entryway-guidance-dialog visualizer-placement-dialog" role="dialog" aria-modal="true" aria-labelledby="visualizer-placement-guidance-title" aria-describedby="visualizer-placement-guidance-description"><span>Door placement</span><h2 id="visualizer-placement-guidance-title">Roughly Outline the Door</h2><p id="visualizer-placement-guidance-description">Place the four points around the existing door. They can be a little inside or outside the exact edges.</p><p className="entryway-guidance-note">Keep the door roughly inside the outline, then use Auto-Fit to align it precisely.</p><div className="entryway-guidance-actions"><button ref={placementGuidanceButtonRef} type="button" className="entryway-guidance-start" onClick={()=>setShowPlacementGuidance(false)}>Start Placing Points <Crosshair size={17}/></button></div></div></div>}
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
              <small>JPG, PNG, or WebP · Maximum 15 MB</small>
              <span className="photo-picker-button"><Upload size={17} /> Choose Photo</span>
            </div>
          </> : <>
            {wizardStep<4&&<ol className="visualizer-progress" aria-label="Visualizer progress" style={{gridTemplateColumns:`repeat(${visualizerProgressSteps.length},minmax(0,1fr))`}}>{visualizerProgressSteps.map(({label,step},index)=><li key={label} className={wizardStep===step?'active':wizardStep>step?'complete':''}><span>{index+1}</span>{label}</li>)}</ol>}
            {wizardStep===0&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>Outline the Door</h3><p>Move the four points roughly near the inside corners of the existing door.</p><p className="entrance-placement-note">Then use Auto-Fit to align the outline more precisely.</p></div></div>
              <EntranceSelector key={photo.objectUrl} corners={corners} proposedCorners={autoFitProposal?.corners} proposedDetectedEdges={autoFitProposal?['top','right','bottom','left'].map((edge)=>autoFitProposal.detectedEdges[edge as keyof typeof autoFitProposal.detectedEdges]):undefined} imageSrc={photo.objectUrl} imageAlt={`Uploaded entrance photo: ${photo.file.name}`} onCornersChange={updateManualCorners} onReset={resetPlacement} showToolbar={false} highlightHandles={highlightAutoFitHandles}/>
              <div className="wizard-secondary auto-fit-primary-row"><button type="button" className="auto-fit-entrance-button" onClick={requestAutoFit} disabled={autoFitLoading||Boolean(autoFitProposal)}><Crosshair size={18}/> {autoFitLoading?'Finding Entrance…':'Auto-Fit Entrance'}</button>{autoFitUndo&&<button type="button" onClick={()=>{updateCorners(autoFitUndo);setAutoFitUndo(null)}}><RotateCcw size={17}/> Undo Auto-Fit</button>}</div>{autoFitProposal&&<div className="auto-fit-controls"><button type="button" className="visualizer-apply-button auto-tool-apply" onClick={applyAutoFit}>Apply Auto-Fit</button><button type="button" onClick={()=>{setAutoFitProposal(null);setAutoFitError('')}}>Cancel</button></div>}{autoFitProposal&&autoFitError&&<p className="auto-tool-result" role="status">{autoFitError}</p>}
              {autoFitUnableToImprove&&<div className="auto-fit-no-improvement" role="status"><strong>Auto-Fit couldn’t improve this placement.</strong><p>You can adjust the points and try again, or continue with your current placement.</p><div><button type="button" onClick={()=>runAutoFit(false)} disabled={autoFitLoading}>{autoFitLoading?'Trying Again…':'Try Again'}</button><button type="button" className="auto-fit-use-manual" onClick={continueFromDoorPlacement} disabled={!doorSource.ready||!isValidEntranceCorners(corners)}>Continue</button></div></div>}
              {autoFitAlreadyAligned&&<div className="auto-fit-no-improvement auto-fit-already-aligned" role="status"><strong>Your door outline is already well aligned.</strong><p>You can keep the current placement and continue.</p><div><button type="button" className="auto-fit-use-manual" onClick={continueFromDoorPlacement} disabled={!doorSource.ready||!isValidEntranceCorners(corners)}>Keep Current Placement &amp; Continue</button></div></div>}
              <div className="wizard-navigation"><button type="button" onClick={leaveVisualizer}><ArrowLeft size={17}/> Back</button><button type="button" className="wizard-continue" disabled={!doorSource.ready||!isValidEntranceCorners(corners)} onClick={continueFromDoorPlacement}>Continue</button></div>
            </>}
            {wizardStep===1&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>{configuredSideliteSides.length===1&&!photoSideliteSide?'Where Is the Sidelite?':configuredSideliteSides.length===1?'Position the Sidelite Opening':'Position Both Sidelite Openings'}</h3><p>{configuredSideliteSides.length===1&&!photoSideliteSide?'Tap the side where the sidelite appears in your uploaded photo.':configuredSideliteSides.length===1?'Place the four points on the inside corners of the sidelite opening.':'Place each set of points on the inside corners of its sidelite opening.'}</p>{photoSideliteSide&&<p className="entrance-placement-note">{configuredSideliteSides.length===1?'Leave the vertical jamb between the door and sidelite outside the selected sidelite area. It will be colored during the Frame step.':'Keep both divider jambs outside the sidelite selections.'}</p>}</div></div>
              <SideliteSelector imageSrc={photo.objectUrl} door={corners} edges={sideliteEdges} sides={photoSideliteSides} showSideChoice={configuredSideliteSides.length===1&&!photoSideliteSide} onChooseSide={(side)=>{setPhotoSideliteSide(side);setSideliteEdges(initializeSideliteEdges(corners,[side]));clearCleanup()}} onChange={(edges)=>{setSideliteEdges(edges);clearCleanup()}}/>
              {configuredSideliteSides.length===1&&photoSideliteSide&&<div className="wizard-secondary"><button type="button" onClick={()=>{const opposite=photoSideliteSide==='left'?'right':'left';setPhotoSideliteSide(opposite);setSideliteEdges(initializeSideliteEdges(corners,[opposite]));setFrameConfirmed(false);clearCleanup()}}>Switch Sidelite Side</button></div>}
              <div className="wizard-navigation"><button type="button" onClick={()=>setWizardStep(0)}><ArrowLeft size={17}/> Back</button><button type="button" className="wizard-continue" disabled={configuredSideliteSides.length===1&&!photoSideliteSide} onClick={()=>{setFrameConfirmed(true);setWizardStep(2)}}>Continue</button></div>
            </>}
            {wizardStep===2&&<>
              <div className="entrance-placement-instructions automatic-frame-status"><Check className="entrance-placement-icon" size={24}/><div><h3>Frame detected from your door placement</h3><p>We've automatically included the surrounding frame and divider jambs.</p></div></div>
              <p className="frame-wizard-summary">Frame Finish: {configuredDoorPreview.jambType==='clad'?'Clad Wrap':'Timber Frame'} — {activeJambFinish.name}</p>
              <FrameAreaEditor imageSrc={recoloredFrameUrl||photo.objectUrl} inner={entranceBoundary} openings={[corners,...sideliteOpenings]} outer={outerFrame} sides={frameSides} corrections={frameCorrections} wizardMode editable={framePlacementMode==='manual'} onDisplaySize={(size)=>setFrameBaseDisplaySize(current=>current.width?current:size)} onOuterChange={(value)=>{setFramePlacementMode('manual');setOuterFrame(value)}} onSidesChange={setFrameSides} onCorrectionsChange={setFrameCorrections} onReset={resetFrameArea} onConfirm={()=>{}}/>
              <div className="automatic-frame-actions">{framePlacementMode==='automatic'?<button type="button" onClick={()=>setFramePlacementMode('manual')}>Adjust Frame</button>:<button type="button" onClick={resetFrameArea}><RotateCcw size={15}/> Reset to Automatic</button>}</div>
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
        {showAutoFitGuidance&&<AutoFitGuidanceModal onRun={acknowledgeAndRunAutoFit} onAdjust={adjustAutoFitPoints} onClose={()=>{setHasSeenAutoFitGuidance(true);setShowAutoFitGuidance(false)}}/>}

        {!photo && <button type="button" className="visualizer-back-button" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back to Door Builder</button>}
      </div>
    </main>
  )
}
