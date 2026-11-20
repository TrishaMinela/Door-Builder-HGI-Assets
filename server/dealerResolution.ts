import { isValidDealerSlug, normalizeDealerSlug } from '../src/utils/dealerSlug.js'
import type { PublicDealerBrand } from '../src/types/dealerBranding.js'

declare const process: { env: Record<string, string | undefined> }

type DealerRow = {
  id: string
  is_active: boolean
  slug: string
  company_name: string
  logo_url: string | null
  logo_light_url: string | null
  logo_generated_light_url: string | null
  logo_black_url?: string | null
  logo_generated_black_url?: string | null
  logo_generated_black_usable?: boolean | null
  logo_header_variant?: string | null
  logo_pages_variant?: string | null
  logo_generated_light_usable?: boolean | null
  logo_display?: string | null
  logo_secondary_url?: string | null
  logo_secondary_light_url?: string | null
  logo_secondary_generated_light_url?: string | null
  logo_secondary_generated_light_usable?: boolean | null
  logo_secondary_black_url?: string | null
  logo_secondary_generated_black_url?: string | null
  logo_secondary_generated_black_usable?: boolean | null
  logo_secondary_header_variant?: string | null
  logo_secondary_pages_variant?: string | null
  logo_website_url?: string | null
  logo_secondary_website_url?: string | null
  logo_placement: string | null
  primary_color: string | null
  secondary_color: string | null
  website: string | null
  heading_font_family: string | null
  heading_font_weight: number | null
  heading_font_size: number | null
  body_font_family: string | null
  body_font_weight: number | null
  body_font_size: number | null
  custom_heading_font_url: string | null
  custom_heading_font_name: string | null
  custom_heading_font_weight: number | null
  custom_body_font_url: string | null
  custom_body_font_name: string | null
  custom_body_font_weight: number | null
}

export class DealerResolutionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 502, message: string) {
    super(message)
  }
}

function supabaseCredentials() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
  return { supabaseUrl, serviceRoleKey }
}

async function resolveDealer(dealerSlug: unknown): Promise<DealerRow | null> {
  if (dealerSlug === undefined || dealerSlug === null || dealerSlug === '') return null
  if (typeof dealerSlug !== 'string') throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const slug = normalizeDealerSlug(dealerSlug)
  if (!isValidDealerSlug(slug)) throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const dealers = await fetchDealerRows(slug)
  if (dealers.length !== 1) throw new DealerResolutionError(404, 'This dealer link is unavailable.')
  if (!dealers[0].is_active) throw new DealerResolutionError(403, 'This dealer link is unavailable.')
  return dealers[0]
}

export async function resolveDealerId(dealerSlug: unknown): Promise<string | null> {
  const dealer = await resolveDealer(dealerSlug)
  return dealer?.id ?? null
}

export async function resolveDealerIdentity(dealerSlug: unknown): Promise<{ id: string; slug: string; companyName: string } | null> {
  const dealer = await resolveDealer(dealerSlug)
  return dealer ? { id: dealer.id, slug: dealer.slug, companyName: dealer.company_name } : null
}

