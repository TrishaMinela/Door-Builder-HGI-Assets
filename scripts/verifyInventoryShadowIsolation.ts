import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createServer, loadConfigFromFile } from 'vite'

// Simulate Vercel's excluded scripts/ directory without moving any local files.
const bundled = await build({
  entryPoints: ['vite.config.ts'], bundle: true, platform: 'node', format: 'esm',
  packages: 'external', write: false, metafile: true,
  plugins: [{ name: 'forbid-dev-build-inputs', setup(builder) {
    builder.onResolve({ filter: /inventoryShadow|scripts\// }, args => {
      throw new Error(`Production config must not resolve DEV tooling: ${args.path}`)
    })
  } }],
})
assert.deepEqual(Object.keys(bundled.metafile!.inputs), ['vite.config.ts'])
const previousFlag = process.env.VITE_INVENTORY_SHADOW
try {
  process.env.VITE_INVENTORY_SHADOW = 'true'
  const production = await loadConfigFromFile({ command: 'build', mode: 'production' })
  assert.ok(production)
  assert.equal(production.config.plugins?.length, 0, 'Build cannot register the DEV plugin even with the flag enabled')
  assert.match(JSON.stringify(production.config.resolve?.alias), /disabled\.ts/, 'Production uses the no-op browser hook')
  process.env.VITE_INVENTORY_SHADOW = 'false'
  const disabled = await createServer({ server: { host: '127.0.0.1', port: 5206, strictPort: true } })
  try {
    await disabled.listen()
    const response = await fetch('http://127.0.0.1:5206/__dev/inventory-shadow/compare', { method: 'POST', body: '{}' })
    assert.equal(response.status, 404, 'Opt-out dev has no shadow endpoint')
  } finally { await disabled.close() }
  process.env.VITE_INVENTORY_SHADOW = 'true'
  const enabled = await createServer({ server: { host: '127.0.0.1', port: 5206, strictPort: true } })
  try {
    await enabled.listen()
    const response = await fetch('http://127.0.0.1:5206/__dev/inventory-shadow/compare', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ styleId: 'f-full-lite', lineId: '20-gauge-smooth-steel', finishType: 'paint', sideliteStyle: 'fsl' }),
    })
    const result = await response.json() as { status: string; reports: { matches: boolean }[]; reason?: string }
    assert.equal(result.status, 'ok', result.reason ?? 'Opted-in DEV middleware must compare the live pinned draft')
    assert.ok(result.reports.length)
    assert.ok(result.reports.every(report => report.matches), 'Local middleware preserves catalog parity')
  } finally { await enabled.close() }
  console.log('Shadow isolation passed: config bundle contains only vite.config.ts; build ignores DEV flag; opt-out endpoint absent; opted-in local middleware compares LIVE DEV draft.')
} finally {
  if (previousFlag === undefined) delete process.env.VITE_INVENTORY_SHADOW
  else process.env.VITE_INVENTORY_SHADOW = previousFlag
}
