import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import dealerContext from '../api/dealer-context'
import type { PublicDealerBrand } from '../src/types/dealerBranding'
import { dealerLogoAnchor, dealerSurfaceLogos, safeLogoWebsite } from '../src/utils/dealerBranding'

process.env.SUPABASE_URL = 'https://hgi-portal-dev.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key'

const originalLogo = 'https://cdn.example.invalid/original.png'
const secondLogo = 'https://cdn.example.invalid/second.png'

const dealerRow = {
  id: '9f2c6160-4f8a-4709-b851-811d9bd726d0',
  is_active: true,
  slug: 'test-dealer-portal-access-qa',
  company_name: 'TEST Dealer - Portal Access QA',
  logo_url: originalLogo,
  logo_light_url: null,
  logo_generated_light_url: null,
  logo_black_url: null,
  logo_generated_black_url: null,
  logo_generated_black_usable: null,
  logo_header_variant: 'original',
  logo_pages_variant: 'black',
  logo_generated_light_usable: null,
  logo_placement: 'header',
  logo_display: 'dual',
  logo_secondary_url: secondLogo,
  logo_secondary_header_variant: 'white',
  logo_secondary_pages_variant: 'original',
  logo_website_url: '  https://logo.example/one  ',
  logo_secondary_website_url: 'https://partner.example/two',
  primary_color: '#2456a6',
  secondary_color: '#40454c',
  website: 'https://dealer.example/home',
  heading_font_family: null, heading_font_weight: null, heading_font_size: null,
  body_font_family: null, body_font_weight: null, body_font_size: null,
  custom_heading_font_url: null, custom_heading_font_name: null, custom_heading_font_weight: null,
  custom_body_font_url: null, custom_body_font_name: null, custom_body_font_weight: null,
}

type ApiResult = { status: number; body: unknown }

async function invoke(rows: unknown[] | { status: number; body: string }, options?: { then?: Array<unknown[] | { status: number; body: string }> }) {
  const requests: string[] = []
  const responses = [rows, ...(options?.then ?? [])]
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
    logoGeneratedLightUrl: null,
    logoGeneratedLightUsable: null,
    logoBlackUrl: null,
    logoGeneratedBlackUrl: null,
    logoGeneratedBlackUsable: null,
    logoHeaderVariant: 'original',
    logoPagesVariant: 'original',
    logoPlacement: 'header',
    logoDisplay: 'single',
    primaryColor: '#2456a6',
    secondaryColor: '#40454c',
    websiteUrl: 'https://dealer.example/home',
    headingFontFamily: null, headingFontWeight: null, headingFontSize: null,
    bodyFontFamily: null, bodyFontWeight: null, bodyFontSize: null,
    customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null,
    customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
    ...overrides,
  }
}

assert.equal(safeLogoWebsite('  https://example.com/brand  '), 'https://example.com/brand')
assert.equal(safeLogoWebsite('http://dealer.example/path'), 'http://dealer.example/path')
assert.equal(safeLogoWebsite('javascript:alert(1)'), null)
assert.equal(safeLogoWebsite('data:text/html,hi'), null)
assert.equal(safeLogoWebsite('vbscript:msgbox(1)'), null)
assert.equal(safeLogoWebsite('file:///tmp/x'), null)
assert.equal(safeLogoWebsite('https://example.com/has space'), null)
assert.equal(safeLogoWebsite(''), null)

const oneLogo = dealerLogoAnchor(brand(), 'primary')
assert.equal(oneLogo?.href, 'https://dealer.example/home')
assert.equal(oneLogo?.label, 'Unified Home Remodeling website (opens in new tab)')
assert.equal(dealerLogoAnchor(brand({ logoWebsiteUrl: 'https://logo.example/one' }), 'primary')?.href, 'https://logo.example/one')
assert.equal(dealerLogoAnchor(brand({ websiteUrl: null, logoWebsiteUrl: ' javascript:alert(1) ' }), 'primary'), null)
assert.equal(dealerLogoAnchor(brand({ websiteUrl: null }), 'primary'), null)
assert.equal(dealerLogoAnchor(brand({ logoDisplay: 'dual', logoSecondaryWebsiteUrl: null, logoWebsiteUrl: 'https://logo.example/one' }), 'secondary'), null)
assert.equal(dealerLogoAnchor(brand({ logoDisplay: 'dual', logoSecondaryWebsiteUrl: 'https://partner.example' }), 'secondary')?.href, 'https://partner.example/')
assert.equal(dealerLogoAnchor(brand({ logoDisplay: 'dual', logoSecondaryWebsiteUrl: 'javascript:alert(1)', logoWebsiteUrl: 'https://logo.example/one' }), 'secondary'), null)

