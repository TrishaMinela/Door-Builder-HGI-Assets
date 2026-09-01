const imagePromises = new Map<string, Promise<HTMLImageElement>>()

export function loadCachedImage(src: string): Promise<HTMLImageElement> {
  const cached = imagePromises.get(src)
  if (cached) return cached
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => {
      imagePromises.delete(src)
      reject(new Error(`Image could not be loaded: ${src}`))
    }
    image.src = src
  })
  imagePromises.set(src, pending)
  return pending
}
