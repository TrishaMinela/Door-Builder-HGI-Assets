import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'

export default defineConfig(({ command, mode }) => {
  const shadowEnabled = command === 'serve' && mode !== 'production'
    && loadEnv(mode, process.cwd(), 'VITE_').VITE_INVENTORY_SHADOW === 'true'
  const publishedShadowEnabled = command === 'serve' && mode !== 'production'
    && loadEnv(mode, process.cwd(), 'VITE_').VITE_PUBLISHED_CATALOG_SHADOW === 'true'
  return {
    resolve: {
      alias: [...(shadowEnabled ? [] : [{
        find: './inventory-shadow/useInventoryShadow',
        replacement: fileURLToPath(new URL('./src/inventory-shadow/disabled.ts', import.meta.url)),
      }]), ...(publishedShadowEnabled ? [] : [{
        find: './published-catalog/usePublishedCatalogShadow',
        replacement: fileURLToPath(new URL('./src/published-catalog/disabled.ts', import.meta.url)),
      }])],
    },
    plugins: [...(shadowEnabled ? [{
      name: 'hgi-local-inventory-shadow',
      apply: 'serve' as const,
      async configureServer(server: ViteDevServer) {
        // Config bundling follows literal imports even in disabled branches.
        // Resolve TS tooling only in the opted-in local server, never in build.
        const { registerInventoryShadow } = await server.ssrLoadModule('/server/inventoryShadowPlugin.ts')
        registerInventoryShadow(server)
      },
    }] : []), ...(publishedShadowEnabled ? [{
      name: 'hgi-local-published-catalog-shadow',
      apply: 'serve' as const,
      async configureServer(server: ViteDevServer) {
        const { registerPublishedCatalogShadow } = await server.ssrLoadModule('/server/publishedCatalogPlugin.ts')
        registerPublishedCatalogShadow(server, { ...loadEnv(mode, process.cwd(), ''), ...process.env })
      },
    }] : [])],
  }
})
