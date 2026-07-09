import { useEffect, useMemo, useState } from 'react'
import type { DoorStyle, DoorSwing, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct } from '../types'
import { hardwarePreviewAssetUrl } from '../data/hardware'
import { hasDoorPreviewAsset, previewAssetGlassOverlay, previewAssetTintMask, resolveDoorPreviewAsset } from '../data/doorPreviewAssets'

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
}

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null, doorSwing = null }: Props) {
  const previewImage = resolveDoorPreviewAsset(style, grain, finish.finishType, product)
  const hasMappedPreview = hasDoorPreviewAsset(style, grain, finish.finishType, product)
  const finishColor = tintColor ?? finish.color
  const finishMask = previewAssetTintMask(style) ?? previewImage
  const glassOverlay = glass?.overlaysByDoorStyle[style.code]
  const showFixedGlassBeforeFinish = ['5LT', 'F764', 'FRT', 'HRT', 'SAT'].some((code) => style.code === code || style.variants.some((variant) => variant.code === code))
  const fixedGlassOverlay = !glassOverlay && (tintColor || showFixedGlassBeforeFinish) ? previewAssetGlassOverlay(style, finish.finishType) : undefined
  const finishLayerStyle = useMemo(() => {
    if (!hasMappedPreview || !finishMask || !finishColor) return undefined
    return {
      '--door': finishColor,
      backgroundColor: finishColor,
      WebkitMaskImage: `url("${finishMask}")`,
      maskImage: `url("${finishMask}")`,
    } as React.CSSProperties
  }, [finishColor, finishMask, hasMappedPreview])
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
          {fixedGlassOverlay && <img className="door-glass-overlay fixed-glass-overlay" src={fixedGlassOverlay} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
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
