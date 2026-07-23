import { useEffect, useMemo, useState } from 'react'
import type { DoorStyle, DoorSwing, Finish, GlassOption, HardwareView, PreviewHardware, ResolvedDoorProduct, SideliteConfiguration } from '../types'
import { hardwareOptions, hardwarePreviewAssetUrl } from '../data/hardware'
import { glassOptions } from '../data/glassOptions'
import { resolveDoorPreviewCandidates } from '../data/doorPreviewAssets'
import { glassDoorCodes } from '../data/productCatalog'
import { resolveGlassMaskAsset } from '../data/glassMaskAssets'
import { DoorFrame } from './preview/DoorFrame'

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
  sidelites?: SideliteConfiguration
  sideliteAssetSrc?: string
  sideliteMaskSrc?: string
  sideliteGlassSrc?: string
  sideliteClearGlassBase?: boolean
  gridMatchesFinish?: boolean
  sideliteGridMatchesFinish?: boolean
  sharedComparisonCanvas?: boolean
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
  LHO: { hardwareSideExterior: 'right', hardwareSideInterior: 'left' },
  RHI: { hardwareSideExterior: 'left', hardwareSideInterior: 'right' },
  RHO: { hardwareSideExterior: 'left', hardwareSideInterior: 'right' },
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
  const glassRegions = connectedAlphaBounds(glassPixels)
  return { finishUrl, glassUrl: canvas.toDataURL('image/png'), glassBounds, glassRegions, maskWidth: canvas.width, maskHeight: canvas.height }
}

