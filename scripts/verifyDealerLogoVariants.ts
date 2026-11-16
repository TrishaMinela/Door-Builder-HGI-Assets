import assert from 'node:assert/strict'
import dealerContext from '../api/dealer-context'
import { dealerLogo, dealerSurfaceLogo, resolvedDealerLightLogo } from '../src/utils/dealerBranding'
import type { DealerLogoVariant, PublicDealerBrand } from '../src/types/dealerBranding'

process.env.SUPABASE_URL = 'https://hgi-portal-dev.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key'

const originalLogo = 'https://cdn.example.invalid/original.png'
const customLight = 'https://cdn.example.invalid/custom-light.png'
const generatedLight = 'https://cdn.example.invalid/generated-light.png'

const dealerRow = {
  id: '9f2c6160-4f8a-4709-b851-811d9bd726d0',
  is_active: true,
  slug: 'test-dealer-portal-access-qa',
  company_name: 'TEST Dealer - Portal Access QA',
  logo_url: originalLogo,
  logo_light_url: customLight,
  logo_generated_light_url: generatedLight,
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
    logoGeneratedLightUrl: generatedLight,
    logoGeneratedLightUsable: null,
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
assert.match(selectOf(legacy.requests[0]), /logo_header_variant/)
assert.match(selectOf(legacy.requests[0]), /logo_pages_variant/)
assert.match(selectOf(legacy.requests[0]), /logo_generated_light_usable/)
assert.equal(legacy.requests.length, 1)
const legacyDealer = (legacy.body as { dealer: PublicDealerBrand }).dealer
assert.equal(legacyDealer.logoUrl, originalLogo)
assert.equal(legacyDealer.logoLightUrl, customLight)
assert.equal(legacyDealer.logoGeneratedLightUrl, generatedLight)
assert.equal(legacyDealer.logoGeneratedLightUsable, null)
assert.equal(legacyDealer.logoHeaderVariant, null)
assert.equal(legacyDealer.logoPagesVariant, null)
assert.equal(JSON.stringify(legacy.body).includes(dealerRow.id), false)

const separate = await invoke([{
  ...dealerRow,
  logo_light_url: null,
  logo_header_variant: 'original',
  logo_pages_variant: 'light',
  logo_generated_light_usable: true,
}])
const separateDealer = (separate.body as { dealer: PublicDealerBrand }).dealer
assert.equal(separateDealer.logoLightUrl, null)
assert.equal(separateDealer.logoGeneratedLightUrl, generatedLight)
assert.equal(separateDealer.logoGeneratedLightUsable, true)
assert.equal(separateDealer.logoHeaderVariant, 'original')
assert.equal(separateDealer.logoPagesVariant, 'light')

const invalidVariant = await invoke([{ ...dealerRow, logo_header_variant: 'automatic', logo_pages_variant: 'LIGHT', logo_generated_light_usable: false }])
const invalidDealer = (invalidVariant.body as { dealer: PublicDealerBrand }).dealer
assert.equal(invalidDealer.logoHeaderVariant, null)
assert.equal(invalidDealer.logoPagesVariant, null)
assert.equal(invalidDealer.logoGeneratedLightUsable, false)

const missingColumns = await invoke(
  { status: 400, body: JSON.stringify({ code: '42703', message: 'column dealers.logo_header_variant does not exist' }) },
  { then: [{ ...dealerRow, logo_header_variant: undefined, logo_pages_variant: undefined, logo_generated_light_usable: undefined }] },
)
assert.equal(missingColumns.status, 200)
assert.equal(missingColumns.requests.length, 2)
assert.match(selectOf(missingColumns.requests[0]), /logo_generated_light_usable/)
assert.doesNotMatch(selectOf(missingColumns.requests[1]), /logo_header_variant|logo_pages_variant|logo_generated_light_usable/)
const missingDealer = (missingColumns.body as { dealer: PublicDealerBrand }).dealer
assert.equal(missingDealer.logoUrl, originalLogo)
assert.equal(missingDealer.logoLightUrl, customLight)
assert.equal(missingDealer.logoGeneratedLightUrl, generatedLight)
assert.equal(missingDealer.logoHeaderVariant, null)
assert.equal(missingDealer.logoPagesVariant, null)
assert.equal(missingDealer.logoGeneratedLightUsable, null)
assert.equal(resolvedDealerLightLogo(missingDealer), customLight)

const schemaCacheMiss = await invoke(
  { status: 400, body: JSON.stringify({ code: 'PGRST204', message: "Could not find the 'logo_pages_variant' column of 'dealers' in the schema cache" }) },
  { then: [{ ...dealerRow, logo_light_url: null }] },
)
assert.equal(schemaCacheMiss.status, 200)
assert.equal(schemaCacheMiss.requests.length, 2)
assert.equal(resolvedDealerLightLogo((schemaCacheMiss.body as { dealer: PublicDealerBrand }).dealer), generatedLight)

const unrelatedFailure = await invoke({ status: 400, body: JSON.stringify({ message: 'invalid query' }) })
assert.equal(unrelatedFailure.status, 502)
assert.equal(unrelatedFailure.requests.length, 1)
const serverFailure = await invoke({ status: 500, body: JSON.stringify({ message: 'column dealers.logo_header_variant does not exist' }) })
assert.equal(serverFailure.status, 502)
assert.equal(serverFailure.requests.length, 1)
const fallbackFailure = await invoke(
  { status: 400, body: JSON.stringify({ message: 'column dealers.logo_generated_light_usable does not exist' }) },
  { then: { status: 500, body: 'still unavailable' } },
)
assert.equal(fallbackFailure.status, 502)
assert.equal(fallbackFailure.requests.length, 2)

const legacyLight = brand()
assert.equal(resolvedDealerLightLogo(legacyLight), generatedLight)
assert.equal(dealerLogo(legacyLight, true), generatedLight)
assert.equal(dealerLogo(legacyLight, false), originalLogo)
assert.deepEqual(dealerSurfaceLogo(legacyLight, 'page-header'), {
  logoUrl: generatedLight,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo(legacyLight, 'home-header'), {
  logoUrl: generatedLight,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

const usableGenerated = brand({ logoLightUrl: null, logoGeneratedLightUsable: true })
assert.equal(resolvedDealerLightLogo(usableGenerated), generatedLight)
const customWins = brand({ logoLightUrl: customLight, logoGeneratedLightUsable: false })
assert.equal(resolvedDealerLightLogo(customWins), customLight)
const unusableGenerated = brand({ logoLightUrl: null, logoGeneratedLightUsable: false })
assert.equal(resolvedDealerLightLogo(unusableGenerated), null)
assert.equal(dealerLogo(unusableGenerated, true), originalLogo)
const missingLight = brand({ logoLightUrl: null, logoGeneratedLightUrl: null, logoGeneratedLightUsable: true })
assert.equal(resolvedDealerLightLogo(missingLight), null)

const darkHeader = brand({ logoPlacement: 'header', logoLightUrl: customLight })
assert.equal(dealerSurfaceLogo(darkHeader, 'home-hero'), null)
for (const variant of ['original', 'light'] as DealerLogoVariant[]) {
  const chosen = brand({ ...darkHeader, logoHeaderVariant: variant, logoPagesVariant: variant === 'original' ? 'light' : 'original' })
  const home = dealerSurfaceLogo(chosen, 'home-header')
  const page = dealerSurfaceLogo(chosen, 'page-header')
  assert.notEqual(home?.logoUrl, page?.logoUrl)
}
assert.deepEqual(dealerSurfaceLogo({ ...darkHeader, logoHeaderVariant: 'original' }, 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: true,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo({ ...darkHeader, logoPagesVariant: 'light' }, 'page-header'), {
  logoUrl: customLight,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo({ ...darkHeader, logoHeaderVariant: 'original', secondaryColor: '#f0b429' }, 'home-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

const lightWithoutAsset = brand({ logoHeaderVariant: 'light', logoPagesVariant: 'light', logoLightUrl: null, logoGeneratedLightUsable: false })
assert.deepEqual(dealerSurfaceLogo(lightWithoutAsset, 'page-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: true,
  usesDarkSurface: false,
})
const lightMissingEntirely = brand({ logoPagesVariant: 'light', logoLightUrl: null, logoGeneratedLightUrl: null })
assert.deepEqual(dealerSurfaceLogo(lightMissingEntirely, 'page-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: true,
  usesDarkSurface: false,
})
const nothingToShow = brand({ logoPagesVariant: 'light', logoUrl: null, logoLightUrl: null, logoGeneratedLightUrl: null })
assert.deepEqual(dealerSurfaceLogo(nothingToShow, 'page-header'), {
  logoUrl: null,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
const originalMissing = brand({ logoHeaderVariant: 'original', logoUrl: null, logoLightUrl: customLight })
assert.deepEqual(dealerSurfaceLogo(originalMissing, 'home-header'), {
  logoUrl: customLight,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

const hero = brand({ logoPlacement: 'hero', logoUrl: originalLogo, logoLightUrl: customLight, logoHeaderVariant: null })
assert.equal(dealerSurfaceLogo(hero, 'home-header'), null)
assert.deepEqual(dealerSurfaceLogo(hero, 'home-hero'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
assert.deepEqual(dealerSurfaceLogo({ ...hero, logoHeaderVariant: 'light' }, 'home-hero'), {
  logoUrl: customLight,
  needsContrastContainer: false,
  usesDarkSurface: true,
})
assert.deepEqual(dealerSurfaceLogo({ ...hero, logoHeaderVariant: 'original' }, 'home-hero'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})
const legacyHeroLightOnly = brand({ logoPlacement: 'hero', logoUrl: null, logoLightUrl: customLight })
assert.deepEqual(dealerSurfaceLogo(legacyHeroLightOnly, 'home-hero'), {
  logoUrl: customLight,
  needsContrastContainer: false,
  usesDarkSurface: true,
})
const legacyDarkOriginalOnly = brand({ logoUrl: originalLogo, logoLightUrl: null, logoGeneratedLightUrl: null })
assert.deepEqual(dealerSurfaceLogo(legacyDarkOriginalOnly, 'page-header'), {
  logoUrl: originalLogo,
  needsContrastContainer: false,
  usesDarkSurface: false,
})

console.info('Verified separate dealer logos, missing-column fallback, and logo variant resolution.')
