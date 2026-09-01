import type { CapturedDoorSource } from './captureDoorPreview'

const entranceImages = new Map<string, CapturedDoorSource>()
const finalVisualizations = new Map<string, { blob: Blob; width: number; height: number }>()
const MAX_CACHE_ENTRIES = 8

function setLimited<T>(cache: Map<string, T>, key: string, value: T) {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!)
}

export const getCachedEntranceImage = (key: string) => entranceImages.get(key)
export const cacheEntranceImage = (key: string, value: CapturedDoorSource) => setLimited(entranceImages, key, value)
export const getCachedVisualization = (key: string) => finalVisualizations.get(key)
export const cacheVisualization = (key: string, value: { blob: Blob; width: number; height: number }) => setLimited(finalVisualizations, key, value)
