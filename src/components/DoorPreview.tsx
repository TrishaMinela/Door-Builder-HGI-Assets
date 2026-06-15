import type { DoorStyle, Finish, GlassOption, PreviewHardware } from '../types'

type Props = {
  style: DoorStyle
  finish: Finish
  glass: GlassOption
  hardware: PreviewHardware
  compact?: boolean
}

export function DoorPreview({ style, finish, glass, hardware, compact = false }: Props) {
  return (
    <div className={`preview-scene ${compact ? 'compact' : ''}`} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <div className="door-frame">
        <div className={`door door-${style.panel}`} style={{ '--door': finish.color, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          <img className="door-style-image" src={style.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
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
