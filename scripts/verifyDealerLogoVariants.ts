import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import dealerContext from '../api/dealer-context'
import { dealerLogo, dealerSurfaceLogo, dealerSurfaceLogos, selectedSecondaryLogoUrl, explicitBlackLogoUrl, explicitWhiteLogoUrl, resolvedDealerLightLogo } from '../src/utils/dealerBranding'
import type { DealerLogoVariant, PublicDealerBrand } from '../src/types/dealerBranding'

process.env.SUPABASE_URL = 'https://hgi-portal-dev.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key'

const originalLogo = 'https://cdn.example.invalid/original.png'
const customWhite = 'https://cdn.example.invalid/custom-white.png'
const generatedWhite = 'https://cdn.example.invalid/generated-white.png'
const customBlack = 'https://cdn.example.invalid/custom-black.png'
const generatedBlack = 'https://cdn.example.invalid/generated-black.png'

const dealerRow = {
  id: '9f2c6160-4f8a-4709-b851-811d9bd726d0',
  is_active: true,
  slug: 'test-dealer-portal-access-qa',
  company_name: 'TEST Dealer - Portal Access QA',
  logo_url: originalLogo,
  logo_light_url: customWhite,
  logo_generated_light_url: generatedWhite,
  logo_black_url: customBlack,
  logo_generated_black_url: generatedBlack,
  logo_generated_black_usable: null as boolean | null,
  logo_header_variant: null as string | null,
  logo_pages_variant: null as string | null,
  logo_generated_light_usable: null as boolean | null,
  logo_placement: 'header',
  primary_color: '#2456a6',
  secondary_color: '#40454c',
  website: 'https://dealer.example.com/home',
  heading_font_family: null, heading_font_weight: null, heading_font_size: null,
  body_font_family: null, body_font_weight: null, body_font_size: null,
  custom_heading_font_url: null, custom_heading_font_name: null, custom_heading_font_weight: null,
  custom_body_font_url: null, custom_body_font_name: null, custom_body_font_weight: null,
}

type ApiResult = { status: number; body: unknown }

async function invoke(rows: unknown[] | { status: number; body: string }, options?: { then?: unknown[] | { status: number; body: string } }) {
  const requests: string[] = []
  const responses = [rows, options?.then].filter((value) => value !== undefined) as Array<unknown[] | { status: number; body: string }>
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const next = responses.shift() ?? rows
    if (Array.isArray(next)) return Response.json(next)
    return new Response(next.body, { status: next.status, headers: { 'content-type': 'application/json' } })
  }
  const result: ApiResult = { status: 0, body: null }
  await dealerContext(
    { method: 'GET', query: { slug: dealerRow.slug } },
    {
      setHeader() {},
      status(code) { result.status = code; return this },
      json(body) { result.body = body },
    },
  )
  return { ...result, requests }
}

function selectOf(url: string) {
  return new URL(url).searchParams.get('select') ?? ''
}

function brand(overrides: Partial<PublicDealerBrand> = {}): PublicDealerBrand {
  return {
    slug: 'uhr',
    companyName: 'Unified Home Remodeling',
    logoUrl: originalLogo,
    logoLightUrl: null,
    logoGeneratedLightUrl: generatedWhite,
    logoGeneratedLightUsable: null,
    logoBlackUrl: null,
    logoGeneratedBlackUrl: generatedBlack,
    logoGeneratedBlackUsable: null,
    logoHeaderVariant: null,
    logoPagesVariant: null,
    logoPlacement: 'header',
    primaryColor: '#F23D4A',
    secondaryColor: '#40454C',
    websiteUrl: null,
    headingFontFamily: null, headingFontWeight: null, headingFontSize: null,
    bodyFontFamily: null, bodyFontWeight: null, bodyFontSize: null,
    customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null,
    customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
    ...overrides,
  }
}

const legacy = await invoke([dealerRow])
assert.equal(legacy.status, 200)
assert.match(selectOf(legacy.requests[0]), /logo_black_url/)
assert.match(selectOf(legacy.requests[0]), /logo_generated_black_url/)
assert.match(selectOf(legacy.requests[0]), /logo_generated_black_usable/)
assert.match(selectOf(legacy.requests[0]), /logo_header_variant/)
assert.match(selectOf(legacy.requests[0]), /logo_pages_variant/)
assert.doesNotMatch(selectOf(legacy.requests[0]), /logo_source_url/)
const legacyDealer = (legacy.body as { dealer: PublicDealerBrand }).dealer
assert.equal(legacyDealer.logoUrl, originalLogo)
assert.equal(legacyDealer.logoLightUrl, customWhite)
assert.equal(legacyDealer.logoBlackUrl, customBlack)
assert.equal(legacyDealer.logoGeneratedBlackUrl, generatedBlack)
assert.equal(legacyDealer.logoGeneratedBlackUsable, null)
assert.equal(legacyDealer.logoHeaderVariant, null)
assert.equal(legacyDealer.logoPagesVariant, null)
assert.equal(JSON.stringify(legacy.body).includes(dealerRow.id), false)

