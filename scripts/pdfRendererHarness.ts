import { doorStyles, finishes, hardwareOptions, glassOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { fslGlassOptions, fslGridAsset } from '../src/data/fslGlass'
import { renderPdfProduct, type PdfProductAppearance } from '../src/utils/pdfProductRenderer'
import { generateSummaryPdf } from '../src/utils/pdf'
import type { DoorConfiguration } from '../src/types'

function fixture(code: string, finishId: string, sidelites: DoorConfiguration['sidelites'] = 'none', double: DoorConfiguration['doorConfigurationType'] = 'single', glassId?: string) {
  const style = doorStyles.find(item => item.code === code)!
  const finish = finishes.find(item => item.id === finishId)!
  const product = resolveDoorProduct(style, finish, finish.finishType === 'stain' ? 'Oak' : undefined, '22-gauge-steel')
  const glass = glassOptions.find(item => item.id === glassId) ?? null
  const configuration: DoorConfiguration = { style, finish, product, grain: finish.finishType === 'stain' ? 'Oak' : null, glass, grid: null, hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' }, sidelites, doorConfigurationType: double, doubleDoorLockPrep: double === 'french' ? 'DDLLBO' : undefined, sideliteSlab: 'fsl' }
  const family = sideliteAssetFamilyForSlab({ doorLineId: '22-gauge-steel', doorStyleCode: code, grain: configuration.grain })
  const sideGlass = fslGlassOptions.find(item => item.asset)!
  if (sidelites !== 'none') configuration.sideliteGlass = { glass: sideGlass.name, glassCategory: 'Decorative Glass', glassAsset: sideGlass.asset }
  const appearance: PdfProductAppearance = { glass, jambFinish: finish, sideliteAssetSrc: sideliteSlabAsset(family, 'fsl'), sideliteMaskSrc: sideliteGlassMask(family, 'fsl'), sideliteGlassSrc: sideGlass.asset, sideliteClearGlassBase: true }
  return { configuration, appearance }
}
const grid = fixture('F', 'paint-black', 'none', 'single', 'f-clear-grids')
grid.configuration.grid = { glassCoating: 'Low-E', gridLocation: 'SDL', gridPattern: '6 Lite', gridStyle: 'Flat' }
grid.appearance.glass = { ...grid.configuration.glass!, overlaysByDoorStyle: { F: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT6LWH.png' } }
grid.appearance.gridMatchesFinish = true
const sideGrid = fixture('F', 'paint-brown', 'both-sides', 'single', 'f-clear-no-grids')
sideGrid.configuration.sideliteGlass = { glass: 'Clear Glass with Grids', glassCategory: 'Clear Glass', gridLocation: 'SDL', gridPattern: '3 Lite', gridStyle: 'Flat' }
sideGrid.appearance.sideliteGlassSrc = fslGridAsset('3 Lite', 'Bronze')
sideGrid.appearance.sideliteGlassIsGrid = true
sideGrid.appearance.sideliteGridMatchesFinish = true
const independent = fixture('F1', 'paint-black')
independent.appearance.jambFinish = finishes.find(item => item.id === 'paint-white')!
const complex = fixture('F', 'stain-nutmeg', 'both-sides', 'french', 'f-clear-no-grids')
complex.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-white')!
complex.appearance.jambFinish = finishes.find(item => item.id === 'paint-brown')!
const sat = fixture('SAT', 'paint-black', 'none', 'single', 'sat-clear-nonstock')
sat.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-brown')!
const hrt = fixture('HRT', 'paint-brown', 'none', 'single', 'hrt-clear-s11rt')
hrt.appearance.glassFrameFinish = finishes.find(item => item.id === 'paint-black')!
const fixtures = [
  { name: 'single-paint', ...fixture('2PHD', 'paint-white') },
  { name: 'black', ...fixture('F1', 'paint-black') },
  { name: 'grain-stain', ...fixture('2PHD', 'stain-nutmeg') },
  { name: 'glass', ...fixture('F', 'paint-brown', 'none', 'single', 'f-clear-no-grids') },
  { name: 'glass-grids', ...grid },
  { name: 'one-sidelite', ...fixture('F1', 'paint-black', 'hinge-side') },
  { name: 'both-sidelites', ...fixture('F1', 'paint-black', 'both-sides') },
  { name: 'sidelite-grid', ...sideGrid },
  { name: 'french', ...fixture('2PHD', 'paint-brown', 'none', 'french') },
  { name: 'independent-jamb', ...independent },
  { name: 'hardware', ...fixture('F1', 'paint-brown') },
  { name: 'complex', ...complex },
  { name: 'savannah', ...fixture('2PHD', 'paint-black', 'lock-side', 'savannah') },
  ...['black-cherry', 'harvest-wheat', 'natural-gold', 'toasted-caramel'].map(id => ({ name: id, ...fixture('2PHD', `stain-${id}`) })),
  { name: 'SAT', ...sat },
  { name: 'HRT', ...hrt },
  { name: 'F48-glass', ...fixture('F48', 'paint-brown', 'none', 'single', 'f48-clear-no-grids') },
  { name: 'F482-glass', ...fixture('F482', 'paint-black', 'none', 'single', 'f48-clear-no-grids') },
  { name: 'half-lite', ...fixture('S', 'paint-white', 'none', 'single', 's-clear-no-grids') },
  ...(['DDLLAC', 'DDLLKP'] as const).map(prep => {
    const item = fixture('F1', 'paint-black', 'none', 'french')
    item.configuration.doubleDoorLockPrep = prep
    return { name: prep, ...item }
  }),
]
Object.assign(window, {
  pdfFixtures: fixtures.map(item => item.name),
  async renderFixture(index: number) {
    const { configuration, appearance } = fixtures[index]
    return renderPdfProduct(configuration, appearance)
  },
  async renderMissingAsset() {
    return renderPdfProduct(complex.configuration, { ...complex.appearance, sideliteGlassSrc: '/assets/missing-pdf-glass.png' })
  },
  async renderDelayedAsset() {
    const configuration = structuredClone(complex.configuration)
    const pending = renderPdfProduct(configuration, { ...complex.appearance, sideliteAssetSrc: `${complex.appearance.sideliteAssetSrc}?pdf-delay-test` })
    configuration.finish = finishes.find(item => item.id === 'paint-white')!
    return pending // Later state mutation must not alter this in-flight render.
  },
  async renderHardwareVariant() {
    const item = fixtures[10]
    return renderPdfProduct({ ...item.configuration, hardware: hardwareOptions.find(h => h.style !== item.configuration.hardware.style)! }, item.appearance)
  },
  async renderWithoutGrid() {
    return renderPdfProduct(grid.configuration, { ...grid.appearance, glass: glassOptions.find(item => item.id === 'f-clear-no-grids')!, gridMatchesFinish: false })
  },
  async createPdf() {
    const { configuration: c, appearance } = complex
    const result = await renderPdfProduct(c, appearance)
    const pdf = await generateSummaryPdf({ fullName: 'PDF Test Customer', email: 'test@example.com', phone: '5551234567', zip: '12345', notes: '' }, c.product, c.style, c.grain, c.finish, c.glass, c.grid, c.hardware, c.doorSwing, c.sidelites, 'FSL', c.sideliteGlass, { jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'Brown', jambFinishOverridden: true }, c.doorConfigurationType, result.dataUrl, c.doubleDoorLockPrep)
    return pdf.output('datauristring')
  },
})
