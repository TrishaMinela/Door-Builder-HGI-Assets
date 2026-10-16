import { resolveAiProduct } from '../server/aiDoorVisualization'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { glassOptions } from '../src/data/glassOptions'
import { sideliteAssetFamilyForSlab, sideliteStylesForFamily } from '../src/data/sideliteAssets'
import { fslGlassOptions } from '../src/data/fslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { s2slGlassOptions } from '../src/data/s2slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { aiTestConfiguration } from './aiVisualizerFixture'

// vercel.json accepts one glob string, not the array supported internally by
// @vercel/node. Escape literal filename syntax (including an authored comma).
export function aiReferenceIncludePattern(paths: string[]) {
  return `{${paths.map(path => `public${path}`.replace(/[\\{}[\]*?,()!+@]/g, character => `\\${character}`)).join(',')}}`
}

/** Enumerate the server resolver, not UI filters. Retained/legacy references and
 * secondary source candidates must keep working too. Independent dimensions
 * avoid a huge Cartesian product: finish colors, swing, placement and lock prep
 * affect prompts, but do not select additional catalog reference image paths.
 */
export function collectAiFallbackReferences(resolver = resolveAiProduct) {
  const groups = new Map<string, { label: string; paths: string[] }>()
  const contexts = new Map<string, Record<string, unknown>>()
  let resolutions = 0
  function add(configuration: unknown) {
    resolutions++
    for (const reference of resolver(configuration).references) {
      groups.set(JSON.stringify(reference), reference)
    }
  }
  const finishTypes = ['paint', 'stain'] as const
  for (const style of doorStyles) {
    // Single variants cover every line/code; the combined variant case also
    // exercises the generic/multi-line fallback branch used by saved products.
    const variantSets = [...style.variants.map(variant => [variant]), style.variants]
    for (const variants of variantSets) {
      for (const grain of [null, ...new Set(variants.flatMap(variant => variant.grains))]) {
        for (const finishType of finishTypes) {
          const configuration = {
            ...aiTestConfiguration, style, grain,
            finish: finishes.find(finish => finish.finishType === finishType)!,
            product: { matchingVariants: variants },
          }
          add(configuration)
          // The endpoint accepts canonical glass IDs, including historical
          // records. Its thumbnail fallback is intentional existing behavior.
          for (const glass of glassOptions) add({ ...configuration, mainDoorGlass: glass })
          const family = sideliteAssetFamilyForSlab({
            doorLineId: variants[0].lineId.startsWith('signature-') ? 'signature-series' : variants[0].lineId,
            grain, doorStyleCode: style.code,
          })
          if (family && !contexts.has(family)) contexts.set(family, configuration)
        }
      }
    }
  }
  for (const hardware of hardwareOptions) add({ ...aiTestConfiguration, hardware })
  const catalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }
  for (const [family, configuration] of contexts) {
    for (const sideliteSlab of sideliteStylesForFamily(family as Parameters<typeof sideliteStylesForFamily>[0])) {
      add({ ...configuration, sidelites: 'both-sides', sideliteSlab })
      for (const glass of catalogs[sideliteSlab]) {
        add({ ...configuration, sidelites: 'both-sides', sideliteSlab, sideliteGlass: { glass: glass.name } })
      }
    }
  }
  const references = [...groups.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'))
  const paths = [...new Set(references.flatMap(reference => reference.paths.map(path => path.split('?')[0])))].sort()
  return { resolutions, references, paths, sideliteFamilies: [...contexts.keys()].sort() }
}
