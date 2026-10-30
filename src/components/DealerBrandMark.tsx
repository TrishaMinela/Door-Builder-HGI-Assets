import { useState } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'
import { dealerInitials, dealerLogo } from '../utils/dealerBranding'

type Props = {
  brand: PublicDealerBrand
  onDarkBackground?: boolean
  compact?: boolean
}

export function DealerBrandMark({ brand, onDarkBackground = false, compact = false }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const logo = dealerLogo(brand, onDarkBackground)

  return <div className={`dealer-brand-mark${compact ? ' compact' : ''}`} aria-label={`In partnership with ${brand.companyName}`}>
    <span className="dealer-brand-divider" aria-hidden="true" />
    {!imageFailed && logo
      ? <img src={logo} alt={`${brand.companyName} logo`} onError={() => setImageFailed(true)} />
      : <span className="dealer-brand-fallback" aria-hidden="true">{dealerInitials(brand.companyName)}</span>}
    <span className="dealer-brand-name"><small>Presented by</small><strong>{brand.companyName}</strong></span>
  </div>
}