const separate = await invoke([{
  ...dealerRow,
  logo_light_url: null,
  logo_black_url: null,
  logo_header_variant: 'white',
  logo_pages_variant: 'black',
  logo_generated_light_usable: true,
  logo_generated_black_usable: true,
}])
const separateDealer = (separate.body as { dealer: PublicDealerBrand }).dealer
assert.equal(separateDealer.logoHeaderVariant, 'white')
assert.equal(separateDealer.logoPagesVariant, 'black')
assert.equal(separateDealer.logoGeneratedLightUsable, true)
assert.equal(separateDealer.logoGeneratedBlackUsable, true)

const retiredLightValue = await invoke([{ ...dealerRow, logo_header_variant: 'light', logo_pages_variant: 'automatic' }])
const retired = (retiredLightValue.body as { dealer: PublicDealerBrand }).dealer
assert.equal(retired.logoHeaderVariant, null)
assert.equal(retired.logoPagesVariant, null)

const missingColumns = await invoke(
  { status: 400, body: JSON.stringify({ code: '42703', message: 'column dealers.logo_black_url does not exist' }) },
  { then: [{ ...dealerRow, logo_black_url: undefined, logo_generated_black_url: undefined, logo_generated_black_usable: undefined, logo_header_variant: undefined, logo_pages_variant: undefined, logo_generated_light_usable: undefined }] },
)
assert.equal(missingColumns.status, 200)
assert.equal(missingColumns.requests.length, 2)
assert.match(selectOf(missingColumns.requests[0]), /logo_generated_black_usable/)
assert.doesNotMatch(selectOf(missingColumns.requests[1]), /logo_black_url|logo_generated_black|logo_header_variant|logo_pages_variant|logo_generated_light_usable/)
const missingDealer = (missingColumns.body as { dealer: PublicDealerBrand }).dealer
assert.equal(missingDealer.logoBlackUrl, null)
assert.equal(missingDealer.logoGeneratedBlackUrl, null)
assert.equal(missingDealer.logoGeneratedBlackUsable, null)
assert.equal(missingDealer.logoHeaderVariant, null)
assert.equal(missingDealer.logoPagesVariant, null)
assert.equal(resolvedDealerLightLogo(missingDealer), customWhite)

const unrelatedFailure = await invoke({ status: 400, body: JSON.stringify({ message: 'invalid query' }) })
assert.equal(unrelatedFailure.status, 502)
assert.equal(unrelatedFailure.requests.length, 1)
const serverFailure = await invoke({ status: 500, body: JSON.stringify({ message: 'column dealers.logo_black_url does not exist' }) })
assert.equal(serverFailure.status, 502)
assert.equal(serverFailure.requests.length, 1)

