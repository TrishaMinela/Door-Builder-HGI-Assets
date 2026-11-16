import { useState } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'
import { dealerInitials, dealerLogo } from '../utils/dealerBranding'

type Props = {
  brand: PublicDealerBrand
  onDarkBackground?: boolean
  logoUrl?: string | null
  contrastContainer?: boolean
}

export function DealerBrandMark({ brand, onDarkBackground = false, logoUrl, contrastContainer = false }: Props) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const logo = logoUrl === undefined ? dealerLogo(brand, onDarkBackground) : logoUrl
  const showFallback = !logo || failedLogo === logo
  const image = logo ? <img src={logo} alt={`${brand.companyName} logo`} onError={() => setFailedLogo(logo)} /> : null

  return <div className="dealer-brand-mark" aria-label={`${brand.companyName} dealer branding`}>
    {!showFallback
      ? contrastContainer ? <span className="dealer-logo-contrast">{image}</span> : image
      : <span className="dealer-brand-fallback" aria-hidden="true">{dealerInitials(brand.companyName)}</span>}
    {showFallback && <strong className="dealer-brand-fallback-name">{brand.companyName}</strong>}
  </div>
}
