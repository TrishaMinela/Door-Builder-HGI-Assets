import type { StyleMood } from './types'

export type InspirationDoor = {
  id: string
  name: string
  detail: string
  src: string
  width: number
  height: number
  mood: StyleMood
  alt: string
}

/**
 * Exterior photos from homeguardindustries.com entry-door pages.
 * Names follow the source filenames. Place names describe the house in the photo.
 */
export const INSPIRATION: InspirationDoor[] = [
  { id: 'hero-craftsman-full-lite', name: '20 Gauge full lite', detail: 'Craftsman', src: '/assets/find-my-door/hero-craftsman-full-lite.webp', width: 1400, height: 907, mood: 'coastal', alt: '20 Gauge full lite door on a craftsman house' },
  { id: 'round-top-brick', name: '20 Gauge round top', detail: 'Brick', src: '/assets/find-my-door/round-top-brick.webp', width: 800, height: 752, mood: 'bold', alt: '20 Gauge round top door on a brick house' },
  { id: 'signature-f482-sidelites', name: 'Signature Series F482', detail: 'Farmhouse', src: '/assets/find-my-door/signature-f482-sidelites.webp', width: 800, height: 519, mood: 'warm', alt: 'Signature Series F482 door with sidelites' },
  { id: 'gauge-22-cr14', name: '22 Gauge CR14', detail: 'Craftsman', src: '/assets/find-my-door/gauge-22-cr14.webp', width: 800, height: 800, mood: 'rustic', alt: '22 Gauge CR14 craftsman door' },
  { id: 'brushed-smooth-full-lite', name: 'Brushed Smooth', detail: 'Traditional', src: '/assets/find-my-door/brushed-smooth-full-lite.webp', width: 800, height: 519, mood: 'modern', alt: 'Brushed Smooth full lite door' },
  { id: 'round-top-modern', name: '20 Gauge round top', detail: 'Modern', src: '/assets/find-my-door/round-top-modern.webp', width: 800, height: 534, mood: 'modern', alt: '20 Gauge round top door on a modern house' },
  { id: 'signature-two-panel', name: 'Signature Series', detail: 'Modern', src: '/assets/find-my-door/signature-two-panel.webp', width: 800, height: 519, mood: 'warm', alt: 'Signature Series wood-look door on a modern house' },
  { id: 'shaker-cottage', name: '22 Gauge shaker', detail: 'Cottage', src: '/assets/find-my-door/shaker-cottage.webp', width: 800, height: 515, mood: 'timeless', alt: '22 Gauge shaker door on a cottage porch' },
  { id: 'brushed-smooth-3-lite', name: 'Brushed Smooth 3 lite', detail: 'Modern', src: '/assets/find-my-door/brushed-smooth-3-lite.webp', width: 800, height: 519, mood: 'bold', alt: 'Brushed Smooth 3 lite door on a stone entry' },
  { id: 'six-panel-colonial', name: '20 Gauge 6 panel', detail: 'Colonial', src: '/assets/find-my-door/six-panel-colonial.webp', width: 800, height: 519, mood: 'timeless', alt: '20 Gauge 6 panel door on a colonial porch' },
  { id: 'textured-half-lite', name: 'Textured half lite', detail: 'Modern', src: '/assets/find-my-door/textured-half-lite.webp', width: 800, height: 519, mood: 'modern', alt: 'Textured half lite door on a modern entry' },
  { id: 'farmhouse-f482', name: 'Popular F482', detail: 'Farmhouse', src: '/assets/find-my-door/farmhouse-f482.webp', width: 800, height: 519, mood: 'rustic', alt: 'Popular F482 door on a farmhouse porch' },
]

export const FEATURED_DOOR = INSPIRATION[0]