function fitGlassOverlayToMask(overlay: HTMLImageElement, width: number, height: number, maskBounds: PixelBounds, offsetY = 0, maskRegions?: PixelBounds[], overscan = 1, containWithinMask = false, stretchToMaskWidth = false, stretchToMaskHeight = false) {
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

  const sourceRegions = connectedAlphaBounds(sourcePixels)
    .filter((region) => region.width > 4 && region.height > 4)
    .sort((a, b) => a.y - b.y)
  const targetRegions = maskRegions?.slice().sort((a, b) => a.y - b.y)

  const glassCenterX = glassBounds.x + glassBounds.width / 2
  const glassCenterY = glassBounds.y + glassBounds.height / 2
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
      outputContext.drawImage(
        sourceCanvas,
        source.x,
        source.y,
        source.width,
        source.height,
        target.x,
        target.y + offsetY,
        target.width,
        target.height,
      )
    })
    return outputCanvas.toDataURL('image/png')
  }
  for (const target of maskRegions?.length ? maskRegions : [maskBounds]) {
    if (stretchToMaskWidth) {
      const scaleX = target.width / glassBounds.width
      const scaleY = stretchToMaskHeight
        ? target.height / glassBounds.height
        : Math.min(target.height / glassBounds.height, scaleX)
      const targetCenterX = target.x + target.width / 2
      const targetCenterY = target.y + target.height / 2
      outputContext.drawImage(sourceCanvas, targetCenterX - glassCenterX * scaleX, targetCenterY - glassCenterY * scaleY + offsetY, width * scaleX, height * scaleY)
      continue
    }
    const scale = (containWithinMask
      ? Math.min(target.width / glassBounds.width, target.height / glassBounds.height)
      : Math.max(target.width / glassBounds.width, target.height / glassBounds.height)) * overscan
    const targetCenterX = target.x + target.width / 2
    const targetCenterY = target.y + target.height / 2
    outputContext.drawImage(sourceCanvas, targetCenterX - glassCenterX * scale, targetCenterY - glassCenterY * scale + offsetY, width * scale, height * scale)
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

export function DoorPreview({ style, finish, glass, hardware, compact = false, grain = null, product = null, tintColor = null, doorSwing = null, applyFinish = true, view, onViewChange, showViewToggle = true, sidelites = 'none', sideliteAssetSrc, sideliteMaskSrc, sideliteGlassSrc, sideliteClearGlassBase = false, gridMatchesFinish = false, sideliteGridMatchesFinish = false, sharedComparisonCanvas = false }: Props) {
  const previewCandidates = resolveDoorPreviewCandidates(style, finish.finishType, product, grain)
  const previewCandidatesKey = previewCandidates.join('|')
  const styleCodes = product?.styleCodes.length ? product.styleCodes : [style.code]
  // These source slabs already contain their full panel relief. Repeating them
  // as the compact detail pass makes the hero versions read as stacked slabs.
  const showDetailImage = !(compact && styleCodes.some((code) => code === 'E1' || code === 'SW'))
  const isGlassCapable = styleCodes.some((code) => glassDoorCodes.has(code))
  const maskCode = styleCodes.find((code) => glassDoorCodes.has(code))
  const maskAsset = maskCode ? resolveGlassMaskAsset(maskCode) : null
  const maskKey = maskCode ?? 'solid-slab'
  const useNativeGlassOverlay = Boolean(maskCode && maskCode !== 'CR14' && maskCode !== 'F4' && maskCode !== 'F482' && maskCode !== 'FO' && maskCode !== 'HRT' && maskCode !== 'N' && maskCode !== 'S2' && maskCode !== 'S3' && maskCode !== 'S4' && maskCode !== 'SAT' && maskCode !== 'SO2')
  const [previewImage, setPreviewImage] = useState(previewCandidates[0] ?? '')
  const hasMappedPreview = Boolean(previewCandidates.length)
  const finishColor = tintColor ?? finish.color
  const [processedMask, setProcessedMask] = useState<{ source: string; finishUrl: string; glassUrl?: string; glassBounds?: PixelBounds | null; glassRegions?: PixelBounds[]; maskWidth?: number; maskHeight?: number } | null>(null)
  const [sideliteFinishMask, setSideliteFinishMask] = useState<{ slab: string; mask: string; url: string } | null>(null)
  const finishMask = previewImage && processedMask?.source === previewImage ? processedMask.finishUrl : undefined
  const glassMask = previewImage && processedMask?.source === previewImage ? processedMask.glassUrl : undefined
  const compatibleGlass = isGlassCapable ? glassOptions.filter((option) => styleCodes.some((code) => option.overlaysByDoorStyle[code])) : []
  const previewGlass = glass && compatibleGlass.some((option) => option.id === glass.id) ? glass : null
  const glassOverlay = previewGlass ? styleCodes.map((code) => previewGlass.overlaysByDoorStyle[code]).find(Boolean) : undefined
  const gridGlassUsesClearBase = previewGlass?.id === 'f-clear-grids' || previewGlass?.id === 'f48-clear-grids' || previewGlass?.id === 's-clear-grids'
  const clearNoGridGlass = glassOptions.find((option) => option.id === (maskCode === 'S' ? 's-clear-no-grids' : maskCode === 'F48' || maskCode === 'F482' ? 'f48-clear-no-grids' : 'f-clear-no-grids'))
  const clearNoGridOverlay = gridGlassUsesClearBase && maskCode
    ? clearNoGridGlass?.overlaysByDoorStyle[maskCode]
    : undefined
  const fitSharedFallbackOverlay = Boolean(
    maskCode
      && glassOverlay
      && (maskCode === '3LT'
        || maskCode === '3STEP'
        || maskCode === '4LT'
        || (['F48', 'F482', 'F848'].includes(maskCode) && !glassOverlay.includes(`/Glass/${maskCode}/`))
        || (maskCode === 'QA' && previewGlass?.id === 'qa-clear-qacl')
        || (maskCode === 'S' && !glassOverlay.includes('/Glass/S/'))
        || (maskCode === 'S836' && !glassOverlay.includes('/Glass/S836/'))
        || (maskCode === 'SO' && !glassOverlay.includes('/Glass/SO/'))
        || (maskCode === 'SW' && !glassOverlay.includes('/Glass/SW/'))),
  )
  const [fittedGlassOverlay, setFittedGlassOverlay] = useState<{ source: string; maskSource: string; url: string } | null>(null)
  const [fittedClearBase, setFittedClearBase] = useState<{ source: string; maskSource: string; url: string } | null>(null)
  const renderedGlassOverlay = glassOverlay && fittedGlassOverlay?.source === glassOverlay && fittedGlassOverlay.maskSource === previewImage ? fittedGlassOverlay.url : glassOverlay
  const [internalPreviewView, setInternalPreviewView] = useState<HardwareView>('Exterior')
  const previewView = view ?? internalPreviewView
  const setPreviewView = onViewChange ?? setInternalPreviewView
  const hardwarePlacement = doorSwing ? hardwarePlacementByDoorSwing[doorSwing.id] : null
  const hardwareSideExterior = hardwarePlacement?.hardwareSideExterior ?? 'right'
  const hardwareSideInterior = hardwarePlacement?.hardwareSideInterior ?? 'left'
  const hardwareSide = previewView === 'Exterior' ? hardwareSideExterior : hardwareSideInterior
  const hardwareSourceSide = sourceHardwareSideByView[previewView]
  const hardwareMovesSides = hardwareSide !== hardwareSourceSide
  const keepHardwareReadable = preservesReadableHardware(hardware)
  const hardwareImagePlacementClass = hardwareMovesSides
    ? keepHardwareReadable
      ? `hardware-image-shift-${hardwareSide}`
      : 'hardware-image-mirrored'
    : ''
  const selectedHardwareImage = hardwarePreviewAssetUrl(hardware, previewView, doorSwing)
  const hingeSideExterior: HardwareSide = doorSwing?.id.startsWith('R') ? 'right' : 'left'
  const semanticSideliteSide: HardwareSide | null = sidelites === 'hinge-side' ? hingeSideExterior : sidelites === 'lock-side' ? (hingeSideExterior === 'left' ? 'right' : 'left') : null
  const visualSideliteSide = previewView === 'Interior' && semanticSideliteSide ? (semanticSideliteSide === 'left' ? 'right' : 'left') : semanticSideliteSide
  const frameSidelites = compact || sidelites === 'none' ? 'none' : sidelites === 'both-sides' ? 'both' : visualSideliteSide ?? 'none'
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
    if (!sideliteAssetSrc || !sideliteMaskSrc) {
      setSideliteFinishMask(null)
      return () => { cancelled = true }
    }
    const slab = new Image()
    slab.onload = () => {
      const mask = new Image()
      mask.onload = () => {
        if (cancelled) return
        const processed = buildPreviewMasks(mask, slab)
        if (!processed) {
          console.error('[door-preview:sidelite-mask-dimension-mismatch]', {
            slab: `${slab.naturalWidth}x${slab.naturalHeight}`,
            mask: `${mask.naturalWidth}x${mask.naturalHeight}`,
            sideliteAssetSrc,
            sideliteMaskSrc,
          })
        }
        setSideliteFinishMask(processed ? { slab: sideliteAssetSrc, mask: sideliteMaskSrc, url: processed.finishUrl } : null)
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
    if ((useNativeGlassOverlay && !fitSharedFallbackOverlay) || !glassOverlay || !previewImage || processedMask?.source !== previewImage || !processedMask.glassBounds || !processedMask.maskWidth || !processedMask.maskHeight) {
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
      const maskRegions = (maskCode === '3LT'
        || maskCode === '3STEP'
        || maskCode === '4LT'
        || (maskCode === 'F848' && previewGlass?.id === 'streamed')
        || (maskCode === 'S836' && !glassOverlay.includes('/Glass/S836/')))
        ? processedMask.glassRegions
        : undefined
      const overscan = maskCode === 'F848' && previewGlass?.id === 'streamed'
        ? 1.2
        : maskCode === 'S836' && previewGlass?.id === 'streamed'
          ? 1.2
        : maskCode === 'N' && previewGlass?.id === 'streamed'
          ? 1.2
        : maskCode === 'HRT' && previewGlass?.id === 'hrt-clear-s11rt'
          ? 1.12
          : 1
      const fitPrairieInsideMask = Boolean(
        (maskCode === 'S' || maskCode === 'F48' || maskCode === 'F482')
        && glassOverlay.includes('/FPRA'),
      )
      const stretchPrairieToMaskWidth = Boolean(
        (maskCode === 'S' || maskCode === 'F48' || maskCode === 'F482')
        && glassOverlay.includes('/FPRA'),
      )
      const stretchPrairieToMaskHeight = maskCode === 'S' && glassOverlay.includes('/FPRA')
      const url = fitGlassOverlayToMask(overlay, processedMask.maskWidth!, processedMask.maskHeight!, processedMask.glassBounds!, offsetY, maskRegions, overscan, fitPrairieInsideMask, stretchPrairieToMaskWidth, stretchPrairieToMaskHeight)
      setFittedGlassOverlay(url ? { source: glassOverlay, maskSource: previewImage, url } : null)
    }
    overlay.onerror = () => { if (!cancelled) setFittedGlassOverlay(null) }
    overlay.src = glassOverlay
    return () => { cancelled = true }
  }, [fitSharedFallbackOverlay, glassOverlay, previewGlass?.id, previewImage, processedMask, useNativeGlassOverlay])

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
      <DoorFrame view={previewView} sharedComparisonCanvas={sharedComparisonCanvas} showFrame={!compact} finishColor={applyFinish ? finishColor : '#d9d9d9'} finishType={finish.finishType} sidelites={frameSidelites} leftSideliteSrc={frameSidelites === 'left' || frameSidelites === 'both' ? sideliteAssetSrc : undefined} rightSideliteSrc={frameSidelites === 'right' || frameSidelites === 'both' ? sideliteAssetSrc : undefined} sideliteMaskSrc={sideliteMaskSrc} sideliteGlassSrc={sideliteGlassSrc} sideliteClearGlassBase={sideliteClearGlassBase} sideliteGridMatchesFinish={sideliteGridMatchesFinish} sideliteFinishStyle={sideliteFinishStyle} sideliteDetailStyle={sideliteDetailStyle}>
        <div className={`door door-${style.panel} ${hasMappedPreview ? 'mapped-preview-door' : ''}`} style={{ '--door': finishColor, '--door-dark': finish.accent } as React.CSSProperties}>
          {style.hasGlass && <div className="glass glass-clear" />}
          <div className="panels">
            {Array.from({ length: style.panel === 'classic' ? 6 : style.panel === 'craftsman' ? 3 : 4 }).map((_, index) => <span key={index} />)}
          </div>
          {previewImage && <img className={`door-style-image door-style-image-${finish.finishType}`} src={previewImage} alt="" decoding="async" onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {finishLayerStyle && <div className={`door-finish-layer door-finish-layer-${finish.finishType}`} style={finishLayerStyle} />}
          {previewImage && finishLayerStyle && showDetailImage && <img className="door-detail-image" src={previewImage} alt="" decoding="async" style={detailLayerStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {clearNoGridOverlay && <img className="door-glass-overlay door-clear-glass-base" src={fittedClearBase?.source === clearNoGridOverlay && fittedClearBase.maskSource === previewImage ? fittedClearBase.url : clearNoGridOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          {renderedGlassOverlay && (gridMatchesFinish
            ? <div className="door-glass-overlay door-grid-finish-overlay" style={{ backgroundColor: applyFinish ? finishColor : '#d9d9d9', WebkitMaskImage: `url("${renderedGlassOverlay}")`, maskImage: `url("${renderedGlassOverlay}")` }} />
            : <img className="door-glass-overlay" src={renderedGlassOverlay} alt="" decoding="async" style={glassOverlayStyle} onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => { event.currentTarget.style.display = 'none' }} />)}
          {hardwareImage && <div className={`hardware hardware-${previewHardware.type} hardware-side-${hardwareSide}`} data-hardware-side={hardwareSide} data-hardware-side-exterior={hardwareSideExterior} data-hardware-side-interior={hardwareSideInterior} style={{ '--metal': previewHardware.color } as React.CSSProperties}>
            <img className={hardwareImagePlacementClass} src={hardwareImage} alt="" decoding="async" onLoad={(event) => { event.currentTarget.style.display = '' }} onError={(event) => {
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
      </DoorFrame>
      {!compact && showViewToggle && previewHardware.manufacturer && previewHardware.asset && <div className="preview-view-toggle" role="group" aria-label="Preview view">
        {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={previewView === view ? 'active' : ''} aria-pressed={previewView === view} key={view} onClick={() => setPreviewView(view)}>{view}</button>)}
      </div>}
    </div>
  )
}
