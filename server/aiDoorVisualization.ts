import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { doorStyles, finishes } from '../src/data/options.js'
import { productCatalog } from '../src/data/productCatalog.js'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets.js'
import { resolveHardwareOption, hardwarePreviewAssetUrl, hardwareAssetUrl } from '../src/data/hardware.js'
import { glassOptions } from '../src/data/glassOptions.js'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset } from '../src/data/sideliteAssets.js'
import { sidelitePlacement } from '../src/data/sideliteConfigurations.js'
import { doorHardwarePlacements } from '../src/data/doorConfigurationRules.js'
import { fslGlassOptions } from '../src/data/fslGlass.js'
import { f48slGlassOptions } from '../src/data/f48slGlass.js'
import { sslGlassOptions } from '../src/data/sslGlass.js'
import { s2slGlassOptions } from '../src/data/s2slGlass.js'
import { cr14slGlassOptions } from '../src/data/cr14slGlass.js'
import { AI_CORNER_ORDER, AI_MASK_PADDING_PX, AI_MAX_PHOTO_BYTES, AI_MAX_PHOTO_EDGE, aiPixelCorners, aiWorkingSize, type AiCorners } from '../src/features/home-visualizer/aiImagePreparation.js'
import type { DoorConfiguration, SideliteConfiguration } from '../src/types.js'

export type AiErrorCode =
  | 'INVALID_IMAGE_INPUT'
  | 'IMAGE_DECODE_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_REQUEST'
  | 'REFERENCE_IMAGE_FAILED'
  | 'OPENAI_REQUEST_REJECTED'
  | 'OPENAI_RATE_LIMITED'
  | 'AI_GENERATION_TIMEOUT'
  | 'SERVERLESS_TIMEOUT'
  | 'NO_GENERATED_IMAGE'
  | 'SERVER_CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR'

export class AiInputError extends Error {
  constructor(public readonly code: AiErrorCode, message: string, public readonly status = 400, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AiInputError'
  }
}

export class AiGenerationError extends Error {
  constructor(public readonly code: AiErrorCode, message: string, public readonly status = 502, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AiGenerationError'
  }
}
export const AI_MODEL = 'gpt-image-2.5-sunburst'
export const AI_QUALITY = 'xhigh' // Favor product detail; keep below the maximum cost tier.
export const AI_SINGLE_DOOR_WIDTH_BIAS = 0.94 // Small AI-only correction after estimating a normal slab from photo scale cues.
export const AI_MAX_REQUEST_BYTES = 3 * 1024 * 1024
export const AI_MAX_REFERENCE_EDGE = 1536
export const AI_MAX_ORIGINAL_PHOTO_BYTES = 30 * 1024 * 1024
export const AI_MAX_ORIGINAL_PIXELS = 40_000_000
export const AI_NORMALIZED_QUALITY = 90
type ObjectValue = Record<string, unknown>
export const objectValue = (value: unknown): ObjectValue | null => value && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : null

export function validateCorners(value: unknown): AiCorners {
  const source = objectValue(value)
  if (!source || Object.keys(source).length !== 4) throw new AiInputError('INVALID_REQUEST', 'Select all four doorway corners before generating.')
  const points = AI_CORNER_ORDER.map(name => {
    const point = objectValue(source[name])
    if (!point || Object.keys(point).length !== 2 || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) throw new AiInputError('INVALID_REQUEST', 'Doorway corners must be inside the photo.')
    return { x: point.x, y: point.y }
  })
  const turns = points.map((a, i) => { const b = points[(i + 1) % 4], c = points[(i + 2) % 4]; return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) })
  if (!turns.every(turn => turn > .0001)) throw new AiInputError('INVALID_REQUEST', 'Please select a valid, non-crossing doorway outline.')
  return Object.fromEntries(AI_CORNER_ORDER.map((name, i) => [name, points[i]])) as AiCorners
}

export function optionalCorners(value: unknown): AiCorners | null {
  return value === undefined || value === null ? null : validateCorners(value)
}

