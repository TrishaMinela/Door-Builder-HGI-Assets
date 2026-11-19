import { randomUUID } from 'node:crypto'
import { AiInputError, objectValue, prepareHouseAndMask } from '../server/aiImagePreprocessing.js'
import { AI_MAX_REQUEST_BYTES } from '../src/features/home-visualizer/aiImagePreparation.js'
import { recipeById, recipeMenu, RECIPES } from '../src/features/find-my-door/recipes.js'
import { chooseFinish, selectRecipes } from '../src/features/find-my-door/selectRecipes.js'
import { LIGHT_CHOICES, STYLE_CHOICES, type HouseReading, type LightPreference, type OpeningHint, type StyleMood } from '../src/features/find-my-door/types.js'

type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const MODEL = process.env.OPENAI_DOOR_RECOMMENDATION_MODEL || process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-5.4-mini'
const moods = new Set<StyleMood>(STYLE_CHOICES.map((choice) => choice.id))
const lights = new Set<LightPreference>(LIGHT_CHOICES.map((choice) => choice.id))
const openings = new Set<OpeningHint>(['single', 'double', 'sidelites', 'unknown'])

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    photoUsable: { type: 'boolean' },
    architecture: { type: 'string' },
    siding: { type: 'string' },
    trim: { type: 'string' },
    opening: { type: 'string', enum: ['single', 'double', 'sidelites', 'unknown'] },
    picks: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          recipeId: { type: 'string' },
          finishId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['recipeId', 'finishId', 'reason'],
      },
    },
  },
  required: ['photoUsable', 'architecture', 'siding', 'trim', 'opening', 'picks'],
} as const

function text(value: unknown, max = 80) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function outputText(result: Record<string, unknown>) {
  const output = Array.isArray(result.output) ? result.output : []
  for (const item of output) {
    const contents = objectValue(item)?.content
    if (!Array.isArray(contents)) continue
    for (const content of contents) {
      const value = objectValue(content)?.text
      if (typeof value === 'string') return value
    }
  }
  return ''
}

function reading(source: Record<string, unknown> | null): HouseReading {
  const opening = text(source?.opening, 20)
  return {
    architecture: text(source?.architecture),
    siding: text(source?.siding),
    trim: text(source?.trim),
    opening: openings.has(opening as OpeningHint) ? opening as OpeningHint : 'unknown',
  }
}

function picksFromModel(value: unknown, house: HouseReading) {
  if (!Array.isArray(value)) return []
  const used = new Set<string>()
  const picks: { id: string; finishId: string; reason: string }[] = []
  for (const item of value) {
    const source = objectValue(item)
    const recipe = recipeById(text(source?.recipeId, 80))
    if (!recipe || used.has(recipe.id)) continue
    used.add(recipe.id)
    picks.push({
      id: recipe.id,
      finishId: chooseFinish(recipe, house.siding, text(source?.finishId, 80)),
      reason: text(source?.reason, 280),
    })
    if (picks.length === 3) break
  }
  return picks
}

function preferencePicks(mood: StyleMood, light: LightPreference, house: HouseReading) {
  return selectRecipes(mood, light, house.opening).map((recipe) => ({
    id: recipe.id,
    finishId: chooseFinish(recipe, house.siding),
    reason: '',
  }))
}

