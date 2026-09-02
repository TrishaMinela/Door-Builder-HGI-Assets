import { useEffect, useMemo, useRef, useState } from 'react'
import type { DoorConfigurationType, DoorStyle, DoorSwing, DoubleDoorLockPrepCode, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct, SideliteConfiguration } from '../types'
import { hardwareOptions, hardwarePreviewAssetUrl } from '../data/hardware'
import { glassOptions } from '../data/glassOptions'
import { resolveDoorPreviewCandidates } from '../data/doorPreviewAssets'
import { doorConfigurationLeafCount, doorHardwarePlacements } from '../data/doorConfigurationRules'
import { glassDoorCodes } from '../data/productCatalog'
import { resolveGlassMaskAsset } from '../data/glassMaskAssets'
import { glassFrameMaskForOpening, type GlassFrameMaskDefinition, type GlassFrameShape } from '../data/glassFrameMasks'
import { DoorFrame } from './preview/DoorFrame'
import { sidelitePlacement } from '../data/sideliteConfigurations'

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export type DoorPreviewProps = {
  style: DoorStyle
  finish: Finish
  glass: GlassOption | null
  hardware: PreviewHardware
  showHardware?: boolean
  compact?: boolean
  grain?: string | null
  product?: ResolvedDoorProduct | null
  tintColor?: string | null
  doorSwing?: DoorSwing | null
  applyFinish?: boolean
  view?: HardwareView
  onViewChange?: (view: HardwareView) => void
  showViewToggle?: boolean
  sidelites?: SideliteConfiguration
  sideliteAssetSrc?: string
  sideliteMaskSrc?: string
  sideliteGlassSrc?: string
  sideliteClearGlassBase?: boolean
  sideliteGlassIsGrid?: boolean
  sideliteGridColor?: string
  sideliteGridIsPrairie?: boolean
  gridMatchesFinish?: boolean
  sideliteGridMatchesFinish?: boolean
  sharedComparisonCanvas?: boolean
  jambFinish?: Finish | null
  jambType?: 'timber' | 'clad'
  glassFrameFinish?: Finish | null
  placementMode?: 'opening-only'
  doorConfigurationType?: DoorConfigurationType
  doubleDoorLockPrep?: DoubleDoorLockPrepCode | null
  loadingLabel?: string
}

const GLASS_FRAME_WIDTH_RATIO = 0.035
const MIN_GLASS_FRAME_WIDTH_PX = 5
const MAX_GLASS_FRAME_WIDTH_PX = 24
const GLASS_EDGE_OVERLAP_PX = 1.5

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
  stainHighlightOpacity: 0.76,
  stainGlossStrength: 1,
} as const

type PixelBounds = { x: number; y: number; width: number; height: number }
type HardwareSide = 'left' | 'right'

const hardwarePlacementByDoorSwing: Record<DoorSwing['id'], {
  hardwareSideExterior: HardwareSide
  hardwareSideInterior: HardwareSide
}> = {
  LHI: { hardwareSideExterior: 'right', hardwareSideInterior: 'left' },
  LHO: { hardwareSideExterior: 'left', hardwareSideInterior: 'right' },
  RHI: { hardwareSideExterior: 'left', hardwareSideInterior: 'right' },
  RHO: { hardwareSideExterior: 'right', hardwareSideInterior: 'left' },
}

const sourceHardwareSideByView: Record<HardwareView, HardwareSide> = {
  Exterior: 'right',
  Interior: 'left',
}

function preservesReadableHardware(hardware: PreviewHardware) {
  const label = `${hardware.manufacturer ?? ''} ${hardware.style ?? ''}`.toLowerCase()
  return /keypad|number|touchscreen|electronic|smart|logo|engraving/.test(label)
}

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

function connectedAlphaBounds(image: ImageData, minimumAlpha = 128): PixelBounds[] {
  const visited = new Uint8Array(image.width * image.height)
  const regions: PixelBounds[] = []
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || image.data[start * 4 + 3] < minimumAlpha) continue
    const stack = [start]
    visited[start] = 1
    let left = image.width
    let top = image.height
    let right = -1
    let bottom = -1
    while (stack.length) {
      const index = stack.pop()!
      const x = index % image.width
      const y = Math.floor(index / image.width)
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
      for (const neighbor of [index - 1, index + 1, index - image.width, index + image.width]) {
        if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] || image.data[neighbor * 4 + 3] < minimumAlpha) continue
        const neighborX = neighbor % image.width
        if (Math.abs(neighborX - x) > 1) continue
        visited[neighbor] = 1
        stack.push(neighbor)
      }
    }
    if (right >= left && bottom >= top) regions.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 })
  }
  return regions
}

function isUsableDoorSlabImage(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 48
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return true
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let visiblePixels = 0
  let opaqueBlackPixels = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 32) continue
    visiblePixels += 1
    if (pixels[index] < 20 && pixels[index + 1] < 20 && pixels[index + 2] < 20 && pixels[index + 3] > 220) opaqueBlackPixels += 1
  }
  // Preview slabs are neutral source artwork. An overwhelmingly opaque-black
  // image is a mask or invalid fallback, not a slab that should be displayed.
  return visiblePixels > 0 && opaqueBlackPixels / visiblePixels < 0.82
}

