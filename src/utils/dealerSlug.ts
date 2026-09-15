const RESERVED_PATHS = new Set([
  'api',
  'assets',
  'favicon.ico',
  'favicon.svg',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'site.webmanifest',
])

const DEALER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeDealerSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
}

export function dealerSlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return null
  const slug = normalizeDealerSlug(segments[0])
  if (!slug || RESERVED_PATHS.has(slug) || !DEALER_SLUG_PATTERN.test(slug) || slug.length > 63) return null
  return slug
}

export function isValidDealerSlug(value: string) {
  const normalized = normalizeDealerSlug(value)
  return normalized === value && normalized.length <= 63 && DEALER_SLUG_PATTERN.test(normalized)
}
