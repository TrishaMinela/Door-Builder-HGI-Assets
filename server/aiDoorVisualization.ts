import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { doorStyles, finishes } from '../src/data/options'
import { productCatalog } from '../src/data/productCatalog'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets'
import { resolveHardwareOption, hardwarePreviewAssetUrl, hardwareAssetUrl } from '../src/data/hardware'
import { glassOptions } from '../src/data/glassOptions'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset } from '../src/data/sideliteAssets'
import { fslGlassOptions } from '../src/data/fslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { s2slGlassOptions } from '../src/data/s2slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { AI_CORNER_ORDER, AI_MASK_PADDING_PX, AI_MAX_PHOTO_BYTES, AI_MAX_PHOTO_EDGE, aiPixelCorners, aiWorkingSize, type AiCorners } from '../src/features/home-visualizer/aiImagePreparation'
import type { DoorConfiguration, SideliteConfiguration } from '../src/types'

export class AiInputError extends Error {}
export const AI_MODEL = 'gpt-image-2.5-sunburst'
export const AI_QUALITY = 'high' // Product fidelity, but not Sunburst's xhigh/max cost tiers.
export const AI_MAX_REQUEST_BYTES = 3 * 1024 * 1024
export const AI_MAX_REFERENCE_EDGE = 1024
type ObjectValue = Record<string, unknown>
export const objectValue = (value: unknown): ObjectValue | null => value && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : null

export function validateCorners(value: unknown): AiCorners {
  const source = objectValue(value)
  if (!source || Object.keys(source).length !== 4) throw new AiInputError('Select all four doorway corners before generating.')
  const points = AI_CORNER_ORDER.map(name => {
    const point = objectValue(source[name])
    if (!point || Object.keys(point).length !== 2 || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) throw new AiInputError('Doorway corners must be inside the photo.')
    return { x: point.x, y: point.y }
  })
  const turns = points.map((a, i) => { const b = points[(i + 1) % 4], c = points[(i + 2) % 4]; return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) })
  if (!turns.every(turn => turn > .0001)) throw new AiInputError('Please select a valid, non-crossing doorway outline.')
  return Object.fromEntries(AI_CORNER_ORDER.map((name, i) => [name, points[i]])) as AiCorners
}

