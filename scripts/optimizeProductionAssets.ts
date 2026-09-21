import { mkdtemp, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const root = process.cwd()
const assetRoot = path.join(root, 'public', 'assets')
const audit = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/auditProductionAssets.ts'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
})
if (audit.status !== 0) throw new Error(audit.stderr || 'Asset audit failed')
const report = JSON.parse(audit.stdout) as { used: string[]; unused: string[] }
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'door-builder-assets-'))
const conversions = new Map<string, string>()
const skipped: { file: string; reason: string }[] = []
let removed = 0

const mustRemainOriginal = (file: string) =>
  file.startsWith('masks/')
  || file.startsWith('pdf/')
  || file.startsWith('pdf-icons/')
  || file === 'branding/hgi-logo-white.png'

try {
  for (const file of report.unused) {
    await unlink(path.join(assetRoot, file))
    removed += 1
  }

  for (const file of report.used) {
    const extension = path.extname(file).toLowerCase()
    if (!['.png', '.jpg', '.jpeg'].includes(extension) || mustRemainOriginal(file)) continue
    const source = path.join(assetRoot, file)
    try { await stat(source) } catch { continue }
    const metadata = await sharp(source).metadata()
    const destinationRelative = file.slice(0, -extension.length) + '.webp'
    const destination = path.join(assetRoot, destinationRelative)
    const temporary = path.join(tempDir, destinationRelative.replaceAll('/', '__'))
    const hasAlpha = metadata.hasAlpha === true
    const photoLike = /^(hero|home|visualizer)\//.test(file)
    const pipeline = sharp(source, { failOn: 'error' })
    if (hasAlpha) await pipeline.webp({ lossless: true, effort: 6 }).toFile(temporary)
    else await pipeline.webp({ quality: photoLike ? 84 : 90, smartSubsample: true, effort: 6 }).toFile(temporary)
    const convertedMetadata = await sharp(temporary).metadata()
    if (metadata.width !== convertedMetadata.width || metadata.height !== convertedMetadata.height) {
      throw new Error(`Dimension mismatch while converting ${file}`)
    }
    const [sourceInfo, convertedInfo] = await Promise.all([stat(source), stat(temporary)])
    if (convertedInfo.size >= sourceInfo.size) {
      skipped.push({ file, reason: 'WebP was not smaller' })
      continue
    }
    await rename(temporary, destination)
    await unlink(source)
    conversions.set(file, destinationRelative)
  }

  const sourceRoots = ['src', 'server', 'api']
  const sourceFiles: string[] = []
  async function walk(directory: string): Promise<string[]> {
    const { readdir } = await import('node:fs/promises')
    const result: string[] = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) result.push(...await walk(fullPath))
      else result.push(fullPath)
    }
    return result
  }
  for (const sourceRoot of sourceRoots) {
    try { sourceFiles.push(...await walk(path.join(root, sourceRoot))) } catch { /* optional */ }
  }
  sourceFiles.push(path.join(root, 'index.html'))

  // Full public URLs cover catalog objects and CSS. Filename-only replacement
  // covers assets passed into centralized path helpers (slabs and hardware).
  const byBasename = new Map<string, string | null>()
  for (const [from, to] of conversions) {
    const oldName = path.basename(from)
    const newName = path.basename(to)
    byBasename.set(oldName, byBasename.has(oldName) ? null : newName)
  }
  for (const file of sourceFiles) {
    if (!/\.(?:ts|tsx|js|jsx|mjs|cjs|css|html|json)$/.test(file)) continue
    let text = await readFile(file, 'utf8')
    const original = text
    for (const [from, to] of conversions) {
      text = text.replaceAll(`/assets/${from}`, `/assets/${to}`)
    }
    for (const [from, to] of byBasename) {
      if (to) text = text.replaceAll(`'${from}'`, `'${to}'`).replaceAll(`\"${from}\"`, `\"${to}\"`)
    }
    if (text !== original) await writeFile(file, text)
  }

  // These URL factories generate filenames rather than storing full paths.
  // Every reachable asset in these authored directories was converted above.
  const dynamicFiles = [
    'src/data/fslGlass.ts', 'src/data/f48slGlass.ts', 'src/data/sslGlass.ts',
    'src/data/glassOptions.ts', 'src/data/heroPresets.ts', 'src/data/options.ts',
    'src/data/hardware.ts', 'src/data/hardwareAssets.ts', 'src/data/schlageHardware.ts',
    'src/data/doorPreviewAssets.ts', 'src/App.tsx',
  ]
  for (const relative of dynamicFiles) {
    const file = path.join(root, relative)
    let text = await readFile(file, 'utf8')
    text = text.replaceAll('}.png`', '}.webp`')
    if (!relative.endsWith('glassOptions.ts')) text = text.replaceAll('.png', '.webp')
    await writeFile(file, text)
  }

  process.stdout.write(JSON.stringify({ removed, converted: conversions.size, skipped, conversions: Object.fromEntries(conversions) }, null, 2) + '\n')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
