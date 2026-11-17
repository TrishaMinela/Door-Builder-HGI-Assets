import assert from 'node:assert/strict'
import dealerContext from '../api/dealer-context'
import { dealerLogo, dealerSurfaceLogo, explicitBlackLogoUrl, explicitWhiteLogoUrl, resolvedDealerLightLogo } from '../src/utils/dealerBranding'
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
            const dark = surface === 'page-header'
            if (!variant) {
              return surface === 'home-hero'
                ? { logoUrl: originalLogo, plate: false, darkHero: false }
                : { logoUrl: legacyChoice || originalLogo, plate: false, darkHero: false }
            }
            const selected = variant === 'white' ? offeredWhite : variant === 'black' ? offeredBlack : originalLogo
            if (selected) {
              return {
                logoUrl: selected,
                plate: dark && variant !== 'white',
                darkHero: variant === 'white' && surface === 'home-hero',
              }
            }
            return { logoUrl: originalLogo, plate: dark, darkHero: false }
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
  needsContrastContainer: true,
  usesDarkSurface: false,
})
const explicitBlackUnchecked = brand({ logoHeaderVariant: 'black', logoPagesVariant: 'black', logoGeneratedBlackUsable: null, logoBlackUrl: null })
assert.equal(explicitBlackLogoUrl(explicitBlackUnchecked), null)
assert.deepEqual(dealerSurfaceLogo(explicitBlackUnchecked, 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: true,
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
  usesDarkSurface: true,
})
assert.deepEqual(dealerSurfaceLogo(brand({ logoHeaderVariant: 'original', secondaryColor: '#f0b429' }), 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

console.info('Verified original, black, and white dealer logos, missing-column fallback, and null-variant legacy behavior.')