export async function prepareHouseAndMask(value: unknown, corners: AiCorners | null) {
  if (typeof value !== 'string') throw new AiInputError('INVALID_IMAGE_INPUT', 'Your house photo is missing.')
  const match = /^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value)
  if (!match) throw new AiInputError('INVALID_IMAGE_INPUT', 'Please use a valid JPG, PNG, WebP, AVIF, HEIC, or HEIF photo.')
  if (match[2].length > Math.ceil(AI_MAX_ORIGINAL_PHOTO_BYTES * 4 / 3) + 4) throw new AiInputError('PAYLOAD_TOO_LARGE', 'Your photo is too large to process safely. Please choose a smaller photo.', 413)
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length) throw new AiInputError('INVALID_IMAGE_INPUT', 'The uploaded photo is empty. Please choose another photo.')
  if (bytes.length > AI_MAX_ORIGINAL_PHOTO_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'Your photo is too large to process safely. Please choose a smaller photo.', 413)
  try {
    const metadata = await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS }).metadata()
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1 || !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format ?? '')) throw new AiInputError('INVALID_IMAGE_INPUT', 'This image format is not supported. Please use JPG, PNG, WebP, AVIF, HEIC, or HEIF.')
    const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
    const orientedWidth = swapsAxes ? metadata.height : metadata.width
    const orientedHeight = swapsAxes ? metadata.width : metadata.height
    const size = aiWorkingSize(orientedWidth, orientedHeight)
    const alreadyNormalized = metadata.format === 'webp' && (metadata.orientation ?? 1) === 1 && !metadata.hasAlpha && metadata.width === size.width && metadata.height === size.height && bytes.length <= AI_MAX_PHOTO_BYTES
    const photo = alreadyNormalized ? bytes : await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS })
      .rotate()
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .webp({ quality: AI_NORMALIZED_QUALITY, effort: 5, smartSubsample: true })
      .toBuffer()
    if (photo.length > AI_MAX_PHOTO_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'This photo could not be compressed enough for AI generation. Please choose a less detailed photo.', 413)
    let mask: Buffer | undefined
    if (corners) {
      const padding = AI_MASK_PADDING_PX * Math.max(size.width, size.height) / AI_MAX_PHOTO_EDGE
      const polygon = aiPixelCorners(corners, size.width, size.height).map(point => `${point.x},${point.y}`).join(' ')
      const cutout = Buffer.from(`<svg width="${size.width}" height="${size.height}"><polygon points="${polygon}" fill="black" stroke="black" stroke-width="${padding * 2}" stroke-linejoin="round"/></svg>`)
      mask = await sharp({ create: { ...size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite([{ input: cutout, blend: 'dest-out' }]).webp({ lossless: true, effort: 5 }).toBuffer()
    }
    return {
      photo, mask, width: size.width, height: size.height,
      original: { declaredMimeType: `image/${match[1].toLowerCase()}`, format: metadata.format, width: metadata.width, height: metadata.height, orientation: metadata.orientation ?? 1, byteSize: bytes.length },
      normalized: { format: 'webp', width: size.width, height: size.height, byteSize: photo.length },
    }
  } catch (error) {
    if (error instanceof AiInputError) throw error
    throw new AiInputError('IMAGE_DECODE_FAILED', 'Your house photo could not be decoded. Please choose another photo.', 400, { cause: error })
  }
}

const sideliteCatalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }
const gridKeys = ['glassCoating', 'gridLocation', 'gridStyle', 'gridPattern', 'gridColor', 'gridWidth']
function gridValues(value: unknown) {
  const source = objectValue(value)
  if (!source) return null
  return Object.fromEntries(gridKeys.filter(key => source[key] !== undefined).map(key => {
    if (typeof source[key] !== 'string' || (source[key] as string).length > 100) throw new AiInputError('INVALID_REQUEST', 'Grid configuration is invalid.')
    return [key, source[key]]
  }))
}

