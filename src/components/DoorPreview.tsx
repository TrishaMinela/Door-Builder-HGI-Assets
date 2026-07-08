import { useEffect, useState } from 'react'
import type { DoorStyle, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct } from '../types'
import { hardwarePreviewAssetUrl } from '../data/hardware'
import { hasDoorPreviewAsset, previewAssetGlassMask, previewAssetGlassOverlay, previewAssetHasGlass, previewAssetTintMask, resolveDoorPreviewAsset } from '../data/doorPreviewAssets'
import { tintDoorPreviewAsset } from '../utils/tintPreview'

type Props = {
  style: DoorStyle
  finish: Finish
  glass: GlassOption | null
  hardware: PreviewHardware
  compact?: boolean
  grain?: string | null
  product?: ResolvedDoorProduct | null
  tintColor?: string | null
}

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null }: Props) {
  const previewImage = resolveDoorPreviewAsset(style, grain, finish.finishType, product)
  const hasMappedPreview = hasDoorPreviewAsset(style)
  const preservePreviewGlass = previewAssetHasGlass(style)
  const tintMask = previewAssetTintMask(style)
  const glassOverlay = glass?.overlaysByDoorStyle[style.code]
  const showFixedGlassBeforeFinish = ['F764', 'HRT', 'SAT'].some((code) => style.code === code || style.variants.some((variant) => variant.code === code))
  const fixedGlassOverlay = !glassOverlay && (tintColor || showFixedGlassBeforeFinish) ? previewAssetGlassOverlay(style, finish.finishType) : undefined
  const glassSitsUnderDoorImage = style.code === 'QA'
  const [displayImage, setDisplayImage] = useState(previewImage)
  const [previewView, setPreviewView] = useState<HardwareView>('Exterior')
  const requestedHardwareImage = hardwarePreviewAssetUrl(hardware, previewView)
  const [hardwareImage, setHardwareImage] = useState(requestedHardwareImage)

  useEffect(() => {
    let isCurrent = true
    setDisplayImage(previewImage)

    if (import.meta.env.DEV) {
      console.info('[door-preview:selection]', {
        style: style.name,
        finishType: finish.finishType,
        finishColor: tintColor,
        previewImage,
        preserveGlass: style.hasGlass,
      })
    }

    if (hasMappedPreview && tintColor) {
      tintDoorPreviewAsset(previewImage, tintColor, {
        preserveGlass: preservePreviewGlass,
        finishType: finish.finishType,
        glassMask: previewAssetGlassMask(style),
        tintMask,
      }).then((tintedImage) => {
        if (import.meta.env.DEV) {
          console.info('[door-preview:image-ready]', {
            style: style.name,
            finishType: finish.finishType,
            finishColor: tintColor,
            isDataUrl: tintedImage.startsWith('data:image/png'),
            outputLength: tintedImage.length,
          })
        }
        if (isCurrent) setDisplayImage(tintedImage)
      })
    }

    return () => {
      isCurrent = false
    }
  }, [previewImage, tintColor, preservePreviewGlass, finish.finishType, hasMappedPreview, tintMask])

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
    })
  }, [hardware.manufacturer, hardware.style, hardware.finish, previewView, requestedHardwareImage])

  return (
    <div className={`preview-scene ${compact ? 'compact' : ''}`} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass && glass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <div className="door-frame">
        <div className={`door door-${style.panel} ${hasMappedPreview ? 'mapped-preview-door' : ''}`} style={{ '--door': tintColor ?? finish.color, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          {glassOverlay && glassSitsUnderDoorImage && <img className="door-glass-overlay under-door-image" src={glassOverlay} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          <img className="door-style-image" src={displayImage} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          {fixedGlassOverlay && <img className="door-glass-overlay fixed-glass-overlay" src={fixedGlassOverlay} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {glassOverlay && !glassSitsUnderDoorImage && <img className="door-glass-overlay" src={glassOverlay} alt="" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {hardwareImage && <div className={`hardware hardware-${hardware.type}`} style={{ '--metal': hardware.color } as React.CSSProperties}>
            <img src={hardwareImage} alt="" decoding="async" onError={(event) => {
              console.warn('[door-preview:failed-hardware-overlay]', {
                manufacturer: hardware.manufacturer,
                style: hardware.style,
                finish: hardware.finish,
                view: previewView,
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