export async function resolveDealerBrand(dealerSlug: unknown): Promise<PublicDealerBrand | null> {
  const dealer = await resolveDealer(dealerSlug)
  if (!dealer) return null
  return {
    slug: dealer.slug,
    companyName: dealer.company_name,
    logoUrl: dealer.logo_url,
    logoLightUrl: dealer.logo_light_url,
    logoGeneratedLightUrl: dealer.logo_generated_light_url,
    logoGeneratedLightUsable: safeUsableFlag(dealer.logo_generated_light_usable),
    logoBlackUrl: dealer.logo_black_url ?? null,
    logoGeneratedBlackUrl: dealer.logo_generated_black_url ?? null,
    logoGeneratedBlackUsable: safeUsableFlag(dealer.logo_generated_black_usable),
    logoHeaderVariant: safeLogoVariant(dealer.logo_header_variant),
    logoPagesVariant: safeLogoVariant(dealer.logo_pages_variant),
    logoPlacement: dealer.logo_placement === 'header' ? 'header' : 'hero',
    logoDisplay: dealer.logo_display === 'dual' ? 'dual' : 'single',
    logoSecondaryUrl: dealer.logo_secondary_url ?? null,
    logoSecondaryLightUrl: dealer.logo_secondary_light_url ?? null,
    logoSecondaryGeneratedLightUrl: dealer.logo_secondary_generated_light_url ?? null,
    logoSecondaryGeneratedLightUsable: safeUsableFlag(dealer.logo_secondary_generated_light_usable),
    logoSecondaryBlackUrl: dealer.logo_secondary_black_url ?? null,
    logoSecondaryGeneratedBlackUrl: dealer.logo_secondary_generated_black_url ?? null,
    logoSecondaryGeneratedBlackUsable: safeUsableFlag(dealer.logo_secondary_generated_black_usable),
    logoSecondaryHeaderVariant: safeLogoVariant(dealer.logo_secondary_header_variant),
    logoSecondaryPagesVariant: safeLogoVariant(dealer.logo_secondary_pages_variant),
    logoWebsiteUrl: safePublicWebsite(dealer.logo_website_url),
    logoSecondaryWebsiteUrl: safePublicWebsite(dealer.logo_secondary_website_url),
    primaryColor: dealer.primary_color,
    secondaryColor: dealer.secondary_color,
    websiteUrl: safePublicWebsite(dealer.website),
    headingFontFamily: safeFontFamily(dealer.heading_font_family),
    headingFontWeight: safeFontWeight(dealer.heading_font_weight),
    headingFontSize: safeFontSize(dealer.heading_font_size,24,72),
    bodyFontFamily: safeFontFamily(dealer.body_font_family),
    bodyFontWeight: safeFontWeight(dealer.body_font_weight),
    bodyFontSize: safeFontSize(dealer.body_font_size,14,22),
    customHeadingFontUrl: safeFontUrl(dealer.custom_heading_font_url),
    customHeadingFontName: safeFontName(dealer.custom_heading_font_name),
    customHeadingFontWeight: safeFontWeight(dealer.custom_heading_font_weight),
    customBodyFontUrl: safeFontUrl(dealer.custom_body_font_url),
    customBodyFontName: safeFontName(dealer.custom_body_font_name),
    customBodyFontWeight: safeFontWeight(dealer.custom_body_font_weight),
  }
}

const dealerBrandColumns = 'id,is_active,slug,company_name,logo_url,logo_light_url,logo_generated_light_url,logo_placement,primary_color,secondary_color,website,heading_font_family,heading_font_weight,heading_font_size,body_font_family,body_font_weight,body_font_size,custom_heading_font_url,custom_heading_font_name,custom_heading_font_weight,custom_body_font_url,custom_body_font_name,custom_body_font_weight'
const logoVariantColumns = 'logo_black_url,logo_generated_black_url,logo_generated_black_usable,logo_header_variant,logo_pages_variant,logo_generated_light_usable'
const logoDualColumns = 'logo_display,logo_secondary_url,logo_secondary_light_url,logo_secondary_generated_light_url,logo_secondary_generated_light_usable,logo_secondary_black_url,logo_secondary_generated_black_url,logo_secondary_generated_black_usable'
const logoSecondaryVariantColumns = 'logo_secondary_header_variant,logo_secondary_pages_variant'
const logoWebsiteColumns = 'logo_website_url,logo_secondary_website_url'

function missingLogoVariantColumns(status: number, body: string) {
  return status === 400 && /logo_black_url|logo_generated_black_url|logo_generated_black_usable|logo_header_variant|logo_pages_variant|logo_generated_light_usable/.test(body)
}

function missingDualLogoColumns(status: number, body: string) {
  return status === 400 && /logo_display|logo_secondary_/.test(body)
}

function missingSecondaryVariantColumns(status: number, body: string) {
  return status === 400 && /logo_secondary_header_variant|logo_secondary_pages_variant/.test(body)
}

function missingLogoWebsiteColumns(status: number, body: string) {
  if (status !== 400 || !/logo_website_url|logo_secondary_website_url/.test(body)) return false
  const rest = body.replaceAll('logo_secondary_website_url', '').replaceAll('logo_website_url', '')
  return !/logo_display|logo_secondary_/.test(rest)
}

