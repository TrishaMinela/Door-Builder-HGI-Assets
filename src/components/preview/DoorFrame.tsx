import { useId, type CSSProperties, type ReactNode } from 'react'

export type DoorFrameSidelites = 'none' | 'left' | 'right' | 'both'
export type DoorFrameView = 'Exterior' | 'Interior'

type DoorFrameProps = {
  children: ReactNode
  sidelites?: DoorFrameSidelites
  leftSideliteSrc?: string
  rightSideliteSrc?: string
  sideliteMaskSrc?: string
  sideliteGlassSrc?: string
  sideliteFinishStyle?: CSSProperties
  sideliteDetailStyle?: CSSProperties
  sideliteHighlightStyle?: CSSProperties
  view?: DoorFrameView
  className?: string
  showFrame?: boolean
  finishColor: string
  finishType: 'paint' | 'stain'
}

// Authored PNG canvas sizes. Every unit is normalized against the shared
// 549px source height, so widths come from each asset's natural aspect ratio.
const SOURCE_GEOMETRY = {
  door: { width: 242, height: 549 },
  fsl: { width: 80, height: 549 },
} as const
const HEIGHT = SOURCE_GEOMETRY.door.height
const DOOR_WIDTH = HEIGHT * (SOURCE_GEOMETRY.door.width / SOURCE_GEOMETRY.door.height)
const SIDELITE_WIDTH = HEIGHT * (SOURCE_GEOMETRY.fsl.width / SOURCE_GEOMETRY.fsl.height)
const MULLION_WIDTH = 10
const FRAME = 12
const HEAD = 12
const THRESHOLD = 12