export function resolveAiProduct(value: unknown, jambFinishId?: unknown, glassFrameFinishId?: unknown) {
  const source = objectValue(value)
  if (!source || JSON.stringify(source).length > 64 * 1024) throw new AiInputError('INVALID_REQUEST', 'Door configuration is missing or invalid.')
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
  if (!style || !finish || !hardware || variants.length !== requestedLines.length || !variants.length || !['single', 'french', 'savannah'].includes(String(type)) || !['LHI', 'LHO', 'RHI', 'RHO'].includes(String(swing)) || !['none', 'hinge-side', 'lock-side', 'both-sides'].includes(String(sidelites))) throw new AiInputError('INVALID_REQUEST', 'Please complete a valid door configuration.')
  if (source.grain !== null && source.grain !== undefined && (typeof source.grain !== 'string' || !variants.some(item => item.grains.includes(source.grain as string)))) throw new AiInputError('INVALID_REQUEST', 'Door grain is invalid.')
  const selectedProduct = { doorTypeLabel: 'Door Line' as const, doorType: variants.map(item => item.lineName).join(' / '), doorTypes: variants.map(item => item.lineId), matchingVariants: variants, styleCodes: variants.map(item => item.code) }
  const doorPaths = resolveDoorPreviewCandidates(style, finish.finishType, selectedProduct, source.grain as string | null)
  const selectedGlass = objectValue(source.mainDoorGlass ?? source.glass)
  const glass = selectedGlass ? glassOptions.find(item => item.id === selectedGlass.id) : null
  if (selectedGlass && !glass) throw new AiInputError('INVALID_REQUEST', 'Selected glass is invalid.')
  const glassPath = glass && (glass.overlaysByDoorStyle[style.code] ?? variants.map(item => glass.overlaysByDoorStyle[item.code]).find(Boolean) ?? glass.thumbnailPath)
  const line = productCatalog.find(item => item.id === variants[0].lineId)
  const family = sideliteAssetFamilyForSlab({ doorLineId: variants[0].lineId.startsWith('signature-') ? 'signature-series' : line?.id, grain: source.grain as string | null, doorStyleCode: style.code })
  const sideliteStyle = source.sideliteSlab as keyof typeof sideliteCatalogs
  const sidelitePath = sidelites !== 'none' ? sideliteSlabAsset(family, sideliteStyle) : undefined
  if (sidelites !== 'none' && !sidelitePath) throw new AiInputError('INVALID_REQUEST', 'Selected sidelite style is invalid.')
  const sideliteGlassSource = objectValue(source.sideliteGlass)
  const sideliteGlass = sidelitePath && sideliteGlassSource ? sideliteCatalogs[sideliteStyle]?.find(item => item.name === sideliteGlassSource.glass) : null
  if (sidelitePath && sideliteGlassSource && !sideliteGlass) throw new AiInputError('INVALID_REQUEST', 'Selected sidelite glass is invalid.')
  const jambFinish = finishes.find(item => item.id === jambFinishId) ?? finishes.find(item => item.name === source.jambFinishColor && item.finishType === source.jambFinishType) ?? (source.jambFinishOverridden ? null : finish)
  if (jambFinishId !== undefined && !finishes.some(item => item.id === jambFinishId)) throw new AiInputError('INVALID_REQUEST', 'Selected jamb finish is invalid.')
  if (!jambFinish || !['timber', 'clad'].includes(String(source.jambType ?? 'timber'))) throw new AiInputError('INVALID_REQUEST', 'Selected jamb finish is invalid.')
  const glassFrameFinish = finishes.find(item => item.id === glassFrameFinishId) ?? (source.glassFrameColorMode === 'match-door' ? finish : null)
  if (glassFrameFinishId !== undefined && !finishes.some(item => item.id === glassFrameFinishId)) throw new AiInputError('INVALID_REQUEST', 'Selected glass frame finish is invalid.')
  const doubleDoorLockPrep = ['DDLLBO', 'DDLLAC', 'DDLLKP'].includes(String(source.doubleDoorLockPrep)) ? source.doubleDoorLockPrep as DoorConfiguration['doubleDoorLockPrep'] : null
  const exteriorHardwareSide = ['LHI', 'RHO'].includes(String(swing)) ? 'right' : 'left'
  const hardwareCount = doorHardwarePlacements(type as DoorConfiguration['doorConfigurationType'], exteriorHardwareSide, exteriorHardwareSide, doubleDoorLockPrep).length
  const snapshot = {
    schemaVersion: 1, configurationType: type, doorLine: line?.name, product: selectedProduct.doorType,
    doorStyle: style.name, doorCode: style.code, grain: source.grain ?? line?.grains[0] ?? null,
    finish: { name: finish.name, type: finish.finishType, hex: finish.color },
    glass: glass?.name ?? 'No glass', grids: gridValues(source.grid),
    hardware: { manufacturer: hardware.manufacturer, style: hardware.style, finish: hardware.finish, handing: hardware.handing, count: hardwareCount },
    doorSwing: swing, jamb: { type: source.jambType ?? 'timber', finish: jambFinish.name, finishType: source.jambFinishType ?? jambFinish.finishType, hex: jambFinish.color },
    glassFrame: glassFrameFinish ? { finish: glassFrameFinish.name, hex: glassFrameFinish.color } : 'Original glass frame finish',
    sidelites: { placement: sidelites as SideliteConfiguration, count: sidelites === 'both-sides' ? 2 : sidelites === 'none' ? 0 : 1, style: sideliteStyle ?? null, glass: sideliteGlass?.name ?? null, grids: gridValues(sideliteGlassSource) },
    doubleDoorLockPrep,
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
  throw new AiGenerationError('REFERENCE_IMAGE_FAILED', 'A configured product reference image could not be loaded.')
}

function structuralValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'none'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function aiStructuralInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  const doorStructure = snapshot.configurationType === 'single' ? 'single' : 'double'
  const sideliteStructure = sidelitePlacement(snapshot.sidelites.placement)
  const selectedHardware = `${snapshot.hardware.manufacturer}; ${snapshot.hardware.style}; ${snapshot.hardware.finish}; ${snapshot.hardware.handing}; exact visible hardware count: ${snapshot.hardware.count}`
  const selectedJambFrame = `${snapshot.jamb.type}; ${snapshot.jamb.finish} ${snapshot.jamb.hex}; glass frame: ${structuralValue(snapshot.glassFrame)}`
  const activeLeaf = snapshot.configurationType === 'single'
    ? `single active slab; swing ${snapshot.doorSwing}`
    : `double-door active-leaf/handing from swing ${snapshot.doorSwing}; lock preparation ${structuralValue(snapshot.doubleDoorLockPrep)}; hinge option ${structuralValue(snapshot.hingeOption)}`

  return [
    'AUTHORITATIVE TARGET ENTRANCE STRUCTURE',
    `door_structure: ${doorStructure}`,
    `sidelite_structure: ${sideliteStructure}`,
    `selected_configuration_type: ${snapshot.configurationType}`,
    `selected_material: ${snapshot.doorLine}; grain: ${structuralValue(snapshot.grain)}`,
    `selected_door_style: ${snapshot.doorStyle} (${snapshot.doorCode})`,
    `selected_finish: ${snapshot.finish.type}; ${snapshot.finish.name}; ${snapshot.finish.hex}`,
    `selected_glass: ${structuralValue(snapshot.glass)}`,
    `selected_grids: ${structuralValue(snapshot.grids)}`,
    `selected_sidelite_product_glass_grids: ${structuralValue(snapshot.sidelites.style)}; ${structuralValue(snapshot.sidelites.glass)}; ${structuralValue(snapshot.sidelites.grids)}`,
    `selected_hardware: ${selectedHardware}`,
    `selected_hardware_handing_active_leaf: ${activeLeaf}`,
    `selected_jamb_frame: ${selectedJambFrame}`,
    'STRUCTURAL CONVERSION RULES',
    '- First inspect the existing entrance in the house photo: determine single versus double main door, existing sidelites and their exterior-view sides, transom, storm/screen door, jamb/casing/trim/mullions, nearby windows that are not sidelites, arches or unusual openings, recesses, columns, masonry, and siding constraints. Then replace only the necessary entrance region with exactly the authoritative target above.',
    '- The target fields above are authoritative. Do not preserve an original door leaf or sidelite merely because it exists in the photo, and do not remove or add a sidelite unless the target structure requires that result.',
    '- Treat the original photo only as the source of entrance location, camera perspective, lighting, scale cues, and surrounding architecture. Treat the selected configuration and product references as the source of truth for door count, sidelite count and side, style, material, finish/color, glass, grids, hardware, and jamb/frame.',
    'PROPORTION ENFORCEMENT — DOOR SLABS, SIDELITES, AND SURROUNDING ARCHITECTURE ARE THREE SEPARATE WIDTH REGIONS.',
    '- Do not interpret the entire original framed opening or entrance composition as the width of the new target slab or slab pair. First detect the existing composition, then determine the target composition, assign realistic slab and sidelite widths, and finally reconstruct leftover or newly required surrounding architecture.',
    `- Use one normal residential door slab as the reference width. For a SINGLE target only, first estimate that normal slab from the photo's height and scale cues, then apply a subtle width bias of ${AI_SINGLE_DOOR_WIDTH_BIAS.toFixed(2)} (about 6% narrower) while keeping its height unchanged. This is a modest correction, not an undersized door. A sidelite remains a separate narrow region, approximately 0.35 of the adjusted single slab unless the supplied product reference establishes a more exact proportion. Jambs, casing, mullions, and reconstructed wall are separate from both slab and sidelite width.`,
    '- SINGLE-DOOR RULE: a target single entrance must remain exactly one normally proportioned residential door slab with the subtle single-only width correction above. Do not shrink the whole entrance, jamb, or surrounding architecture with the slab. The slab must not become oversized because the old composition was wide. Keep or update its jamb/frame independently, preserve believable spacing, then reconstruct every unused side region with matching wall, trim, casing, masonry, siding, or other entrance-adjacent architecture, with no ghost seams from removed sidelites.',
    '- DOUBLE-DOOR RULE: a target double entrance must remain exactly two normally proportioned residential door slabs. The entrance may use former sidelite space or widen only as needed, but never create two skinny slabs squeezed into a former single opening and never stretch two oversized slabs across the entire old composition.',
    '- Original single -> target double: construct a realistic two-slab opening at the same entrance location. Use available existing entrance composition first, including former sidelite space when the target omits those sidelites; modify adjacent entrance construction only if more width is genuinely needed.',
    '- Original double -> target single: install one normally proportioned slab; reconstruct any leftover former-door space as believable matching surrounding wall, trim, masonry/siding, or jamb construction instead of stretching the slab.',
    '- Existing single with both sidelites -> target single with none: keep one normal-width single slab and its jamb/frame, remove both sidelites completely, and reconstruct both unused side regions as seamless matching architecture. Never widen the slab to consume those regions.',
    '- Existing single with both sidelites -> target double with none: remove both sidelites and let the realistically proportioned double-door system legitimately use their former entrance space; do not preserve them as windows or narrow the two slabs unnaturally.',
    '- Existing double with none -> target single with both: create one normal single slab plus one proportional sidelite on each side; do not stretch the slab across the old double-door width.',
    '- Existing double with both sidelites -> target single with left only: create one normal-width single slab plus exactly one proportional left sidelite, then seamlessly reconstruct every remaining former slab/sidelite region on the unselected side.',
    '- Existing both sidelites -> target left only: retain or create only the left sidelite and reconstruct the former right-sidelite region. Existing left only -> target right only: remove/reconstruct the left region and create only the right sidelite.',
    '- For every sidelite transition, the target sidelite_structure is the sole authority: none means no sidelites; left or right means exactly one on that exterior-view side; both means exactly one on each side. Never invent an extra sidelite. Do not mistake an adjacent house window for a sidelite or absorb it into the entrance.',
    '- If the target is wider than the existing entrance, use existing entrance space first, then expand only the minimum contiguous entrance construction genuinely required. If the target is narrower, keep normal product proportions and rebuild leftover former door/sidelite space with matching wall, trim, jamb, masonry, siding, or casing.',
    'BAD RESULTS TO AVOID: one giant single slab filling a former single-plus-sidelite or double opening; two giant slabs spanning the entire former sidelite width; tiny double slabs squeezed into a former single opening; any faint outlines, glass traces, mullion traces, color bands, or ghost seams left by removed sidelites.',
    '- Preserve an existing transom by default because the Door Builder does not configure transoms. Alter it only if required for a physically plausible conversion; never invent a new transom.',
    '- A storm or screen door is not the configured primary entry door. Ignore or visually remove it as necessary so the selected entry door and hardware are shown clearly.',
    '- Preserve arches, recessed construction, close columns, unusual casing, masonry constraints, porch, steps, ceiling, and the house style wherever possible. If a constraint prevents an exact fit, make the smallest believable architectural adjustment rather than flattening or redesigning the whole entrance.',
    '- Preserve the full photograph and everything outside the minimum entrance-conversion area, including walls, siding, brick/stone, columns, genuine windows, landscaping, lighting, shadows, camera perspective, pets, furniture, vehicles, and unrelated objects. The result must look structurally plausible, normally scaled, and physically installed.',
  ].join('\n')
}