const legacyLight = brand()
assert.equal(resolvedDealerLightLogo(legacyLight), generatedWhite)
assert.equal(dealerLogo(legacyLight, true), generatedWhite)
assert.equal(dealerLogo(legacyLight, false), originalLogo)
assert.deepEqual(dealerSurfaceLogo(legacyLight, 'home-header'), {
  logoUrl: generatedWhite,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo(legacyLight, 'page-header'), {
  logoUrl: generatedWhite,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

const choices = [null, 'original', 'black', 'white'] as const
for (const headerVariant of choices) {
  for (const pagesVariant of choices) {
    for (const whiteUsable of [true, false, null] as const) {
      for (const blackUsable of [true, false, null] as const) {
        for (const custom of [true, false]) {
          const sample = brand({
            logoPlacement: 'hero',
            logoLightUrl: custom ? customWhite : null,
            logoBlackUrl: custom ? customBlack : null,
            logoGeneratedLightUsable: whiteUsable,
            logoGeneratedBlackUsable: blackUsable,
            logoHeaderVariant: headerVariant,
            logoPagesVariant: pagesVariant,
            secondaryColor: '#40454C',
          })
          const offeredWhite = custom ? customWhite : whiteUsable === true ? generatedWhite : null
          const offeredBlack = custom ? customBlack : blackUsable === true ? generatedBlack : null
          const legacyChoice = custom ? customWhite : whiteUsable === false ? null : generatedWhite
          const expectSurface = (variant: DealerLogoVariant | null, surface: 'home-hero' | 'page-header') => {
            if (!variant) {
              return surface === 'home-hero'
                ? { logoUrl: originalLogo, plate: false, darkHero: false }
                : { logoUrl: legacyChoice || originalLogo, plate: false, darkHero: false }
            }
            const selected = variant === 'white' ? offeredWhite : variant === 'black' ? offeredBlack : originalLogo
            if (selected) {
              return {
                logoUrl: selected,
                plate: false,
                darkHero: false,
              }
            }
            return { logoUrl: originalLogo, plate: false, darkHero: false }
          }
          const home = dealerSurfaceLogo(sample, 'home-hero')
          const page = dealerSurfaceLogo(sample, 'page-header')
          const homeExpected = expectSurface(headerVariant, 'home-hero')
          const pageExpected = expectSurface(pagesVariant, 'page-header')
          assert.equal(dealerSurfaceLogo(sample, 'home-header'), null)
          assert.equal(home?.logoUrl, homeExpected.logoUrl, `home ${headerVariant}/${pagesVariant} white=${whiteUsable} black=${blackUsable} custom=${custom}`)
          assert.equal(home?.needsContrastContainer, homeExpected.plate)
          assert.equal(home?.usesDarkSurface, homeExpected.darkHero)
          assert.equal(page?.logoUrl, pageExpected.logoUrl, `page ${headerVariant}/${pagesVariant} white=${whiteUsable} black=${blackUsable} custom=${custom}`)
          assert.equal(page?.needsContrastContainer, pageExpected.plate)
        }
      }
    }
  }
}

const explicitWhiteUnchecked = brand({ logoHeaderVariant: 'white', logoPagesVariant: 'white', logoGeneratedLightUsable: null, logoLightUrl: null })
assert.equal(explicitWhiteLogoUrl(explicitWhiteUnchecked), null)
assert.deepEqual(dealerSurfaceLogo(explicitWhiteUnchecked, 'page-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
const explicitBlackUnchecked = brand({ logoHeaderVariant: 'black', logoPagesVariant: 'black', logoGeneratedBlackUsable: null, logoBlackUrl: null })
assert.equal(explicitBlackLogoUrl(explicitBlackUnchecked), null)
assert.deepEqual(dealerSurfaceLogo(explicitBlackUnchecked, 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.equal(explicitWhiteLogoUrl(brand({ logoLightUrl: customWhite, logoGeneratedLightUsable: false })), customWhite)
assert.equal(explicitBlackLogoUrl(brand({ logoBlackUrl: customBlack, logoGeneratedBlackUsable: false })), customBlack)
assert.equal(explicitWhiteLogoUrl(brand({ logoGeneratedLightUsable: true })), generatedWhite)
assert.equal(explicitBlackLogoUrl(brand({ logoGeneratedBlackUsable: true })), generatedBlack)
assert.equal(explicitWhiteLogoUrl(brand({ logoGeneratedLightUsable: false })), null)
assert.equal(explicitBlackLogoUrl(brand({ logoGeneratedBlackUsable: false })), null)
assert.equal(dealerSurfaceLogo(brand({ logoPagesVariant: 'white', logoUrl: null, logoLightUrl: null, logoGeneratedLightUsable: null }), 'page-header')?.logoUrl, null)
assert.equal(dealerSurfaceLogo(brand({ logoHeaderVariant: 'black', logoUrl: null, logoBlackUrl: null, logoGeneratedBlackUsable: false }), 'home-header')?.logoUrl, null)
assert.deepEqual(dealerSurfaceLogo(brand({ logoPlacement: 'hero', logoHeaderVariant: 'white', logoGeneratedLightUsable: true }), 'home-hero'), {
  logoUrl: generatedWhite,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo(brand({ logoHeaderVariant: 'original', secondaryColor: '#f0b429' }), 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

const secondLogo = 'https://cdn.example.invalid/second.png'
const secondWhite = 'https://cdn.example.invalid/second-white.png'
const secondBlack = 'https://cdn.example.invalid/second-black.png'
const dual = dealerSurfaceLogos(brand({ logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'original', secondaryColor: '#05040b', logoSecondaryUrl: secondLogo }), 'home-header')
assert.equal(dual.showPair, true)
assert.equal(dual.primary?.logoUrl, originalLogo)
assert.equal(dual.secondary?.logoUrl, secondLogo)
const missingWhite = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'white', secondaryColor: '#05040b',
  logoLightUrl: customWhite, logoSecondaryUrl: secondLogo, logoSecondaryLightUrl: null, logoSecondaryGeneratedLightUsable: false,
}), 'home-header')
assert.equal(missingWhite.showPair, false)
assert.equal(missingWhite.primary?.logoUrl, customWhite)
const readableWhite = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'white', secondaryColor: '#05040b',
  logoLightUrl: customWhite, logoSecondaryLightUrl: secondWhite,
}), 'home-header')
assert.equal(readableWhite.showPair, true)
assert.equal(readableWhite.secondary?.logoUrl, secondWhite)
const whiteOnLightHero = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'hero', logoHeaderVariant: 'white', secondaryColor: '#f7f8f9',
  logoLightUrl: customWhite, logoSecondaryLightUrl: secondWhite,
}), 'home-hero')
assert.equal(whiteOnLightHero.showPair, true)
assert.equal(whiteOnLightHero.primary?.usesDarkSurface, false)
assert.equal(whiteOnLightHero.secondary?.logoUrl, secondWhite)
const blackOnDark = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'black', secondaryColor: '#05040b',
  logoBlackUrl: customBlack, logoSecondaryBlackUrl: secondBlack,
}), 'home-header')
assert.equal(blackOnDark.showPair, true)
assert.equal(blackOnDark.secondary?.logoUrl, secondBlack)
const blackOnLightPage = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'hero', logoPagesVariant: 'black', secondaryColor: '#f7f8f9',
  logoSecondaryBlackUrl: secondBlack,
}), 'page-header')
assert.equal(blackOnLightPage.showPair, true)
assert.equal(blackOnLightPage.secondary?.logoUrl, secondBlack)
const unreadableGenerated = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'white', secondaryColor: '#05040b',
  logoLightUrl: customWhite, logoSecondaryGeneratedLightUrl: secondWhite, logoSecondaryGeneratedLightUsable: false,
}), 'home-header')
assert.equal(unreadableGenerated.showPair, false)
assert.equal(dealerSurfaceLogo(brand({ logoHeaderVariant: 'white', logoLightUrl: null, logoGeneratedLightUsable: false }), 'page-header')?.logoUrl, originalLogo)
assert.equal(selectedSecondaryLogoUrl(brand({
  logoPlacement: 'hero', logoHeaderVariant: 'white', logoSecondaryUrl: secondLogo, logoSecondaryLightUrl: null, logoSecondaryGeneratedLightUsable: false,
}), 'home-hero'), null)
const missingSecond = dealerSurfaceLogos(brand({ logoDisplay: 'dual', logoPlacement: 'header', logoHeaderVariant: 'original' }), 'home-header')
assert.equal(missingSecond.showPair, false)
assert.equal(missingSecond.primary?.logoUrl, originalLogo)
const stillSingle = dealerSurfaceLogos(brand({ logoPlacement: 'header', logoHeaderVariant: 'original', logoSecondaryUrl: secondLogo }), 'home-header')
assert.equal(stillSingle.showPair, false)
const homeCss = readFileSync(new URL('../src/home.css', import.meta.url), 'utf8')
const below700 = homeCss.slice(homeCss.indexOf('@media(max-width:700px)'), homeCss.indexOf('@media(max-width:560px)'))
assert.match(below700, /\.builder-typography\.home-app\.dealer-logo-in-hero \.home-hero h1\{margin-bottom:12px\}/)
assert.match(below700, /\.home-app\.dealer-logo-in-hero \.home-hero-copy>p\{margin-bottom:18px\}/)
assert.match(below700, /\.home-app\.dealer-cobranded \.home-preview-caption\{padding:18px 0 34px\}/)
assert.doesNotMatch(homeCss.slice(homeCss.indexOf('@media(max-width:560px)')), /margin-bottom:12px|margin-bottom:18px|padding:18px 0 34px/)
assert.match(readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8'), /dealer-brand-mark\.dealer-brand-mark--pair>img/)
const resolution = readFileSync(new URL('../server/dealerResolution.ts', import.meta.url), 'utf8')
assert.match(resolution, /missingDualLogoColumns/)
assert.match(resolution, /logo_display,logo_secondary_url/)
assert.match(readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), /secondaryLogoUrl=\{dealerHeaderLogos\?\.showPair/)
assert.match(readFileSync(new URL('../src/features/find-my-door/FindMyDoorPage.tsx', import.meta.url), 'utf8'), /secondaryLogoUrl=\{pageLogos\?\.showPair/)

console.info('Verified original, black, and white dealer logos render without a contrast plate, fallbacks stay on the original, and null variants keep the legacy logo.')
