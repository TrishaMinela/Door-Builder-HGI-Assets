import { useEffect, useMemo, useState } from 'react'
import type { DoorStyle, DoorSwing, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct } from '../types'
import { hardwareOptions, hardwarePreviewAssetUrl } from '../data/hardware'
import { glassOptions } from '../data/glassOptions'
import { resolveDoorPreviewCandidates } from '../data/doorPreviewAssets'
import { glassDoorCodes } from '../data/productCatalog'
import { resolveGlassMaskAsset } from '../data/glassMaskAssets'

type Props = {
  style: DoorStyle
  finish: Finish
  glass: GlassOption | null
  hardware: PreviewHardware
  compact?: boolean
  grain?: string | null
  product?: ResolvedDoorProduct | null
  tintColor?: string | null
  doorSwing?: DoorSwing | null
  applyFinish?: boolean
  view?: HardwareView
  onViewChange?: (view: HardwareView) => void
  showViewToggle?: boolean
}

const FINISH_RENDERING = {
  paintColorBlendMode: 'normal',
  paintColorOpacity: 0.92,
  paintDetailBlendMode: 'multiply',
  paintDetailOpacity: 0.25,
  stainColorBlendMode: 'normal',
  stainColorOpacity: 0.92,
  stainDetailBlendMode: 'multiply',
  stainDetailOpacity: 0.52,
  stainContrast: 1.35,
  stainSaturation: 1.18,
  stainHighlightOpacity: 0.18,
  stainGlossStrength: 0.72,
} as const

type PixelBounds = { x: number; y: number; width: number; height: number }

function pixelBounds(image: ImageData, isVisible: (red: number, green: number, blue: number, alpha: number) => boolean): PixelBounds | null {
  let left = image.width
  let top = image.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4
      if (!isVisible(image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3])) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return right < left || bottom < top ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

function buildPreviewMasks(mask: HTMLImageElement, slab: HTMLImageElement) {
  if (mask.naturalWidth !== slab.naturalWidth || mask.naturalHeight !== slab.naturalHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = slab.naturalWidth
  canvas.height = slab.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  // Several supplied masks encode the solid slab as transparent pixels.
  // Composite over white first so transparency remains finishable material,
  // while the authored black glass openings stay excluded. Preserve every
  // grayscale edge value so the supplied anti-aliasing remains intact.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(mask, 0, 0)
  const maskPixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const glassPixels = new ImageData(new Uint8ClampedArray(maskPixels.data), canvas.width, canvas.height)
  for (let index = 0; index < maskPixels.data.length; index += 4) {
    const maskValue = Math.round((maskPixels.data[index] + maskPixels.data[index + 1] + maskPixels.data[index + 2]) / 3)
    maskPixels.data[index] = 255
    maskPixels.data[index + 1] = 255
    maskPixels.data[index + 2] = 255
    maskPixels.data[index + 3] = maskValue
    glassPixels.data[index] = 255
    glassPixels.data[index + 1] = 255
    glassPixels.data[index + 2] = 255
    glassPixels.data[index + 3] = 255 - maskValue
  }
  context.putImageData(maskPixels, 0, 0)
  const finishUrl = canvas.toDataURL('image/png')
  context.putImageData(glassPixels, 0, 0)
  const glassBounds = pixelBounds(glassPixels, (_red, _green, _blue, alpha) => alpha > 0)
  return { finishUrl, glassUrl: canvas.toDataURL('image/png'), glassBounds, maskWidth: canvas.width, maskHeight: canvas.height }
}

function fitGlassOverlayToMask(overlay: HTMLImageElement, width: number, height: number, maskBounds: PixelBounds) {
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = width
  sourceCanvas.height = height
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) return null
  sourceContext.imageSmoothingEnabled = true
  sourceContext.imageSmoothingQuality = 'high'

  const containScale = Math.min(width / overlay.naturalWidth, height / overlay.naturalHeight)
  const containedWidth = overlay.naturalWidth * containScale
  const containedHeight = overlay.naturalHeight * containScale
  sourceContext.drawImage(overlay, (width - containedWidth) / 2, (height - containedHeight) / 2, containedWidth, containedHeight)
  const sourcePixels = sourceContext.getImageData(0, 0, width, height)
  const glassBounds = pixelBounds(sourcePixels, (red, green, blue, alpha) => alpha > 0 && red + green + blue > 12)
  if (!glassBounds) return null

  const scale = Math.max(maskBounds.width / glassBounds.width, maskBounds.height / glassBounds.height)
  const maskCenterX = maskBounds.x + maskBounds.width / 2
  const maskCenterY = maskBounds.y + maskBounds.height / 2
  const glassCenterX = glassBounds.x + glassBounds.width / 2
  const glassCenterY = glassBounds.y + glassBounds.height / 2
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height
  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) return null
  outputContext.imageSmoothingEnabled = true
  outputContext.imageSmoothingQuality = 'high'
  outputContext.drawImage(
    sourceCanvas,
    maskCenterX - glassCenterX * scale,
    maskCenterY - glassCenterY * scale,
    width * scale,
    height * scale,
  )
  return outputCanvas.toDataURL('image/png')
}