function mixHex(color: string, target: '#000000' | '#ffffff', amount: number) {
  const match = color.match(/^#([\da-f]{6})$/i)
  if (!match) return color
  const source = Number.parseInt(match[1], 16)
  const destination = Number.parseInt(target.slice(1), 16)
  const channel = (shift: number) => Math.round(((source >> shift) & 255) * (1 - amount) + ((destination >> shift) & 255) * amount)
  return `#${[channel(16), channel(8), channel(0)].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function DoorFrame({
  children,
  sidelites = 'none',
  leftSideliteSrc,
  rightSideliteSrc,
  sideliteMaskSrc,
  sideliteGlassSrc,
  sideliteFinishStyle,
  sideliteDetailStyle,
  sideliteHighlightStyle,
  view = 'Exterior',
  className = '',
  showFrame = true,
  finishColor,
  finishType,
}: DoorFrameProps) {
  const frameId = useId().replace(/:/g, '')
  const hasLeft = sidelites === 'left' || sidelites === 'both'
  const hasRight = sidelites === 'right' || sidelites === 'both'
  const leftWidth = hasLeft ? SIDELITE_WIDTH : 0
  const rightWidth = hasRight ? SIDELITE_WIDTH : 0
  const leftMullionWidth = hasLeft ? MULLION_WIDTH : 0
  const rightMullionWidth = hasRight ? MULLION_WIDTH : 0
  const openingWidth = leftWidth + leftMullionWidth + DOOR_WIDTH + rightMullionWidth + rightWidth
  const totalWidth = openingWidth + FRAME * 2
  const totalHeight = HEIGHT + HEAD + THRESHOLD
  const doorLeft = FRAME + leftWidth + leftMullionWidth
  const isInterior = view === 'Interior'
  const frameFill = finishColor
  const edgeAmount = finishType === 'stain' ? 0.24 : 0.16
  const highlightAmount = finishType === 'stain' ? 0.1 : 0.14
  const frameEdge = mixHex(finishColor, '#000000', edgeAmount)
  const frameHighlight = mixHex(finishColor, '#ffffff', highlightAmount)
  const faceGradientId = `door-frame-face-${frameId}`
  const mullionGradientId = `door-frame-mullion-${frameId}`

  const layoutStyle = {
    '--door-frame-aspect': `${totalWidth} / ${totalHeight}`,
    '--door-frame-columns': `${leftWidth}fr ${leftMullionWidth}fr ${DOOR_WIDTH}fr ${rightMullionWidth}fr ${rightWidth}fr`,
    '--door-frame-left': `${(FRAME / totalWidth) * 100}%`,
    '--door-frame-right': `${(FRAME / totalWidth) * 100}%`,
    '--door-frame-top': `${(HEAD / totalHeight) * 100}%`,
    '--door-frame-bottom': `${(THRESHOLD / totalHeight) * 100}%`,
  } as CSSProperties

  return (
    <div className={`door-frame door-frame-${view.toLowerCase()} ${className}`.trim()} data-sidelites={sidelites} data-view={view} data-frame={showFrame ? 'visible' : 'hidden'} data-finish-type={finishType} style={layoutStyle}>
      <div className="door-frame-openings door-unit-canvas" aria-hidden="true">
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-left">
          {hasLeft && leftSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-left" src={leftSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={leftSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}{sideliteGlassSrc && <img className="door-frame-sidelite-glass" src={sideliteGlassSrc} alt="" decoding="async" style={sideliteMaskSrc ? { WebkitMaskImage: `url("${sideliteMaskSrc}")`, maskImage: `url("${sideliteMaskSrc}")` } : undefined} />}</>}
        </div>
        {hasLeft && <div className="door-frame-mullion-space door-frame-mullion-space-left" />}
        <div className="door-frame-door-slot">{children}</div>
        {hasRight && <div className="door-frame-mullion-space door-frame-mullion-space-right" />}
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-right">
          {hasRight && rightSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-right" src={rightSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={rightSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}{sideliteGlassSrc && <img className="door-frame-sidelite-glass" src={sideliteGlassSrc} alt="" decoding="async" style={sideliteMaskSrc ? { WebkitMaskImage: `url("${sideliteMaskSrc}")`, maskImage: `url("${sideliteMaskSrc}")` } : undefined} />}</>}
        </div>
      </div>
      {showFrame && <svg className="door-frame-svg door-frame-svg-base" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={faceGradientId} x1="0" x2="1">
            <stop offset="0" stopColor={frameEdge} />
            <stop offset="0.28" stopColor={frameFill} />
            <stop offset="0.72" stopColor={frameHighlight} />
            <stop offset="1" stopColor={frameEdge} />
          </linearGradient>
        </defs>
        <path
          d={`M0 0H${totalWidth}V${totalHeight - THRESHOLD}H0Z M${FRAME} ${HEAD}V${totalHeight - THRESHOLD}H${totalWidth - FRAME}V${HEAD}Z`}
          fill={`url(#${faceGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          stroke={frameEdge}
          strokeWidth="1"
        />
      </svg>}
      {showFrame && <svg className="door-frame-svg door-frame-svg-foreground" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={mullionGradientId} x1="0" x2="1">
            <stop offset="0" stopColor={frameEdge} />
            <stop offset="0.35" stopColor={frameFill} />
            <stop offset="0.7" stopColor={frameHighlight} />
            <stop offset="1" stopColor={frameEdge} />
          </linearGradient>
        </defs>
        {hasLeft && <rect x={FRAME + leftWidth} y={HEAD} width={MULLION_WIDTH} height={HEIGHT} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth="1" />}
        {hasRight && <rect x={doorLeft + DOOR_WIDTH} y={HEAD} width={MULLION_WIDTH} height={HEIGHT} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth="1" />}
        <rect x="0" y={totalHeight - THRESHOLD} width={totalWidth} height={THRESHOLD} rx="1" fill="#111211" />
        <path d={`M3 ${totalHeight - THRESHOLD + 2}H${totalWidth - 3}`} stroke="#3c3d3b" strokeWidth="2" />
        {isInterior && <path d={`M${FRAME - 3} ${totalHeight - THRESHOLD}V${HEAD - 3}H${totalWidth - FRAME + 3}V${totalHeight - THRESHOLD}`} fill="none" stroke={frameEdge} strokeWidth="2" />}
      </svg>}
    </div>
  )
}