function vectorFramePath(shape: GlassFrameShape, bounds: PixelBounds, expansion: number) {
  const x = bounds.x - expansion
  const y = bounds.y - expansion
  const width = bounds.width + expansion * 2
  const height = bounds.height + expansion * 2
  const right = x + width
  const bottom = y + height
  const centerX = x + width / 2
  const centerY = y + height / 2

  if (shape === 'oval') {
    const radiusX = width / 2
    const radiusY = height / 2
    return `M ${centerX - radiusX} ${centerY} A ${radiusX} ${radiusY} 0 1 0 ${centerX + radiusX} ${centerY} A ${radiusX} ${radiusY} 0 1 0 ${centerX - radiusX} ${centerY} Z`
  }
  if (shape === 'round-top') {
    const radius = width / 2
    const shoulderY = y + radius
    return `M ${x} ${bottom} L ${x} ${shoulderY} A ${radius} ${radius} 0 0 1 ${right} ${shoulderY} L ${right} ${bottom} Z`
  }
  if (shape === 'eyebrow') {
    const shoulderY = y + Math.min(height * 0.2, width * 0.18)
    const controlY = y - (shoulderY - y)
    return `M ${x} ${bottom} L ${x} ${shoulderY} Q ${centerX} ${controlY} ${right} ${shoulderY} L ${right} ${bottom} Z`
  }
  if (shape === 'diamond') {
    return `M ${centerX} ${y} L ${right} ${centerY} L ${centerX} ${bottom} L ${x} ${centerY} Z`
  }
  return `M ${x} ${y} H ${right} V ${bottom} H ${x} Z`
}

function vectorMaskDataUrl(width: number, height: number, path: string, evenOdd = false) {
  const fillRule = evenOdd ? ' fill-rule="evenodd" clip-rule="evenodd"' : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path}" fill="white"${fillRule}/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function buildVectorGlassMasks(width: number, height: number, regions: PixelBounds[], shape: GlassFrameShape) {
  const openingPaths = regions.map((region) => vectorFramePath(shape, region, 0))
  const ringPaths = regions.map((region, index) => {
    const frameWidth = Math.max(MIN_GLASS_FRAME_WIDTH_PX, Math.min(MAX_GLASS_FRAME_WIDTH_PX, Math.min(region.width, region.height) * GLASS_FRAME_WIDTH_RATIO))
    // Reuse the exact same inner path string used by the opening mask. The
    // frame/glass boundary therefore has one canonical geometry and cannot
    // drift because of independent bounds, rounding, or rasterization.
    return `${vectorFramePath(shape, region, frameWidth)} ${openingPaths[index]}`
  })
  return {
    openingUrl: vectorMaskDataUrl(width, height, openingPaths.join(' ')),
    frameUrl: vectorMaskDataUrl(width, height, ringPaths.join(' '), true),
  }
}

function buildPreviewMasks(mask: HTMLImageElement, slab: HTMLImageElement, expandGlassCutout = true, frameDefinition: GlassFrameMaskDefinition = { shape: 'rectangle', separateOpenings: false }, openingMask?: HTMLImageElement) {
  if (mask.naturalWidth !== slab.naturalWidth || mask.naturalHeight !== slab.naturalHeight) return null
  if (openingMask && (openingMask.naturalWidth !== slab.naturalWidth || openingMask.naturalHeight !== slab.naturalHeight)) return null
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
  let openingPixels = maskPixels
  if (openingMask) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(openingMask, 0, 0)
    openingPixels = context.getImageData(0, 0, canvas.width, canvas.height)
  }
  const glassPixels = new ImageData(new Uint8ClampedArray(openingPixels.data), canvas.width, canvas.height)
  for (let index = 0; index < maskPixels.data.length; index += 4) {
    const maskValue = Math.round((maskPixels.data[index] + maskPixels.data[index + 1] + maskPixels.data[index + 2]) / 3)
    const openingValue = Math.round((openingPixels.data[index] + openingPixels.data[index + 1] + openingPixels.data[index + 2]) / 3)
    maskPixels.data[index] = 255
    maskPixels.data[index + 1] = 255
    maskPixels.data[index + 2] = 255
    maskPixels.data[index + 3] = maskValue
    glassPixels.data[index] = 255
    glassPixels.data[index + 1] = 255
    glassPixels.data[index + 2] = 255
    glassPixels.data[index + 3] = 255 - openingValue
  }

  // Treat every authored glass opening as inclusive. Growing the cutout by one
  // source pixel keeps anti-aliased edge pixels out of the finish layer, so
  // paint cannot appear beneath Internal, External, or SDL grid artwork.
  if (expandGlassCutout) {
    const sourceAlpha = new Uint8ClampedArray(canvas.width * canvas.height)
    for (let pixel = 0; pixel < sourceAlpha.length; pixel += 1) {
      sourceAlpha[pixel] = glassPixels.data[pixel * 4 + 3]
    }
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        let glassAlpha = 0
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const sampleY = y + offsetY
          if (sampleY < 0 || sampleY >= canvas.height) continue
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const sampleX = x + offsetX
            if (sampleX < 0 || sampleX >= canvas.width) continue
            glassAlpha = Math.max(glassAlpha, sourceAlpha[sampleY * canvas.width + sampleX])
          }
        }
        const index = (y * canvas.width + x) * 4
        glassPixels.data[index + 3] = glassAlpha
        maskPixels.data[index + 3] = 255 - glassAlpha
      }
    }
  }
  const glassBounds = pixelBounds(glassPixels, (_red, _green, _blue, alpha) => alpha > 0)
  const glassRegions = connectedAlphaBounds(glassPixels)
  // Frame color is an independent vector layer. Decorative glass pixels never
  // participate in its contour, and no raster morphology is used to create it.
  const frameRegions = glassBounds
    ? (frameDefinition.separateOpenings ? glassRegions : [glassBounds])
    : []
  const vectorMasks = frameRegions.length
    ? buildVectorGlassMasks(canvas.width, canvas.height, frameRegions, frameDefinition.shape)
    : undefined
  context.putImageData(maskPixels, 0, 0)
  const finishUrl = canvas.toDataURL('image/png')
  let glassUrl = vectorMasks?.openingUrl
  if (openingMask) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.putImageData(glassPixels, 0, 0)
    glassUrl = canvas.toDataURL('image/png')
  }
  return { finishUrl, glassUrl, glassFrameUrl: vectorMasks?.frameUrl, glassBounds, glassRegions: frameRegions, maskWidth: canvas.width, maskHeight: canvas.height }
}

