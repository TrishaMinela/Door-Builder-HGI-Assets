import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dealerBrandStyle } from '../src/utils/dealerBranding'
import {
  APPEARANCE_FIELDS,
  appearanceCssVars,
  appearanceFromStorage,
  resolvedBrandColors,
} from '../src/utils/doorBuilderAppearance'
import type { PublicDealerBrand } from '../src/types/dealerBranding'

const brand = {
  slug: 'example',
  companyName: 'Example',
  logoUrl: null,
  logoLightUrl: null,
  logoGeneratedLightUrl: null,
  logoGeneratedLightUsable: null,
  logoBlackUrl: null,
  logoGeneratedBlackUrl: null,
  logoGeneratedBlackUsable: null,
  logoHeaderVariant: null,
  logoPagesVariant: null,
  logoPlacement: 'header',
  primaryColor: '#235176',
  secondaryColor: '#8ebb53',
  websiteUrl: null,
  headingFontFamily: null,
  headingFontWeight: null,
  headingFontSize: null,
  bodyFontFamily: null,
  bodyFontWeight: null,
  bodyFontSize: null,
  customHeadingFontUrl: null,
  customHeadingFontName: null,
  customHeadingFontWeight: null,
  customBodyFontUrl: null,
  customBodyFontName: null,
  customBodyFontWeight: null,
} satisfies PublicDealerBrand

const untouched = dealerBrandStyle(brand)
assert.equal(untouched['--db-header-background' as keyof typeof untouched], undefined)
assert.equal(untouched['--dealer-secondary' as keyof typeof untouched], '#8ebb53')
assert.equal(untouched['--dealer-primary' as keyof typeof untouched], '#235176')

const themed = dealerBrandStyle({
  ...brand,
  appearance: appearanceFromStorage({
    headerBackground: '#ffffff',
    headerText: 'primary',
    bodyBackground: '#f7f3ea',
    primaryButtonBackground: 'secondary',
    webhookUrl: 'https://hooks.example/secret',
  }),
})
assert.equal(themed['--db-header-background' as keyof typeof themed], '#ffffff')
assert.equal(themed['--db-header-text' as keyof typeof themed], '#235176')
assert.equal(themed['--db-body-background' as keyof typeof themed], '#f7f3ea')
assert.equal(themed['--db-primary-button-background' as keyof typeof themed], '#8ebb53')
assert.equal(JSON.stringify(themed).includes('webhook'), false)

const followed = appearanceCssVars(
  { headerBackground: 'secondary' },
  resolvedBrandColors({ primaryColor: '#235176', secondaryColor: '#111111' }),
)
assert.equal(followed['--db-header-background'], '#111111')

const css = readFileSync(new URL('../src/styles/dealerAppearance.css', import.meta.url), 'utf8')
const resolution = readFileSync(new URL('../server/dealerResolution.ts', import.meta.url), 'utf8')
assert.match(resolution, /door_builder_appearance/)
assert.match(resolution, /missingAppearanceColumn/)
assert.match(resolution, /appearanceFromStorage/)
assert.doesNotMatch(css, /door-frame|option-visual|filter:/)
for (const field of APPEARANCE_FIELDS) {
  assert.match(css, new RegExp(field.cssVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}
assert.match(css, /--db-header-background, var\(--dealer-secondary\)/)
assert.match(css, /--db-header-background, var\(--black, #05040b\)/)

console.info('Verified Door Builder appearance tokens, brand-color references, and the public color sanitizer.')
