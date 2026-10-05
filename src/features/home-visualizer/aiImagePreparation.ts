// AI-only limits; Manual photo/render resolution is deliberately unchanged.
export const AI_MAX_PHOTO_EDGE = 1536
export const AI_MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const AI_MASK_PADDING_PX = 18 // At a 1536px working edge; adjustable prototype blend allowance.
export const AI_CORNER_ORDER = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const
export type AiCorners = Record<typeof AI_CORNER_ORDER[number], { x: number; y: number }>

export function aiWorkingSize(width: number, height: number, maxEdge = AI_MAX_PHOTO_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function aiPixelCorners(corners: AiCorners, width: number, height: number) {
  return AI_CORNER_ORDER.map(name => ({ x: corners[name].x * width, y: corners[name].y * height }))
}
