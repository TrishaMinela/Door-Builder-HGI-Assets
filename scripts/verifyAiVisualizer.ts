import assert from 'node:assert/strict'
import handler from '../api/generate-ai-visualization.ts'

const pixel = 'data:image/png;base64,iVBORw0KGgo='
const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY

let forwardedForm: FormData | null = null
globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
  assert.equal(init?.method, 'POST')
  assert.ok(init?.body instanceof FormData)
  forwardedForm = init.body
  return new Response(JSON.stringify({ data: [{ b64_json: 'YWktcmVzdWx0' }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch
process.env.OPENAI_API_KEY = 'test-key'

let statusCode = 0
let responseBody: unknown
const response = {
  status(code: number) { statusCode = code; return this },
  json(body: unknown) { responseBody = body },
  setHeader() {},
}

try {
  await handler({
    method: 'POST',
    body: JSON.stringify({
      photo: pixel,
      mask: pixel,
      corners: {
        topLeft: { x: .2, y: .1 }, topRight: { x: .8, y: .1 },
        bottomRight: { x: .8, y: .9 }, bottomLeft: { x: .2, y: .9 },
      },
      configuration: { schemaVersion: 1, configuration: { finish: { name: 'Black', color: '#111111' } } },
      references: [{ label: 'base door style', dataUrl: pixel }, { label: 'selected hardware', dataUrl: pixel }],
    }),
  }, response)

  assert.equal(statusCode, 200)
  assert.deepEqual(responseBody, { image: 'data:image/jpeg;base64,YWktcmVzdWx0' })
  assert.ok(forwardedForm)
  const images = forwardedForm.getAll('image[]')
  assert.equal(images.length, 3, 'house photo plus two original product references should be sent')
  assert.ok(forwardedForm.get('mask') instanceof Blob)
  const prompt = String(forwardedForm.get('prompt'))
  assert.match(prompt, /Black/)
  assert.match(prompt, /base door style, selected hardware/)
  assert.match(prompt, /"topLeft":\{"x":0\.2,"y":0\.1\}/)
  assert.doesNotMatch(prompt, /finalEntranceImage/)
  console.log('AI visualizer endpoint verification passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
}
