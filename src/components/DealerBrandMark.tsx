import { useState } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'
import { dealerInitials, dealerLogo } from '../utils/dealerBranding'

type Props = {
  brand: PublicDealerBrand
  onDarkBackground?: boolean
  logoUrl?: string | null
  secondaryLogoUrl?: string | null
  contrastContainer?: boolean
}

export function DealerBrandMark({ brand, onDarkBackground = false, logoUrl, secondaryLogoUrl = null, contrastContainer = false }: Props) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const [failedSecondary, setFailedSecondary] = useState<string | null>(null)
  const logo = logoUrl === undefined ? dealerLogo(brand, onDarkBackground) : logoUrl
  const showFallback = !logo || failedLogo === logo
  const showSecondary = Boolean(secondaryLogoUrl) && failedSecondary !== secondaryLogoUrl && !showFallback
  const image = logo ? <img src={logo} alt={`${brand.companyName} logo`} onError={() => setFailedLogo(logo)} /> : null

  return <div className={`dealer-brand-mark${showSecondary ? ' dealer-brand-mark--pair' : ''}`} aria-label={`${brand.companyName} dealer branding`}>
    {showFallback
      ? <span className="dealer-brand-fallback" aria-hidden="true">{dealerInitials(brand.companyName)}</span>
      : showSecondary && secondaryLogoUrl
        ? <>
            <img src={logo ?? ''} alt={`${brand.companyName} logo`} onError={() => setFailedLogo(logo ?? '')} />
            <span className="dealer-logo-divider" aria-hidden="true" />
            <img src={secondaryLogoUrl} alt="" onError={() => setFailedSecondary(secondaryLogoUrl)} />
          </>
        : contrastContainer ? <span className="dealer-logo-contrast">{image}</span> : image}
    {showFallback && <strong className="dealer-brand-fallback-name">{brand.companyName}</strong>}
  </div>
}
