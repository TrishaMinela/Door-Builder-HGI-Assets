import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { doorStyles, finishes, glassOptions, hardwareOptions } from '../src/data/options'
import { cladColors } from '../src/data/finishes'
import { doorLineChoices, doorLineChoicesForStyle, doorStyleSupportsGlass, finishesForStyle, resolveDoorProduct } from '../src/data/productCatalog'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets'
import { resolveGlassMaskAsset } from '../src/data/glassMaskAssets'
import { hardwareAssetUrl, hardwareCardAssetUrl, hardwarePreviewAssetUrl } from '../src/data/hardware'
import { sideliteAssetFamilyForSlab, sideliteGlassMask, sideliteSlabAsset, sideliteStylesForFamily } from '../src/data/sideliteAssets'
import { sideliteBuilderOptions } from '../src/data/sideliteConfigurations'
import { fslGlassOptions, fslStandardStyleRules, fslLowEStyleRules, fslGridAsset, fslPrairieGridAsset, fslArtsAndCraftsGridAsset } from '../src/data/fslGlass'
import { f48slGlassOptions, f48slStandardStyleRules, f48slLowEStyleRules, f48slGridAsset, f48slPrairieGridAsset, f48slArtsAndCraftsGridAsset } from '../src/data/f48slGlass'
import { sslGlassOptions, sslStandardStyleRules, sslLowEStyleRules, sslGridAsset, sslPrairieGridAsset, sslArtsAndCraftsGridAsset } from '../src/data/sslGlass'
import { s2slGlassOptions } from '../src/data/s2slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { loadAiReference, resolveAiProduct } from '../server/aiDoorVisualization'
import type { DoorConfiguration, Finish, GlassOption, GridColor, GridPattern, GridStyle, GridWidth } from '../src/types'

const root = process.cwd()
const assetRoot = path.join(root, 'public', 'assets')
const assetChecks = new Set<string>()
const failures: string[] = []
const oldRasterReferences: string[] = []

