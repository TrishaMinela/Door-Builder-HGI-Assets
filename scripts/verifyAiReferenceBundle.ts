import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Stream } from 'node:stream'
import sharp from 'sharp'
import { collectAiFallbackReferences } from './aiFallbackReferenceInventory'
import { aiReferenceAssetReaders } from '../server/aiReferenceAssets.generated'
import { AiGenerationError, loadAiReference } from '../server/aiDoorVisualization'

const inventory = collectAiFallbackReferences()
assert.deepEqual(Object.keys(aiReferenceAssetReaders).sort(), inventory.paths)
const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
assert.deepEqual(config.functions['api/generate-door-visualization.ts'].includeFiles, inventory.paths.map(path => `public${path}`))
for (const excluded of ['/fonts/', '/hero/', '/logos/', '/templates/', '/finishes/']) {
  assert.ok(!inventory.paths.some(path => path.includes(excluded)), `Unexpected ${excluded} fallback dependency`)
}
// Compare every candidate against the previous filesystem loader's result,
// including secondary candidates, not just the first successful source.
for (const path of inventory.paths) {
  const original = readFileSync(`public${path}`)
  assert.deepEqual(await aiReferenceAssetReaders[path](), original, path)
  const expected = await sharp(original, { limitInputPixels: 24_000_000 }).resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  assert.deepEqual(await loadAiReference([path]), expected, path)
}
await assert.rejects(loadAiReference(['/assets/../package.json', '/assets/not-in-manifest.webp']), (error: unknown) => error instanceof AiGenerationError && error.code === 'REFERENCE_IMAGE_FAILED')
assert.deepEqual(await loadAiReference(['/assets/not-in-manifest.webp', `${inventory.paths[0]}?v=5`]), await loadAiReference([inventory.paths[0]]))

if (process.argv.includes('--package')) {
  // Use Vercel's actual installed Node builder, not a hand-built facsimile.
  // No installs, framework builds, deployment, credentials or AI calls.
  const require = createRequire(import.meta.url)
  const builderRequire = createRequire(resolve('.vercel/builders/node_modules/@vercel/node/package.json'))
  const { build } = require(resolve('.vercel/builders/node_modules/@vercel/node'))
  const { FileFsRef } = builderRequire('@vercel/build-utils')
  const packagedRoot = await mkdtemp(join(tmpdir(), 'ai-fallback-package-'))
  const measurements = []
  for (const endpoint of ['generate-door-visualization', 'detect-entrance-structure']) {
    const entrypoint = `api/${endpoint}.ts`
    const built = await build({
      files: { [entrypoint]: new FileFsRef({ fsPath: resolve(entrypoint), mode: statSync(entrypoint).mode }) },
      entrypoint, workPath: process.cwd(), repoRootPath: process.cwd(), meta: { skipDownload: true },
      considerBuildCommand: true,
      config: { ...config.functions[entrypoint], projectSettings: { installCommand: '', buildCommand: 'true', nodeVersion: '24.x' } },
    })
    const assets = Object.keys(built.output.files).filter(path => path.startsWith('public/')).sort()
    assert.deepEqual(assets, endpoint.startsWith('generate') ? inventory.paths.map(path => `public${path}`).sort() : [], `${endpoint}: actual package assets`)
    let bytes = 0
    const root = join(packagedRoot, endpoint)
    for (const [path, file] of Object.entries(built.output.files) as [string, { toStream: () => Stream | Promise<Stream> }][]) {
      assert.ok(!path.startsWith('../') && !path.startsWith('/'), path)
      const stream = await file.toStream()
      const data = await new Promise<Buffer>((done, reject) => {
        const chunks: Buffer[] = []
        stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
        stream.on('end', () => done(Buffer.concat(chunks)))
        stream.on('error', reject)
      })
      bytes += data.length
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), data)
    }
    if (endpoint.startsWith('generate')) {
      const packed = await import(pathToFileURL(join(root, 'server/aiReferenceAssets.generated.js')).href)
      assert.deepEqual(Object.keys(packed.aiReferenceAssetReaders).sort(), inventory.paths)
      for (const path of inventory.paths) assert.deepEqual(await packed.aiReferenceAssetReaders[path](), readFileSync(`public${path}`), `Packaged ${path}`)
      // Execute the compiled resolver/loader with no access to source public/.
      // Buffer equality above verifies exact images; decode each unique group.
      const runtime = await import(pathToFileURL(join(root, 'server/aiDoorVisualization.js')).href)
      assert.deepEqual(collectAiFallbackReferences(runtime.resolveAiProduct), inventory, 'Packaged resolver parity')
      for (const reference of inventory.references) assert.ok((await sharp(await runtime.loadAiReference(reference.paths)).metadata()).width, reference.label)
    } else {
      assert.ok(!Object.keys(built.output.files).some(path => path.startsWith('src/data/') || path.includes('aiReferenceAssets') || path.includes('aiDoorVisualization')))
    }
    measurements.push({ endpoint, files: Object.keys(built.output.files).length, assets: assets.length, bytes })
  }
  console.log(JSON.stringify({ builderVersion: builderRequire('./package.json').version, platform: process.platform, packages: measurements, isolatedArtifacts: packagedRoot }))
}
// Guard the rest of the generation implementation byte-for-byte against the
// prior commit: prompts, settings, resolver and error semantics are untouched.
if (process.argv.includes('--compare-head')) {
  const prior = execFileSync('git', ['show', 'HEAD:server/aiDoorVisualization.ts'], { encoding: 'utf8' })
  const current = readFileSync('server/aiDoorVisualization.ts', 'utf8')
  assert.equal(current, prior.replace("import { readFile } from 'node:fs/promises'\nimport { resolve } from 'node:path'", "import { aiReferenceAssetReaders } from './aiReferenceAssets.generated.js'").replace("      const bytes = await readFile(resolve(process.cwd(), 'public', localPath.slice(1)))", '      const reader = aiReferenceAssetReaders[localPath]\n      if (!reader) continue\n      const bytes = await reader()'))
}
console.log(JSON.stringify({ passed: true, assets: inventory.paths.length, referenceGroups: inventory.references.length, resolverCases: inventory.resolutions }))