async function fetchDealerRows(slug: string): Promise<DealerRow[]> {
  const full = await queryDealers(slug, `${dealerBrandColumns},${logoVariantColumns},${logoDualColumns},${logoSecondaryVariantColumns},${logoWebsiteColumns}`)
  if (full.ok) return await full.json() as DealerRow[]
  const fullBody = await full.text()
  if (missingLogoWebsiteColumns(full.status, fullBody)) {
    return fetchWithoutWebsiteColumns(slug)
  }
  return fetchFromLegacyColumns(slug, full.status, fullBody)
}

async function fetchWithoutWebsiteColumns(slug: string): Promise<DealerRow[]> {
  const next = await queryDealers(slug, `${dealerBrandColumns},${logoVariantColumns},${logoDualColumns},${logoSecondaryVariantColumns}`)
  if (next.ok) return await next.json() as DealerRow[]
  const body = await next.text()
  return fetchFromLegacyColumns(slug, next.status, body)
}

async function fetchFromLegacyColumns(slug: string, status: number, fullBody: string): Promise<DealerRow[]> {
  if (missingSecondaryVariantColumns(status, fullBody) && !/logo_display/.test(fullBody)) {
    const withoutSecondaryVariants = await queryDealers(slug, `${dealerBrandColumns},${logoVariantColumns},${logoDualColumns}`)
    if (withoutSecondaryVariants.ok) return await withoutSecondaryVariants.json() as DealerRow[]
    const narrowedBody = await withoutSecondaryVariants.text()
    return fetchWithoutDualColumns(slug, withoutSecondaryVariants.status, narrowedBody)
  }
  return fetchWithoutDualColumns(slug, status, fullBody)
}

async function fetchWithoutDualColumns(slug: string, status: number, body: string): Promise<DealerRow[]> {
  if (missingDualLogoColumns(status, body)) {
    const variants = await queryDealers(slug, `${dealerBrandColumns},${logoVariantColumns}`)
    if (variants.ok) return await variants.json() as DealerRow[]
    const variantBody = await variants.text()
    if (!missingLogoVariantColumns(variants.status, variantBody)) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
    const fallback = await queryDealers(slug, dealerBrandColumns)
    if (!fallback.ok) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
    return await fallback.json() as DealerRow[]
  }
  if (!missingLogoVariantColumns(status, body)) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
  const fallback = await queryDealers(slug, dealerBrandColumns)
  if (!fallback.ok) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
  return await fallback.json() as DealerRow[]
}

async function queryDealers(slug: string, select: string) {
  const { supabaseUrl, serviceRoleKey } = supabaseCredentials()
  const query = new URLSearchParams({ select, slug: `eq.${slug}`, limit: '2' })
  return fetch(`${supabaseUrl}/rest/v1/dealers?${query}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
}

function safeLogoVariant(value: string | null | undefined): 'original' | 'black' | 'white' | null {
  return value === 'original' || value === 'black' || value === 'white' ? value : null
}

function safeUsableFlag(value: boolean | null | undefined): boolean | null {
  return value === true || value === false ? value : null
}

const fontFamilies=new Set(['system','arial','helvetica','verdana','tahoma','trebuchet','georgia','times','courier','montserrat','caladea','custom'])
const fontWeights=new Set([300,400,500,600,700,800])
function safeFontFamily(value:string|null){return value&&fontFamilies.has(value)?value:null}
function safeFontWeight(value:number|null){return value&&fontWeights.has(value)?value:null}
function safeFontSize(value:number|null,min:number,max:number){return Number.isInteger(value)&&value!>=min&&value!<=max?value:null}
function safeFontName(value:string|null){return value&&/^[\w .-]{1,80}$/.test(value)?value:null}
function safeFontUrl(value:string|null){
  const url=safePublicWebsite(value)
  return url&&/\/storage\/v1\/object\/public\/dealer-fonts\//.test(url)&&/\.(woff2?|WOFF2?)(\?|$)/.test(url)?url:null
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 31 || code === 127) return true
  }
  return false
}

function safePublicWebsite(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2000 || hasControlCharacter(trimmed) || /\s/.test(trimmed) || !/^https?:\/\//i.test(trimmed)) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
