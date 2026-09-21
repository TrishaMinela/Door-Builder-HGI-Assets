import { doorStyles, finishes, glassOptions, hardwareOptions } from '../src/data/options'
import { doorLineChoicesForStyle, finishesForStyle, resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteAssetFamilyForSlab, sideliteGlassMask, sideliteSlabAsset, sideliteStylesForFamily } from '../src/data/sideliteAssets'
import { fslGlassOptions } from '../src/data/fslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { s2slGlassOptions } from '../src/data/s2slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { renderPdfProduct, type PdfProductAppearance } from '../src/utils/pdfProductRenderer'
import type { DoorConfiguration, DoorStyle, Finish, GlassOption, HardwareOption } from '../src/types'

type Fixture = { name: string; coverage: string[]; configuration: DoorConfiguration; appearance: PdfProductAppearance }
const fixtures: Fixture[] = []
const swings = [
  { id: 'LHI', name: 'Left Hand Inswing' }, { id: 'LHO', name: 'Left Hand Outswing' },
  { id: 'RHI', name: 'Right Hand Inswing' }, { id: 'RHO', name: 'Right Hand Outswing' },
] as const
const sideliteCatalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }

function makeFixture(name: string, style: DoorStyle, lineId: string, finish: Finish, glass: GlassOption | null, hardware: HardwareOption = hardwareOptions[0], options: Partial<DoorConfiguration> = {}, coverage: string[] = []): Fixture | null {
  const line = doorLineChoicesForStyle(style).find(item => item.id === lineId)
  if (!line) return null
  const variants = style.variants.filter(variant => line.lineIds.includes(variant.lineId))
  const grain = line.id === 'signature-series' ? variants.flatMap(variant => variant.grains)[0] ?? null : line.autoGrain ?? null
  const product = resolveDoorProduct(style, finish, grain ?? undefined, line.id)
  if (!product.matchingVariants.length) return null
  const configuration: DoorConfiguration = {
    doorConfigurationType: 'single', product, doorLine: line.id, style, grain, finish,
    glass, mainDoorGlass: glass, grid: null, hardware, doorSwing: { ...swings[0], image: '' },
    sidelites: 'none', jambType: 'timber', jambFinishType: finish.finishType, jambFinishColor: finish.name,
    ...options,
  }
  return { name, coverage, configuration, appearance: { glass, jambFinish: finish } }
}

// Every UI-reachable door style/door-line/material pair.
for (const style of doorStyles) for (const line of doorLineChoicesForStyle(style)) {
  const variants = style.variants.filter(variant => line.lineIds.includes(variant.lineId))
  const grain = line.id === 'signature-series' ? variants.flatMap(variant => variant.grains)[0] ?? null : line.autoGrain ?? null
  const finish = finishesForStyle(style, finishes, line.id, grain)[0]
  if (!finish) continue
  const codes = variants.map(variant => variant.code)
  const glass = glassOptions.find(option => codes.some(code => option.overlaysByDoorStyle[code])) ?? null
  const fixture = makeFixture(`style-${style.code}-${line.id}`, style, line.id, finish, glass, hardwareOptions[0], {}, [`style:${style.code}`, `material:${line.id}`])
  if (fixture) fixtures.push(fixture)
}

// Every distinct production glass option, paired with a real compatible style.
for (const glass of glassOptions) {
  const compatible = doorStyles.flatMap(style => doorLineChoicesForStyle(style).map(line => ({ style, line }))).find(({ style, line }) => {
    const codes = style.variants.filter(variant => line.lineIds.includes(variant.lineId)).map(variant => variant.code)
    return codes.some(code => glass.overlaysByDoorStyle[code])
  })
  if (!compatible) continue
  const variants = compatible.style.variants.filter(variant => compatible.line.lineIds.includes(variant.lineId))
  const grain = compatible.line.id === 'signature-series' ? variants.flatMap(variant => variant.grains)[0] ?? null : compatible.line.autoGrain ?? null
  const finish = finishesForStyle(compatible.style, finishes, compatible.line.id, grain)[0]
  const fixture = finish && makeFixture(`glass-${glass.id}`, compatible.style, compatible.line.id, finish, glass, hardwareOptions[0], {}, [`glass:${glass.id}`])
  if (fixture) fixtures.push(fixture)
}

