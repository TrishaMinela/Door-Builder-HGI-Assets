export type DealerLogoVariant = 'original' | 'black' | 'white'

export type PublicDealerBrand = {
  slug: string
  companyName: string
  logoUrl: string | null
  logoLightUrl: string | null
  logoGeneratedLightUrl: string | null
  logoGeneratedLightUsable: boolean | null
  logoBlackUrl: string | null
  logoGeneratedBlackUrl: string | null
  logoGeneratedBlackUsable: boolean | null
  logoHeaderVariant: DealerLogoVariant | null
  logoPagesVariant: DealerLogoVariant | null
  logoPlacement: 'header' | 'hero'
  logoDisplay?: 'single' | 'dual'
  logoSecondaryUrl?: string | null
  logoSecondaryLightUrl?: string | null
  logoSecondaryGeneratedLightUrl?: string | null
  logoSecondaryGeneratedLightUsable?: boolean | null
  logoSecondaryBlackUrl?: string | null
  logoSecondaryGeneratedBlackUrl?: string | null
  logoSecondaryGeneratedBlackUsable?: boolean | null
  logoSecondaryHeaderVariant?: DealerLogoVariant | null
  logoSecondaryPagesVariant?: DealerLogoVariant | null
  primaryColor: string | null
  secondaryColor: string | null
  websiteUrl: string | null
  headingFontFamily: string | null
  headingFontWeight: number | null
  headingFontSize: number | null
  bodyFontFamily: string | null
  bodyFontWeight: number | null
  bodyFontSize: number | null
  customHeadingFontUrl: string | null
  customHeadingFontName: string | null
  customHeadingFontWeight: number | null
  customBodyFontUrl: string | null
  customBodyFontName: string | null
  customBodyFontWeight: number | null
}
