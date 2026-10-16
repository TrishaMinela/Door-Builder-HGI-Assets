import { useEffect } from 'react'

/** Diagnostics only. No state setters, configuration writes or render authority. */
export function usePublishedCatalogShadow(active: boolean) {
  useEffect(() => {
    if (!active || !import.meta.env.DEV || import.meta.env.MODE === 'production' || import.meta.env.VITE_PUBLISHED_CATALOG_SHADOW !== 'true') return
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 20000)
    let disposed = false
    void fetch('/__dev/published-catalog-shadow/compare', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Shadow unavailable'); return response.json() })
      .then(result => { if (!disposed) console.info('[published-catalog-shadow]', result) })
      .catch(() => { if (!disposed) console.warn('[published-catalog-shadow]', 'Unavailable; hardcoded catalog and local assets unchanged') })
      .finally(() => window.clearTimeout(timer))
    return () => { disposed = true; controller.abort(); window.clearTimeout(timer) }
  }, [active])
}
