import assert from 'node:assert/strict'
import { imageDataUrlToBlob, saveVisualizationImage, visualizationSourceToBlob } from '../src/features/home-visualizer/saveVisualizationImage'

const jpegDataUrl = 'data:image/jpeg;base64,/9j/2Q=='

async function main() {
  const jpeg = imageDataUrlToBlob(jpegDataUrl)
  assert.equal(jpeg.type, 'image/jpeg')
  assert.equal(jpeg.size, 4)

  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
  assert.equal(await visualizationSourceToBlob(png), png)
  const remotePng = await visualizationSourceToBlob(
    'https://images.example.test/visualization.png',
    async () => new Response(png, { status: 200, headers: { 'Content-Type': 'image/png' } }),
  )
  assert.equal(remotePng.type, 'image/png')
  assert.equal(remotePng.size, png.size)

  const clicked: string[] = []
  const revoked: string[] = []
  const desktop = await saveVisualizationImage(jpeg, {
    filenameBase: 'hgi-door-visualization',
    environment: {
      navigator: { userAgent: 'Desktop Chrome', maxTouchPoints: 0 },
      document: {
        createElement: () => ({ href: '', download: '', rel: '', click: () => clicked.push('clicked'), remove: () => undefined }) as unknown as HTMLAnchorElement,
        body: { appendChild: () => undefined } as unknown as HTMLElement,
      },
      fetch,
      createObjectURL: () => 'blob:desktop',
      revokeObjectURL: value => revoked.push(value),
      scheduleCleanup: callback => { callback(); return 1 },
    },
  })
  assert.deepEqual(desktop, { method: 'download', filename: 'hgi-door-visualization.jpg' })
  assert.deepEqual(clicked, ['clicked'])
  assert.deepEqual(revoked, ['blob:desktop'])

  let sharedFilename = ''
  const mobileShare = await saveVisualizationImage(png, {
    environment: {
      navigator: {
        userAgent: 'iPhone Mobile Safari', maxTouchPoints: 5,
        canShare: value => Boolean(value.files?.length),
        share: async value => { sharedFilename = value.files?.[0]?.name ?? '' },
      },
      document: {} as Document,
      fetch,
      createObjectURL: () => { throw new Error('Share should not allocate an object URL.') },
      revokeObjectURL: () => undefined,
      scheduleCleanup: () => 1,
    },
  })
  assert.equal(mobileShare.method, 'share')
  assert.equal(sharedFilename, 'hgi-door-visualization.png')

  const cancelledShare = await saveVisualizationImage(png, {
    environment: {
      navigator: {
        userAgent: 'iPhone Mobile Safari', maxTouchPoints: 5,
        canShare: value => Boolean(value.files?.length),
        share: async () => { throw new DOMException('The operation was cancelled.', 'AbortError') },
      },
      document: {} as Document,
      fetch,
      createObjectURL: () => { throw new Error('Cancelled share should not allocate an object URL.') },
      revokeObjectURL: () => undefined,
      scheduleCleanup: () => 1,
    },
  })
  assert.equal(cancelledShare.method, 'cancelled')

  let fallbackRevoked = false
  const mobileFallback = await saveVisualizationImage(jpeg, {
    environment: {
      navigator: { userAgent: 'Android Mobile Chrome', maxTouchPoints: 5 },
      document: {} as Document,
      fetch,
      createObjectURL: () => 'blob:fallback',
      revokeObjectURL: () => { fallbackRevoked = true },
      scheduleCleanup: () => 1,
    },
  })
  assert.equal(mobileFallback.method, 'fallback')
  if (mobileFallback.method === 'fallback') mobileFallback.revoke()
  assert.equal(fallbackRevoked, true)

  await assert.rejects(
    () => visualizationSourceToBlob('https://example.test/expired.jpg', async () => new Response('', { status: 404 })),
    /no longer available/,
  )
  await assert.rejects(() => visualizationSourceToBlob(new Blob([], { type: 'image/jpeg' })), /unavailable/)
  console.log('Visualization download verification passed.')
}

void main()
