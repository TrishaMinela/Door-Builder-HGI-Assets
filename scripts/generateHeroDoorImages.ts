import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { HERO_PRESETS, heroDoorFilename } from '../src/data/heroPresets'

const PORT = 4178
const BASE_URL = `http://127.0.0.1:${PORT}`
const OUTPUT_DIRECTORY = path.resolve(process.cwd(), 'public/assets/generated/hero-doors')
const CHROME_EXECUTABLE = process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function waitForServer(process: ChildProcess) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`The Vite generation server exited with code ${process.exitCode}.`)
    try {
      const response = await fetch(BASE_URL)
      if (response.ok) return
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for the Vite generation server.')
}

async function main() {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout?.on('data', (chunk) => process.stdout.write(String(chunk)))
  server.stderr?.on('data', (chunk) => process.stderr.write(String(chunk)))

  try {
    await waitForServer(server)
    const browser = await chromium.launch({ executablePath: CHROME_EXECUTABLE, headless: true })
    try {
      const page = await browser.newPage({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2 })
      for (let index = 0; index < HERO_PRESETS.length; index += 1) {
        const preset = HERO_PRESETS[index]
        const filename = heroDoorFilename(preset, index)
        const browserErrors: string[] = []
        const onConsole = (message: { type(): string; text(): string }) => { if (message.type() === 'error') browserErrors.push(message.text()) }
        page.on('console', onConsole)
        await page.goto(`${BASE_URL}/?generateHeroDoor=${index}`, { waitUntil: 'networkidle' })
        await page.waitForFunction(() => window.__heroDoorReady === true && typeof window.__captureHeroDoor === 'function')
        const result = await page.evaluate(async () => {
          if (!window.__captureHeroDoor) throw new Error('The hero capture function was not registered.')
          return window.__captureHeroDoor()
        })
        page.off('console', onConsole)
        const fatalBrowserErrors = browserErrors.filter((message) => message.includes('[door-preview:') && /missing|failed|could not|dimension-mismatch/i.test(message))
        if (fatalBrowserErrors.length) throw new Error(`${filename} reported missing or invalid assets:\n${fatalBrowserErrors.join('\n')}`)
        const outputPath = path.join(OUTPUT_DIRECTORY, filename)
        await writeFile(outputPath, Buffer.from(result.base64, 'base64'))
        process.stdout.write(`Generated ${filename} — ${result.width}×${result.height} WebP\n`)
      }
    } finally {
      await browser.close()
    }
  } finally {
    server.kill('SIGTERM')
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
