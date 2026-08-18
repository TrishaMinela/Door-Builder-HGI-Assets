import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { EntranceCorners } from './EntranceSelector'
import { PerspectiveDoorCanvas } from './PerspectiveDoorCanvas'
import { usePhotoZoom } from './usePhotoZoom'
import type { ProductLayer } from './SideliteSelector'
import { buildEntranceRegionMap } from './entranceRegionMap'

type Props = {
  corners: EntranceCorners
  doorSourceUrl: string
  imageAlt: string
  imageSrc: string
  originalImageSrc: string
  showAfter: boolean
  displayMode?: 'original' | 'cleanup' | 'final'
  productLayers?: ProductLayer[]
  showZoomControls?: boolean
  onExporterReady?: (exporter: (() => Promise<Blob>) | null) => void
  beforeAfter?: boolean
}

export function ComposedPhotoPreview({ corners, doorSourceUrl, imageAlt, imageSrc, originalImageSrc, showAfter, displayMode, productLayers, showZoomControls = true, onExporterReady, beforeAfter = false }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [comparisonPosition, setComparisonPosition] = useState(50)
  const comparisonDragRef = useRef<number | null>(null)
  const { zoom, pan, isPanning, onWheel, beginPan, movePan, endPan, zoomIn, zoomOut, resetZoom } = usePhotoZoom(editorRef, stageSize)
  useEffect(resetZoom, [originalImageSrc, resetZoom])

  const updateStageSize = () => {
    const editor = editorRef.current
    const natural = naturalSizeRef.current
    if (!editor || !natural.width || !natural.height) return
    const bounds = editor.getBoundingClientRect()
    const scale = Math.min(bounds.width / natural.width, bounds.height / natural.height)
    setStageSize({ width: natural.width * scale, height: natural.height * scale })
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateStageSize)
    observer.observe(editor)
    return () => observer.disconnect()
  }, [])

  const showOriginal = displayMode ? displayMode === 'original' : !showAfter
  const showDoor = displayMode ? displayMode === 'final' : showAfter
  useEffect(() => {
    if (!import.meta.env.DEV || !naturalSizeRef.current.width || !naturalSizeRef.current.height) return
    const activeLayers = productLayers?.length ? productLayers : [{ kind: 'door' as const, corners, sourceRect: { x: 0, y: 0, width: 1, height: 1 } }]
    const diagnostic = buildEntranceRegionMap(naturalSizeRef.current.width, naturalSizeRef.current.height, corners, activeLayers)
    console.debug('[home-visualizer:entrance-region-map]', {
      processingResolution: `${naturalSizeRef.current.width}×${naturalSizeRef.current.height}`,
      seamPixelCount: diagnostic.seamPixelCount,
      maximumSeamWidth: diagnostic.maximumSeamWidth,
      repairedByRegion: diagnostic.repairedByRegion,
      overlapSourcePixels: 6,
      showSeamPixels: diagnostic.seamPixelCount ? 'magenta diagnostic required' : 'no seam pixels to display',
    })
  }, [corners, productLayers, stageSize.width, stageSize.height])
  const exportComposite = useCallback(async () => {
    const stage = editorRef.current?.querySelector<HTMLElement>('.composed-photo-stage')
    const width = naturalSizeRef.current.width
    const height = naturalSizeRef.current.height
    if (!stage || !width || !height) throw new Error('The completed visualization is not ready yet.')
    const layers = Array.from(stage.querySelectorAll<HTMLCanvasElement>('.perspective-door-canvas'))
    for (let attempt = 0; attempt < 100 && layers.some((layer) => layer.dataset.renderReady !== 'true'); attempt += 1) await new Promise((resolve) => window.setTimeout(resolve, 50))
    if (layers.some((layer) => layer.dataset.renderReady !== 'true')) throw new Error('The configured door is still rendering. Please try again.')
    const base = await new Promise<HTMLImageElement>((resolve, reject) => { const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The completed house photo could not be loaded.'));image.src=imageSrc })
    const canvas = document.createElement('canvas');canvas.width=width;canvas.height=height
    const context = canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare the completed photo.')
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(base,0,0,width,height);layers.forEach((layer)=>context.drawImage(layer,0,0,width,height))
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((value)=>value?resolve(value):reject(new Error('The completed photo could not be encoded.')),'image/jpeg',.94));canvas.width=0;canvas.height=0;return blob
  }, [imageSrc])
  useEffect(()=>{onExporterReady?.(exportComposite);return()=>onExporterReady?.(null)},[exportComposite,onExporterReady])
  const updateComparison=(event:ReactPointerEvent)=>{if(comparisonDragRef.current!==event.pointerId)return;const bounds=event.currentTarget.getBoundingClientRect();setComparisonPosition(Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100)))}

  return <><div ref={editorRef} className="visualizer-editor composed-photo-editor" aria-label="Configured door applied to house photo">
    <div className={`entrance-image-stage composed-photo-stage ${beforeAfter?'before-after-stage':''} ${zoom>1?'photo-pan-enabled':''} ${isPanning?'photo-panning':''}`} style={stageSize.width ? { width: stageSize.width, height: stageSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined} onWheel={onWheel} onPointerDown={(event)=>{if(!(event.target as Element).closest('.visualizer-comparison-handle'))beginPan(event)}} onPointerMove={(event)=>{if(comparisonDragRef.current===event.pointerId)updateComparison(event);else movePan(event)}} onPointerUp={(event)=>{endPan(event);comparisonDragRef.current=null}} onPointerCancel={(event)=>{endPan(event);comparisonDragRef.current=null}}>
      <img src={showOriginal ? originalImageSrc : imageSrc} alt={imageAlt} onLoad={(event) => {
        naturalSizeRef.current = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
        updateStageSize()
      }} />
      {stageSize.width > 0 && (productLayers?.length ? productLayers.map((layer) => <PerspectiveDoorCanvas key={layer.kind} diagnosticName={layer.kind} corners={layer.corners} sourceRect={layer.sourceRect} flipX={layer.flipX} doorSourceUrl={doorSourceUrl} photoWidth={naturalSizeRef.current.width} photoHeight={naturalSizeRef.current.height} visible={showDoor} />) : <PerspectiveDoorCanvas corners={corners} doorSourceUrl={doorSourceUrl} photoWidth={naturalSizeRef.current.width} photoHeight={naturalSizeRef.current.height} visible={showDoor} />)}
      {beforeAfter&&<><img className="visualizer-before-image" src={originalImageSrc} alt="Original uploaded entrance before visualization" style={{clipPath:`inset(0 ${100-comparisonPosition}% 0 0)`}}/><span className="visualizer-comparison-label visualizer-comparison-before">Before</span><span className="visualizer-comparison-label visualizer-comparison-after">After</span><span className="visualizer-comparison-line" style={{left:`${comparisonPosition}%`}}/><button type="button" className="visualizer-comparison-handle" style={{left:`${comparisonPosition}%`}} aria-label="Drag to compare before and after" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(comparisonPosition)} onKeyDown={(event)=>{if(event.key==='ArrowLeft')setComparisonPosition(value=>Math.max(0,value-2));if(event.key==='ArrowRight')setComparisonPosition(value=>Math.min(100,value+2))}} onPointerDown={(event)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);comparisonDragRef.current=event.pointerId}}>↔</button></>}
    </div>
    {showZoomControls&&<div className="visualizer-zoom-controls" role="group" aria-label="Photo zoom controls">
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={zoomOut}><ZoomOut size={17} /></button>
      <span aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 4} onClick={zoomIn}><ZoomIn size={17} /></button>
      <button type="button" onClick={resetZoom}>Reset Zoom</button>
    </div>}
  </div>{showZoomControls&&<div className="visualizer-zoom-controls mobile-external-zoom-controls" role="group" aria-label="Photo zoom controls"><button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={zoomOut}><ZoomOut size={17}/></button><span aria-live="polite">{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom in" disabled={zoom>=4} onClick={zoomIn}><ZoomIn size={17}/></button><button type="button" onClick={resetZoom}>Reset Zoom</button></div>}</>
}