function fitGlassOverlayToMask(overlay: HTMLImageElement, width: number, height: number, maskBounds: PixelBounds, offsetY = 0, maskRegions?: PixelBounds[], edgeOverlapPx = GLASS_EDGE_OVERLAP_PX, containWithinMask = false, stretchToMaskWidth = false, stretchToMaskHeight = false) {
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = overlay.naturalWidth
  sourceCanvas.height = overlay.naturalHeight
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) return null
  sourceContext.imageSmoothingEnabled = true
  sourceContext.imageSmoothingQuality = 'high'

  sourceContext.drawImage(overlay, 0, 0)
  const sourcePixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  // Crop transparent PNG padding before any scale is calculated. Dark caming
  // remains part of the artwork because alpha—not luminance—defines content.
  const sourceBounds = pixelBounds(sourcePixels, (_red, _green, _blue, alpha) => alpha > 2)
  if (!sourceBounds) return null

  const sourceRegions = connectedAlphaBounds(sourcePixels)
    .filter((region) => region.width > 4 && region.height > 4)
    .sort((a, b) => a.y - b.y)
  const targetRegions = maskRegions?.slice().sort((a, b) => a.y - b.y)

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height
  const outputContext = outputCanvas.getContext('2d')
  if (!outputContext) return null
  outputContext.imageSmoothingEnabled = true
  outputContext.imageSmoothingQuality = 'high'
  if (targetRegions?.length && sourceRegions.length === targetRegions.length && targetRegions.length > 1) {
    targetRegions.forEach((target, index) => {
      const source = sourceRegions[index]
      const bleedX = edgeOverlapPx
      const bleedY = edgeOverlapPx
      outputContext.drawImage(
        sourceCanvas,
        source.x,
        source.y,
        source.width,
        source.height,
        target.x - bleedX,
        target.y - bleedY + offsetY,
        target.width + bleedX * 2,
        target.height + bleedY * 2,
      )
    })
    return outputCanvas.toDataURL('image/png')
  }
  // When artwork exposes one source component per opening, the branch above
  // maps them individually. Otherwise fit the complete artwork once to the
  // combined opening bounds; repeating the full design inside every pane can
  // leave inconsistent scale and duplicated decorative details.
  for (const target of [maskBounds]) {
    if (stretchToMaskWidth) {
      const scaleX = target.width / sourceBounds.width
      const scaleY = stretchToMaskHeight
        ? target.height / sourceBounds.height
        : Math.min(target.height / sourceBounds.height, scaleX)
      const renderedWidth = sourceBounds.width * scaleX + edgeOverlapPx * 2
      const renderedHeight = sourceBounds.height * scaleY + edgeOverlapPx * 2
      const targetCenterX = target.x + target.width / 2
      const targetCenterY = target.y + target.height / 2
      outputContext.drawImage(sourceCanvas, sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height, targetCenterX - renderedWidth / 2, targetCenterY - renderedHeight / 2 + offsetY, renderedWidth, renderedHeight)
      continue
    }
    const scale = (containWithinMask
      ? Math.min(target.width / sourceBounds.width, target.height / sourceBounds.height)
      : Math.max(target.width / sourceBounds.width, target.height / sourceBounds.height))
    const renderedWidth = sourceBounds.width * scale + edgeOverlapPx * 2
    const renderedHeight = sourceBounds.height * scale + edgeOverlapPx * 2
    const targetCenterX = target.x + target.width / 2
    const targetCenterY = target.y + target.height / 2
    outputContext.drawImage(sourceCanvas, sourceBounds.x, sourceBounds.y, sourceBounds.width, sourceBounds.height, targetCenterX - renderedWidth / 2, targetCenterY - renderedHeight / 2 + offsetY, renderedWidth, renderedHeight)
  }
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

