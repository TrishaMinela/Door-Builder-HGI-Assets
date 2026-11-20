export type InspirationDoor = {
  id: string
  src: string
  width: number
  height: number
  alt: string
}

/**
 * Exterior photos from homeguardindustries.com entry-door pages.
 * The start page shows the photos only. Alt text stays in plain language.
 */
export const INSPIRATION: InspirationDoor[] = [
  { id: 'hero-craftsman-full-lite', src: '/assets/find-my-door/hero-craftsman-full-lite.webp', width: 1400, height: 907, alt: 'Full lite front door on a craftsman house' },
  { id: 'round-top-brick', src: '/assets/find-my-door/round-top-brick.webp', width: 800, height: 752, alt: 'Round top front door on a brick house' },
  { id: 'signature-f482-sidelites', src: '/assets/find-my-door/signature-f482-sidelites.webp', width: 800, height: 519, alt: 'Front door with sidelites on a farmhouse' },
  { id: 'gauge-22-cr14', src: '/assets/find-my-door/gauge-22-cr14.webp', width: 800, height: 800, alt: 'Craftsman front door with a glass panel' },
  { id: 'brushed-smooth-full-lite', src: '/assets/find-my-door/brushed-smooth-full-lite.webp', width: 800, height: 519, alt: 'Full lite front door' },
  { id: 'round-top-modern', src: '/assets/find-my-door/round-top-modern.webp', width: 800, height: 534, alt: 'Round top front door on a modern house' },
  { id: 'signature-two-panel', src: '/assets/find-my-door/signature-two-panel.webp', width: 800, height: 519, alt: 'Wood-look front door on a modern house' },
  { id: 'shaker-cottage', src: '/assets/find-my-door/shaker-cottage.webp', width: 800, height: 515, alt: 'Shaker front door on a cottage porch' },
  { id: 'brushed-smooth-3-lite', src: '/assets/find-my-door/brushed-smooth-3-lite.webp', width: 800, height: 519, alt: 'Three-lite front door on a stone entry' },
  { id: 'six-panel-colonial', src: '/assets/find-my-door/six-panel-colonial.webp', width: 800, height: 519, alt: 'Six-panel front door on a colonial porch' },
  { id: 'textured-half-lite', src: '/assets/find-my-door/textured-half-lite.webp', width: 800, height: 519, alt: 'Half-lite front door on a modern entry' },
  { id: 'farmhouse-f482', src: '/assets/find-my-door/farmhouse-f482.webp', width: 800, height: 519, alt: 'Front door on a farmhouse porch' },
]

export const FEATURED_DOOR = INSPIRATION[0]