function buildSolidSlabMask(slab: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = slab.naturalWidth
  canvas.height = slab.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null, doorSwing = null, applyFinish = true, view, onViewChange, showViewToggle = true }: Props) {
  const previewCandidates = resolveDoorPreviewCandidates(style, finish.finishType, product, grain)
  const previewCandidatesKey = previewCandidates.join('|')
  const styleCodes = product?.styleCodes.length ? product.styleCodes : [style.code]
  const isGlassCapable = styleCodes.some((code) => glassDoorCodes.has(code))
  const maskCode = styleCodes.find((code) => glassDoorCodes.has(code))
  const maskAsset = maskCode ? resolveGlassMaskAsset(maskCode) : null
  const maskKey = maskCode ?? 'solid-slab'
  const [previewImage, setPreviewImage] = useState(previewCandidates[0] ?? '')
  const hasMappedPreview = Boolean(previewCandidates.length)
  const finishColor = tintColor ?? finish.color
  const [processedMask, setProcessedMask] = useState<{ source: string; finishUrl: string; glassUrl?: string; glassBounds?: PixelBounds | null; maskWidth?: number; maskHeight?: number } | null>(null)
  const finishMask = previewImage && processedMask?.source === previewImage ? processedMask.finishUrl : undefined
  const glassMask = previewImage && processedMask?.source === previewImage ? processedMask.glassUrl : undefined
  const compatibleGlass = isGlassCapable ? glassOptions.filter((option) => styleCodes.some((code) => option.overlaysByDoorStyle[code])) : []
  const previewGlass = glass && compatibleGlass.some((option) => option.id === glass.id) ? glass : null
  const glassOverlay = previewGlass ? styleCodes.map((code) => previewGlass.overlaysByDoorStyle[code]).find(Boolean) : undefined
  const [fittedGlassOverlay, setFittedGlassOverlay] = useState<{ source: string; maskSource: string; url: string } | null>(null)
  const [internalPreviewView, setInternalPreviewView] = useState<HardwareView>('Exterior')
  const previewView = view ?? internalPreviewView
  const setPreviewView = onViewChange ?? setInternalPreviewView
  const selectedHardwareImage = hardwarePreviewAssetUrl(hardware, previewView, doorSwing)
  const defaultHardware = hardwareOptions.find((option) => Boolean(hardwarePreviewAssetUrl(option, previewView, doorSwing)))
  const previewHardware: PreviewHardware = selectedHardwareImage ? hardware : defaultHardware ?? hardware

  useEffect(() => {
    let cancelled = false
    let candidateIndex = 0

    const tryNextCandidate = () => {
      const candidate = previewCandidates[candidateIndex++]
      if (!candidate || cancelled) return
      const slab = new Image()
      slab.onload = () => {
        if (cancelled) return
        if (!maskAsset) {
          const maskUrl = isGlassCapable ? null : buildSolidSlabMask(slab)
          setProcessedMask(maskUrl ? { source: candidate, finishUrl: maskUrl } : null)
          setPreviewImage(candidate)
          return
        }

        const suppliedMask = new Image()
        suppliedMask.onload = () => {
          if (cancelled) return
          if (import.meta.env.DEV) {
            console.info('[door-preview:glass-mask]', {
              selectedDoorStyleId: maskCode,
              resolvedMappingKey: maskCode,
              resolvedMappingPath: maskAsset,
              loaded: true,
              maskDimensions: `${suppliedMask.naturalWidth}x${suppliedMask.naturalHeight}`,
              doorPreviewDimensions: `${slab.naturalWidth}x${slab.naturalHeight}`,
            })
          }
          const masks = buildPreviewMasks(suppliedMask, slab)
          if (!masks) {
            console.error('[door-preview:glass-mask-dimension-mismatch]', {
              selectedDoorStyleId: maskCode,
              resolvedMappingKey: maskCode,
              resolvedMappingPath: maskAsset,
              maskDimensions: `${suppliedMask.naturalWidth}x${suppliedMask.naturalHeight}`,
              doorPreviewDimensions: `${slab.naturalWidth}x${slab.naturalHeight}`,
            })
          }
          setProcessedMask(masks ? { source: candidate, ...masks } : null)
          setPreviewImage(candidate)
        }
        suppliedMask.onerror = () => {
          if (cancelled) return
          console.error('[door-preview:missing-finish-mask]', {
            selectedDoorStyleId: maskCode,
            resolvedMappingKey: maskCode,
            resolvedMappingPath: maskAsset,
            loaded: false,
          })
          setProcessedMask(null)
          setPreviewImage(candidate)
        }
        suppliedMask.src = maskAsset
      }
      slab.onerror = tryNextCandidate
      slab.src = candidate
    }

    tryNextCandidate()
    return () => { cancelled = true }
  }, [previewCandidatesKey, isGlassCapable, maskKey, maskAsset, maskCode])

  useEffect(() => {
    let cancelled = false
    if (!glassOverlay || !previewImage || processedMask?.source !== previewImage || !processedMask.glassBounds || !processedMask.maskWidth || !processedMask.maskHeight) {
      setFittedGlassOverlay(null)
      return () => { cancelled = true }
    }
    const overlay = new Image()
    overlay.onload = () => {
      if (cancelled) return
      const url = fitGlassOverlayToMask(overlay, processedMask.maskWidth!, processedMask.maskHeight!, processedMask.glassBounds!)
      setFittedGlassOverlay(url ? { source: glassOverlay, maskSource: previewImage, url } : null)
    }
    overlay.onerror = () => { if (!cancelled) setFittedGlassOverlay(null) }
    overlay.src = glassOverlay
    return () => { cancelled = true }
  }, [glassOverlay, previewImage, processedMask])

  const finishLayerStyle = useMemo(() => {
    if (!applyFinish || !hasMappedPreview || !finishMask || !finishColor) return undefined
    return {
      '--door': finishColor,
      backgroundColor: finishColor,
      WebkitMaskImage: `url("${finishMask}")`,
      maskImage: `url("${finishMask}")`,
      mixBlendMode: finish.finishType === 'paint' ? FINISH_RENDERING.paintColorBlendMode : FINISH_RENDERING.stainColorBlendMode,
      opacity: finish.finishType === 'paint' ? FINISH_RENDERING.paintColorOpacity : FINISH_RENDERING.stainColorOpacity,
      ...(finish.finishType === 'stain' ? { filter: `saturate(${FINISH_RENDERING.stainSaturation})` } : {}),
    } as React.CSSProperties
  }, [applyFinish, finish.finishType, finishColor, finishMask, hasMappedPreview])
  const detailLayerStyle = {
    WebkitMaskImage: finishMask ? `url("${finishMask}")` : undefined,
    maskImage: finishMask ? `url("${finishMask}")` : undefined,
    mixBlendMode: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailBlendMode : FINISH_RENDERING.stainDetailBlendMode,
    opacity: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity,
    ...(finish.finishType === 'stain' ? { filter: `grayscale(1) contrast(${FINISH_RENDERING.stainContrast})` } : {}),
  } as React.CSSProperties
  const stainHighlightStyle = finish.finishType === 'stain' && finishMask ? {
    '--stain-gloss-strength': FINISH_RENDERING.stainGlossStrength,
    WebkitMaskImage: `url("${finishMask}")`,
    maskImage: `url("${finishMask}")`,
    opacity: FINISH_RENDERING.stainHighlightOpacity,
  } as React.CSSProperties : undefined
  const glassOverlayStyle = glassMask ? {
    ...(maskCode === 'CR14' || maskCode === 'CR14PL' ? { backgroundColor: '#eef1f2' } : {}),
    WebkitMaskImage: `url("${glassMask}")`,
    maskImage: `url("${glassMask}")`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  } as React.CSSProperties : undefined
  const requestedHardwareImage = selectedHardwareImage || hardwarePreviewAssetUrl(previewHardware, previewView, doorSwing)
  const [hardwareImage, setHardwareImage] = useState(requestedHardwareImage)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[door-preview:selection]', {
      style: style.name,
      finishType: finish.finishType,
      finishColor,
      previewImage,
    })
  }, [finish.finishType, finishColor, previewImage, style.name])

  useEffect(() => {
    setHardwareImage(requestedHardwareImage)
  }, [requestedHardwareImage])

  useEffect(() => {
    if (!previewHardware.manufacturer || !previewHardware.style || !previewHardware.finish || requestedHardwareImage) return
    console.warn('[door-preview:missing-hardware-overlay]', {
      manufacturer: previewHardware.manufacturer,
      style: previewHardware.style,
      finish: previewHardware.finish,
      view: previewView,
      doorSwing: doorSwing?.id,
    })
  }, [previewHardware.manufacturer, previewHardware.style, previewHardware.finish, previewView, requestedHardwareImage, doorSwing?.id])

  return (
    <div className={`preview-scene ${compact ? 'compact' : ''}`} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass && glass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <div className="door-frame">
        <div className={`door door-${style.panel} ${hasMappedPreview ? 'mapped-preview-door' : ''}`} style={{ '--door': finishColor, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          {previewImage && <img className={`door-style-image door-style-image-${finish.finishType}`} src={previewImage} alt="" decoding="async" onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {finishLayerStyle && <div className={`door-finish-layer door-finish-layer-${finish.finishType}`} style={finishLayerStyle} />}
          {previewImage && finishLayerStyle && <img className="door-detail-image" src={previewImage} alt="" decoding="async" style={detailLayerStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {stainHighlightStyle && <div className="door-stain-highlight" style={stainHighlightStyle} />}
          {glassOverlay && <img className="door-glass-overlay" src={fittedGlassOverlay?.source === glassOverlay && fittedGlassOverlay.maskSource === previewImage ? fittedGlassOverlay.url : glassOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {hardwareImage && <div className={`hardware hardware-${previewHardware.type}`} style={{ '--metal': previewHardware.color } as React.CSSProperties}>
            <img src={hardwareImage} alt="" decoding="async" onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => {
              console.warn('[door-preview:failed-hardware-overlay]', {
                manufacturer: previewHardware.manufacturer,
                style: previewHardware.style,
                finish: previewHardware.finish,
                view: previewView,
                doorSwing: doorSwing?.id,
                src: hardwareImage,
              })
              event.currentTarget.style.display = 'none'
            }} />
          </div>}
        </div>
      </div>
      {!compact && showViewToggle && previewHardware.manufacturer && previewHardware.asset && <div className="preview-view-toggle" role="group" aria-label="Preview view">
        {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={previewView === view ? 'active' : ''} aria-pressed={previewView === view} key={view} onClick={() => setPreviewView(view)}>{view}</button>)}
      </div>}
    </div>
  )
}
