import { useState, type ReactNode } from 'react'
import type { PublicDealerBrand } from '../types/dealerBranding'
import { dealerInitials, dealerLogo, type DealerLogoAnchor } from '../utils/dealerBranding'

type Props = {
  brand: PublicDealerBrand
  onDarkBackground?: boolean
  logoUrl?: string | null
  secondaryLogoUrl?: string | null
  contrastContainer?: boolean
  primaryLink?: DealerLogoAnchor | null
  secondaryLink?: DealerLogoAnchor | null
}

function LogoLink({ link, children }: { link?: DealerLogoAnchor | null; children: ReactNode }) {
  if (!link) return children
  return <a className="dealer-logo-link" href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>{children}</a>
}

export function DealerBrandMark({ brand, onDarkBackground = false, logoUrl, secondaryLogoUrl = null, contrastContainer = false, primaryLink = null, secondaryLink = null }: Props) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const [failedSecondary, setFailedSecondary] = useState<string | null>(null)
  const logo = logoUrl === undefined ? dealerLogo(brand, onDarkBackground) : logoUrl
  const showFallback = !logo || failedLogo === logo
  const showSecondary = Boolean(secondaryLogoUrl) && failedSecondary !== secondaryLogoUrl && !showFallback
  const primaryAnchor = showFallback ? null : primaryLink
  const secondaryAnchor = showSecondary ? secondaryLink : null
  const image = logo ? <img src={logo} alt={primaryAnchor ? '' : `${brand.companyName} logo`} onError={() => setFailedLogo(logo)} /> : null

  return <div className={`dealer-brand-mark${showSecondary ? ' dealer-brand-mark--pair' : ''}`} aria-label={`${brand.companyName} dealer branding`}>
    {showFallback
      ? <span className="dealer-brand-fallback" aria-hidden="true">{dealerInitials(brand.companyName)}</span>
      : showSecondary && secondaryLogoUrl
        ? <>
            <LogoLink link={primaryAnchor}><img src={logo ?? ''} alt={primaryAnchor ? '' : `${brand.companyName} logo`} onError={() => setFailedLogo(logo ?? '')} /></LogoLink>
            <span className="dealer-logo-divider" aria-hidden="true" />
            <LogoLink link={secondaryAnchor}><img src={secondaryLogoUrl} alt={secondaryAnchor ? '' : `${brand.companyName} partner logo`} onError={() => setFailedSecondary(secondaryLogoUrl)} /></LogoLink>
          </>
        : <LogoLink link={primaryAnchor}>{contrastContainer ? <span className="dealer-logo-contrast">{image}</span> : image}</LogoLink>}
    {showFallback && <strong className="dealer-brand-fallback-name">{brand.companyName}</strong>}
  </div>
}
