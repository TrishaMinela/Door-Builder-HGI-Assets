import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Crosshair, Download, FileText, ImagePlus, Info, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react'
import { cloneEntranceCorners, EntranceSelector, INITIAL_ENTRANCE_CORNERS, isValidEntranceCorners, type CornerId, type EntranceCorners, type EntranceViewportMetrics } from './EntranceSelector'
import type { DoorPreviewProps } from '../../components/DoorPreview'
import { sidelitePlacement } from '../../data/sideliteConfigurations'
import { doorConfigurationLeafCount } from '../../data/doorConfigurationRules'
import { ConfiguredDoorSource, type DoorSourceState } from './ConfiguredDoorSource'
import { ComposedPhotoPreview } from './ComposedPhotoPreview'
import { autoFitEntrance } from './computerVision'
import { CleanupBrushEditor, type CleanupStroke } from './CleanupBrushEditor'
import { createBrushCleanup, type CleanupDiagnosticComponent } from './brushCleanup'
import { CleanupComparisonSlider } from './CleanupComparisonSlider'
import { FrameAreaEditor } from './FrameAreaEditor'
import { AUTO_FRAME_EXPANSION_PX, createAutomaticFrame, expandFrameCorners, recolorPhotoFrame, type FrameMaskCorrections, type FrameSides } from './frameRecolor'
import { completeEntranceBoundary, dividerJambQuads, initializeSideliteEdges, productLayers as createProductLayers, sideliteOpeningQuads, SideliteSelector, type SideliteEdges, type SideliteSide } from './SideliteSelector'

const MAX_PHOTO_SIZE = 15 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'])
const SUPPORTED_PHOTO_EXTENSIONS = /\.(?:jpe?g|png|webp|avif|heic|heif)$/i
const HEIC_PHOTO_TYPES = new Set(['image/heic', 'image/heif'])

type SelectedPhoto = {
  file: File
  objectUrl: string
}

type Props = {
  onBack: () => void
  onReturnToReview?: () => void
  onDownloadPdf?: () => Promise<void>
  configuredDoorPreview: DoorPreviewProps
  configurationKey: string
}

function fileError(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type.toLowerCase()) && !SUPPORTED_PHOTO_EXTENSIONS.test(file.name)) return 'Please choose a JPG, PNG, WebP, AVIF, HEIC, or HEIF image.'
  if (file.size > MAX_PHOTO_SIZE) return 'That photo is larger than 15 MB. Please choose a smaller image.'
  return ''
}

function isHeicPhoto(file: File) {
  return HEIC_PHOTO_TYPES.has(file.type.toLowerCase()) || /\.(?:heic|heif)$/i.test(file.name)
}

async function normalizePhoto(file: File) {
  if (!isHeicPhoto(file)) return file
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: .94 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  return new File([blob], file.name.replace(/\.(?:heic|heif)$/i, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified })
}

