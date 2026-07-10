import { useEffect, useMemo, useState } from 'react'
import type { DoorStyle, DoorSwing, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct } from '../types'
import { hardwarePreviewAssetUrl } from '../data/hardware'
import { resolveDoorPreviewCandidates } from '../data/doorPreviewAssets'

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
}

const FINISH_RENDERING = {
  paintColorBlendMode: 'normal',
  paintColorOpacity: 1,
  paintDetailBlendMode: 'multiply',
  paintDetailOpacity: 0.25,
  stainColorBlendMode: 'normal',
  stainColorOpacity: 0.96,
  stainDetailBlendMode: 'multiply',
  stainDetailOpacity: 0.52,
  stainContrast: 1.35,
  stainSaturation: 1.18,
  stainHighlightOpacity: 0.18,
  stainGlossStrength: 0.72,
} as const

const SLAB_MASK_WHITE_THRESHOLD = 253

function buildSlabMask(slab: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = slab.naturalWidth
  canvas.height = slab.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.drawImage(slab, 0, 0)
  const maskPixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let index = 0; index < maskPixels.data.length; index += 4) {
    const red = maskPixels.data[index]
    const green = maskPixels.data[index + 1]
    const blue = maskPixels.data[index + 2]
    const alpha = maskPixels.data[index + 3]
    const protectedPixel = alpha === 0 || (red > SLAB_MASK_WHITE_THRESHOLD && green > SLAB_MASK_WHITE_THRESHOLD && blue > SLAB_MASK_WHITE_THRESHOLD)
    maskPixels.data[index] = 255
    maskPixels.data[index + 1] = 255
    maskPixels.data[index + 2] = 255
    maskPixels.data[index + 3] = protectedPixel ? 0 : alpha
  }
  context.putImageData(maskPixels, 0, 0)
  return canvas.toDataURL('image/png')
}

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null, doorSwing = null, applyFinish = true }: Props) {
  const previewCandidates = resolveDoorPreviewCandidates(style, finish.finishType, product, grain)
  const previewCandidatesKey = previewCandidates.join('|')
  const [previewImage, setPreviewImage] = useState(previewCandidates[0] ?? '')
  const hasMappedPreview = Boolean(previewCandidates.length)
  const finishColor = tintColor ?? finish.color
  const [processedMask, setProcessedMask] = useState<{ source: string; url: string } | null>(null)
  const finishMask = previewImage && processedMask?.source === previewImage ? processedMask.url : undefined
  const glassStyleCodes = [...new Set([...(product?.styleCodes ?? []), style.code, ...style.variants.map((variant) => variant.code)])]
  const glassOverlay = glass ? glassStyleCodes.map((code) => glass.overlaysByDoorStyle[code]).find(Boolean) : undefined

  useEffect(() => {
    let cancelled = false
    let candidateIndex = 0

    const tryNextCandidate = () => {
      const candidate = previewCandidates[candidateIndex++]
      if (!candidate || cancelled) return
      const slab = new Image()
      slab.onload = () => {
        if (cancelled) return
        const maskUrl = buildSlabMask(slab)
        setProcessedMask(maskUrl ? { source: candidate, url: maskUrl } : null)
        setPreviewImage(candidate)
      }
      slab.onerror = tryNextCandidate
      slab.src = candidate
    }

    tryNextCandidate()
    return () => { cancelled = true }
  }, [previewCandidatesKey])

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
  const [previewView, setPreviewView] = useState<HardwareView>('Exterior')
  const requestedHardwareImage = hardwarePreviewAssetUrl(hardware, previewView, doorSwing)
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
    if (!hardware.manufacturer || !hardware.style || !hardware.finish || requestedHardwareImage) return
    console.warn('[door-preview:missing-hardware-overlay]', {
      manufacturer: hardware.manufacturer,
      style: hardware.style,
      finish: hardware.finish,
      view: previewView,
      doorSwing: doorSwing?.id,
    })
  }, [hardware.manufacturer, hardware.style, hardware.finish, previewView, requestedHardwareImage, doorSwing?.id])

  return (
    <div className={`preview-scene ${compact ? 'compact' : ''}`} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass && glass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <div className="door-frame">
        <div className={`door door-${style.panel} ${hasMappedPreview ? 'mapped-preview-door' : ''}`} style={{ '--door': finishColor, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          {previewImage && <img className={`door-style-image door-style-image-${finish.finishType}`} src={previewImage} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {finishLayerStyle && <div className={`door-finish-layer door-finish-layer-${finish.finishType}`} style={finishLayerStyle} />}
          {previewImage && finishLayerStyle && <img className="door-detail-image" src={previewImage} alt="" decoding="async" style={detailLayerStyle} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {stainHighlightStyle && <div className="door-stain-highlight" style={stainHighlightStyle} />}
          {glassOverlay && <img className="door-glass-overlay" src={glassOverlay} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {hardwareImage && <div className={`hardware hardware-${hardware.type}`} style={{ '--metal': hardware.color } as React.CSSProperties}>
            <img src={hardwareImage} alt="" decoding="async" onError={(event) => {
              console.warn('[door-preview:failed-hardware-overlay]', {
                manufacturer: hardware.manufacturer,
                style: hardware.style,
                finish: hardware.finish,
                view: previewView,
                doorSwing: doorSwing?.id,
                src: hardwareImage,
              })
              event.currentTarget.style.display = 'none'
            }} />
          </div>}
        </div>
      </div>
      {!compact && hardware.manufacturer && hardware.asset && <div className="preview-view-toggle" role="group" aria-label="Preview view">
        {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={previewView === view ? 'active' : ''} aria-pressed={previewView === view} key={view} onClick={() => setPreviewView(view)}>{view}</button>)}
      </div>}
      {!compact && <p className="preview-caption">Live preview · {previewView} view</p>}
    </div>
  )
}