function respond(response: ApiResponse, status: number, body: unknown) {
  response.status(status).json(body)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const requestId = randomUUID()
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Request-Id', requestId)
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    respond(response, 405, { error: 'Method not allowed.' })
    return
  }
  try {
    const serialized = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null)
    if (Buffer.byteLength(serialized) > AI_MAX_REQUEST_BYTES) {
      respond(response, 413, { error: 'That photo is too large. Please choose a smaller one.' })
      return
    }
    const source = objectValue(JSON.parse(serialized))
    const mood = text(source?.mood, 20)
    const light = text(source?.light, 20)
    if (!source || !moods.has(mood as StyleMood) || !lights.has(light as LightPreference) || typeof source.photo !== 'string') {
      respond(response, 400, { error: 'Choose a style and a light preference, then try the photo again.' })
      return
    }
    const prepared = await prepareHouseAndMask(source.photo, null)
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      respond(response, 200, { photoRead: false, house: reading(null), recommendations: preferencePicks(mood as StyleMood, light as LightPreference, reading(null)), request_id: requestId })
      return
    }
    const styleName = STYLE_CHOICES.find((choice) => choice.id === mood)?.name
    const lightName = LIGHT_CHOICES.find((choice) => choice.id === light)?.name
    let upstream: Response
    try {
      upstream = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model: MODEL,
          store: false,
          input: [{ role: 'user', content: [
            { type: 'input_text', text: [
              'You are recommending entry doors for Home Guard Industries from the menu below. Use only those recipe ids and finish ids.',
              `The homeowner wants: ${styleName}. Glass preference: ${lightName}.`,
              'Look at the house photo. Describe the architecture in a few words, the siding or masonry color, and the trim color. Set opening to single, double, or sidelites from the existing front door. Use unknown when the opening is unclear.',
              'Set photoUsable to false only when the image is not a house entrance.',
              'Return 2 or 3 different recipes. Prefer recipes whose light tag matches the glass preference, whose moods include the requested style, and whose opening matches the photo. Choose a finish id from that recipe to improve the house: contrast a light wall with a deeper door, or complement brick and dark siding with a lighter door. Stay inside the listed finishes.',
              'Each reason is one or two sentences about this specific house. Mention a color or material you can see. Do not invent products, glass, or colors that are not in the chosen recipe.',
              'Menu:',
              recipeMenu(),
              `Known recipe ids: ${RECIPES.map((recipe) => recipe.id).join(', ')}`,
            ].join('\n') },
            { type: 'input_image', image_url: `data:image/webp;base64,${prepared.photo.toString('base64')}`, detail: 'high' },
          ] }],
          text: { format: { type: 'json_schema', name: 'door_recommendations', strict: true, schema } },
        }),
      })
    } catch (error) {
      console.error('[find-my-door:provider]', { request_id: requestId, timeout: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') })
      respond(response, 200, { photoRead: false, house: reading(null), recommendations: preferencePicks(mood as StyleMood, light as LightPreference, reading(null)), request_id: requestId })
      return
    }
    const result = await upstream.json().catch(() => null) as Record<string, unknown> | null
    if (!upstream.ok || !result) {
      console.error('[find-my-door:provider-status]', { request_id: requestId, status: upstream.status })
      respond(response, 200, { photoRead: false, house: reading(null), recommendations: preferencePicks(mood as StyleMood, light as LightPreference, reading(null)), request_id: requestId })
      return
    }
    let parsed: Record<string, unknown> | null = null
    try { parsed = objectValue(JSON.parse(outputText(result))) } catch { parsed = null }
    const house = reading(parsed)
    if (parsed?.photoUsable === false) {
      respond(response, 422, { error: 'We couldn’t find a front door in that photo. Try a daylight photo with the whole entry in the frame.', request_id: requestId })
      return
    }
    const recommendations = picksFromModel(parsed?.picks, house).filter((pick) => {
      const recipe = recipeById(pick.id)
      return recipe?.light === light
    })
    if (recommendations.length < 2) {
      const extras = preferencePicks(mood as StyleMood, light as LightPreference, house)
      for (const extra of extras) {
        if (recommendations.some((pick) => pick.id === extra.id)) continue
        recommendations.push(extra)
        if (recommendations.length === 3) break
      }
    }
    respond(response, 200, { photoRead: Boolean(parsed), house, recommendations: recommendations.slice(0, 3), request_id: requestId })
  } catch (error) {
    const status = error instanceof AiInputError ? error.status : 400
    const message = error instanceof AiInputError && status === 413
      ? 'That photo is too large. Please choose a smaller one.'
      : 'We couldn’t read that photo. Please try another one with the whole front door visible.'
    respond(response, status === 413 ? 413 : 400, { error: message, request_id: requestId })
  }
}
