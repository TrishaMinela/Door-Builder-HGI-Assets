export type HouseImageCache = {
  has: (doorKey: string) => boolean
  get: (doorKey: string) => string | undefined
  begin: (doorKey: string) => 'cached' | 'inflight' | 'start'
  fulfill: (doorKey: string, image: string) => void
  fail: (doorKey: string) => void
}

export function createHouseImageCache(): HouseImageCache {
  const images = new Map<string, string>()
  const pending = new Set<string>()
  return {
    has: (doorKey) => images.has(doorKey),
    get: (doorKey) => images.get(doorKey),
    begin(doorKey) {
      if (images.has(doorKey)) return 'cached'
      if (pending.has(doorKey)) return 'inflight'
      pending.add(doorKey)
      return 'start'
    },
    fulfill(doorKey, image) {
      pending.delete(doorKey)
      images.set(doorKey, image)
    },
    fail(doorKey) {
      pending.delete(doorKey)
    },
  }
}

let boundPhoto = ''
let generation = 0
let cache = createHouseImageCache()

/** One cache for the current house photo. A different photo drops every door image. */
export function houseImages(photo: string) {
  if (photo !== boundPhoto) {
    boundPhoto = photo
    generation += 1
    cache = createHouseImageCache()
  }
  return cache
}

export function houseImageGeneration() {
  return generation
}

export function hasHouseImage(photo: string, doorKey: string) {
  return houseImages(photo).has(doorKey)
}

/** While "On my house" is open, a cached door stays there. An uncached door falls back to the door preview. */
export function modeAfterOptionChange(viewingHouse: boolean, nextHasImage: boolean): 'house' | 'door' {
  if (viewingHouse && nextHasImage) return 'house'
  return 'door'
}

export function resetHouseImages() {
  boundPhoto = ''
  generation += 1
  cache = createHouseImageCache()
}
