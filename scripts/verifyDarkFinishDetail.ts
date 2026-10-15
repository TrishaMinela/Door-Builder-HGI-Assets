import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5228', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5228')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5228/scripts/pdfRendererHarness.html')
  // Browser module import exercises the same canvas implementation as captures.
  const result = await page.evaluate(`(async () => {
    const {darkFinishStrength, frameFinishLighting, renderDarkFinishSurface} = await import('/src/utils/finishDetail.ts');
    const {loadPdfImage} = await import('/src/utils/pdfProductRenderer.ts');
    const {finishes} = await import('/src/data/options.ts');
    const colors = ['paint-musket','paint-wineberry','paint-terratone','paint-black','paint-white'].map(id=>finishes.find(f=>f.id===id).color);
    const samples = [];
    for (let n=0;n<=255;n++) { const h=n.toString(16).padStart(2,'0'); samples.push(darkFinishStrength('#'+h+h+h)); }
    const source=document.createElement('canvas'); source.width=80; source.height=160;
    const ctx=source.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,80,160);
    const flat=await loadPdfImage(source.toDataURL());
    ctx.fillStyle='#ccc'; ctx.fillRect(0,0,80,160);
    ctx.fillStyle='#777'; ctx.fillRect(20,0,4,160);
    ctx.fillStyle='#fff'; ctx.fillRect(24,0,4,160);
    const authored=await loadPdfImage(source.toDataURL());
    return {samples, colors: colors.map(color => {
      const flatPaint=renderDarkFinishSurface(flat,undefined,color,'paint');
      const paint=renderDarkFinishSurface(authored,undefined,color,'paint');
      const pixels=paint.getContext('2d').getImageData(0,0,80,160).data;
      const pixel=(x)=>Array.from(pixels.slice((80*80+x)*4,(80*80+x)*4+4));
      return {color, flat:Array.from(flatPaint.getContext('2d').getImageData(40,80,1,1).data), shadow:pixel(22), highlight:pixel(26), face:pixel(50), frame:frameFinishLighting(color,'exterior','paint')};
    })};
  })()`)
  for (let i = 1; i < result.samples.length; i++) {
    assert.ok(result.samples[i] <= result.samples[i - 1], 'Adjustment decreases monotonically with luminance')
    assert.ok(result.samples[i - 1] - result.samples[i] < .02, 'No abrupt color threshold')
  }
  for (const sample of result.colors) {
    const rgb = sample.color.slice(1).match(/../g)!.map((c: string) => parseInt(c, 16))
    assert.deepEqual(sample.flat, [...rgb, 255], 'Uniform smooth source stays at the selected RGB; no invented grain, outlines or global lightening')
    assert.equal(sample.frame.base, sample.color)
    if (sample.color === '#EBEEE8') continue
    assert.ok(sample.highlight[0] > sample.face[0] && sample.face[0] > sample.shadow[0], 'Authored highlight/recess direction is preserved')
    for (const pixel of [sample.shadow, sample.highlight]) {
      assert.ok(pixel[0] >= rgb[0] * .75, 'Shadows do not crush the selected dark color')
      for (let c = 1; c < 3; c++) assert.ok(Math.abs(pixel[0] * rgb[c] - pixel[c] * rgb[0]) <= rgb[0] + rgb[c], 'Local shading preserves hue/channel proportions')
    }
  }
  console.log('Dark finish detail: continuous luminance response, exact flat RGB, no invented smooth-surface texture, authored highlights/shadows, bounded shadows, hue and shared frame lighting passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
