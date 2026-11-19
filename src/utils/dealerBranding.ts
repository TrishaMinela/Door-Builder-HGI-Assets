import type { CSSProperties } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const FONT_STACKS: Record<string,string>={system:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',arial:'Arial,sans-serif',helvetica:'Helvetica,Arial,sans-serif',verdana:'Verdana,Geneva,sans-serif',tahoma:'Tahoma,Verdana,sans-serif',trebuchet:'"Trebuchet MS",Arial,sans-serif',georgia:'Georgia,"Times New Roman",serif',times:'"Times New Roman",Times,serif',courier:'"Courier New",Courier,monospace',montserrat:'Montserrat,Arial,sans-serif',caladea:'Caladea,Georgia,serif'}

function safeColor(value: string | null, fallback: string) {
  return value && HEX_COLOR.test(value) ? value : fallback
}

export function dealerBrandStyle(brand: PublicDealerBrand): CSSProperties {
  const primary = safeColor(brand.primaryColor, '#0d666c')
  const secondary = safeColor(brand.secondaryColor, '#05040b')
  const headingCustom=`DealerHeading-${brand.slug}`
  const bodyCustom=`DealerBody-${brand.slug}`
  const headingFont=brand.headingFontFamily==='custom'&&brand.customHeadingFontUrl?`"${headingCustom}",var(--font-heading)`:FONT_STACKS[brand.headingFontFamily||'']
  const bodyFont=brand.bodyFontFamily==='custom'&&brand.customBodyFontUrl?`"${bodyCustom}",var(--font-body)`:FONT_STACKS[brand.bodyFontFamily||'']
  return {
    '--dealer-primary': primary,
    '--dealer-primary-foreground': isLightBrandColor(primary) ? '#101417' : '#ffffff',
    '--dealer-secondary': secondary,
    '--dealer-secondary-foreground': isLightBrandColor(secondary) ? '#101417' : '#ffffff',
    '--peacock': primary,
    '--green': primary,
    ...(headingFont?{'--dealer-heading-font':headingFont}:{}),
    ...(bodyFont?{'--dealer-body-font':bodyFont}:{}),
    ...(brand.headingFontWeight?{'--dealer-heading-weight':String(brand.headingFontWeight)}:{}),
    ...(brand.bodyFontWeight?{'--dealer-body-weight':String(brand.bodyFontWeight)}:{}),
    ...(brand.headingFontSize?{'--dealer-heading-size':`${brand.headingFontSize}px`}:{}),
    ...(brand.bodyFontSize?{'--dealer-body-size':`${brand.bodyFontSize}px`}:{}),
  } as CSSProperties
}

export function dealerCustomFontCss(brand:PublicDealerBrand){
  const rules:string[]=[]
  if(brand.headingFontFamily==='custom'&&brand.customHeadingFontUrl) rules.push(`@font-face{font-family:"DealerHeading-${brand.slug}";src:url(${JSON.stringify(brand.customHeadingFontUrl)}) format("${brand.customHeadingFontUrl.includes('.woff2')?'woff2':'woff'}");font-weight:${brand.customHeadingFontWeight||brand.headingFontWeight||400};font-display:swap}`)
  if(brand.bodyFontFamily==='custom'&&brand.customBodyFontUrl) rules.push(`@font-face{font-family:"DealerBody-${brand.slug}";src:url(${JSON.stringify(brand.customBodyFontUrl)}) format("${brand.customBodyFontUrl.includes('.woff2')?'woff2':'woff'}");font-weight:${brand.customBodyFontWeight||brand.bodyFontWeight||400};font-display:swap}`)
  return rules.join('')
}

export function dealerInitials(companyName: string) {
  const words = companyName.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'D'
}

function cleanLogoUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Null-variant logo choice only. A null usable flag keeps today's custom-or-generated light merge. */
export function resolvedDealerLightLogo(brand: PublicDealerBrand) {
  const custom = cleanLogoUrl(brand.logoLightUrl)
  if (custom) return custom
  if (brand.logoGeneratedLightUsable === false) return null
  return cleanLogoUrl(brand.logoGeneratedLightUrl)
}

/** Explicit white: custom upload, otherwise the generated file only when it is marked usable. */
export function explicitWhiteLogoUrl(brand: PublicDealerBrand) {
  const custom = cleanLogoUrl(brand.logoLightUrl)
  if (custom) return custom
  if (brand.logoGeneratedLightUsable === true) return cleanLogoUrl(brand.logoGeneratedLightUrl)
  return null
}

/** Explicit black: custom upload, otherwise the generated file only when it is marked usable. */
export function explicitBlackLogoUrl(brand: PublicDealerBrand) {
  const custom = cleanLogoUrl(brand.logoBlackUrl)
  if (custom) return custom
  if (brand.logoGeneratedBlackUsable === true) return cleanLogoUrl(brand.logoGeneratedBlackUrl)
  return null
}

export function dealerLogo(brand: PublicDealerBrand, onDarkBackground = false) {
  const light = resolvedDealerLightLogo(brand)
  return onDarkBackground ? light || brand.logoUrl : brand.logoUrl || light
}

export type DealerLogoPlacement = {
  placement: 'header' | 'hero'
  headerIsDark: boolean
  logoUrl: string | null
  heroUsesDarkSurface: boolean
}

function relativeLuminance(value: string) {
  const channel = (start: number) => {
    const srgb = Number.parseInt(value.slice(start, start + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function brandColorContrast(first: string | null, second: string | null) {
  const firstColor = safeColor(first, '#0d666c')
  const secondColor = safeColor(second, '#05040b')
  const lighter = Math.max(relativeLuminance(firstColor), relativeLuminance(secondColor))
  const darker = Math.min(relativeLuminance(firstColor), relativeLuminance(secondColor))
  return (lighter + 0.05) / (darker + 0.05)
}

export function dealerLogoPlacement(brand: PublicDealerBrand): DealerLogoPlacement {
  const headerIsDark = !isLightBrandColor(safeColor(brand.secondaryColor, '#05040b'))
  const placement = brand.logoPlacement === 'header' ? 'header' : 'hero'
  const light = resolvedDealerLightLogo(brand)
  if (placement === 'header') {
    return {
      placement,
      headerIsDark,
      logoUrl: headerIsDark ? light || brand.logoUrl : brand.logoUrl || light,
      heroUsesDarkSurface: false,
    }
  }
  return {
    placement,
    headerIsDark,
    logoUrl: brand.logoUrl || light,
    heroUsesDarkSurface: !brand.logoUrl && Boolean(light),
  }
}

export type DealerLogoSurface = 'home-header' | 'home-hero' | 'page-header'

export type DealerSurfaceLogo = {
  logoUrl: string | null
  needsContrastContainer: boolean
  usesDarkSurface: boolean
}

function explicitLogoVariant(value: PublicDealerBrand['logoHeaderVariant'] | undefined) {
  return value === 'original' || value === 'black' || value === 'white' ? value : null
}

export function dealerSurfaceLogo(brand: PublicDealerBrand, surface: DealerLogoSurface): DealerSurfaceLogo | null {
  const placement = brand.logoPlacement === 'header' ? 'header' : 'hero'
  if (surface === 'home-header' && placement !== 'header') return null
  if (surface === 'home-hero' && placement !== 'hero') return null

  const headerIsDark = !isLightBrandColor(safeColor(brand.secondaryColor, '#05040b'))
  const legacyLight = resolvedDealerLightLogo(brand)
  const variant = explicitLogoVariant(surface === 'page-header' ? brand.logoPagesVariant : brand.logoHeaderVariant)
  const legacy = surface === 'home-hero'
    ? { logoUrl: brand.logoUrl || legacyLight, needsContrastContainer: false, usesDarkSurface: false }
    : { logoUrl: headerIsDark ? legacyLight || brand.logoUrl : brand.logoUrl || legacyLight, needsContrastContainer: false, usesDarkSurface: false }
  if (!variant) return legacy

  const selected = variant === 'white'
    ? explicitWhiteLogoUrl(brand)
    : variant === 'black'
      ? explicitBlackLogoUrl(brand)
      : cleanLogoUrl(brand.logoUrl)
  if (selected) {
    return {
      logoUrl: selected,
      needsContrastContainer: false,
      usesDarkSurface: false,
    }
  }
  const original = cleanLogoUrl(brand.logoUrl)
  if (original && variant !== 'original') {
    return { logoUrl: original, needsContrastContainer: false, usesDarkSurface: false }
  }
  return { logoUrl: null, needsContrastContainer: false, usesDarkSurface: false }
}

export type DealerSurfaceLogos = {
  primary: DealerSurfaceLogo | null
  secondary: DealerSurfaceLogo | null
  showPair: boolean
}

function secondaryBrand(brand: PublicDealerBrand): PublicDealerBrand {
  return {
    ...brand,
    logoUrl: brand.logoSecondaryUrl ?? null,
    logoLightUrl: brand.logoSecondaryLightUrl ?? null,
    logoGeneratedLightUrl: brand.logoSecondaryGeneratedLightUrl ?? null,
    logoGeneratedLightUsable: brand.logoSecondaryGeneratedLightUsable ?? null,
    logoBlackUrl: brand.logoSecondaryBlackUrl ?? null,
    logoGeneratedBlackUrl: brand.logoSecondaryGeneratedBlackUrl ?? null,
    logoGeneratedBlackUsable: brand.logoSecondaryGeneratedBlackUsable ?? null,
  }
}

/** Selected file only. A missing white or black file does not switch to another color. */
export function selectedSecondaryLogoUrl(brand: PublicDealerBrand, surface: DealerLogoSurface): string | null {
  const second = secondaryBrand(brand)
  const variant = explicitLogoVariant(surface === 'page-header' ? brand.logoPagesVariant : brand.logoHeaderVariant)
  if (variant === 'white') return explicitWhiteLogoUrl(second)
  if (variant === 'black') return explicitBlackLogoUrl(second)
  if (variant === 'original') return cleanLogoUrl(second.logoUrl)
  return dealerSurfaceLogo(second, surface)?.logoUrl ?? null
}

/** Two logos when the second file exists. A missing second file leaves the first logo alone. */
export function dealerSurfaceLogos(brand: PublicDealerBrand, surface: DealerLogoSurface): DealerSurfaceLogos {
  const primary = dealerSurfaceLogo(brand, surface)
  if (brand.logoDisplay !== 'dual' || !primary?.logoUrl) return { primary, secondary: null, showPair: false }
  const logoUrl = selectedSecondaryLogoUrl(brand, surface)
  if (!logoUrl) return { primary, secondary: null, showPair: false }
  return {
    primary,
    secondary: { logoUrl, needsContrastContainer: false, usesDarkSurface: false },
    showPair: true,
  }
}

export function isLightBrandColor(value: string | null) {
  if (!value || !HEX_COLOR.test(value)) return false
  const channel = (start: number) => {
    const srgb = Number.parseInt(value.slice(start, start + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  const contrastWithBlack = (luminance + 0.05) / 0.05
  const contrastWithWhite = 1.05 / (luminance + 0.05)
  return contrastWithBlack >= contrastWithWhite
}