const baseStyle = doorStyles.find(style => style.code === 'F1')!
const baseFinish = finishes.find(finish => finish.id === 'paint-black')!
// Every hardware SKU plus all swing/door-configuration/jamb modes.
for (const hardware of hardwareOptions) {
  const fixture = makeFixture(`hardware-${hardware.id}`, baseStyle, '20-gauge-smooth-steel', baseFinish, null, hardware, {}, [`hardware:${hardware.id}`, `hardware-type:${hardware.type}`])
  if (fixture) fixtures.push(fixture)
}
for (const swing of swings) {
  const fixture = makeFixture(`swing-${swing.id}`, baseStyle, '20-gauge-smooth-steel', baseFinish, null, hardwareOptions[0], { doorSwing: { ...swing, image: '' } }, [`swing:${swing.id}`])
  if (fixture) fixtures.push(fixture)
}
for (const [type, prep] of [['single', undefined], ['french', 'DDLLBO'], ['french', 'DDLLAC'], ['french', 'DDLLKP'], ['savannah', undefined]] as const) {
  const fixture = makeFixture(`configuration-${type}-${prep ?? 'default'}`, baseStyle, '20-gauge-smooth-steel', baseFinish, null, hardwareOptions[0], { doorConfigurationType: type, doubleDoorLockPrep: prep }, [`configuration:${type}`, `lock:${prep ?? 'default'}`])
  if (fixture) fixtures.push(fixture)
}
for (const jamb of ['timber', 'clad'] as const) {
  const fixture = makeFixture(`jamb-${jamb}`, baseStyle, '20-gauge-smooth-steel', baseFinish, null, hardwareOptions[0], { jambType: jamb, jambFinishType: jamb === 'clad' ? 'clad' : 'paint' }, [`jamb:${jamb}`])
  if (fixture) fixtures.push(fixture)
}

// Every real material-family/sidelite-style pair with authored glass.
for (const style of doorStyles) for (const line of doorLineChoicesForStyle(style)) {
  const variants = style.variants.filter(variant => line.lineIds.includes(variant.lineId))
  const grain = line.id === 'signature-series' ? variants.flatMap(variant => variant.grains)[0] ?? null : line.autoGrain ?? null
  const family = sideliteAssetFamilyForSlab({ doorLineId: line.id, grain, doorStyleCode: style.code })
  if (!family) continue
  const finish = finishesForStyle(style, finishes, line.id, grain)[0]
  if (!finish) continue
  for (const sideliteStyle of sideliteStylesForFamily(family)) {
    const key = `sidelite:${family}:${sideliteStyle}`
    if (fixtures.some(fixture => fixture.coverage.includes(key))) continue
    const sideGlass = sideliteCatalogs[sideliteStyle].find(option => option.asset)
    const fixture = makeFixture(`sidelite-${family}-${sideliteStyle}`, style, line.id, finish, null, hardwareOptions[0], {
      sidelites: 'both-sides', sideliteSlab: sideliteStyle,
      sideliteGlass: sideGlass ? { glass: sideGlass.name, glassCategory: 'Decorative Glass', glassAsset: sideGlass.asset } : undefined,
    }, [key])
    if (!fixture) continue
    fixture.appearance = {
      ...fixture.appearance,
      sideliteAssetSrc: sideliteSlabAsset(family, sideliteStyle),
      sideliteMaskSrc: sideliteGlassMask(family, sideliteStyle),
      sideliteGlassSrc: sideGlass?.asset,
      sideliteClearGlassBase: true,
    }
    fixtures.push(fixture)
  }
}

Object.assign(window, {
  integrityFixtureCount: fixtures.length,
  integrityCoverage: [...new Set(fixtures.flatMap(fixture => fixture.coverage))],
  integrityFixtureName(index: number) { return fixtures[index]?.name },
  async renderIntegrityFixture(index: number) {
    const fixture = fixtures[index]
    if (!fixture) throw new Error(`Unknown fixture ${index}`)
    return renderPdfProduct(fixture.configuration, fixture.appearance)
  },
})