export function HomeVisualizer({ onBack, onReturnToReview, onDownloadPdf, configuredDoorPreview, configurationKey }: Props) {
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [corners, setCorners] = useState<EntranceCorners>(() => cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS))
  const cornersRef = useRef(corners)
  const entranceViewportMetricsRef = useRef<EntranceViewportMetrics | null>(null)
  const [wizardStep, setWizardStep] = useState(0)
  const [sideliteEdges, setSideliteEdges] = useState<SideliteEdges>({})
  const [photoSideliteSide, setPhotoSideliteSide] = useState<SideliteSide|'both'|'none'|null>(null)
  const [flipDoorOrientation, setFlipDoorOrientation] = useState(false)
  const [downloadPreparing, setDownloadPreparing] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [pdfDownloadPreparing, setPdfDownloadPreparing] = useState(false)
  const [showPlacementGuidance, setShowPlacementGuidance] = useState(false)
  const placementGuidanceButtonRef = useRef<HTMLButtonElement>(null)
  const compositeExporterRef = useRef<(() => Promise<Blob>) | null>(null)
  const [autoFitApplied, setAutoFitApplied] = useState(false)
  const [autoFitLoading, setAutoFitLoading] = useState(false)
  const [showAutoFitHelp, setShowAutoFitHelp] = useState(false)
  const [autoFitUnableToImprove, setAutoFitUnableToImprove] = useState(false)
  const [autoFitAlreadyAligned, setAutoFitAlreadyAligned] = useState(false)
  const [autoFitAlignmentReady, setAutoFitAlignmentReady] = useState(false)
  const [autoFitDetectedEdges, setAutoFitDetectedEdges] = useState<boolean[] | null>(null)
  const [autoFitAdjustmentCorners, setAutoFitAdjustmentCorners] = useState<CornerId[]>([])
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
  const [frameImageSize, setFrameImageSize] = useState({width:0,height:0})
  const [frameSides, setFrameSides] = useState<FrameSides>({ top: true, left: true, right: true, bottom: true })
  const [frameCorrections, setFrameCorrections] = useState<FrameMaskCorrections>({ add: [], remove: [] })
  const [frameConfirmed, setFrameConfirmed] = useState(false)
  const [recoloredFrameUrl, setRecoloredFrameUrl] = useState('')
  const frameUrlRef = useRef('')
  const activeJambFinish = configuredDoorPreview.jambFinish ?? configuredDoorPreview.finish
  const configuredSideliteSides = useMemo<SideliteSide[]>(() => {
    const placement = sidelitePlacement(configuredDoorPreview.sidelites)
    return placement === 'both' ? ['left', 'right'] : placement === 'left' || placement === 'right' ? [placement] : []
  }, [configuredDoorPreview.sidelites])
  const visualizerProgressSteps = useMemo(() => [{label:'Complete Entry',step:0}], [])
  const photoSideliteSides = useMemo<SideliteSide[]>(() => photoSideliteSide==='both'?['left','right']:photoSideliteSide==='left'||photoSideliteSide==='right'?[photoSideliteSide]:[], [photoSideliteSide])
  const entranceBoundary = useMemo(() => completeEntranceBoundary(corners, sideliteEdges), [corners, sideliteEdges])
  const sideliteOpenings = useMemo(() => sideliteOpeningQuads(sideliteEdges), [sideliteEdges])
  const dividerJambs = useMemo(() => dividerJambQuads(corners,sideliteEdges),[corners,sideliteEdges])
  const visualizerProductLayers = useMemo(() => createProductLayers(corners, sideliteEdges, configuredSideliteSides, outerFrame, flipDoorOrientation, configuredDoorPreview.doorConfigurationType), [corners, sideliteEdges, configuredSideliteSides, outerFrame, flipDoorOrientation, configuredDoorPreview.doorConfigurationType])
  const doorPlacementValid = isValidEntranceCorners(corners)
  const canContinueDoorPlacement = doorPlacementValid && !autoFitLoading
  const autoFitPlacementComplete = autoFitApplied || autoFitAlreadyAligned
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

  const downloadConfigurationPdf = async () => {
    if (!onDownloadPdf || pdfDownloadPreparing) return
    setPdfDownloadPreparing(true);setDownloadError('')
    try { await onDownloadPdf() }
    catch (reason) { setDownloadError(reason instanceof Error ? reason.message : 'The configuration PDF could not be downloaded.') }
    finally { setPdfDownloadPreparing(false) }
  }

  useEffect(()=>{if(!showPlacementGuidance)return;placementGuidanceButtonRef.current?.focus();const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setShowPlacementGuidance(false)};document.addEventListener('keydown',onKeyDown);return()=>document.removeEventListener('keydown',onKeyDown)},[showPlacementGuidance])

  const clearAutoFitFailure = () => {
    setAutoFitApplied(false)
    setShowAutoFitHelp(false)
    setAutoFitUnableToImprove(false)
    setAutoFitAlreadyAligned(false)
    setAutoFitDetectedEdges(null)
    setAutoFitAdjustmentCorners([])
  }

  const resetPlacement = () => {
    setAutoFitAlignmentReady(false)
    const initialCorners=cloneEntranceCorners(INITIAL_ENTRANCE_CORNERS)
    cornersRef.current=initialCorners
    setCorners(initialCorners)
    setWizardStep(0)
    setSideliteEdges({})
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===0?'none':null)
    setFlipDoorOrientation(false)
    clearAutoFitFailure()
    setOuterFrame(expandFrameCorners(INITIAL_ENTRANCE_CORNERS)); setFramePlacementMode('automatic');setFrameImageSize({width:0,height:0});setFrameConfirmed(false); setFrameCorrections({ add: [], remove: [] })
  }

  useEffect(() => {
    setAutoFitAlignmentReady(false)
    clearAutoFitFailure()
    setSideliteEdges({})
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===0?'none':null)
    setFlipDoorOrientation(false)
  }, [configurationKey, configuredSideliteSides.length])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current)
  }, [])

  const clearRecoloredFrame = () => { if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current); frameUrlRef.current = ''; setRecoloredFrameUrl('') }

  const automaticFrame=useMemo(()=>frameImageSize.width?createAutomaticFrame(entranceBoundary,corners,frameImageSize):expandFrameCorners(entranceBoundary),[entranceBoundary,corners,frameImageSize])
  const resetFrameArea = () => { clearRecoloredFrame(); setFramePlacementMode('automatic');setOuterFrame(automaticFrame); setFrameSides({ top: true, left: true, right: true, bottom: true }); setFrameCorrections({ add: [], remove: [] }); setFrameConfirmed(true) }

  useEffect(()=>{
    // Mobile can move directly from opening placement to the completed view,
    // while desktop visits the frame review first. Build the same automatic
    // structural-frame geometry in either destination so both paths use the
    // configured jamb finish.
    if((wizardStep!==2&&wizardStep!==4)||framePlacementMode!=='automatic')return
    setOuterFrame(automaticFrame)
    setFrameConfirmed(true)
    setFrameCorrections({add:[],remove:[]})
  },[automaticFrame,framePlacementMode,wizardStep])
  useEffect(()=>{if(!import.meta.env.DEV||!photo||!frameImageSize.width)return;console.debug('[home-visualizer:automatic-frame]',{doorPolygon:corners,leftSidelitePolygon:sideliteEdges.left?sideliteOpenings[0]??null:null,rightSidelitePolygon:sideliteEdges.right?sideliteOpenings[sideliteEdges.left?1:0]??null:null,assemblyEnvelope:entranceBoundary,frameExpansionPx:AUTO_FRAME_EXPANSION_PX,sourceImageSize:frameImageSize,outerFramePolygon:outerFrame,framePlacementMode,dividerJambRegions:dividerJambs,frameMaskOpenings:[corners,...sideliteOpenings]})},[photo,corners,sideliteEdges,sideliteOpenings,entranceBoundary,frameImageSize,outerFrame,framePlacementMode,dividerJambs])

  useEffect(() => {
    // Keep the exact native-resolution frame preview as the base of the final
    // comparison. This guarantees the slider uses the same approved width and
    // finish instead of replacing it with a separately warped frame layer.
    if (!photo || (wizardStep !== 2 && wizardStep !== 4) || !frameConfirmed) { clearRecoloredFrame(); return }
    let cancelled = false
    const base = approvedCleanup?.cleanedUrl ?? photo.objectUrl
    void recolorPhotoFrame(base, entranceBoundary, outerFrame, frameSides, frameCorrections, activeJambFinish.color, configuredDoorPreview.jambType === 'clad' ? 'clad' : activeJambFinish.finishType, [corners, ...sideliteOpenings]).then((blob) => {
      if (cancelled) return
      clearRecoloredFrame(); const url = URL.createObjectURL(blob); frameUrlRef.current = url; setRecoloredFrameUrl(url)
    }).catch(() => { if (!cancelled) clearRecoloredFrame() })
    return () => { cancelled = true }
  }, [photo, approvedCleanup?.cleanedUrl, wizardStep, frameConfirmed, outerFrame, frameSides, frameCorrections, activeJambFinish.id, configuredDoorPreview.jambType, entranceBoundary, corners, sideliteOpenings])

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

  const choosePhoto = async (file?: File) => {
    if (!file) return
    const nextError = fileError(file)
    if (nextError) {
      setError(nextError)
      return
    }

    setError('')
    let displayFile: File
    try {
      displayFile = await normalizePhoto(file)
    } catch (reason) {
      console.error('[home-visualizer:photo-conversion]', reason)
      setError('That HEIC photo could not be opened. Please try another photo.')
      return
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const objectUrl = URL.createObjectURL(displayFile)
    objectUrlRef.current = objectUrl
    setPhoto({ file: displayFile, objectUrl })
    setShowAutoFitHelp(false)
    setShowPlacementGuidance(true)
    clearCleanup()
    resetPlacement()
    const image = new Image()
    image.onload = () => { if (objectUrlRef.current === objectUrl) setFrameImageSize({ width: image.naturalWidth, height: image.naturalHeight }) }
    image.src = objectUrl
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
    setShowAutoFitHelp(false)
    setShowPlacementGuidance(false)
    clearCleanup()
    resetPlacement()
    if (inputRef.current) inputRef.current.value = ''
  }

  const runAutoFit = async () => {
    if (!photo || autoFitLoading) return
    const activeCorners = cloneEntranceCorners(cornersRef.current)
    const metrics = entranceViewportMetricsRef.current
    setAutoFitLoading(true)
    setAutoFitApplied(false)
    setAutoFitUnableToImprove(false)
    setAutoFitAlreadyAligned(false)
    setAutoFitDetectedEdges(null)
    setAutoFitAdjustmentCorners([])
    if (import.meta.env.DEV) console.debug('MOBILE_AUTOFIT_DEBUG', { lifecycle:'started', mobileViewport:window.matchMedia('(max-width: 767px)').matches?{width:innerWidth,height:innerHeight}:null, naturalImageDimensions:metrics?.naturalSize??frameImageSize, displayedImageDimensions:metrics?.displaySize??null, imageOffsetInsideEditor:metrics?.imageOffset??null, currentZoom:metrics?.zoom??1, currentPan:metrics?.pan??{x:0,y:0}, manualDisplayPoints:metrics?.displayPoints??null, convertedSourcePoints:metrics?.sourcePoints??null, searchRoiSource:(()=>{const points=Object.values(metrics?.sourcePoints??Object.fromEntries(Object.entries(activeCorners).map(([id,point])=>[id,{x:point.x*frameImageSize.width,y:point.y*frameImageSize.height}])) as EntranceCorners);const xs=points.map(point=>point.x),ys=points.map(point=>point.y);return{left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)}})(), colorMode:'computed-from-original-source-pixels', autoFitLoading:true })
    try {
      const result = await autoFitEntrance(photo.objectUrl, activeCorners)
      if (import.meta.env.DEV) console.debug('[home-visualizer:autoFitResult]', { success: result.detectedCount > 0, refinedEdgeCount: result.detectedCount, averageMovement: result.averageMovement, geometryValid: isValidEntranceCorners(result.corners), outcome: result.detectedCount > 0 ? 'proposal' : result.alreadyAligned ? 'already-aligned' : 'failure', proposedPoints: result.corners, edgeDiagnostics: result.diagnostics })
      if (import.meta.env.DEV) console.debug('MOBILE_AUTOFIT_DEBUG', { lifecycle:'result', outcome:result.detectedCount>0?'success':result.alreadyAligned?'already-aligned':'failure', autoFitCandidateResult:result, proposalSourcePoints:Object.fromEntries(Object.entries(result.corners).map(([id,point])=>[id,{x:point.x*frameImageSize.width,y:point.y*frameImageSize.height}])), proposalDisplayPoints:metrics?Object.fromEntries(Object.entries(result.corners).map(([id,point])=>[id,{x:metrics.imageOffset.x+point.x*metrics.displaySize.width,y:metrics.imageOffset.y+point.y*metrics.displaySize.height}])):null })
      const edgeStates=['top','right','bottom','left'].map((name)=>result.detectedEdges[name as keyof typeof result.detectedEdges])
      setAutoFitDetectedEdges(edgeStates)
      setAutoFitAdjustmentCorners(result.needsAdjustmentCorners)
      if(result.detectedCount>0&&isValidEntranceCorners(result.corners)){updateCorners(cloneEntranceCorners(result.corners));setAutoFitApplied(true);setAutoFitAlignmentReady(result.detectedCount===4);setShowAutoFitHelp(false);setAutoFitUnableToImprove(result.needsAdjustmentCorners.length>0);setAutoFitAlreadyAligned(false)}
      else if(result.alreadyAligned){setAutoFitApplied(true);setAutoFitAlignmentReady(true);setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(true);setAutoFitDetectedEdges([true,true,true,true]);setAutoFitAdjustmentCorners([])}
      else{setAutoFitAlreadyAligned(false);setAutoFitUnableToImprove(true);setAutoFitAdjustmentCorners(result.needsAdjustmentCorners)}
    } catch (reason) {
      if(import.meta.env.DEV)console.error('[home-visualizer:auto-fit-error]',reason)
      setAutoFitAlreadyAligned(false)
      setAutoFitUnableToImprove(true)
      setAutoFitAdjustmentCorners(['topLeft','topRight','bottomRight','bottomLeft'])
      if (import.meta.env.DEV) console.debug('[home-visualizer:autoFitResult]', { success: false, confidence: null, failureStage: 'processing-error', proposedPoints: null })
      if (import.meta.env.DEV) console.debug('MOBILE_AUTOFIT_DEBUG', { lifecycle:'result', outcome:'exception', reason })
    } finally {
      setAutoFitLoading(false)
      if (import.meta.env.DEV) console.debug('MOBILE_AUTOFIT_DEBUG', { lifecycle:'finished', autoFitLoading:false })
    }
  }

  const updateCorners = (nextCorners: EntranceCorners) => {
    cornersRef.current = nextCorners
    setCorners(nextCorners)
    setSideliteEdges({})
    if(cleanupProposal||approvedCleanup||cleanupStrokes.length||cleanupError||cleanupSampleCenters.length||cleanupSampleAdjusting||recoloredFrameUrl)clearCleanup()
    if(framePlacementMode==='automatic'){setOuterFrame(frameImageSize.width?createAutomaticFrame(nextCorners,nextCorners,frameImageSize):expandFrameCorners(nextCorners));setFrameCorrections({ add: [], remove: [] })} clearRecoloredFrame()
  }

  const updateManualCorners=(nextCorners:EntranceCorners)=>{
    const moved=(Object.keys(nextCorners) as CornerId[]).filter(id=>Math.abs(nextCorners[id].x-corners[id].x)>1e-7||Math.abs(nextCorners[id].y-corners[id].y)>1e-7)
    if(moved.length){setAutoFitApplied(false);setAutoFitUnableToImprove(false);setAutoFitAlreadyAligned(false);setAutoFitDetectedEdges(null);setAutoFitAdjustmentCorners([])}
    updateCorners(nextCorners)
  }

  const requestAutoFit = () => {
    if (autoFitLoading) return
    void runAutoFit()
  }

  const handleContinueDoorPlacement = () => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (import.meta.env.DEV && isMobile) console.debug('[home-visualizer:mobileNextTapped]', { currentStep: wizardStep, activeDoorPoints: corners, doorPlacementValid, canContinue: canContinueDoorPlacement, disabled: !canContinueDoorPlacement, autoFitProcessing: autoFitLoading, autoFitApplied, autoFitProposal: null })
    if (!canContinueDoorPlacement) return
    if (import.meta.env.DEV && isMobile) console.debug('[home-visualizer:mobileNextNavigationStarted]', { currentStep: wizardStep })
    setPhotoSideliteSide(configuredSideliteSides.length===2?'both':configuredSideliteSides.length===1?configuredSideliteSides[0]:'none')
    setSideliteEdges(configuredSideliteSides.length ? initializeSideliteEdges(corners, configuredSideliteSides, doorConfigurationLeafCount(configuredDoorPreview.doorConfigurationType)) : {})
    setFrameConfirmed(false)
    // A configured sidelite always needs its own photo-opening placement,
    // regardless of whether the entry is Single, French, or Savannah. Only a
    // true no-sidelite configuration may skip directly to the next stage.
    setWizardStep(configuredSideliteSides.length ? 1 : (isMobile ? 4 : 2))
  }

  const finishSidelitePlacement = () => {
    setFrameConfirmed(true)
    if(framePlacementMode==='automatic')setOuterFrame(frameImageSize.width?createAutomaticFrame(entranceBoundary,corners,frameImageSize):expandFrameCorners(entranceBoundary))
    setWizardStep(typeof window!=='undefined'&&window.matchMedia('(max-width: 767px)').matches?4:2)
  }

  const returnFromFinal = () => setWizardStep(0)

  useEffect(() => {
    if (!import.meta.env.DEV || wizardStep !== 0 || typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return
    const nextButton = document.querySelector<HTMLButtonElement>('.visualizer-step-editor-shell > .wizard-navigation .wizard-continue')
    const styles = nextButton ? window.getComputedStyle(nextButton) : null
    console.debug('MOBILE_CONTINUE_DEBUG', { currentStep: wizardStep, activeDoorPoints: corners, doorPlacementValid, greenPointValidityState: autoFitAlignmentReady, autoFitApplied, hasAutoFitProposal: false, doorSourceReady: doorSource.ready, autoFitProcessing: autoFitLoading, sharedCanContinue: canContinueDoorPlacement, mobileDisabledExpression: '!canContinueDoorPlacement', finalDisabled: nextButton?.disabled ?? true, zIndex: styles?.zIndex ?? null, pointerEvents: styles?.pointerEvents ?? null })
  }, [wizardStep, corners, doorPlacementValid, autoFitAlignmentReady, autoFitApplied, doorSource.ready, canContinueDoorPlacement, autoFitLoading])


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
      {showPlacementGuidance&&<div className="entryway-guidance-backdrop" role="presentation"><div className="entryway-guidance-dialog visualizer-placement-dialog" role="dialog" aria-modal="true" aria-labelledby="visualizer-placement-guidance-title" aria-describedby="visualizer-placement-guidance-description"><span>Entry placement</span><h2 id="visualizer-placement-guidance-title">Roughly Outline the Door</h2><p id="visualizer-placement-guidance-description">Place the four points around the center door opening{configuredDoorPreview.doorConfigurationType==='single'?'':', including both middle door leaves'}.</p><p className="entryway-guidance-note">Sidelites are positioned separately in the next step so each part lands on the correct opening.</p><div className="entryway-guidance-actions"><button ref={placementGuidanceButtonRef} type="button" className="entryway-guidance-start" onClick={()=>setShowPlacementGuidance(false)}>Start Placing Points <Crosshair size={17}/></button></div></div></div>}
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
              <h2 id="visualizer-photo-title">{photo ? ['Entry Placement','Sidelite Placement','Frame Selection','Cleanup','Completed Visualization'][wizardStep] : 'Add your house photo'}</h2>
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
              <small>JPG, PNG, WebP, AVIF, or HEIC · Maximum 15 MB</small>
              <span className="photo-picker-button"><Upload size={17} /> Choose Photo</span>
            </div>
          </> : <>
            {wizardStep<4&&<ol className="visualizer-progress" aria-label="Visualizer progress" style={{gridTemplateColumns:`repeat(${visualizerProgressSteps.length},minmax(0,1fr))`}}>{visualizerProgressSteps.map(({label,step},index)=><li key={label} className={wizardStep===step?'active':wizardStep>step?'complete':''}><span>{index+1}</span>{label}</li>)}</ol>}
            {wizardStep===0&&<>
              {!autoFitPlacementComplete&&<div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>Outline the Door</h3><p>Move the four points near the corners of the center door opening{configuredDoorPreview.doorConfigurationType==='single'?'':', around both door leaves'}.</p><p className="entrance-placement-note">Sidelites will be positioned separately in the next step.</p></div></div>}
              <div className="visualizer-step-editor-shell">
                <EntranceSelector key={photo.objectUrl} corners={corners} imageSrc={photo.objectUrl} imageAlt={`Uploaded entrance photo: ${photo.file.name}`} onCornersChange={updateManualCorners} onReset={resetPlacement} showToolbar={false} highlightedCorners={autoFitAdjustmentCorners} forcedAlignedEdges={autoFitDetectedEdges} forceAligned={autoFitAlreadyAligned||autoFitDetectedEdges?.every(Boolean)===true} onAlignmentReadyChange={setAutoFitAlignmentReady} onViewportMetricsChange={(metrics)=>{entranceViewportMetricsRef.current=metrics}}/>
                <div className="mobile-photo-tools" role="group" aria-label="Photo controls"><button type="button" aria-label="Replace photo" onClick={openPicker}><RefreshCw size={21}/></button><button type="button" className="remove" aria-label="Remove photo" onClick={removePhoto}><Trash2 size={21}/></button></div>
                <div className="wizard-navigation"><button type="button" aria-label="Back" onClick={leaveVisualizer}><ArrowLeft size={17}/><span className="wizard-nav-label">Back</span></button><button type="button" className="wizard-continue" aria-label="Continue" disabled={!canContinueDoorPlacement} onClick={handleContinueDoorPlacement}><span className="wizard-nav-label">Continue</span><ArrowRight className="mobile-nav-icon" size={17}/></button></div>
              </div>
              {!autoFitPlacementComplete&&<div className={`auto-fit-ready-callout ${autoFitAlignmentReady?'ready':'needs-adjustment'}`} role="status"><div className="auto-fit-status-copy"><strong>{autoFitAlignmentReady?'READY':'NEEDS ADJUSTMENT'}</strong><span>Auto-Fit fine-tunes points placed near the door edges.</span></div><div className="auto-fit-actions-inline"><button type="button" className="auto-fit-info-button" aria-label="About Auto-Fit" aria-expanded={showAutoFitHelp} onClick={()=>setShowAutoFitHelp(value=>!value)}><Info size={17}/></button><button type="button" className={`auto-fit-entrance-button ${autoFitAlignmentReady?'auto-fit-ready-button':''}`} onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation();requestAutoFit()}} disabled={autoFitLoading}><Crosshair size={18}/> {autoFitLoading?'Finding nearby edges…':'Auto-Fit'}</button></div>{showAutoFitHelp&&<div className="auto-fit-help-popover"><p>Place the four points close to the corners of the door slab. Auto-Fit will snap them to nearby edges. Exclude the frame, sidelites, and transom.</p><details><summary>View example</summary><img src="/assets/visualizer/auto-fit-door-slab-example.png" alt="Four points correctly placed around the operable door slab"/></details></div>}</div>}
              {autoFitUnableToImprove&&<div className="auto-fit-no-improvement" role="status"><strong>{autoFitAdjustmentCorners.length===1?'Move this point closer to the door corner.':`${autoFitAdjustmentCorners.length||4} points need adjustment`}</strong>{autoFitAdjustmentCorners.length!==1&&<p>Move the highlighted points closer to the door slab, then try Auto-Fit again.</p>}<div><button type="button" onClick={requestAutoFit} disabled={autoFitLoading}>{autoFitLoading?'Trying Again…':'Try Auto-Fit Again'}</button><button type="button" className="auto-fit-use-manual" onClick={handleContinueDoorPlacement} disabled={!canContinueDoorPlacement}>Continue Manually</button></div></div>}
              {autoFitAlreadyAligned&&<div className="auto-fit-no-improvement auto-fit-already-aligned" role="status"><strong>Your door outline is already well aligned.</strong><p>You can keep the current placement and continue.</p><div><button type="button" className="auto-fit-use-manual" onClick={handleContinueDoorPlacement} disabled={!canContinueDoorPlacement}>Keep Current Placement &amp; Continue</button></div></div>}
            </>}
            {wizardStep===1&&<>
              <div className="entrance-placement-instructions"><Crosshair className="entrance-placement-icon" size={24}/><div><h3>{configuredSideliteSides.length===1&&!photoSideliteSide?'Where Is the Sidelite?':configuredSideliteSides.length===1?'Position the Sidelite Opening':'Position Both Sidelite Openings'}</h3><p>{configuredSideliteSides.length===1&&!photoSideliteSide?'Tap the side where the sidelite appears in your uploaded photo.':configuredSideliteSides.length===1?'Place the four points on the inside corners of the sidelite opening.':'Place each set of points on the inside corners of its sidelite opening.'}</p>{photoSideliteSide&&<p className="entrance-placement-note">{configuredSideliteSides.length===1?'Leave the vertical jamb between the door and sidelite outside the selected sidelite area. It will be colored during the Frame step.':'Keep both divider jambs outside the sidelite selections.'}</p>}</div></div>
              <div className="visualizer-step-editor-shell">
              <SideliteSelector imageSrc={photo.objectUrl} door={corners} edges={sideliteEdges} sides={photoSideliteSides} showSideChoice={configuredSideliteSides.length===1&&!photoSideliteSide} onChooseSide={(side)=>{setPhotoSideliteSide(side);setSideliteEdges(initializeSideliteEdges(corners,[side],doorConfigurationLeafCount(configuredDoorPreview.doorConfigurationType)));clearCleanup()}} onChange={(edges)=>{setSideliteEdges(edges);clearCleanup()}}/>
                <div className="mobile-photo-tools" role="group" aria-label="Photo controls"><button type="button" aria-label="Replace photo" onClick={openPicker}><RefreshCw size={21}/></button><button type="button" className="remove" aria-label="Remove photo" onClick={removePhoto}><Trash2 size={21}/></button></div>
                <div className="wizard-navigation"><button type="button" aria-label="Back" onClick={()=>setWizardStep(0)}><ArrowLeft size={17}/><span className="wizard-nav-label">Back</span></button><button type="button" className="wizard-continue" aria-label="Continue" disabled={configuredSideliteSides.length===1&&!photoSideliteSide} onClick={finishSidelitePlacement}><span className="wizard-nav-label">Continue</span><ArrowRight className="mobile-nav-icon" size={17}/></button></div>
              </div>
              {configuredSideliteSides.length===1&&photoSideliteSide&&<div className="wizard-secondary"><button type="button" onClick={()=>{const opposite=photoSideliteSide==='left'?'right':'left';setPhotoSideliteSide(opposite);setSideliteEdges(initializeSideliteEdges(corners,[opposite],doorConfigurationLeafCount(configuredDoorPreview.doorConfigurationType)));setFrameConfirmed(false);clearCleanup()}}>Switch Sidelite Side</button></div>}
            </>}
            {wizardStep===2&&<>
              <div className="entrance-placement-instructions automatic-frame-status"><Check className="entrance-placement-icon" size={24}/><div><h3>Frame detected from your door placement</h3><p>We've automatically included the surrounding frame, divider jambs, and threshold.</p></div></div>
              <p className="frame-wizard-summary">Frame Finish: {configuredDoorPreview.jambType==='clad'?'Clad Wrap':'Timber Frame'} — {activeJambFinish.name}</p>
              <div className="visualizer-step-editor-shell">
                <FrameAreaEditor imageSrc={recoloredFrameUrl||photo.objectUrl} inner={entranceBoundary} openings={[corners,...sideliteOpenings]} outer={outerFrame} sides={frameSides} corrections={frameCorrections} wizardMode editable={framePlacementMode==='manual'} onImageSize={(size)=>setFrameImageSize(current=>current.width?current:size)} onOuterChange={(value)=>{setFramePlacementMode('manual');setOuterFrame(value)}} onSidesChange={setFrameSides} onCorrectionsChange={setFrameCorrections} onReset={resetFrameArea} onConfirm={()=>{}}/>
                <div className="mobile-photo-tools" role="group" aria-label="Photo controls"><button type="button" aria-label="Replace photo" onClick={openPicker}><RefreshCw size={21}/></button><button type="button" className="remove" aria-label="Remove photo" onClick={removePhoto}><Trash2 size={21}/></button></div>
                <div className="mobile-frame-contextual-action">{framePlacementMode==='automatic'?<button type="button" onClick={()=>setFramePlacementMode('manual')}>Adjust Frame</button>:<button type="button" onClick={resetFrameArea}><RotateCcw size={15}/> Reset to Automatic</button>}</div>
                <div className="wizard-navigation"><button type="button" aria-label="Back" onClick={()=>setWizardStep(configuredSideliteSides.length?1:0)}><ArrowLeft size={17}/><span className="wizard-nav-label">Back</span></button><button type="button" className="wizard-continue" aria-label="Finish visualization" onClick={()=>{setFrameConfirmed(true);setWizardStep(4)}}><span className="wizard-nav-label">Finish Visualization</span><ArrowRight className="mobile-nav-icon" size={17}/></button></div>
              </div>
              <div className="automatic-frame-actions">{framePlacementMode==='automatic'?<button type="button" onClick={()=>setFramePlacementMode('manual')}>Adjust Frame</button>:<button type="button" onClick={resetFrameArea}><RotateCcw size={15}/> Reset to Automatic</button>}</div>
            </>}
            {wizardStep===4&&<section className="visualizer-final-result" aria-labelledby="visualizer-final-title"><div className="visualizer-final-heading"><span>Visualization complete</span><h2 id="visualizer-final-title">Your new entrance</h2></div>{doorSource.ready?<ComposedPhotoPreview corners={entranceBoundary} productLayers={visualizerProductLayers} doorSourceUrl={doorSource.url} imageSrc={approvedCleanup?.cleanedUrl||photo.objectUrl} originalImageSrc={photo.objectUrl} imageAlt={`Completed visualization: ${photo.file.name}`} showAfter displayMode="final" showZoomControls beforeAfter onExporterReady={setCompositeExporter}/>:<div className="visualizer-source-loading" role={doorSource.error?'alert':'status'}><span>{doorSource.error||'Preparing your configured door…'}</span>{doorSource.error&&doorSource.retry&&<button type="button" onClick={doorSource.retry}><RefreshCw size={16}/> Retry Rendering</button>}</div>}<div className="visualizer-final-actions"><button type="button" className="visualizer-download-button" aria-label="Download completed home visualization photo" disabled={downloadPreparing||!doorSource.ready} onClick={downloadVisualization}><Download size={18}/>{downloadPreparing?'Preparing Photo…':'Download Photo'}</button>{onDownloadPdf&&<button type="button" className="visualizer-download-button" aria-label="Download configured door PDF" disabled={pdfDownloadPreparing} onClick={downloadConfigurationPdf}><FileText size={18}/>{pdfDownloadPreparing?'Preparing PDF…':'Download Configuration PDF'}</button>}<button type="button" className="visualizer-review-button" aria-label="Return to the previous visualizer step" onClick={returnFromFinal}>Return to Previous Step</button></div><div className="visualizer-final-text-actions"><button type="button" onClick={onReturnToReview??onBack}>Return to Review</button><button type="button" onClick={()=>setFlipDoorOrientation(value=>!value)}>Hardware on the wrong side? Flip Door Orientation</button></div><span className="visualizer-download-status" role="status" aria-live="polite">{downloadPreparing?'Preparing your full-resolution photo.':pdfDownloadPreparing?'Preparing your configuration PDF.':''}</span>{downloadError&&<p className="visualizer-error" role="alert">{downloadError}</p>}</section>}
          </>}

          <input ref={inputRef} className="visualizer-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif" onChange={onInputChange} />
          {error && <p className="visualizer-error" role="alert">{error}</p>}

          {photo && wizardStep !== 4 && <div className="visualizer-photo-actions">
            <button type="button" className="visualizer-secondary-button visualizer-desktop-photo-action" onClick={openPicker}><RefreshCw size={17} /> Replace Photo</button>
            <button type="button" className="visualizer-remove-button visualizer-desktop-photo-action" onClick={removePhoto}><Trash2 size={17} /> Remove Photo</button>
            <button type="button" className="visualizer-back-button visualizer-back-button-inline" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back to Door Builder</button>
          </div>}
        </section>

        <ConfiguredDoorSource configurationKey={configurationKey} previewProps={configuredDoorPreview} onStateChange={updateDoorSource} />
        {!photo && <button type="button" className="visualizer-back-button" onClick={leaveVisualizer}><ArrowLeft size={17} /> Back to Door Builder</button>}
      </div>
    </main>
  )
}
