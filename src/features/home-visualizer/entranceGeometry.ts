import type { DoorConfigurationType } from '../../types'
import { doorConfigurationLeafCount, hasCenterMeetingStile } from '../../data/doorConfigurationRules'

/** Standard U.S. sidelite fallback: 12–14 inches beside a 36-inch slab. */
export const STANDARD_SIDELITE_TO_SLAB_RATIO = 0.35
const STANDARD_DOOR_SLAB_WIDTH = 242

/** Fixed product coordinates shared by DoorPreview, PDF, and Visualizer. */
export const ENTRANCE_GEOMETRY = {
  slabWidth: STANDARD_DOOR_SLAB_WIDTH,
  openingHeight: 549,
  // Structural width is independent of the raster asset canvas and padding.
  // A future product-specific dimension may replace this fallback upstream.
  sideliteWidth: STANDARD_DOOR_SLAB_WIDTH * STANDARD_SIDELITE_TO_SLAB_RATIO,
  centerMeetingStileWidth: 7,
  thresholdHeight: 12,
  visualizerFrameWidth: 20,
  frameProfiles: {
    exterior: { side: 19, head: 19, mullion: 11, profileInset: 5, profileStroke: 3 },
    interior: { side: 8, head: 8, mullion: 8, profileInset: 2, profileStroke: 1.5 },
  },
} as const

export const VISUALIZER_FRAME_WIDTH_PX = ENTRANCE_GEOMETRY.visualizerFrameWidth
export type CanonicalSidelites = 'none' | 'left' | 'right' | 'both'
export type CanonicalFrameVariant = 'exterior' | 'interior'

/** Raster assets occupy these boxes; they never contribute structural size. */
export function createCanonicalEntranceGeometry({ doorConfigurationType, sidelites, variant, openingOnly, sharedComparisonCanvas = false }: {
  doorConfigurationType: DoorConfigurationType
  sidelites: CanonicalSidelites
  variant: CanonicalFrameVariant
  openingOnly: boolean
  sharedComparisonCanvas?: boolean
}) {
  const hasLeft = sidelites === 'left' || sidelites === 'both'
  const hasRight = sidelites === 'right' || sidelites === 'both'
  const profile = ENTRANCE_GEOMETRY.frameProfiles[variant]
  const leftSideliteWidth = hasLeft ? ENTRANCE_GEOMETRY.sideliteWidth : 0
  const rightSideliteWidth = hasRight ? ENTRANCE_GEOMETRY.sideliteWidth : 0
  const mullionWidth = profile.mullion
  const leftMullionWidth = hasLeft ? mullionWidth : 0
  const rightMullionWidth = hasRight ? mullionWidth : 0
  const centerMeetingStileWidth = hasCenterMeetingStile(doorConfigurationType) ? ENTRANCE_GEOMETRY.centerMeetingStileWidth : 0
  const doorAssemblyWidth = ENTRANCE_GEOMETRY.slabWidth * doorConfigurationLeafCount(doorConfigurationType) + centerMeetingStileWidth
  const openingWidth = leftSideliteWidth + leftMullionWidth + doorAssemblyWidth + rightMullionWidth + rightSideliteWidth
  const sideJambWidth = openingOnly ? ENTRANCE_GEOMETRY.visualizerFrameWidth : sharedComparisonCanvas ? ENTRANCE_GEOMETRY.frameProfiles.exterior.side : profile.side
  const headJambHeight = openingOnly ? ENTRANCE_GEOMETRY.visualizerFrameWidth : sharedComparisonCanvas ? ENTRANCE_GEOMETRY.frameProfiles.exterior.head : profile.head
  const bottomStructureHeight = openingOnly ? ENTRANCE_GEOMETRY.visualizerFrameWidth : ENTRANCE_GEOMETRY.thresholdHeight
  const totalWidth = sideJambWidth * 2 + openingWidth
  const totalHeight = headJambHeight + ENTRANCE_GEOMETRY.openingHeight + bottomStructureHeight
  const contentLeft = sideJambWidth
  const contentTop = headJambHeight
  const contentRight = contentLeft + openingWidth
  const contentBottom = contentTop + ENTRANCE_GEOMETRY.openingHeight
  const doorLeft = contentLeft + leftSideliteWidth + leftMullionWidth

  return {
    totalWidth, totalHeight, openingWidth, openingHeight: ENTRANCE_GEOMETRY.openingHeight,
    contentLeft, contentTop, contentRight, contentBottom, thresholdTop: contentBottom,
    sideJambWidth, headJambHeight, bottomStructureHeight,
    leftSideliteWidth, rightSideliteWidth, leftMullionWidth, rightMullionWidth,
    mullionWidth, doorAssemblyWidth, doorLeft,
    centerMeetingStileWidth,
    centerMeetingStileLeft: doorLeft + ENTRANCE_GEOMETRY.slabWidth,
    columns: [leftSideliteWidth, leftMullionWidth, doorAssemblyWidth, rightMullionWidth, rightSideliteWidth] as const,
    hasLeft, hasRight, profile,
  }
}
