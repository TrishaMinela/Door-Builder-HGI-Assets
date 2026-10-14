/** Color-independent relief from the authored SSL pixels, not drawn contours.
 * A local surface reference removes the white/brown source tone. Uniform faces
 * stay at the selected RGB; only existing bevels and texture modulate it. */
export function renderSslRelief(slab: HTMLImageElement, mask: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = slab.naturalWidth; canvas.height = slab.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  // Some textured SSL assets store translucent relief instead of an opaque
  // white slab. Resolve that authored alpha over a neutral source first.
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(slab, 0, 0)
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(mask, 0, 0)
  const coverage = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const rgb = color.replace('#', '').match(/../g)!.map(value => parseInt(value, 16))
  const radius = Math.max(2, Math.round(canvas.width * .1))
  const stride = canvas.width + 1
  const sums = new Float64Array(stride * (canvas.height + 1))
  const counts = new Float64Array(sums.length)
  const luminance = new Float64Array(canvas.width * canvas.height)
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = y * canvas.width + x, p = i * 4, k = (y + 1) * stride + x + 1
    luminance[i] = source.data[p] * .2126 + source.data[p + 1] * .7152 + source.data[p + 2] * .0722
    // Do not let the glass opening or transparent artwork create a false edge.
    const valid = coverage.data[p] > 245 && source.data[p + 3] > 245 ? 1 : 0
    sums[k] = luminance[i] * valid + sums[k - 1] + sums[k - stride] - sums[k - stride - 1]
    counts[k] = valid + counts[k - 1] + counts[k - stride] - counts[k - stride - 1]
  }
  const gain = 1.1 + (1 - Math.max(...rgb) / 255) * 1.6
  const output = ctx.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = y * canvas.width + x, p = i * 4
    const left = Math.max(0, x - radius), right = Math.min(canvas.width, x + radius + 1)
    const top = Math.max(0, y - radius), bottom = Math.min(canvas.height, y + radius + 1)
    const area = (table: Float64Array) => table[bottom * stride + right] - table[top * stride + right] - table[bottom * stride + left] + table[top * stride + left]
    const count = area(counts)
    const delta = count && coverage.data[p] > 245 && source.data[p + 3] > 245 ? luminance[i] - area(sums) / count : 0
    const relief = Math.abs(delta) < .75 ? 0 : Math.max(-.3, Math.min(.3, delta / 255 * gain))
    // Proportional RGB shading retains hue/saturation; no white outline, global
    // brightness adjustment, or source material color is mixed into the finish.
    const headroom = (255 - Math.max(...rgb)) / Math.max(1, Math.max(...rgb))
    const factor = 1 + Math.min(relief, headroom * .4)
    rgb.forEach((value, channel) => { output.data[p + channel] = Math.round(value * factor) })
    output.data[p + 3] = 255
  }
  ctx.putImageData(output, 0, 0)
  return canvas
}
