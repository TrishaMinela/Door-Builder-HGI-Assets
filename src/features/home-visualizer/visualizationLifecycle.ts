// Every browser-only stage has a deadline, including a decoder that never settles.
export function boundedStage<T>(operation: Promise<T>, signal: AbortSignal | undefined, timeoutMs: number, failure: Error): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const abort = () => finish(() => reject(new DOMException('Attempt canceled', 'AbortError')))
    const timer = window.setTimeout(() => finish(() => reject(failure)), timeoutMs)
    const finish = (complete: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      complete()
    }
    // Observe late rejections even if this attempt was canceled before entry.
    operation.then(value => finish(() => resolve(value)), error => finish(() => reject(error)))
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

export async function validateVisualizationImage(source: string, signal: AbortSignal | undefined, failure: Error) {
  const image = new Image()
  const loaded = new Promise<void>((resolve, reject) => {
    image.onerror = () => reject(failure)
    image.onload = async () => {
      try {
        if (!image.naturalWidth || !image.naturalHeight) throw failure
        if (typeof image.decode === 'function') await image.decode()
        resolve()
      } catch { reject(failure) }
    }
    image.src = source
  })
  try { await boundedStage(loaded, signal, 20_000, failure) }
  finally { image.onload = null; image.onerror = null; image.removeAttribute('src') }
}