function localAsset(url: string) {
  const clean = decodeURIComponent(url.split(/[?#]/, 1)[0])
  return clean.startsWith('/assets/') ? path.join(root, 'public', clean.slice(1)) : null
}

async function checkAsset(url: string | undefined, context: string) {
  if (!url) return
  const local = localAsset(url)
  if (!local) return failures.push(`${context}: invalid asset URL ${url}`)
  assetChecks.add(url.split(/[?#]/, 1)[0])
  try {
    const info = await stat(local)
    if (!info.isFile() || info.size === 0) failures.push(`${context}: empty asset ${url}`)
  } catch { failures.push(`${context}: missing asset ${url}`) }
}

const clearIds = new Set(['clear', 'f-clear-no-grids', 'f-clear-grids', 'clear-low-e', 'cr14-divided-lites', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-clear-nonstock', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-clear-grids', 'f48-clear-no-grids', 'frt-clear-f17rt', 'hrt-clear-s11rt', 'n-clear-ncl', 'qa-clear-qacl', 'sat-clear-nonstock', 'so-clear-nonstock', 'so-clear-small-no-coating', 'so-clear-small-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock', 's-clear-grids', 's-clear-no-grids', 'sw-clear-swg'])
const legacyFullLite = new Set(['clear', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-nonstock', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-blinds-15', 'blinds-espresso', 'blinds-gray', 'blinds-sand', 'blinds-silver', 'blinds-tan', 'blinds-white'])
const legacyF48 = new Set(['clear-low-e', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock'])
const legacyS = new Set(['clear', 'clear-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock'])
const f48Ids = new Set(['f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-clear-grids', 'f48-clear-no-grids', 'f48-blinds-white', 'f48-clic-nogrid', 'f48-clic-ext-12l', 'ashbury', 'berkley', 'briselle', 'cadence', 'calandra', 'courtyard', 'crosswalk', 'cyndi', 'dorian-nickel', 'dorian-patina', 'edgewood', 'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'fragrance', 'garrison', 'grace-nickel', 'grace-patina', 'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jameston', 'majestic-nickel', 'majestic-patina', 'margate', 'metro', 'mistify', 'mohave', 'monterey-nickel', 'monterey-patina', 'neo', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'paris', 'pembrook', 'prestige', 'rill', 'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'micro-granite', 'rain', 'streamed', 'vapor', 'wide-reed'])
function isPrivacy(glass: GlassOption) { return /blanca|chinchilla|cumulus|linen|micro granite|rain|vapor|streamed|wide reed/i.test(`${glass.id} ${glass.name}`) }
function availableGlass(codes: string[]) {
  return glassOptions.filter(option => codes.some(code => Boolean(option.overlaysByDoorStyle[code]))
    && !(codes.includes('F') && legacyFullLite.has(option.id))
    && !(codes.includes('S') && legacyS.has(option.id))
    && !((codes.includes('F48') || codes.includes('F482')) && legacyF48.has(option.id))
    && (!(codes.includes('F48') || codes.includes('F482')) || f48Ids.has(option.id))
    && !(codes.includes('SAT') && isPrivacy(option)))
}

const sideliteCatalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }
const sideliteRules = {
  fsl: { standard: fslStandardStyleRules, lowE: fslLowEStyleRules, grid: fslGridAsset, prairie: fslPrairieGridAsset, arts: fslArtsAndCraftsGridAsset },
  f48sl: { standard: f48slStandardStyleRules, lowE: f48slLowEStyleRules, grid: f48slGridAsset, prairie: f48slPrairieGridAsset, arts: f48slArtsAndCraftsGridAsset },
  ssl: { standard: sslStandardStyleRules, lowE: sslLowEStyleRules, grid: sslGridAsset, prairie: sslPrairieGridAsset, arts: sslArtsAndCraftsGridAsset },
} as const

function gridLeaves(styleRules: Partial<Record<GridStyle, Partial<Record<GridPattern, Partial<Record<GridColor, GridWidth[]>>>>>>) {
  const leaves: { style: GridStyle; pattern: GridPattern; color: GridColor; width?: GridWidth }[] = []
  for (const [style, patterns] of Object.entries(styleRules)) for (const [pattern, colors] of Object.entries(patterns ?? {})) for (const [color, widths] of Object.entries(colors ?? {})) {
    if (!widths?.length) leaves.push({ style: style as GridStyle, pattern: pattern as GridPattern, color: color as GridColor })
    else for (const width of widths) leaves.push({ style: style as GridStyle, pattern: pattern as GridPattern, color: color as GridColor, width })
  }
  return leaves
}

let configurationCount = 0n
let materialSelections = 0
let aiConfigurations = 0
const aiReferenceSets = new Set<string>()
const aiReferenceLoads = new Map<string, Promise<Buffer>>()
const doorTypes = [{ id: 'single', lock: 1n }, { id: 'french', lock: 3n }, { id: 'savannah', lock: 1n }] as const
const swings = [{ id: 'LHI', name: 'Left Hand Inswing' }, { id: 'LHO', name: 'Left Hand Outswing' }, { id: 'RHI', name: 'Right Hand Inswing' }, { id: 'RHO', name: 'Right Hand Outswing' }] as const
const cladFinishCount = finishes.filter(finish => finish.finishType === 'paint' && cladColors.some(color => `paint-${color.id}` === finish.id)).length

for (const style of doorStyles) {
  for (const line of doorLineChoicesForStyle(style)) {
    const variants = style.variants.filter(variant => line.lineIds.includes(variant.lineId))
    const grains = line.id === 'signature-series' ? [...new Set(variants.flatMap(variant => variant.grains))] : [line.autoGrain ?? null]
    for (const grain of grains) {
      const compatibleFinishes = finishesForStyle(style, finishes, line.id, grain)
      for (const finish of compatibleFinishes) {
        const product = resolveDoorProduct(style, finish, grain ?? undefined, line.id)
        if (!product.matchingVariants.length) continue
        materialSelections += 1
        const codes = product.styleCodes
        const slabs = resolveDoorPreviewCandidates(style, finish.finishType, product, grain)
        assert.ok(slabs.length, `${line.id}/${style.code}/${finish.id} has no slab candidate`)
        for (const slab of slabs) await checkAsset(slab, `slab ${line.id}/${style.code}/${finish.id}`)
        await checkAsset(resolveGlassMaskAsset(codes.find(code => resolveGlassMaskAsset(code)) ?? ''), `mask ${style.code}`)
        const glassChoices = doorStyleSupportsGlass(style, line.id) ? availableGlass(codes) : []
        const glassVariants = glassChoices.length || 1
        for (const glass of glassChoices) for (const code of codes) await checkAsset(glass.overlaysByDoorStyle[code], `glass ${glass.id}/${code}`)

        const family = sideliteAssetFamilyForSlab({ doorLineId: line.id, grain, doorStyleCode: style.code })
        let sideliteSelectionCount = 1n
        if (family) {
          let perPlacement = 0n
          for (const sideliteStyle of sideliteStylesForFamily(family)) {
            await checkAsset(sideliteSlabAsset(family, sideliteStyle), `sidelite slab ${family}/${sideliteStyle}`)
            await checkAsset(sideliteGlassMask(family, sideliteStyle), `sidelite mask ${family}/${sideliteStyle}`)
            const catalog = sideliteCatalogs[sideliteStyle]
            let glassCount = 0n
            for (const glass of catalog) {
              await checkAsset(glass.asset, `sidelite glass ${sideliteStyle}/${glass.id}`)
              glassCount += 1n
            }
            const rules = sideliteRules[sideliteStyle as keyof typeof sideliteRules]
            if (rules) {
              const leaves = [...gridLeaves(rules.standard), ...gridLeaves(rules.lowE)]
              for (const leaf of leaves) {
                const url = leaf.style === 'Prairie' ? rules.prairie(leaf.color) : leaf.style === 'Arts & Crafts' ? rules.arts(leaf.color) : rules.grid(leaf.pattern, leaf.color)
                await checkAsset(url, `sidelite grid ${sideliteStyle}/${leaf.style}/${leaf.pattern}/${leaf.color}`)
              }
              glassCount += BigInt(leaves.length)
            }
            perPlacement += glassCount
          }
          sideliteSelectionCount += perPlacement * 3n
        }

        // Main grid choices are authored as concrete production assets. Their
        // filename set is the same source consumed by the UI's grid rules.
        let mainGridVariants = 0
        for (const code of codes.filter(code => ['F', 'F48', 'F482', 'S'].includes(code))) {
          const directory = code === 'S' ? 'S' : code.startsWith('F48') ? 'F48' : 'F'
          const files = await readdir(path.join(assetRoot, 'hgi-assets', 'Glass', directory, 'INTERNAL GRIDS'))
          for (const file of files.filter(file => file.endsWith('.webp'))) {
            await checkAsset(`/assets/hgi-assets/Glass/${directory}/INTERNAL GRIDS/${file}`, `main grid ${code}`)
            mainGridVariants += 1
          }
        }
        const expandedGlassVariants = BigInt(glassVariants + mainGridVariants)
        const jambVariants = BigInt(compatibleFinishes.filter(item => item.finishType === finish.finishType).length + cladFinishCount)
        const glassFrameVariants = BigInt(1 + compatibleFinishes.length)
        for (const doorType of doorTypes) {
          assert.equal(sideliteBuilderOptions(doorType.id).length, 4)
          configurationCount += doorType.lock * BigInt(hardwareOptions.length) * BigInt(swings.length) * jambVariants * glassFrameVariants * expandedGlassVariants * sideliteSelectionCount
        }

        // Exercise AI resolution for every finish/style/material/glass leaf.
        const aiGlasses = glassChoices.length ? glassChoices : [null]
        for (const glass of aiGlasses) {
          const config: DoorConfiguration = {
            doorConfigurationType: 'single', product, doorLine: line.id, style, grain, finish,
            glass, mainDoorGlass: glass, grid: null, hardware: hardwareOptions[0],
            doorSwing: { ...swings[0], image: '' }, sidelites: 'none', jambType: 'timber',
          }
          const resolved = resolveAiProduct(config)
          aiConfigurations += 1
          for (const reference of resolved.references) {
            const key = `${reference.label}:${reference.paths.join('|')}`
            aiReferenceSets.add(key)
            const loaded = aiReferenceLoads.get(key) ?? loadAiReference(reference.paths)
            aiReferenceLoads.set(key, loaded)
            assert.ok((await loaded).length > 0, `AI reference failed: ${reference.label}`)
          }
        }
      }
    }
  }
}

for (const hardware of hardwareOptions) {
  await checkAsset(hardwareCardAssetUrl(hardware), `hardware card ${hardware.id}`)
  await checkAsset(hardwareAssetUrl(hardware.asset), `hardware source ${hardware.id}`)
  await checkAsset(hardwarePreviewAssetUrl(hardware, 'Exterior'), `hardware exterior ${hardware.id}`)
  await checkAsset(hardwarePreviewAssetUrl(hardware, 'Interior'), `hardware interior ${hardware.id}`)
}

// Production source must not reference a deleted PNG/JPG. Existing PNGs are
// intentionally limited to exact masks, jsPDF inputs, and smaller thumbnails.
for (const directory of ['src', 'server', 'api']) {
  async function walk(current: string): Promise<string[]> {
    const entries = await readdir(current, { withFileTypes: true })
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(current, entry.name)) : [path.join(current, entry.name)]))).flat()
  }
  for (const file of await walk(path.join(root, directory))) {
    if (!/\.(?:ts|tsx|js|jsx|css|json)$/.test(file)) continue
    const text = await readFile(file, 'utf8')
    for (const match of text.matchAll(/\/assets\/[A-Za-z0-9_@%+.,()&'\- /]+?\.(?:png|jpe?g)/gi)) {
      const url = match[0]
      const local = localAsset(url)
      if (!local) continue
      try { await stat(local) } catch { oldRasterReferences.push(`${path.relative(root, file)}: ${url}`) }
    }
  }
}

if (failures.length || oldRasterReferences.length) {
  console.error(JSON.stringify({ failures, oldRasterReferences }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({
    validConfigurations: configurationCount.toString(), materialFinishSelections: materialSelections,
    uniqueAssetPathsChecked: assetChecks.size, aiConfigurationsPrepared: aiConfigurations,
    uniqueAiReferenceSets: aiReferenceSets.size, missingAssets: 0, brokenDynamicPaths: 0,
    oldDeletedRasterReferences: 0,
  }, null, 2))
}
