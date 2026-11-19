import type { StyleMood } from './types'

export type InspirationDoor = {
  id: string
  name: string
  detail: string
  src: string
  width: number
  height: number
  mood: StyleMood
}

/**
 * Catalog product photos already in the repo, recompressed for this page.
 * None of these are photographs of a door installed on a house.
 * Sources are listed in docs/find-my-door-ui-audit.md.
 */
export const INSPIRATION: InspirationDoor[] = [
  { id: 'full-lite-white', name: 'Full Lite', detail: 'White', src: '/assets/find-my-door/full-lite-white.webp', width: 224, height: 508, mood: 'coastal' },
  { id: 'two-panel-navy', name: '2 Panel', detail: 'Navy', src: '/assets/find-my-door/two-panel-navy.webp', width: 224, height: 508, mood: 'bold' },
  { id: 'stacked-three-black', name: 'Stacked 3 Lite', detail: 'Black', src: '/assets/find-my-door/stacked-three-black.webp', width: 224, height: 508, mood: 'modern' },
  { id: 'two-panel-natural', name: '2 Panel', detail: 'Natural Gold', src: '/assets/find-my-door/two-panel-natural.webp', width: 224, height: 508, mood: 'warm' },
  { id: 'shaker-forest', name: '3-Panel Shaker', detail: 'Forest', src: '/assets/find-my-door/shaker-forest.webp', width: 224, height: 508, mood: 'rustic' },
  { id: 'craftsman-harvest', name: 'Craftsman', detail: 'Harvest Wheat', src: '/assets/find-my-door/craftsman-harvest.webp', width: 224, height: 508, mood: 'warm' },
  { id: 'french-black', name: 'French doors', detail: 'Black', src: '/assets/find-my-door/french-black.webp', width: 292, height: 320, mood: 'modern' },
  { id: 'sidelites-forest', name: '3/4 Lite with sidelites', detail: 'Forest', src: '/assets/find-my-door/sidelites-forest.webp', width: 261, height: 320, mood: 'rustic' },
]

export const FEATURED_DOOR = INSPIRATION[0]
