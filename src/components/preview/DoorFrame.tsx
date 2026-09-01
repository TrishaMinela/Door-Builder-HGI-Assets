import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { DoorConfigurationType } from '../../types'
import { createCanonicalEntranceGeometry, ENTRANCE_GEOMETRY } from '../../features/home-visualizer/entranceGeometry'

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
  sideliteGlassIsGrid?: boolean
  sideliteGridIsPrairie?: boolean
  sideliteGridMatchesFinish?: boolean
  sideliteGridFinishColor?: string
  sideliteFinishStyle?: CSSProperties
  sideliteDetailStyle?: CSSProperties
  sideliteGlassOpeningStyle?: CSSProperties
  sideliteGlassFrameMaskStyle?: CSSProperties
  sideliteGlassFrameTintStyle?: CSSProperties
  sideliteGlassFrameDetailStyle?: CSSProperties
  sideliteHighlightStyle?: CSSProperties
  view?: DoorFrameView
  variant?: DoorFrameVariant
  sharedComparisonCanvas?: boolean
  className?: string
  showFrame?: boolean
  openingOnly?: boolean
  finishColor: string
  finishType: 'paint' | 'stain'
  finishSurface?: 'timber' | 'clad'
  doorConfigurationType?: DoorConfigurationType
}

const FRAME_SEAM_UNDERLAP = 1

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
  sideliteGlassIsGrid = false,
  sideliteGridIsPrairie = false,
  sideliteGridMatchesFinish = false,
  sideliteGridFinishColor,
  sideliteFinishStyle,
  sideliteDetailStyle,
  sideliteGlassOpeningStyle,
  sideliteGlassFrameMaskStyle,
  sideliteGlassFrameTintStyle,
  sideliteGlassFrameDetailStyle,
  sideliteHighlightStyle,
  view = 'Exterior',
  variant = view === 'Interior' ? 'interior' : 'exterior',
  sharedComparisonCanvas = false,
  className = '',
  showFrame = true,
  openingOnly = false,
  finishColor,
  finishType,
  finishSurface = 'timber',
  doorConfigurationType = 'single',
}: DoorFrameProps) {
  const frameId = useId().replace(/:/g, '')
  const frameRef = useRef<HTMLDivElement>(null)
  const [unitScale, setUnitScale] = useState(1)
  const geometry = createCanonicalEntranceGeometry({ doorConfigurationType, sidelites, variant, openingOnly, sharedComparisonCanvas })
  const { hasLeft, hasRight, profile } = geometry
  const { mullionWidth, leftSideliteWidth: leftWidth, doorAssemblyWidth, totalWidth, totalHeight, contentLeft: openingLeft, contentRight: openingRight, contentTop: openingTop, thresholdTop, doorLeft, centerMeetingStileLeft, bottomStructureHeight } = geometry
  const outerLeft = 0
  const outerRight = totalWidth
  const outerTop = 0
  const isInterior = view === 'Interior'
  const frameFill = finishColor
  const edgeAmount = variant === 'exterior' ? 0.035 : finishType === 'stain' ? 0.075 : 0.055
  const highlightAmount = variant === 'exterior' ? 0.03 : 0.035
  const frameEdge = mixHex(frameFill, '#000000', edgeAmount)
  const frameHighlight = mixHex(frameFill, '#ffffff', highlightAmount)
  const faceGradientId = `door-frame-face-${frameId}`
  const mullionGradientId = `door-frame-mullion-${frameId}`
  const sideliteMaskId = sideliteMaskSrc?.split('/').pop()?.replace(/\.png$/i, '').toLowerCase() ?? 'default'
  const sideliteGlassMaskStyle = sideliteGlassOpeningStyle ? {
    ...sideliteGlassOpeningStyle,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskPosition: '0 0',
    maskPosition: '0 0',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  } as CSSProperties : undefined
  const renderSideliteGlass = () => {
    if (!sideliteGlassSrc || !sideliteGlassMaskStyle) return null
    if (!sideliteGlassIsGrid) {
      return <div className="door-frame-sidelite-glass-clip" data-glass-mask={sideliteMaskSrc} style={sideliteGlassMaskStyle}>
        <img className={`door-frame-sidelite-glass door-frame-sidelite-glass-${sideliteMaskId}`} src={sideliteGlassSrc} alt="" decoding="async" />
      </div>
    }
    return <div className={`door-frame-sidelite-grid-clip door-frame-sidelite-grid-clip-${sideliteMaskId}`} style={sideliteGlassMaskStyle}>
      {sideliteGridMatchesFinish
        ? <div className="door-frame-sidelite-grid-art door-frame-sidelite-grid-finish" style={{ backgroundColor: sideliteGridFinishColor ?? finishColor, WebkitMaskImage: `url("${sideliteGlassSrc}")`, maskImage: `url("${sideliteGlassSrc}")` }} />
        : <img className={`door-frame-sidelite-grid-art${sideliteGlassSrc.includes('/FART3LWH.png') ? ' door-frame-sidelite-grid-art-centered-cover' : ''}`} src={sideliteGlassSrc} alt="" decoding="async" />}
    </div>
  }
  const renderSideliteGlassFrame = (source: string) => sideliteGlassFrameMaskStyle ? <>
    <img className="door-frame-sidelite-glass-frame-material" src={source} alt="" decoding="async" style={sideliteGlassFrameMaskStyle} />
    {sideliteGlassFrameTintStyle && <div className="door-frame-sidelite-glass-frame-tint" style={sideliteGlassFrameTintStyle} />}
    {sideliteGlassFrameDetailStyle && <img className="door-frame-sidelite-glass-frame-detail" src={source} alt="" decoding="async" style={sideliteGlassFrameDetailStyle} />}
  </> : null

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
    '--door-frame-columns': geometry.columns.map((width) => `${width}px`).join(' '),
    '--door-frame-left': `${(openingLeft / totalWidth) * 100}%`,
    '--door-frame-right': `${((totalWidth - openingRight) / totalWidth) * 100}%`,
    '--door-frame-top': `${(openingTop / totalHeight) * 100}%`,
    '--door-frame-bottom': `${(bottomStructureHeight / totalHeight) * 100}%`,
    ...(showFrame || openingOnly ? {
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
    <div ref={frameRef} className={`door-frame door-frame-${view.toLowerCase()} door-frame-variant-${variant} ${openingOnly ? 'door-frame-opening-only' : ''} ${className}`.trim()} data-door-configuration={doorConfigurationType} data-double-door={geometry.centerMeetingStileWidth > 0 ? 'true' : 'false'} data-sidelites={sidelites} data-view={view} data-variant={variant} data-shared-canvas={sharedComparisonCanvas ? 'true' : 'false'} data-frame={openingOnly ? 'opening-only' : showFrame ? 'visible' : 'hidden'} data-finish-type={finishType} data-finish-surface={finishSurface} data-scale={showFrame || openingOnly ? unitScale.toFixed(4) : undefined} style={layoutStyle}>
      <div className="door-frame-openings door-unit-canvas" aria-hidden="true">
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-left">
          {hasLeft && leftSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-left" src={leftSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={leftSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}<div className="door-frame-sidelite-glass-assembly">{renderSideliteGlassFrame(leftSideliteSrc)}{sideliteClearGlassBase && <div className="door-frame-sidelite-clear-glass" style={sideliteGlassMaskStyle} />}{renderSideliteGlass()}</div>{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}</>}
        </div>
        {hasLeft && <div className="door-frame-mullion-space door-frame-mullion-space-left" />}
        <div className="door-frame-door-slot">{children}</div>
        {hasRight && <div className="door-frame-mullion-space door-frame-mullion-space-right" />}
        <div className="door-frame-sidelite-slot door-frame-sidelite-slot-right">
          {hasRight && rightSideliteSrc && <><img className="door-frame-sidelite door-frame-sidelite-right" src={rightSideliteSrc} data-glass-mask={sideliteMaskSrc} alt="" decoding="async" />{sideliteFinishStyle && <div className={`door-frame-sidelite-finish door-frame-sidelite-finish-${finishType}`} style={sideliteFinishStyle} />}{sideliteDetailStyle && <img className="door-frame-sidelite-detail" src={rightSideliteSrc} alt="" decoding="async" style={sideliteDetailStyle} />}<div className="door-frame-sidelite-glass-assembly">{renderSideliteGlassFrame(rightSideliteSrc)}{sideliteClearGlassBase && <div className="door-frame-sidelite-clear-glass" style={sideliteGlassMaskStyle} />}{renderSideliteGlass()}</div>{sideliteHighlightStyle && <div className="door-frame-sidelite-highlight" style={sideliteHighlightStyle} />}</>}
        </div>
      </div>
      {(showFrame || openingOnly) && <svg className="door-frame-svg door-frame-svg-base" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
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
          d={openingOnly
            // Contract the transparent opening by one hidden source pixel.
            // Product layers sit above this SVG, so the frame tucks beneath
            // their edges without changing the visible opening dimensions.
            ? `M${outerLeft} ${outerTop}H${outerRight}V${totalHeight}H${outerLeft}Z M${openingLeft + FRAME_SEAM_UNDERLAP} ${openingTop + FRAME_SEAM_UNDERLAP}V${thresholdTop - FRAME_SEAM_UNDERLAP}H${openingRight - FRAME_SEAM_UNDERLAP}V${openingTop + FRAME_SEAM_UNDERLAP}Z`
            : `M${outerLeft} ${outerTop}H${outerRight}V${thresholdTop}H${outerLeft}Z M${openingLeft} ${openingTop}V${thresholdTop}H${openingRight}V${openingTop}Z`}
          fill={`url(#${faceGradientId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          stroke={frameEdge}
          strokeWidth="1"
          strokeOpacity="0.45"
        />
      </svg>}
      {(showFrame || openingOnly) && <svg className="door-frame-svg door-frame-svg-foreground" viewBox={`0 0 ${totalWidth} ${totalHeight}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={mullionGradientId} x1="0" x2="1">
            <stop offset="0" stopColor={frameEdge} />
            <stop offset="0.2" stopColor={frameFill} />
            <stop offset="0.5" stopColor={frameHighlight} />
            <stop offset="0.8" stopColor={frameFill} />
            <stop offset="1" stopColor={frameEdge} />
          </linearGradient>
        </defs>
        {!openingOnly && variant === 'exterior' && <path d={`M${outerLeft + profile.profileInset} ${thresholdTop}V${outerTop + profile.profileInset}H${outerRight - profile.profileInset}V${thresholdTop}`} fill="none" stroke={frameHighlight} strokeWidth={profile.profileStroke} opacity="0.35" />}
        {!openingOnly && <path d={`M${openingLeft - profile.profileInset} ${thresholdTop}V${openingTop - profile.profileInset}H${openingRight + profile.profileInset}V${thresholdTop}`} fill="none" stroke={frameEdge} strokeWidth={profile.profileStroke} opacity="0.32" />}
        {!openingOnly && <path d={`M${openingLeft} ${thresholdTop}V${openingTop}H${openingRight}V${thresholdTop}`} fill="none" stroke={frameEdge} strokeWidth={variant === 'exterior' ? 2.5 : 1.25} opacity={variant === 'exterior' ? 0.42 : 0.32} />}
        {hasLeft && <rect className="door-frame-divider door-frame-divider-left" x={openingLeft + leftWidth} y={openingTop} width={mullionWidth} height={geometry.openingHeight} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth={variant === 'exterior' ? 1.5 : 1} strokeOpacity="0.4" />}
        {geometry.centerMeetingStileWidth > 0 && <rect className="door-frame-divider door-frame-center-meeting-stile" x={centerMeetingStileLeft} y={openingTop} width={geometry.centerMeetingStileWidth} height={geometry.openingHeight} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth={variant === 'exterior' ? 1.5 : 1} strokeOpacity="0.4" />}
        {hasRight && <rect className="door-frame-divider door-frame-divider-right" x={doorLeft + doorAssemblyWidth} y={openingTop} width={mullionWidth} height={geometry.openingHeight} fill={`url(#${mullionGradientId})`} stroke={frameEdge} strokeWidth={variant === 'exterior' ? 1.5 : 1} strokeOpacity="0.4" />}
        {!openingOnly && <rect x={outerLeft} y={thresholdTop} width={outerRight - outerLeft} height={ENTRANCE_GEOMETRY.thresholdHeight} rx="1" fill="#111211" />}
        {!openingOnly && <path d={`M${outerLeft + 3} ${thresholdTop + 2}H${outerRight - 3}`} stroke="#3c3d3b" strokeWidth="2" />}
        {!openingOnly && isInterior && <path d={`M${openingLeft - 2} ${thresholdTop}V${openingTop - 2}H${openingRight + 2}V${thresholdTop}`} fill="none" stroke={frameHighlight} strokeWidth="1" opacity="0.35" />}
      </svg>}
    </div>
  )
}