export function aiProductFidelityInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  return [
    'AUTHORITATIVE PRODUCT FIDELITY RULES',
    '- The resolved DoorConfiguration and supplied configured-product reference images are authoritative for the final entrance product. Match the selected door exactly; they are product specifications, not visual inspiration.',
    `- Preserve exactly: ${snapshot.configurationType === 'single' ? 'one slab' : 'two slabs'}; the selected single/double structure; slab proportions; panel layout; panel count; panel shapes; top-panel shapes; glass-lite count, size, placement and proportions; mullion/grid layout; target sidelite presence and side; sidelite glass; hardware type, exact hardware count (${snapshot.hardware.count}), placement and handing; active/inactive leaf behavior; finish/color; material appearance; and jamb/frame appearance.`,
    '- Do not redesign the door. Do not reinterpret the style. Do not create a new panel layout. Do not change the panel layout. Do not change panel count, panel shapes, or top-panel shapes.',
    '- Do not change the glass layout. Do not widen or narrow glass lites arbitrarily. Do not change the number, size, proportions, or placement of glass lites. Do not alter or simplify the configured mullion/grid layout.',
    `- Do not change hardware count. The final entrance must show exactly ${snapshot.hardware.count} configured visible hardware placement${snapshot.hardware.count === 1 ? '' : 's'}. Do not replace the selected hardware with a different type or layout, move it, or remove one handle when two are configured.`,
    '- Do not redesign, embellish, or simplify the selected product. Do not add optional features that were not selected. Do not invent decorative details that are absent from the configured product. Do not simplify the configured product into a generic door. Do not substitute a visually similar door style.',
    '- HOUSE VERSUS PRODUCT SEPARATION: the house photo supplies location, perspective, lighting, shadows and surrounding facade. The configured product references and DoorConfiguration supply the exact door design and product details.',
    '- Change only the surrounding architectural context when necessary for a realistic fit: trim, casing, brick, stone, siding, opening width, former sidelite space, jamb transition, contact shadows and immediate entrance architecture. If the opening must change, adjust architecture around the configured door rather than redesigning the door itself.',
  ].join('\n')
}

