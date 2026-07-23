import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export type DoorFrameSidelites = 'none' | 'left' | 'right' | 'both'
export type DoorFrameView = 'Exterior' | 'Interior'
export type DoorFrameVariant = 'exterior' | 'interior'

type DoorFrameProps = {
  children: ReactNode
  sidelites?: DoorFrameSidelites
  leftSideliteSrc?: string
  rightSideliteSrc?: string
  sideliteMaskSrc?: string
  sideliteGlassSrc?: string
  sideliteClearGlassBase?: boolean
  sideliteGridMatchesFinish?: boolean
  sideliteFinishStyle?: CSSProperties
  sideliteDetailStyle?: CSSProperties
  sideliteHighlightStyle?: CSSProperties
  view?: DoorFrameView
  variant?: DoorFrameVariant
  sharedComparisonCanvas?: boolean
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
const THRESHOLD = 12
const FRAME_PROFILES = {
  exterior: {
    side: 19,
    head: 19,
    mullion: 11,
    profileInset: 5,
    profileStroke: 3,
  },
  interior: {
    side: 8,
    head: 8,
    mullion: 8,
    profileInset: 2,
    profileStroke: 1.5,
  },
} as const

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
  sideliteClearGlassBase = false,
  sideliteGridMatchesFinish = false,
  sideliteFinishStyle,
  sideliteDetailStyle,
  sideliteHighlightStyle,
  view = 'Exterior',
  variant = view === 'Interior' ? 'interior' : 'exterior',
  sharedComparisonCanvas = false,
  className = '',
  showFrame = true,
  finishColor,
  finishType,
}: DoorFrameProps) {
  const frameId = useId().replace(/:/g, '')
  const frameRef = useRef<HTMLDivElement>(null)
  const [unitScale, setUnitScale] = useState(1)
  const hasLeft = sidelites === 'left' || sidelites === 'both'
  const hasRight = sidelites === 'right' || sidelites === 'both'
  const profile = FRAME_PROFILES[variant]
  const frameSide = profile.side
  const frameHead = profile.head
  const mullionWidth = profile.mullion
  const leftWidth = hasLeft ? SIDELITE_WIDTH : 0
  const rightWidth = hasRight ? SIDELITE_WIDTH : 0
  const leftMullionWidth = hasLeft ? mullionWidth : 0
  const rightMullionWidth = hasRight ? mullionWidth : 0
  const openingWidth = leftWidth + leftMullionWidth + DOOR_WIDTH + rightMullionWidth + rightWidth
  const sharedMullionWidth = FRAME_PROFILES.exterior.mullion
  const sharedOpeningWidth = leftWidth + (hasLeft ? sharedMullionWidth : 0) + DOOR_WIDTH + (hasRight ? sharedMullionWidth : 0) + rightWidth
  const totalWidth = sharedComparisonCanvas ? sharedOpeningWidth + FRAME_PROFILES.exterior.side * 2 : openingWidth + frameSide * 2
  const totalHeight = HEIGHT + (sharedComparisonCanvas ? FRAME_PROFILES.exterior.head : frameHead) + THRESHOLD
  const openingLeft = (totalWidth - openingWidth) / 2
  const openingRight = openingLeft + openingWidth
  const openingTop = sharedComparisonCanvas ? FRAME_PROFILES.exterior.head : frameHead
  const thresholdTop = openingTop + HEIGHT
  const outerLeft = openingLeft - frameSide
  const outerRight = openingRight + frameSide
  const outerTop = openingTop - frameHead
  const doorLeft = openingLeft + leftWidth + leftMullionWidth
  const isInterior = view === 'Interior'
  const frameFill = variant === 'exterior' ? '#eef1f2' : finishColor
  const edgeAmount = variant === 'exterior' ? 0.035 : finishType === 'stain' ? 0.075 : 0.055
  const highlightAmount = variant === 'exterior' ? 0.03 : 0.035
  const frameEdge = mixHex(frameFill, '#000000', edgeAmount)
  const frameHighlight = mixHex(frameFill, '#ffffff', highlightAmount)
  const faceGradientId = `door-frame-face-${frameId}`
  const mullionGradientId = `door-frame-mullion-${frameId}`
  const sideliteGlassMaskStyle = sideliteMaskSrc ? {
    WebkitMaskImage: `url("${sideliteMaskSrc}")`,
    maskImage: `url("${sideliteMaskSrc}")`,
  } as CSSProperties : undefined
  const renderSideliteGlass = () => {
    if (!sideliteGlassSrc) return null
    if (!sideliteClearGlassBase) {
      return <img className="door-frame-sidelite-glass" src={sideliteGlassSrc} alt="" decoding="async" style={sideliteGlassMaskStyle} />
    }
    return <div className="door-frame-sidelite-grid-clip" style={sideliteGlassMaskStyle}>
      {sideliteGridMatchesFinish
        ? <div className="door-frame-sidelite-grid-art door-frame-sidelite-grid-finish" style={{ backgroundColor: finishColor, WebkitMaskImage: `url("${sideliteGlassSrc}")`, maskImage: `url("${sideliteGlassSrc}")` }} />
        : <img className="door-frame-sidelite-grid-art" src={sideliteGlassSrc} alt="" decoding="async" />}
    </div>
  }

  useLayoutEffect(() => {
    if (!showFrame) return
    const frame = frameRef.current
    const viewport = frame?.parentElement
    if (!frame || !viewport || typeof ResizeObserver === 'undefined') return

    const updateScale = () => {
      const bounds = viewport.getBoundingClientRect()
      const styles = window.getComputedStyle(viewport)
      const horizontalPadding = Number.parseFloat(styles.paddingLeft || '0') + Number.parseFloat(styles.paddingRight || '0')
      const verticalPadding = Number.parseFloat(styles.paddingTop || '0') + Number.parseFloat(styles.paddingBottom || '0')
      const availableWidth = Math.max(1, bounds.width - horizontalPadding - 12)
      const availableHeight = Math.max(1, bounds.height - verticalPadding - 12)
      const nextScale = Math.min(1, availableWidth / totalWidth, availableHeight / totalHeight)
      setUnitScale((current) => Math.abs(current - nextScale) < 0.001 ? current : nextScale)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [showFrame, totalHeight, totalWidth])

  const layoutStyle = {
    '--door-frame-aspect': `${totalWidth} / ${totalHeight}`,
    '--door-frame-columns': `${leftWidth}fr ${leftMullionWidth}fr ${DOOR_WIDTH}fr ${rightMullionWidth}fr ${rightWidth}fr`,
    '--door-frame-left': `${(openingLeft / totalWidth) * 100}%`,
    '--door-frame-right': `${((totalWidth - openingRight) / totalWidth) * 100}%`,
    '--door-frame-top': `${(openingTop / totalHeight) * 100}%`,
    '--door-frame-bottom': `${(THRESHOLD / totalHeight) * 100}%`,
    ...(showFrame ? {
      width: `${totalWidth}px`,
      height: `${totalHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      flex: '0 0 auto',
      transform: `scale(${unitScale})`,
      transformOrigin: 'center',
    } : {}),
  } as CSSProperties

  return (
    <div ref={frameRef} className={`door-frame door-frame-${view.toLowerCase()} door-frame-variant-${variant} ${className}`.trim()} data-sidelites={sidelites} data-view={view} data-variant={variant} data-shared-canvas={sharedComparisonCanvas ? 'true' : 'false'} data-frame={showFrame ? 'visible' : 'hidden'} data-finish-type={finishType} data-scale={showFrame ? unitScale.toFixed(4) : undefined} style={layoutStyle}>
      <div className="door-frame-openings door-unit-canvas" aria-hidden="true">
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-left">
          {hasLeft && leftSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-left" src={leftSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={leftSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}{sideliteClearGlassBase && <div className="door-frame-sidelite-clear-glass" style={sideliteGlassMaskStyle} />}{renderSideliteGlass()}</>}
        </div>
        {hasLeft && <div className="door-frame-mullion-space door-frame-mullion-space-left" />}
        <div className="door-frame-door-slot">{children}</div>
        {hasRight && <div className="door-frame-mullion-space door-frame-mullion-space-right" />}
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-right">
          {hasRight && rightSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-right" src={rightSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={rightSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}{sideliteClearGlassBase && <div className="door-frame-sidelite-clear-glass" style={sideliteGlassMaskStyle} />}{renderSideliteGlass()}</>}
        </div>
      </div>
      {showFrame && <svg className="door-frame-svg door-frame-svg-base" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={faceGradientId} x1="0" x2="1">
            <stop offset="0" stopColor={frameEdge} />
            <stop offset="0.18" stopColor={frameFill} />
            <stop offset="0.5" stopColor={frameHighlight} />
            <stop offset="0.82" stopColor={frameFill} />
            <stop offset="1" stopColor={frameEdge} />
          </linearGradient>
        </defs>
        <path
          d={`M${outerLeft} ${outerTop}H${outerRight}V${thresholdTop}H${outerLeft}Z M${openingLeft} ${openingTop}V${thresholdTop}H${openingRight}V${openingTop}Z`}
          fill={`url(#${faceGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          stroke={frameEdge}
          strokeWidth="1"
          strokeOpacity="0.45"
        />
      </svg>}
      {showFrame && <svg className="door-frame-svg door-frame-svg-foreground" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={mullionGradientId} x1="0" x2="1">
            <stop offset="0" stopColor={frameEdge} />
            <stop offset="0.2" stopColor={frameFill} />
            <stop offset="0.5" stopColor={frameHighlight} />
            <stop offset="0.8" stopColor={frameFill} />
            <stop offset="1" stopColor={frameEdge} />
          </linearGradient>
        </defs>
        {variant === 'exterior' && <path d={`M${outerLeft + profile.profileInset} ${thresholdTop}V${outerTop + profile.profileInset}H${outerRight - profile.profileInset}V${thresholdTop}`} fill="none" stroke={frameHighlight} strokeWidth={profile.profileStroke} opacity="0.35" />}
        <path d={`M${openingLeft - profile.profileInset} ${thresholdTop}V${openingTop - profile.profileInset}H${openingRight + profile.profileInset}V${thresholdTop}`} fill="none" stroke={frameEdge} strokeWidth={profile.profileStroke} opacity="0.32" />
        <path d={`M${openingLeft} ${thresholdTop}V${openingTop}H${openingRight}V${thresholdTop}`} fill="none" stroke={frameEdge} strokeWidth={variant === 'exterior' ? 2.5 : 1.25} opacity={variant === 'exterior' ? 0.42 : 0.32} />
        {hasLeft && <rect x={openingLeft + leftWidth} y={openingTop} width={mullionWidth} height={HEIGHT} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth={variant === 'exterior' ? 1.5 : 1} strokeOpacity="0.4" />}
        {hasRight && <rect x={doorLeft + DOOR_WIDTH} y={openingTop} width={mullionWidth} height={HEIGHT} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth={variant === 'exterior' ? 1.5 : 1} strokeOpacity="0.4" />}
        <rect x={outerLeft} y={thresholdTop} width={outerRight - outerLeft} height={THRESHOLD} rx="1" fill="#111211" />
        <path d={`M${outerLeft + 3} ${thresholdTop + 2}H${outerRight - 3}`} stroke="#3c3d3b" strokeWidth="2" />
        {isInterior && <path d={`M${openingLeft - 2} ${thresholdTop}V${openingTop - 2}H${openingRight + 2}V${thresholdTop}`} fill="none" stroke={frameHighlight} strokeWidth="1" opacity="0.35" />}
      </svg>}
    </div>
  )
}
