import { useEffect, useState } from 'react'
import type { DoorStyle, Finish, GlassOption, PreviewHardware, ResolvedDoorProduct } from '../types'
import { resolveDoorPreviewAsset } from '../data/doorPreviewAssets'
import { tintDoorPreviewAsset } from '../utils/tintPreview'

type Props = {
  style: DoorStyle
  finish: Finish
  glass: GlassOption
  hardware: PreviewHardware
  compact?: boolean
  grain?: string | null
  product?: ResolvedDoorProduct | null
  tintColor?: string | null
}

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null }: Props) {
  const previewImage = resolveDoorPreviewAsset(style, grain, finish.finishType, product)
  const [displayImage, setDisplayImage] = useState(previewImage)

  useEffect(() => {
    let isCurrent = true
    setDisplayImage(previewImage)

    if (tintColor) {
      tintDoorPreviewAsset(previewImage, tintColor).then((tintedImage) => {
        if (isCurrent) setDisplayImage(tintedImage)
      })
    }

    return () => {
      isCurrent = false
    }
  }, [previewImage, tintColor])

  return (
    <div className={`preview-scene ${compact ? 'compact' : ''}`} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <div className="door-frame">
        <div className={`door door-${style.panel}`} style={{ '--door': finish.color, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          <img className="door-style-image" src={displayImage} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          {hardware.asset && <div className={`hardware hardware-${hardware.type}`} style={{ '--metal': hardware.color } as React.CSSProperties}>
            <i className="deadbolt" /><i className="handle" />
            <img src={`/assets/hardware/${hardware.asset}`} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          </div>}
        </div>
      </div>
      {!compact && <p className="preview-caption">Live preview · Exterior view</p>}
    </div>
  )
}
