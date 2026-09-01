import type { EntranceCorners, Point } from './EntranceSelector'
import type { ProductLayer } from './SideliteSelector'

export const ENTRANCE_REGION = { outside: 0, door: 1, leftSidelite: 2, rightSidelite: 3, frame: 4, threshold: 5, glass: 6 } as const

const points = (corners: EntranceCorners) => [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
function contains(point: Point, polygon: Point[]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]; const b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** One geometry-owned classification for every source-photo pixel in the entrance. */
export function buildEntranceRegionMap(width: number, height: number, outer: EntranceCorners, layers: ProductLayer[]) {
  const map = new Uint8Array(width * height)
  const outerPolygon = points(outer)
  const layerPolygons = layers.map((layer) => ({
    region: ENTRANCE_REGION.frame,
    polygon: points(layer.corners),
  }))
  const xs = outerPolygon.map((point) => point.x * width); const ys = outerPolygon.map((point) => point.y * height)
  const left = Math.max(0, Math.floor(Math.min(...xs))); const right = Math.min(width, Math.ceil(Math.max(...xs)))
  const top = Math.max(0, Math.floor(Math.min(...ys))); const bottom = Math.min(height, Math.ceil(Math.max(...ys)))
  let seamPixelCount = 0
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const normalized = { x: (x + .5) / width, y: (y + .5) / height }
    if (!contains(normalized, outerPolygon)) continue
    // Frame is the default architectural owner. Product polygons reuse the exact
    // same stored floating-point boundaries and replace that classification.
    let region: number = ENTRANCE_REGION.frame
    for (const layer of layerPolygons) if (contains(normalized, layer.polygon)) { region = layer.region; break }
    map[y * width + x] = region
    if (region === ENTRANCE_REGION.outside) seamPixelCount += 1
  }
  return { map, seamPixelCount, maximumSeamWidth: seamPixelCount ? 1 : 0, repairedByRegion: { frame: 0, door: 0, leftSidelite: 0, rightSidelite: 0 } }
}
