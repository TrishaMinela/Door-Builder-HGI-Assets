import { darkFinishStrength, finishRgb, renderSslRelief } from './sideliteRelief'
export { darkFinishStrength } from './sideliteRelief'

export const FINISH_RENDERING = {
  paintColorBlendMode: 'normal', paintColorOpacity: 0.92, slabColorOpacity: 1,
  paintDetailBlendMode: 'multiply', paintDetailOpacity: 0.25,
  stainColorBlendMode: 'normal', stainColorOpacity: 0.92,
  stainDetailBlendMode: 'multiply', stainDetailOpacity: 0.52,
  stainContrast: 1.35, stainSaturation: 1.18,
  stainHighlightOpacity: 0.76, stainGlossStrength: 1,
} as const

/** Shade existing frame profiles without mixing in white or shifting hue. */
export function frameFinishLighting(color: string, variant: 'exterior' | 'interior', kind: 'paint' | 'stain') {
  const rgb = finishRgb(color), amount = darkFinishStrength(color)
  const shade = (factor: number) => `#${rgb.map(c => Math.round(Math.min(255, c * factor)).toString(16).padStart(2, '0')).join('')}`
  const edge = variant === 'exterior' ? .035 : kind === 'stain' ? .075 : .055
  return { base: color, shadow: shade(1 - edge - .09 * amount), highlight: shade(1 + .16 * amount) }
}

/** Same precomposed surface for CSS preview, capture and canvas PDF. A dark
 * finish transitions from the existing material pass to locally normalized
 * authored relief. No new texture, directional gradient or contour is drawn. */
export function renderDarkFinishSurface(slab: HTMLImageElement, mask: HTMLImageElement | undefined, color: string, kind: 'paint' | 'stain', alphaMask = true): HTMLCanvasElement {
  const result = document.createElement('canvas')
  result.width = slab.naturalWidth; result.height = slab.naturalHeight
  const ctx = result.getContext('2d')!
  ctx.fillStyle = color
  if (kind === 'stain') ctx.filter = `saturate(${FINISH_RENDERING.stainSaturation})`
  ctx.fillRect(0, 0, result.width, result.height)
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = kind === 'paint' ? FINISH_RENDERING.paintDetailOpacity : FINISH_RENDERING.stainDetailOpacity
  ctx.filter = `grayscale(1) contrast(${kind === 'paint' ? 1.12 : FINISH_RENDERING.stainContrast})`
  ctx.drawImage(slab, 0, 0)
  ctx.filter = 'none'
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = darkFinishStrength(color)
  ctx.drawImage(renderSslRelief(slab, mask, color, alphaMask), 0, 0)
  ctx.globalAlpha = 1
  return result
}
