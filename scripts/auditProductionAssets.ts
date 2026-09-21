import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const assetRoot = path.join(root, 'public', 'assets')
const productionRoots = ['src', 'server', 'api']
const productionFiles = ['index.html', 'vercel.json']
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'])
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.json'])

async function walk(directory: string): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await walk(fullPath))
    else result.push(fullPath)
  }
  return result
}

function normalizeAssetUrl(value: string) {
  const clean = value.split(/[?#]/, 1)[0]
  if (!clean.startsWith('/assets/')) return null
  try {
    return decodeURIComponent(clean.slice('/assets/'.length)).replaceAll('\\', '/')
  } catch {
    return clean.slice('/assets/'.length).replaceAll('\\', '/')
  }
}

async function collectReferences() {
  const exact = new Set<string>()
  const dynamicPrefixes = new Set<string>()
  const sourceFiles: string[] = []
  for (const sourceRoot of productionRoots) {
    const fullRoot = path.join(root, sourceRoot)
    try {
      sourceFiles.push(...(await walk(fullRoot)).filter((file) => sourceExtensions.has(path.extname(file).toLowerCase())))
    } catch { /* optional server/api directory */ }
  }
  for (const file of productionFiles) {
    const fullPath = path.join(root, file)
    try { if ((await stat(fullPath)).isFile()) sourceFiles.push(fullPath) } catch { /* optional */ }
  }

  for (const file of sourceFiles) {
    const text = await readFile(file, 'utf8')
    for (const match of text.matchAll(/\/assets\/[A-Za-z0-9_@%+.,()&'\- /]+?\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?[^\s'"`)},]*)?/gi)) {
      const normalized = normalizeAssetUrl(match[0])
      if (normalized) exact.add(normalized)
    }
    // A template such as `/assets/foo/${name}.png` can reach any authored
    // file under foo. Preserve that directory unless a catalog enumerates it.
    for (const match of text.matchAll(/\/assets\/([^`'"\n]*?)\$\{/g)) {
      const staticPart = match[1]
      const slash = staticPart.lastIndexOf('/')
      if (slash >= 0) dynamicPrefixes.add(decodeURIComponent(staticPart.slice(0, slash + 1)))
    }
  }
  return { exact, dynamicPrefixes, sourceFiles }
}

const files = (await walk(assetRoot)).filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
const relativeFiles = files.map((file) => path.relative(assetRoot, file).replaceAll('\\', '/'))
const { exact, dynamicPrefixes, sourceFiles } = await collectReferences()
const used = new Set(relativeFiles.filter((file) => exact.has(file) || [...dynamicPrefixes].some((prefix) => file.startsWith(prefix))))
const missing = [...exact].filter((file) => !relativeFiles.includes(file)).sort()
const unused = relativeFiles.filter((file) => !used.has(file)).sort()

const hashes = new Map<string, string[]>()
let totalBytes = 0
let usedBytes = 0
for (const file of files) {
  const relative = path.relative(assetRoot, file).replaceAll('\\', '/')
  const buffer = await readFile(file)
  totalBytes += buffer.byteLength
  if (used.has(relative)) usedBytes += buffer.byteLength
  const hash = createHash('sha256').update(buffer).digest('hex')
  hashes.set(hash, [...(hashes.get(hash) ?? []), relative])
}
const duplicates = [...hashes.values()].filter((group) => group.length > 1).sort((a, b) => b.length - a.length)

const report = {
  sourceFilesScanned: sourceFiles.length,
  totalImages: relativeFiles.length,
  totalBytes,
  exactReferences: exact.size,
  dynamicPrefixes: [...dynamicPrefixes].sort(),
  usedImages: used.size,
  usedBytes,
  unusedImages: unused.length,
  unusedBytes: totalBytes - usedBytes,
  missingReferences: missing,
  duplicateGroups: duplicates.length,
  duplicateFiles: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
  used: [...used].sort(),
  unused,
  duplicates,
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