export async function prepareHouseAndMask(value: unknown, corners: AiCorners) {
  if (typeof value !== 'string') throw new AiInputError('Your house photo is missing.')
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match) throw new AiInputError('Please use a JPG, PNG, or WebP working photo.')
  if (match[2].length > Math.ceil(AI_MAX_PHOTO_BYTES * 4 / 3) + 4) throw new AiInputError('Your AI photo is too large. Please choose a smaller photo.')
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > AI_MAX_PHOTO_BYTES) throw new AiInputError('Your AI photo is too large. Please choose a smaller photo.')
  try {
    const metadata = await sharp(bytes, { limitInputPixels: 24_000_000 }).metadata()
    if (metadata.format !== match[1] || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error('Invalid image')
    const size = aiWorkingSize(metadata.width, metadata.height)
    const photo = await sharp(bytes, { limitInputPixels: 24_000_000 }).resize(size.width, size.height).png().toBuffer()
    const padding = AI_MASK_PADDING_PX * Math.max(size.width, size.height) / AI_MAX_PHOTO_EDGE
    const polygon = aiPixelCorners(corners, size.width, size.height).map(point => `${point.x},${point.y}`).join(' ')
    const cutout = Buffer.from(`<svg width="${size.width}" height="${size.height}"><polygon points="${polygon}" fill="black" stroke="black" stroke-width="${padding * 2}" stroke-linejoin="round"/></svg>`)
    const mask = await sharp({ create: { ...size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite([{ input: cutout, blend: 'dest-out' }]).png().toBuffer()
    return { photo, mask, ...size }
  } catch {
    throw new AiInputError('Your house photo could not be decoded. Please choose another photo.')
  }
}

const sideliteCatalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }
const gridKeys = ['glassCoating', 'gridLocation', 'gridStyle', 'gridPattern', 'gridColor', 'gridWidth']
function gridValues(value: unknown) {
  const source = objectValue(value)
  if (!source) return null
  return Object.fromEntries(gridKeys.filter(key => source[key] !== undefined).map(key => {
    if (typeof source[key] !== 'string' || (source[key] as string).length > 100) throw new AiInputError('Grid configuration is invalid.')
    return [key, source[key]]
  }))
}

export function resolveAiProduct(value: unknown, jambFinishId?: unknown, glassFrameFinishId?: unknown) {
  const source = objectValue(value)
  if (!source || JSON.stringify(source).length > 64 * 1024) throw new AiInputError('Door configuration is missing or invalid.')
  const style = doorStyles.find(item => item.id === objectValue(source.style)?.id)
  const finish = finishes.find(item => item.id === objectValue(source.finish)?.id)
  const selectedHardware = objectValue(source.hardware)
  const hardware = selectedHardware && resolveHardwareOption(selectedHardware.manufacturer as DoorConfiguration['hardware']['manufacturer'], String(selectedHardware.style), String(selectedHardware.finish), selectedHardware.handing as DoorConfiguration['hardware']['handing'])
  const product = objectValue(source.product)
  const requestedLines = Array.isArray(product?.matchingVariants) ? product.matchingVariants.map(item => objectValue(item)?.lineId) : []
  const variants = style?.variants.filter(item => requestedLines.includes(item.lineId)) ?? []
  const type = source.doorConfigurationType ?? 'single'
  const swing = objectValue(source.doorSwing)?.id
  const sidelites = source.sidelites ?? 'none'
  if (!style || !finish || !hardware || variants.length !== requestedLines.length || !variants.length || !['single', 'french', 'savannah'].includes(String(type)) || !['LHI', 'LHO', 'RHI', 'RHO'].includes(String(swing)) || !['none', 'hinge-side', 'lock-side', 'both-sides'].includes(String(sidelites))) throw new AiInputError('Please complete a valid door configuration.')
  if (source.grain !== null && source.grain !== undefined && (typeof source.grain !== 'string' || !variants.some(item => item.grains.includes(source.grain as string)))) throw new AiInputError('Door grain is invalid.')
  const selectedProduct = { doorTypeLabel: 'Door Line' as const, doorType: variants.map(item => item.lineName).join(' / '), doorTypes: variants.map(item => item.lineId), matchingVariants: variants, styleCodes: variants.map(item => item.code) }
  const doorPaths = resolveDoorPreviewCandidates(style, finish.finishType, selectedProduct, source.grain as string | null)
  const selectedGlass = objectValue(source.mainDoorGlass ?? source.glass)
  const glass = selectedGlass ? glassOptions.find(item => item.id === selectedGlass.id) : null
  if (selectedGlass && !glass) throw new AiInputError('Selected glass is invalid.')
  const glassPath = glass && (glass.overlaysByDoorStyle[style.code] ?? variants.map(item => glass.overlaysByDoorStyle[item.code]).find(Boolean) ?? glass.thumbnailPath)
  const line = productCatalog.find(item => item.id === variants[0].lineId)
  const family = sideliteAssetFamilyForSlab({ doorLineId: variants[0].lineId.startsWith('signature-') ? 'signature-series' : line?.id, grain: source.grain as string | null, doorStyleCode: style.code })
  const sideliteStyle = source.sideliteSlab as keyof typeof sideliteCatalogs
  const sidelitePath = sidelites !== 'none' ? sideliteSlabAsset(family, sideliteStyle) : undefined
  if (sidelites !== 'none' && !sidelitePath) throw new AiInputError('Selected sidelite style is invalid.')
  const sideliteGlassSource = objectValue(source.sideliteGlass)
  const sideliteGlass = sidelitePath && sideliteGlassSource ? sideliteCatalogs[sideliteStyle]?.find(item => item.name === sideliteGlassSource.glass) : null
  if (sidelitePath && sideliteGlassSource && !sideliteGlass) throw new AiInputError('Selected sidelite glass is invalid.')
  const jambFinish = finishes.find(item => item.id === jambFinishId) ?? finishes.find(item => item.name === source.jambFinishColor && item.finishType === source.jambFinishType) ?? (source.jambFinishOverridden ? null : finish)
  if (jambFinishId !== undefined && !finishes.some(item => item.id === jambFinishId)) throw new AiInputError('Selected jamb finish is invalid.')
  if (!jambFinish || !['timber', 'clad'].includes(String(source.jambType ?? 'timber'))) throw new AiInputError('Selected jamb finish is invalid.')
  const glassFrameFinish = finishes.find(item => item.id === glassFrameFinishId) ?? (source.glassFrameColorMode === 'match-door' ? finish : null)
  if (glassFrameFinishId !== undefined && !finishes.some(item => item.id === glassFrameFinishId)) throw new AiInputError('Selected glass frame finish is invalid.')
  const snapshot = {
    schemaVersion: 1, configurationType: type, doorLine: line?.name, product: selectedProduct.doorType,
    doorStyle: style.name, doorCode: style.code, grain: source.grain ?? null,
    finish: { name: finish.name, type: finish.finishType, hex: finish.color },
    glass: glass?.name ?? 'No glass', grids: gridValues(source.grid),
    hardware: { manufacturer: hardware.manufacturer, style: hardware.style, finish: hardware.finish, handing: hardware.handing },
    doorSwing: swing, jamb: { type: source.jambType ?? 'timber', finish: jambFinish.name, finishType: source.jambFinishType ?? jambFinish.finishType, hex: jambFinish.color },
    glassFrame: glassFrameFinish ? { finish: glassFrameFinish.name, hex: glassFrameFinish.color } : 'Original glass frame finish',
    sidelites: { placement: sidelites as SideliteConfiguration, count: sidelites === 'both-sides' ? 2 : sidelites === 'none' ? 0 : 1, style: sideliteStyle ?? null, glass: sideliteGlass?.name ?? null, grids: gridValues(sideliteGlassSource) },
    doubleDoorLockPrep: ['DDLLBO', 'DDLLAC', 'DDLLKP'].includes(String(source.doubleDoorLockPrep)) ? source.doubleDoorLockPrep : null,
    hingeOption: objectValue(source.doorConfigurationProductOption)?.code === 'HINGEOJ' ? 'HINGEOJ - Hinge off outer jamb' : null,
  }
  return { snapshot, references: [
    { label: 'original base door design', paths: doorPaths },
    ...(glassPath ? [{ label: 'selected glass design', paths: [glassPath] }] : []),
    { label: 'selected exterior hardware', paths: [hardwarePreviewAssetUrl(hardware), hardwareAssetUrl(hardware.asset)].filter(Boolean) },
    ...(sidelitePath ? [{ label: 'original sidelite slab', paths: [sidelitePath] }] : []),
    ...(sideliteGlass?.asset ? [{ label: 'selected sidelite glass', paths: [sideliteGlass.asset] }] : []),
  ] }
}

export async function loadAiReference(paths: string[]) {
  for (const path of paths) {
    // Paths originate only from imported application catalogs, never the browser.
    const localPath = path.split('?')[0]
    if (!localPath.startsWith('/assets/') || localPath.includes('..') || localPath.includes('\\')) continue
    try {
      const bytes = await readFile(resolve(process.cwd(), 'public', localPath.slice(1)))
      return await sharp(bytes, { limitInputPixels: 24_000_000 }).resize({ width: AI_MAX_REFERENCE_EDGE, height: AI_MAX_REFERENCE_EDGE, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    } catch { /* Try the next trusted original source candidate. */ }
  }
  throw new Error('asset-resolution')
}

export function aiPrompt(snapshot: ReturnType<typeof resolveAiProduct>['snapshot'], corners: AiCorners, labels: string[]) {
  return [
    'PRIORITY 1 — PRESERVE THE HOUSE. The FIRST image is the original customer house and the base scene. The transparent PNG mask indicates the only editable entrance region, including a small blending allowance. Preserve architecture, siding, windows, roof, porch, masonry, landscaping, steps and surroundings. Do not redesign unrelated pixels.',
    `PRIORITY 2 — PRODUCT FIDELITY. Subsequent original source references are in this order: ${labels.join(', ')}. Install the exact referenced panel count and geometry, glass shape/design, hardware style and physical placement. Preserve the configured single/French/Savannah arrangement, sidelite count and placement, and grids. These are design references, NOT a finished composite. Do not simply paste them into the house.`,
    'PRIORITY 3 — SELECTED FINISHES. Ignore original reference door/sidelite colors. Refinish the slab and sidelites with the SAME specified customer finish/hex while retaining panel geometry and material/grain. Paint must be opaque, not a translucent pale tint. Stain retains natural grain. Respect configured glass coating, grid color/location, jamb finish and hardware finish.',
    'PRIORITY 4 — NATURAL INSTALLATION. Fit to the selected perspective; match scene lighting, exposure, color temperature, highlights, glass reflections/transparency and believable contact shadows. The result must look physically installed, not pasted. Preserve photo framing/aspect ratio. Do not invent decorative architecture, plants, lights, windows, columns, transoms or extra trim.',
    `Selected doorway corners, normalized 0–1: ${JSON.stringify(corners)}`,
    `DoorConfiguration schemaVersion 1: ${JSON.stringify(snapshot)}`,
  ].join('\n')
}