function hasConfiguredGrid(value: ReturnType<typeof gridValues>) {
  return Boolean(value && Object.values(value).some(item => item.trim() !== '' && !/^(none|no grids?|not selected)$/i.test(item.trim())))
}

export function aiDoNotInventInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  const hasMainGrid = hasConfiguredGrid(snapshot.grids)
  const hasSideliteGrid = hasConfiguredGrid(snapshot.sidelites.grids)
  const noGlass = snapshot.glass === 'No glass'
  const plainGlass = /\b(clear|plain)\b/i.test(snapshot.glass) && !/decorative/i.test(snapshot.glass)
  const sideliteRule = snapshot.sidelites.count === 0
    ? '- No sidelites are selected. Do not add, retain, imply, or fabricate sidelites; reconstruct former sidelite space as matching surrounding architecture under the structural-conversion rules.'
    : `- Preserve exactly ${snapshot.sidelites.count} selected sidelite${snapshot.sidelites.count === 1 ? '' : 's'} in the configured ${sidelitePlacement(snapshot.sidelites.placement)} arrangement. Do not add another sidelite, a fake sidelite, or a nearby window that reads as a sidelite.`
  const glassRule = noGlass
    ? '- No door glass is selected. Do not create glass panes, lites, glazing, divided-light patterns, grille bars, or reflections that imply glass.'
    : plainGlass
      ? `- The selected door glass is plain/clear (${snapshot.glass}). Keep it plain/clear; do not add decorative glass, bevel patterns, textures, extra panes, divided lites, muntins, or grille bars.`
      : `- Use only the selected door glass (${snapshot.glass}) with its exact lite count, shape, size, placement, proportions and decorative pattern. Do not add panes, lites, bevels, patterns, or glass trim.`
  return [
    'DO NOT ADD OR INVENT DETAILS',
    '- Use only product features explicitly present in the resolved DoorConfiguration and supplied product references. Absence is an instruction: an unselected feature must remain absent.',
    '- Do not add grids or muntins, extra glass panes or lites, decorative glass, sidelites, panels, different panel shapes, decorative moulding, extra trim around glass, bevels, raised moulding, embossing, fake texture, or product details not present in the selected configuration.',
    '- Do not add wood grain to a material/finish that should not show wood grain. Do not introduce color variation, highlights, reflections, shadows, edge lines, or texture that changes the selected product design or makes one panel or lite appear to be multiple panels or lites.',
    '- Do not add or substitute hardware. Do not add knockers, kickplates, mail slots, peepholes, clavos, straps, decorative hinges, or other decorative metal details unless they are explicitly present in the configured product.',
    '- Do not add shutters, fake windows, fake sidelites, a new transom, unexpected arch-top styling, unexpected divided-lite patterns, grille bars, or surrounding door components that are not present in the selected system or existing architecture that must remain unchanged.',
    '- Do not alter the active/inactive leaf arrangement, double-door center seam, jamb/frame proportions, glass-frame geometry, panel count, panel layout, glass count, glass layout, hardware type, hardware count, or hardware placement.',
    'UNSELECTED FEATURES MUST NOT APPEAR',
    hasMainGrid
      ? `- Use only the configured door grid specification (${structuralValue(snapshot.grids)}). Do not add, remove, multiply, or reinterpret grille bars.`
      : '- No door grids are selected. Do not show grids, muntins, grille bars, divided-light lines, or reflections/edge lines that resemble them.',
    hasSideliteGrid
      ? `- Use only the configured sidelite grid specification (${structuralValue(snapshot.sidelites.grids)}). Do not add, remove, multiply, or reinterpret grille bars.`
      : '- No sidelite grids are selected. Do not show grids, muntins, grille bars, divided-light lines, or reflections/edge lines on sidelite glass.',
    sideliteRule,
    glassRule,
    '- Do not invent decorative glass when clear/plain glass is selected, and do not replace selected decorative glass with a different pattern.',
    '- No transom is configured by Door Builder. Preserve a real existing transom only when the existing-architecture rules require it; never invent a transom where none exists.',
    `- Show exactly ${snapshot.hardware.count} configured visible hardware placement${snapshot.hardware.count === 1 ? '' : 's'}—no more and no fewer. Use the selected hardware type, finish, handing and placement only.`,
    '- Show the exact selected panel count, panel layout and panel shapes, with no added panels, grooves, moulding, embossing or edge lines that change the composition.',
    '- Show the exact selected glass-lite count and layout, with no added, removed, divided, merged, widened or narrowed lites.',
    '- Adjust surrounding architecture to fit the configured product; never add product features to fill or decorate the available opening.',
  ].join('\n')
}

