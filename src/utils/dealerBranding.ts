import type { CSSProperties } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function safeColor(value: string | null, fallback: string) {
  return value && HEX_COLOR.test(value) ? value : fallback
}

export function dealerBrandStyle(brand: PublicDealerBrand): CSSProperties {
  const primary = safeColor(brand.primaryColor, '#0d666c')
  return {
    '--dealer-primary': primary,
    '--dealer-primary-foreground': isLightBrandColor(primary) ? '#101417' : '#ffffff',
    '--dealer-secondary': safeColor(brand.secondaryColor, '#05040b'),
    '--peacock': primary,
  } as CSSProperties
}

export function dealerInitials(companyName: string) {
  const words = companyName.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'D'
}

export function dealerLogo(brand: PublicDealerBrand, onDarkBackground = false) {
  return onDarkBackground
    ? brand.logoLightUrl || brand.logoUrl
    : brand.logoUrl || brand.logoLightUrl
}

export function isLightBrandColor(value: string | null) {
  if (!value || !HEX_COLOR.test(value)) return false
  const red = Number.parseInt(value.slice(1, 3), 16)
  const green = Number.parseInt(value.slice(3, 5), 16)
  const blue = Number.parseInt(value.slice(5, 7), 16)
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150
}
