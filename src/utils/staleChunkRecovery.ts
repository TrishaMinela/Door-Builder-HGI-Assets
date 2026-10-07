export const STALE_CHUNK_RECOVERY_KEY = 'hgi-stale-chunk-recovery-v1'
export const STALE_CHUNK_MESSAGE = 'An update was installed. Please refresh the page and try again.'

export function isStaleChunkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  return name === 'ChunkLoadError' || (typeof message === 'string' && /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk(?:\s+\S+)?\s+failed|chunkloaderror/i.test(message))
}

type RecoveryEnvironment = {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  reload: () => void
}

export function createStaleChunkRecovery({ storage, reload }: RecoveryEnvironment) {
  let reloading = false
  const recover = (error: unknown): boolean => {
    if (!isStaleChunkError(error)) return false
    // Vite's event and the import catch can report the same failure.
    if (reloading) return true
    try {
      // If storage is blocked, do not reload: a persistent loop guard is required.
      if (!storage || storage.getItem(STALE_CHUNK_RECOVERY_KEY)) return false
      storage.setItem(STALE_CHUNK_RECOVERY_KEY, 'attempted')
      reloading = true
      reload()
      return true
    } catch {
      reloading = false
      return false
    }
  }
  const load = async <T,>(loader: () => Promise<T>): Promise<T> => {
    try { return await loader() }
    catch (error) {
      if (!isStaleChunkError(error)) throw error
      const recovering = recover(error)
      // Keep raw chunk URLs out of customer-facing PDF error messages.
      throw new Error(recovering ? 'Updating the app. Please wait…' : STALE_CHUNK_MESSAGE)
    }
  }
  return { recover, load }
}

let browserRecovery: ReturnType<typeof createStaleChunkRecovery> | undefined
function getBrowserRecovery() {
  if (!browserRecovery) {
    let storage: Storage | null = null
    try { storage = window.sessionStorage } catch { /* Privacy settings can block storage. */ }
    browserRecovery = createStaleChunkRecovery({ storage, reload: () => window.location.reload() })
  }
  return browserRecovery
}

export function safeDynamicImport<T>(loader: () => Promise<T>): Promise<T> {
  return getBrowserRecovery().load(loader)
}

export function installStaleChunkRecovery() {
  window.addEventListener('vite:preloadError', event => {
    const error = (event as Event & { payload?: unknown }).payload
    getBrowserRecovery().recover(error)
    // Do not preventDefault: Vite would resolve the import with undefined.
    // Wrapped imports must reject normally to produce a safe fallback message.
  })
}