export function aiPrompt(snapshot: ReturnType<typeof resolveAiProduct>['snapshot'], corners: AiCorners | null, labels: string[]) {
  const roles: Record<string, string> = {
    'original base door design': 'defines the exact slab design, panel geometry, panel depth, grooves, glass opening and underlying material/grain; its original color is not the selected finish',
    'selected glass design': 'defines the exact selected glass shape, decorative detail, pattern and visible glass construction; do not substitute plain glass',
    'selected exterior hardware': 'defines the exact hardware silhouette, proportions, knob/lever/handle/lockset components and finish; preserve its relative placement on the slab',
    'original sidelite slab': 'defines the exact sidelite structure, panel details, opening and material; preserve the configured count and placement',
    'selected sidelite glass': 'defines the exact sidelite glass design and decorative detail, separately from the main-door glass',
  }
  return [
    corners
      ? 'PRIORITY 1 — PRESERVE THE HOUSE. The FIRST image is the original customer house and the base scene. The transparent PNG mask indicates the only editable entrance region, including a small blending allowance. Preserve architecture, siding, windows, roof, porch, masonry, landscaping, steps and surroundings. Do not redesign unrelated pixels.'
      : 'PRIORITY 1 — PRESERVE THE HOUSE. The FIRST image is the full original customer house and the base scene. Identify the existing main exterior entrance in that photograph and replace only that entrance. Preserve the full photo framing and all unrelated architecture, siding, windows, roof, porch, masonry, landscaping, steps and surroundings. Do not crop or redesign unrelated pixels.',
    aiStructuralInstructionBlock(snapshot),
    aiProductFidelityInstructionBlock(snapshot),
    aiDoNotInventInstructionBlock(snapshot),
    'PRIORITY 2 — PRODUCT FIDELITY. The references are high-priority product-definition inputs, NOT inspiration images and NOT a finished composite. They define the true HGI product design. Adapt only finish, perspective and scene lighting, never redesign or generalize the product. Do not simply paste them into the house.',
    ...labels.map((label, index) => `Image ${index + 2} — ${label}: ${roles[label] ?? 'defines the selected product detail'}.`),
    'DETAILS TO PRESERVE. Preserve selected hardware style, silhouette, proportions, finish, handing/active-leaf logic and physical placement. Preserve selected glass style and all visible decorative detail. Preserve configured grid pattern, grid count implied by the selected layout/reference, grid placement, visible grid thickness and color; do not invent an unspecified count. Preserve the TARGET sidelite glass and structure, exact panel geometry, visible panel grooves and depth, and crisp jamb/frame edge definition. Keep the configured single/French/Savannah arrangement and target sidelite count/placement.',
    'PRIORITY 3 — SELECTED FINISHES. Ignore original reference door/sidelite colors. Refinish the slab and sidelites with the SAME specified customer finish/hex while retaining panel geometry and material/grain. Paint must be opaque, not a translucent pale tint. Stain retains natural grain. Respect configured glass coating, grid color/location, jamb finish and hardware finish.',
    'MATERIAL FIDELITY. The configured door line and grain define the underlying material. Smooth steel must remain smooth steel; brushed/smooth fiberglass must remain that fiberglass surface; textured or oak-grain fiberglass must retain its texture/oak grain. Preserve any configured visible woodgrain, its direction and relief while applying paint or stain naturally. Do not turn steel into wood or textured fiberglass into a generic flat surface. The selected finish changes color, not material type.',
    `PRIORITY 4 — NATURAL INSTALLATION. ${corners ? 'Fit to the selected perspective' : 'Use the perspective and exact opening of the detected existing main exterior entrance'}; match scene lighting, exposure, color temperature, highlights, glass reflections/transparency and believable contact shadows. The result must look physically installed, not pasted. Preserve photo framing/aspect ratio. Do not invent decorative architecture, plants, lights, windows, columns, transoms or extra trim.`,
    'AVOID. Do not substitute a different or generic knob, lever, lockset or pull handle. Do not add, remove, simplify or flatten configured glass details. Do not add, remove, reduce or reinterpret configured grids. Do not replace configured glass with plain generic glass. Do not change material type or flatten panel depth. Do not oversoften, blur away or smooth out product-defining details. Preserve fine edges without artificial sharpening halos. Do not invent unrelated architecture or redesign the house.',
    corners ? `Optional user-provided doorway corners, normalized 0–1: ${JSON.stringify(corners)}` : 'No doorway corners were provided. Locate the existing main exterior entrance from the complete house photograph.',
    `DoorConfiguration schemaVersion 1: ${JSON.stringify(snapshot)}`,
  ].join('\n')
}