const singleStillHidesSecond = dealerSurfaceLogos(brand({ logoSecondaryUrl: secondLogo, logoSecondaryWebsiteUrl: 'https://partner.example' }), 'home-header')
assert.equal(singleStillHidesSecond.showPair, false)
const pair = dealerSurfaceLogos(brand({
  logoDisplay: 'dual', logoSecondaryUrl: secondLogo, logoHeaderVariant: 'original', logoSecondaryHeaderVariant: 'original',
}), 'home-header')
assert.equal(pair.showPair, true)
assert.equal(pair.secondary?.logoUrl, secondLogo)
const missingSecond = dealerSurfaceLogos(brand({ logoDisplay: 'dual', logoHeaderVariant: 'original', logoSecondaryWebsiteUrl: 'https://partner.example' }), 'home-header')
assert.equal(missingSecond.showPair, false)
assert.equal(missingSecond.primary?.logoUrl, originalLogo)

const linked = await invoke([dealerRow])
assert.equal(linked.status, 200)
assert.match(selectOf(linked.requests[0]), /logo_website_url,logo_secondary_website_url/)
const linkedDealer = (linked.body as { dealer: PublicDealerBrand }).dealer
assert.equal(linkedDealer.logoWebsiteUrl, 'https://logo.example/one')
assert.equal(linkedDealer.logoSecondaryWebsiteUrl, 'https://partner.example/two')
assert.equal(linkedDealer.websiteUrl, 'https://dealer.example/home')
assert.equal(linkedDealer.logoHeaderVariant, 'original')
assert.equal(linkedDealer.logoPagesVariant, 'black')
assert.equal(JSON.stringify(linked.body).includes(dealerRow.id), false)

const unsafe = await invoke([{
  ...dealerRow,
  logo_website_url: 'javascript:alert(1)',
  logo_secondary_website_url: 'data:text/html,hi',
}])
const unsafeDealer = (unsafe.body as { dealer: PublicDealerBrand }).dealer
assert.equal(unsafeDealer.logoWebsiteUrl, null)
assert.equal(unsafeDealer.logoSecondaryWebsiteUrl, null)
assert.equal(unsafeDealer.websiteUrl, 'https://dealer.example/home')
assert.equal(dealerLogoAnchor(unsafeDealer, 'primary')?.href, 'https://dealer.example/home')
assert.equal(dealerLogoAnchor(unsafeDealer, 'secondary'), null)

const beforeMigration = await invoke(
  { status: 400, body: JSON.stringify({ message: 'column dealers.logo_secondary_website_url does not exist' }) },
  { then: [[{ ...dealerRow, logo_website_url: undefined, logo_secondary_website_url: undefined }]] },
)
assert.equal(beforeMigration.status, 200)
assert.equal(beforeMigration.requests.length, 2)
assert.match(selectOf(beforeMigration.requests[0]), /logo_website_url/)
assert.doesNotMatch(selectOf(beforeMigration.requests[1]), /logo_website_url|logo_secondary_website_url/)
assert.match(selectOf(beforeMigration.requests[1]), /logo_display/)
const legacyDealer = (beforeMigration.body as { dealer: PublicDealerBrand }).dealer
assert.equal(legacyDealer.logoDisplay, 'dual')
assert.equal(legacyDealer.logoSecondaryUrl, secondLogo)
assert.equal(legacyDealer.logoWebsiteUrl, null)
assert.equal(legacyDealer.logoSecondaryWebsiteUrl, null)
assert.equal(dealerLogoAnchor(legacyDealer, 'primary')?.href, 'https://dealer.example/home')

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const hero = app.slice(app.indexOf('dealer-hero-logo'), app.indexOf('dealer-hero-logo') + 700)
assert.match(app, /primaryLink=\{headerPrimaryLink\}/)
assert.match(app, /secondaryLink=\{headerSecondaryLink\}/)
assert.doesNotMatch(hero, /primaryLink=|secondaryLink=/)
const finder = readFileSync(new URL('../src/features/find-my-door/FindMyDoorPage.tsx', import.meta.url), 'utf8')
assert.match(finder, /primaryLink=\{primaryLink\}/)
assert.match(finder, /secondaryLink=\{secondaryLink\}/)
const mark = readFileSync(new URL('../src/components/DealerBrandMark.tsx', import.meta.url), 'utf8')
assert.match(mark, /rel="noopener noreferrer"/)
assert.match(mark, /target="_blank"/)
assert.match(mark, /className="dealer-logo-divider logo-pair__rule"/)
assert.doesNotMatch(mark, /<a[^>]*dealer-logo-divider|dealer-logo-divider[^>]*<a/)
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
assert.match(styles, /dealer-brand-mark\.dealer-brand-mark--pair>img/)
assert.match(styles, /pointer-events:none/)

console.info('Verified per-logo website links, Logo 1 fallback, Logo 2 with no fallback, and sanitization before the public response.')