export function DoorPreview({ style, finish, glass, hardware, showHardware = true, compact = false, grain = null, product = null, tintColor = null, doorSwing = null, applyFinish = true, view, onViewChange, showViewToggle = true, sidelites = 'none', sideliteAssetSrc, sideliteMaskSrc, sideliteGlassSrc, sideliteClearGlassBase = false, sideliteGlassIsGrid = false, sideliteGridColor, sideliteGridIsPrairie = false, gridMatchesFinish = false, sideliteGridMatchesFinish = false, sharedComparisonCanvas = false, jambFinish = null, jambType = 'timber', glassFrameFinish = null, placementMode, doorConfigurationType = 'single', doubleDoorLockPrep = null, loadingLabel = 'Loading preview' }: DoorPreviewProps) {
  const previewSceneRef = useRef<HTMLDivElement>(null)
  const [previewAssetsLoading, setPreviewAssetsLoading] = useState(false)
  const previewCandidates = resolveDoorPreviewCandidates(style, finish.finishType, product, grain)
  const previewCandidatesKey = previewCandidates.join('|')
  const styleCodes = product?.styleCodes.length ? product.styleCodes : [style.code]
  // These source slabs already contain their full panel relief. Repeating them
  // as the compact detail pass makes the hero versions read as stacked slabs.
  const showDetailImage = !(compact && styleCodes.some((code) => code === 'E1' || code === 'SW'))
  const isGlassCapable = styleCodes.some((code) => glassDoorCodes.has(code))
  const maskCode = styleCodes.find((code) => glassDoorCodes.has(code))
  const isHrtDoor = maskCode === 'HRT'
  const maskAsset = maskCode ? (maskCode === 'HRT' && previewCandidates[0]?.includes('/Textured/') ? '/assets/masks/HRT-textured.png' : resolveGlassMaskAsset(maskCode)) : null
  const openingMaskAsset = maskCode === 'HRT' ? '/assets/masks/HRT-glass.png' : null
  const maskKey = maskCode ?? 'solid-slab'
  const [previewImage, setPreviewImage] = useState(previewCandidates[0] ?? '')
  const hasMappedPreview = Boolean(previewCandidates.length)
  const finishColor = tintColor ?? finish.color
  const [processedMask, setProcessedMask] = useState<{ source: string; finishUrl: string; glassUrl?: string; glassFrameUrl?: string; glassBounds?: PixelBounds | null; glassRegions?: PixelBounds[]; maskWidth?: number; maskHeight?: number } | null>(null)
  const [sideliteFinishMask, setSideliteFinishMask] = useState<{ slab: string; mask: string; url: string; glassUrl?: string; glassFrameUrl?: string; glassBounds?: PixelBounds | null; glassRegions?: PixelBounds[]; maskWidth?: number; maskHeight?: number } | null>(null)
  const finishMask = previewImage && processedMask?.source === previewImage ? processedMask.finishUrl : undefined
  const glassMask = previewImage && processedMask?.source === previewImage ? processedMask.glassUrl : undefined
  const glassFrameMask = previewImage && processedMask?.source === previewImage ? processedMask.glassFrameUrl : undefined
  const compatibleGlass = isGlassCapable ? glassOptions.filter((option) => styleCodes.some((code) => option.overlaysByDoorStyle[code])) : []
  const previewGlass = glass && compatibleGlass.some((option) => option.id === glass.id) ? glass : null
  const glassOverlay = previewGlass ? styleCodes.map((code) => previewGlass.overlaysByDoorStyle[code]).find(Boolean) : undefined
  const gridGlassUsesClearBase = previewGlass?.id === 'f-clear-grids' || previewGlass?.id === 'f48-clear-grids' || previewGlass?.id === 's-clear-grids'
  const clearNoGridGlass = glassOptions.find((option) => option.id === (maskCode === 'S' ? 's-clear-no-grids' : maskCode === 'F48' || maskCode === 'F482' ? 'f48-clear-no-grids' : 'f-clear-no-grids'))
  const clearNoGridOverlay = gridGlassUsesClearBase && maskCode
    ? clearNoGridGlass?.overlaysByDoorStyle[maskCode]
    : undefined
  const [fittedGlassOverlay, setFittedGlassOverlay] = useState<{ source: string; maskSource: string; url: string } | null>(null)
  const [fittedClearBase, setFittedClearBase] = useState<{ source: string; maskSource: string; url: string } | null>(null)
  const [fittedSideliteGlass, setFittedSideliteGlass] = useState<{ source: string; slab: string; mask: string; url: string } | null>(null)
  const [tintedPrairieGrid, setTintedPrairieGrid] = useState<{ source: string; color: string; url: string } | null>(null)
  const renderedGlassOverlay = glassOverlay && fittedGlassOverlay?.source === glassOverlay && fittedGlassOverlay.maskSource === previewImage ? fittedGlassOverlay.url : glassOverlay
  const fittedOrSourceSideliteGlass = sideliteGlassSrc && fittedSideliteGlass?.source === sideliteGlassSrc && fittedSideliteGlass.slab === sideliteAssetSrc && fittedSideliteGlass.mask === sideliteMaskSrc
    ? fittedSideliteGlass.url
    : sideliteGlassSrc
  const renderedSideliteGlass = fittedOrSourceSideliteGlass && sideliteGridIsPrairie && sideliteGridColor && tintedPrairieGrid?.source === fittedOrSourceSideliteGlass && tintedPrairieGrid.color === sideliteGridColor
    ? tintedPrairieGrid.url
    : fittedOrSourceSideliteGlass
  const [internalPreviewView, setInternalPreviewView] = useState<HardwareView>('Exterior')
  const previewView = view ?? internalPreviewView
  const setPreviewView = onViewChange ?? setInternalPreviewView
  const hardwarePlacement = doorSwing ? hardwarePlacementByDoorSwing[doorSwing.id] : null
  const hardwareSideExterior = hardwarePlacement?.hardwareSideExterior ?? 'right'
  const hardwareSideInterior = hardwarePlacement?.hardwareSideInterior ?? 'left'
  const hardwareSide = previewView === 'Exterior' ? hardwareSideExterior : hardwareSideInterior
  const hardwareSourceSide = sourceHardwareSideByView[previewView]
  const keepHardwareReadable = preservesReadableHardware(hardware)
  const hardwareImagePlacementClassForSide = (targetSide: HardwareSide) => targetSide !== hardwareSourceSide
    ? keepHardwareReadable
      ? `hardware-image-shift-${targetSide}`
      : 'hardware-image-mirrored'
    : ''
  const selectedHardwareImage = hardwarePreviewAssetUrl(hardware, previewView, doorSwing)
  const configuredSidelitePlacement = sidelitePlacement(sidelites)
  const semanticSideliteSide: HardwareSide | null = configuredSidelitePlacement === 'left' ? 'left' : configuredSidelitePlacement === 'right' ? 'right' : null
  const visualSideliteSide = previewView === 'Interior' && semanticSideliteSide ? (semanticSideliteSide === 'left' ? 'right' : 'left') : semanticSideliteSide
  const frameSidelites = compact || configuredSidelitePlacement === 'none' ? 'none' : configuredSidelitePlacement === 'both' ? 'both' : visualSideliteSide ?? 'none'
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
        if (!isUsableDoorSlabImage(slab)) {
          if (import.meta.env.DEV) console.warn('[door-preview:rejected-black-slab]', { candidate, style: style.code })
          tryNextCandidate()
          return
        }
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
          const applyMasks = (openingMask?: HTMLImageElement) => {
            if (cancelled) return
            const masks = buildPreviewMasks(suppliedMask, slab, true, glassFrameMaskForOpening(maskCode), openingMask)
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
          if (openingMaskAsset) {
            const openingMask = new Image()
            openingMask.onload = () => applyMasks(openingMask)
            openingMask.onerror = () => applyMasks()
            openingMask.src = openingMaskAsset
          } else applyMasks()
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
  }, [previewCandidatesKey, isGlassCapable, maskKey, maskAsset, maskCode, openingMaskAsset])

  useEffect(() => {
    let cancelled = false
    if (!sideliteAssetSrc || !sideliteMaskSrc) {
      setSideliteFinishMask(null)
      return () => { cancelled = true }
    }
    const slab = new Image()
    slab.onload = () => {
      const mask = new Image()
      mask.onload = () => {
        if (cancelled) return
        // Sidelite masks are authored against the exact 80 x 549 sidelite
        // slabs. Do not grow their glass cutout: even a one-source-pixel
        // expansion creates a visible finish gap along the tall FSL opening.
        // Main-door masks continue using the protective grid expansion above.
        const processed = buildPreviewMasks(mask, slab, false)
        if (!processed) {
          console.error('[door-preview:sidelite-mask-dimension-mismatch]', {
            slab: `${slab.naturalWidth}x${slab.naturalHeight}`,
            mask: `${mask.naturalWidth}x${mask.naturalHeight}`,
            sideliteAssetSrc,
            sideliteMaskSrc,
          })
        }
        setSideliteFinishMask(processed ? { slab: sideliteAssetSrc, mask: sideliteMaskSrc, url: processed.finishUrl, glassUrl: processed.glassUrl, glassFrameUrl: processed.glassFrameUrl, glassBounds: processed.glassBounds, glassRegions: processed.glassRegions, maskWidth: processed.maskWidth, maskHeight: processed.maskHeight } : null)
      }
      mask.onerror = () => { if (!cancelled) setSideliteFinishMask(null) }
      mask.src = sideliteMaskSrc
    }
    slab.onerror = () => { if (!cancelled) setSideliteFinishMask(null) }
    slab.src = sideliteAssetSrc
    return () => { cancelled = true }
  }, [sideliteAssetSrc, sideliteMaskSrc])

  useEffect(() => {
    let cancelled = false
    // Sparse grid-only artwork is authored in the sidelite source coordinate
    // system and must remain untouched. The supplied FSL Prairie files are
    // different: they include their own visible glass pane inside transparent
    // padding, so fit that pane to the canonical opening to avoid exposed
    // clear-glass strips above or below it.
    const usesAuthoredArtsAndCraftsGlass = sideliteGlassSrc?.includes('/F48SL%20SSL%20Arts%20Crafts%20White.png')
      || sideliteGlassSrc?.includes('/F48SL SSL Arts Crafts White.png')
    if (sideliteGlassIsGrid && !sideliteGridIsPrairie && !usesAuthoredArtsAndCraftsGlass) {
      setFittedSideliteGlass(null)
      return () => { cancelled = true }
    }
    if (!sideliteGlassSrc || !sideliteAssetSrc || !sideliteMaskSrc || sideliteFinishMask?.slab !== sideliteAssetSrc || sideliteFinishMask.mask !== sideliteMaskSrc || !sideliteFinishMask.glassBounds || !sideliteFinishMask.maskWidth || !sideliteFinishMask.maskHeight) {
      setFittedSideliteGlass(null)
      return () => { cancelled = true }
    }
    const overlay = new Image()
    overlay.onload = () => {
      if (cancelled) return
      const isFullLiteSidelite = /\/FSL\.png(?:$|[?#])/i.test(sideliteMaskSrc)
      const url = fitGlassOverlayToMask(
        overlay,
        sideliteFinishMask.maskWidth!,
        sideliteFinishMask.maskHeight!,
        sideliteFinishMask.glassBounds!,
        0,
        sideliteFinishMask.glassRegions,
        GLASS_EDGE_OVERLAP_PX,
        false,
        isFullLiteSidelite,
        isFullLiteSidelite,
      )
      setFittedSideliteGlass(url ? { source: sideliteGlassSrc, slab: sideliteAssetSrc, mask: sideliteMaskSrc, url } : null)
    }
    overlay.onerror = () => { if (!cancelled) setFittedSideliteGlass(null) }
    overlay.src = sideliteGlassSrc
    return () => { cancelled = true }
  }, [sideliteAssetSrc, sideliteGlassSrc, sideliteMaskSrc, sideliteFinishMask, sideliteGlassIsGrid, sideliteGridIsPrairie])

  useEffect(() => {
    let cancelled = false
    const source = fittedOrSourceSideliteGlass
    const usesAuthoredPrairieColor = /\/(?:FSL|F48SL|SSL)(?:%20| )Prairie(?:%20| )/i.test(sideliteGlassSrc ?? '')
    if (!sideliteGridIsPrairie || !sideliteGridColor || !source || usesAuthoredPrairieColor) {
      setTintedPrairieGrid(null)
      return () => { cancelled = true }
    }
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      const target = hexToRgb(sideliteGridColor)
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index]
        const green = pixels.data[index + 1]
        const blue = pixels.data[index + 2]
        const lightness = (red + green + blue) / 3
        const neutrality = Math.max(red, green, blue) - Math.min(red, green, blue)
        // The supplied Prairie artwork includes its clear-glass shading. Only
        // recolor the bright neutral muntin pixels and retain their antialiasing.
        if (pixels.data[index + 3] > 0 && lightness > 226 && neutrality < 18) {
          const edgeStrength = Math.min(1, Math.max(0, (lightness - 226) / 29))
          pixels.data[index] = Math.round(red + (target.r - red) * edgeStrength)
          pixels.data[index + 1] = Math.round(green + (target.g - green) * edgeStrength)
          pixels.data[index + 2] = Math.round(blue + (target.b - blue) * edgeStrength)
        }
      }
      context.putImageData(pixels, 0, 0)
      setTintedPrairieGrid({ source, color: sideliteGridColor, url: canvas.toDataURL('image/png') })
    }
    image.onerror = () => { if (!cancelled) setTintedPrairieGrid(null) }
    image.src = source
    return () => { cancelled = true }
  }, [fittedOrSourceSideliteGlass, sideliteGlassSrc, sideliteGridColor, sideliteGridIsPrairie])

  useEffect(() => {
    let cancelled = false
    if (!glassOverlay || !previewImage || processedMask?.source !== previewImage || !processedMask.glassBounds || !processedMask.maskWidth || !processedMask.maskHeight) {
      setFittedGlassOverlay(null)
      return () => { cancelled = true }
    }
    const overlay = new Image()
    overlay.onload = () => {
      if (cancelled) return
      const usesAdjustedArtsAndCrafts = Boolean(
        (maskCode === 'S' || maskCode === 'F48' || maskCode === 'F482')
        && glassOverlay.includes('/FART'),
      )
      const offsetY = usesAdjustedArtsAndCrafts
        ? processedMask.glassBounds!.height * (maskCode === 'S' ? 0.4 : 0.2)
        : previewGlass?.id === 'f48-clear-f648l'
          ? processedMask.glassBounds!.height * 0.08
          : 0
      const maskRegions = glassFrameMaskForOpening(maskCode).separateOpenings ? processedMask.glassRegions : undefined
      const fitPrairieInsideMask = Boolean(
        (maskCode === 'S' || maskCode === 'F48' || maskCode === 'F482')
        && glassOverlay.includes('/FPRA'),
      )
      const stretchPrairieToMaskWidth = Boolean(
        (maskCode === 'S' || maskCode === 'F48' || maskCode === 'F482')
        && glassOverlay.includes('/FPRA'),
      )
      const stretchPrairieToMaskHeight = maskCode === 'S' && glassOverlay.includes('/FPRA')
      const url = fitGlassOverlayToMask(overlay, processedMask.maskWidth!, processedMask.maskHeight!, processedMask.glassBounds!, offsetY, maskRegions, GLASS_EDGE_OVERLAP_PX, fitPrairieInsideMask, stretchPrairieToMaskWidth, stretchPrairieToMaskHeight)
      setFittedGlassOverlay(url ? { source: glassOverlay, maskSource: previewImage, url } : null)
    }
    overlay.onerror = () => { if (!cancelled) setFittedGlassOverlay(null) }
    overlay.src = glassOverlay
    return () => { cancelled = true }
  }, [glassOverlay, maskCode, previewGlass?.id, previewImage, processedMask])

  useEffect(() => {
    let cancelled = false
    if (maskCode !== 'F482' || !clearNoGridOverlay || !previewImage || processedMask?.source !== previewImage || !processedMask.glassBounds || !processedMask.maskWidth || !processedMask.maskHeight) {
      setFittedClearBase(null)
      return () => { cancelled = true }
    }
    const overlay = new Image()
    overlay.onload = () => {
      if (cancelled) return
      const url = fitGlassOverlayToMask(
        overlay,
        processedMask.maskWidth!,
        processedMask.maskHeight!,
        processedMask.glassBounds!,
        0,
        processedMask.glassRegions,
      )
      setFittedClearBase(url ? { source: clearNoGridOverlay, maskSource: previewImage, url } : null)
    }
    overlay.onerror = () => { if (!cancelled) setFittedClearBase(null) }
    overlay.src = clearNoGridOverlay
    return () => { cancelled = true }
  }, [clearNoGridOverlay, maskCode, previewImage, processedMask])

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
  const glassFrameMaskStyle = glassFrameFinish && glassFrameMask ? {
    WebkitMaskImage: `url("${glassFrameMask}")`,
    maskImage: `url("${glassFrameMask}")`,
  } as React.CSSProperties : undefined
  const glassFrameTintStyle = glassFrameFinish && glassFrameMaskStyle ? {
    ...glassFrameMaskStyle,
    backgroundColor: glassFrameFinish.color,
    ...(glassFrameFinish.finishType === 'stain' ? { backgroundImage: `url("${glassFrameFinish.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    opacity: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintColorOpacity : FINISH_RENDERING.stainColorOpacity,
  } as React.CSSProperties : undefined
  const glassFrameDetailStyle = glassFrameFinish && glassFrameMaskStyle ? {
    ...glassFrameMaskStyle,
    mixBlendMode: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintDetailBlendMode : FINISH_RENDERING.stainDetailBlendMode,
    opacity: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity,
    filter: `grayscale(1) contrast(${glassFrameFinish.finishType === 'paint' ? 1.12 : FINISH_RENDERING.stainContrast})`,
  } as React.CSSProperties : undefined
  const sideliteGlassFrameMaskStyle = glassFrameFinish && sideliteFinishMask?.glassFrameUrl ? {
    WebkitMaskImage: `url("${sideliteFinishMask.glassFrameUrl}")`,
    maskImage: `url("${sideliteFinishMask.glassFrameUrl}")`,
  } as React.CSSProperties : undefined
  const sideliteGlassOpeningStyle = sideliteFinishMask?.glassUrl ? {
    WebkitMaskImage: `url("${sideliteFinishMask.glassUrl}")`,
    maskImage: `url("${sideliteFinishMask.glassUrl}")`,
  } as React.CSSProperties : undefined
  const sideliteGlassFrameTintStyle = glassFrameFinish && sideliteGlassFrameMaskStyle ? {
    ...sideliteGlassFrameMaskStyle,
    backgroundColor: glassFrameFinish.color,
    ...(glassFrameFinish.finishType === 'stain' ? { backgroundImage: `url("${glassFrameFinish.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    opacity: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintColorOpacity : FINISH_RENDERING.stainColorOpacity,
  } as React.CSSProperties : undefined
  const sideliteGlassFrameDetailStyle = glassFrameFinish && sideliteGlassFrameMaskStyle ? {
    ...sideliteGlassFrameMaskStyle,
    mixBlendMode: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintDetailBlendMode : FINISH_RENDERING.stainDetailBlendMode,
    opacity: glassFrameFinish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity,
    filter: `grayscale(1) contrast(${glassFrameFinish.finishType === 'paint' ? 1.12 : FINISH_RENDERING.stainContrast})`,
  } as React.CSSProperties : undefined
  const detailLayerStyle = {
    WebkitMaskImage: finishMask ? `url("${finishMask}")` : undefined,
    maskImage: finishMask ? `url("${finishMask}")` : undefined,
    mixBlendMode: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailBlendMode : FINISH_RENDERING.stainDetailBlendMode,
    opacity: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity,
    ...(finish.finishType === 'stain' ? { filter: `grayscale(1) contrast(${FINISH_RENDERING.stainContrast})` } : {}),
  } as React.CSSProperties
  const activeSideliteFinishMask = sideliteFinishMask && sideliteFinishMask.slab === sideliteAssetSrc && sideliteFinishMask.mask === sideliteMaskSrc ? sideliteFinishMask.url : undefined
  const sideliteFinishStyle = applyFinish && activeSideliteFinishMask ? {
    backgroundColor: finishColor,
    WebkitMaskImage: `url("${activeSideliteFinishMask}")`,
    maskImage: `url("${activeSideliteFinishMask}")`,
    mixBlendMode: finish.finishType === 'paint' ? FINISH_RENDERING.paintColorBlendMode : FINISH_RENDERING.stainColorBlendMode,
    opacity: finish.finishType === 'paint' ? FINISH_RENDERING.paintColorOpacity : FINISH_RENDERING.stainColorOpacity,
    ...(finish.finishType === 'stain' ? { filter: `saturate(${FINISH_RENDERING.stainSaturation})` } : {}),
  } as React.CSSProperties : undefined
  const sideliteDetailStyle = applyFinish && activeSideliteFinishMask ? {
    WebkitMaskImage: `url("${activeSideliteFinishMask}")`,
    maskImage: `url("${activeSideliteFinishMask}")`,
    mixBlendMode: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailBlendMode : FINISH_RENDERING.stainDetailBlendMode,
    opacity: finish.finishType === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity,
    ...(finish.finishType === 'stain' ? { filter: `grayscale(1) contrast(${FINISH_RENDERING.stainContrast})` } : {}),
  } as React.CSSProperties : undefined
  // Clip every glass layer to the authored opening. This is especially
  // important for S before its SDL grid layer is added: the slab finish must
  // stop at the glass mask, while the grid remains a separate layer above it.
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
    const scene = previewSceneRef.current
    if (!scene) return

    let loadingTimer: number | undefined
    let observedImages = new Set<HTMLImageElement>()

    const clearLoadingTimer = () => {
      if (loadingTimer !== undefined) window.clearTimeout(loadingTimer)
      loadingTimer = undefined
    }

    const updateReadiness = () => {
      clearLoadingTimer()
      const images = Array.from(scene.querySelectorAll('img'))
      const pending = images.some((image) => !image.complete)

      if (!pending) {
        setPreviewAssetsLoading(false)
        return
      }

      // Cached assets normally complete synchronously. Delay the indicator so
      // it only appears for a genuinely slow layer (usually decorative glass),
      // rather than flashing for every option click.
      loadingTimer = window.setTimeout(() => setPreviewAssetsLoading(true), 120)
    }

    const syncImageListeners = () => {
      const currentImages = new Set(scene.querySelectorAll<HTMLImageElement>('img'))
      observedImages.forEach((image) => {
        if (currentImages.has(image)) return
        image.removeEventListener('load', updateReadiness)
        image.removeEventListener('error', updateReadiness)
      })
      currentImages.forEach((image) => {
        if (observedImages.has(image)) return
        image.addEventListener('load', updateReadiness)
        image.addEventListener('error', updateReadiness)
      })
      observedImages = currentImages
      updateReadiness()
    }

    syncImageListeners()
    const observer = new MutationObserver(syncImageListeners)
    observer.observe(scene, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })

    return () => {
      observer.disconnect()
      clearLoadingTimer()
      observedImages.forEach((image) => {
        image.removeEventListener('load', updateReadiness)
        image.removeEventListener('error', updateReadiness)
      })
    }
  }, [previewCandidatesKey, previewImage, renderedGlassOverlay, clearNoGridOverlay, hardwareImage, sideliteAssetSrc, sideliteMaskSrc, sideliteGlassSrc, frameSidelites, previewView, finishColor])

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
    <div ref={previewSceneRef} className={`preview-scene ${compact ? 'compact' : ''}`} aria-busy={previewAssetsLoading} aria-label={`Preview of ${finish.name} ${style.name} door${style.hasGlass && glass ? ` with ${glass.name} glass` : ''}`}>
      <div className="preview-glow" />
      <DoorFrame doorConfigurationType={doorConfigurationType} view={previewView} sharedComparisonCanvas={sharedComparisonCanvas} showFrame={!compact && placementMode !== 'opening-only'} openingOnly={placementMode === 'opening-only'} finishColor={jambFinish?.color ?? (applyFinish ? finishColor : '#d9d9d9')} finishType={jambFinish?.finishType ?? finish.finishType} finishSurface={jambType} sidelites={frameSidelites} leftSideliteSrc={frameSidelites === 'left' || frameSidelites === 'both' ? sideliteAssetSrc : undefined} rightSideliteSrc={frameSidelites === 'right' || frameSidelites === 'both' ? sideliteAssetSrc : undefined} sideliteMaskSrc={sideliteMaskSrc} sideliteGlassSrc={renderedSideliteGlass} sideliteClearGlassBase={sideliteClearGlassBase} sideliteGlassIsGrid={sideliteGlassIsGrid} sideliteGridIsPrairie={sideliteGridIsPrairie} sideliteGridMatchesFinish={sideliteGridMatchesFinish} sideliteGridFinishColor={applyFinish ? finishColor : '#d9d9d9'} sideliteFinishStyle={sideliteFinishStyle} sideliteDetailStyle={sideliteDetailStyle} sideliteGlassOpeningStyle={sideliteGlassOpeningStyle} sideliteGlassFrameMaskStyle={sideliteGlassFrameMaskStyle} sideliteGlassFrameTintStyle={sideliteGlassFrameTintStyle} sideliteGlassFrameDetailStyle={sideliteGlassFrameDetailStyle}>
        {Array.from({ length: doorConfigurationLeafCount(doorConfigurationType) }).map((_, leafIndex) => {
          // The Savannah operating leaf is a physical leaf and must not switch
          // when Interior reverses the visible hardware side. Anchor the leaf
          // to the exterior handedness, then mirror only the hardware artwork.
          const hardwarePlacementForLeaf = doorHardwarePlacements(doorConfigurationType, hardwareSide, hardwareSideExterior, doubleDoorLockPrep).find((placement) => placement.leafIndex === leafIndex)
          const leafHardwareSide = hardwarePlacementForLeaf?.side ?? hardwareSide
          const showHardwareOnLeaf = Boolean(hardwarePlacementForLeaf)
          const leafHardwareImagePlacementClass = hardwareImagePlacementClassForSide(leafHardwareSide)

          return <div key={leafIndex} className={`door door-leaf door-leaf-${leafIndex === 0 ? 'left' : 'right'} door-${style.panel} ${hasMappedPreview ? 'mapped-preview-door' : ''}${isHrtDoor ? ' door-preview-hrt' : ''}`} data-door-style-id={maskCode} style={{ '--door': finishColor, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          {previewImage && <img className={`door-style-image door-style-image-${finish.finishType}`} src={previewImage} alt="" decoding="async" onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {finishLayerStyle && <div className={`door-finish-layer door-finish-layer-${finish.finishType}`} style={finishLayerStyle} />}
          {previewImage && finishLayerStyle && showDetailImage && <img className="door-detail-image" src={previewImage} alt="" decoding="async" style={detailLayerStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          <div className="door-glass-assembly">
          {previewImage && glassFrameMaskStyle && <img className="door-glass-frame-material" src={previewImage} alt="" decoding="async" style={glassFrameMaskStyle} />}
          {glassFrameTintStyle && <div className="door-glass-frame-tint" style={glassFrameTintStyle} />}
          {previewImage && glassFrameDetailStyle && <img className="door-glass-frame-detail" src={previewImage} alt="" decoding="async" style={glassFrameDetailStyle} />}
          {clearNoGridOverlay && <img className="door-glass-overlay door-clear-glass-base" src={fittedClearBase?.source === clearNoGridOverlay && fittedClearBase.maskSource === previewImage ? fittedClearBase.url : clearNoGridOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {isHrtDoor
            ? renderedGlassOverlay && <>
              <div className="door-glass-overlay door-hrt-decorative-glass" style={glassOverlayStyle} />
              {gridMatchesFinish
                ? <div className="door-glass-overlay door-grid-finish-overlay door-hrt-caming-layer" style={{ backgroundColor: applyFinish ? finishColor : '#d9d9d9', WebkitMaskImage: `url("${renderedGlassOverlay}")`, maskImage: `url("${renderedGlassOverlay}")` }} />
                : <img className="door-glass-overlay door-hrt-caming-layer" src={renderedGlassOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
            </>
            : renderedGlassOverlay && (gridMatchesFinish
              ? <div className="door-glass-overlay door-grid-finish-overlay" style={{ backgroundColor: applyFinish ? finishColor : '#d9d9d9', WebkitMaskImage: `url("${renderedGlassOverlay}")`, maskImage: `url("${renderedGlassOverlay}")` }} />
              : <img className="door-glass-overlay" src={renderedGlassOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />)}
          </div>
          {showHardware && hardwareImage && showHardwareOnLeaf && <div className={`hardware hardware-${previewHardware.type} hardware-side-${leafHardwareSide}${hardwarePlacementForLeaf?.mode === 'knob-only' ? ' hardware-crop-knob-only' : ''}${isHrtDoor ? ' hardware-hrt' : ''}`} data-hardware-side={leafHardwareSide} data-hardware-mode={hardwarePlacementForLeaf?.mode} data-hardware-side-exterior={hardwareSideExterior} data-hardware-side-interior={hardwareSideInterior} style={{ '--metal': previewHardware.color } as React.CSSProperties}>
            <img className={leafHardwareImagePlacementClass} src={hardwareImage} alt="" decoding="async" style={hardwarePlacementForLeaf?.mode === 'knob-only' && previewHardware.crop?.knobOnly ? { clipPath: `inset(${previewHardware.crop.knobOnly.top}% ${previewHardware.crop.knobOnly.right}% ${previewHardware.crop.knobOnly.bottom}% ${previewHardware.crop.knobOnly.left}%)` } : undefined} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => {
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
        })}
      </DoorFrame>
      {previewAssetsLoading && <div className="preview-asset-loading" role="status" aria-live="polite">
        <span className="preview-asset-spinner" aria-hidden="true" />
        <span className="preview-asset-loading-label">{loadingLabel}</span>
      </div>}
      {!compact && showViewToggle && previewHardware.manufacturer && previewHardware.asset && <div className="preview-view-toggle" role="group" aria-label="Preview view">
        {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={previewView === view ? 'active' : ''} aria-pressed={previewView === view} key={view} onClick={() => setPreviewView(view)}>{view}</button>)}
      </div>}
    </div>
  )
}
