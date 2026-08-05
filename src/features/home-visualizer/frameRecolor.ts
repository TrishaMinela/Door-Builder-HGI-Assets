import type { CleanupStroke } from './CleanupBrushEditor'
import type { EntranceCorners, Point } from './EntranceSelector'

export type FrameSides = { top: boolean; left: boolean; right: boolean; bottom: boolean }
export type FrameMaskCorrections = { add: CleanupStroke[]; remove: CleanupStroke[] }

export function expandFrameCorners(inner: EntranceCorners): EntranceCorners {
  return {
    topLeft: { x: Math.max(0, inner.topLeft.x - .035), y: Math.max(0, inner.topLeft.y - .025) },
    topRight: { x: Math.min(1, inner.topRight.x + .035), y: Math.max(0, inner.topRight.y - .025) },
    bottomRight: { x: Math.min(1, inner.bottomRight.x + .035), y: Math.min(1, inner.bottomRight.y + .018) },
    bottomLeft: { x: Math.max(0, inner.bottomLeft.x - .035), y: Math.min(1, inner.bottomLeft.y + .018) },
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The house photo could not be prepared for frame color.')); image.src = src
  })
}

function polygon(context: CanvasRenderingContext2D, points: Point[], width: number, height: number) {
  context.beginPath(); points.forEach((point, index) => index ? context.lineTo(point.x * width, point.y * height) : context.moveTo(point.x * width, point.y * height)); context.closePath(); context.fill()
}

function replay(context: CanvasRenderingContext2D, strokes: CleanupStroke[], width: number, height: number, operation: GlobalCompositeOperation) {
  context.globalCompositeOperation = operation; context.fillStyle = '#fff'; const short = Math.min(width, height)
  strokes.forEach((stroke) => {
    const radius = stroke.radius * short
    stroke.points.forEach((point, index) => {
      const previous = stroke.points[index - 1] ?? point; const distance = Math.hypot((point.x - previous.x) * width, (point.y - previous.y) * height); const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * .45)))
      for (let step = 1; step <= steps; step += 1) { const ratio = step / steps; context.beginPath(); context.arc((previous.x + (point.x - previous.x) * ratio) * width, (previous.y + (point.y - previous.y) * ratio) * height, radius, 0, Math.PI * 2); context.fill() }
    })
  })
  context.globalCompositeOperation = 'source-over'
}

function parseHex(color: string) {
  const match = color.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return { r: 217, g: 217, b: 217 }
  return { r: parseInt(match[1].slice(0, 2), 16), g: parseInt(match[1].slice(2, 4), 16), b: parseInt(match[1].slice(4, 6), 16) }
}

function rgbToHsl(r: number, g: number, b: number) {
  const red=r/255,green=g/255,blue=b/255,max=Math.max(red,green,blue),min=Math.min(red,green,blue),lightness=(max+min)/2
  if(max===min)return{h:0,s:0,l:lightness}
  const delta=max-min,saturation=lightness>.5?delta/(2-max-min):delta/(max+min)
  const hue=max===red?(green-blue)/delta+(green<blue?6:0):max===green?(blue-red)/delta+2:(red-green)/delta+4
  return{h:hue/6,s:saturation,l:lightness}
}

function hslToRgb(h: number, s: number, l: number) {
  if(!s){const value=Math.round(l*255);return{r:value,g:value,b:value}}
  const hue=(p:number,q:number,t:number)=>{let value=t;if(value<0)value+=1;if(value>1)value-=1;if(value<1/6)return p+(q-p)*6*value;if(value<1/2)return q;if(value<2/3)return p+(q-p)*(2/3-value)*6;return p}
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q
  return{r:Math.round(hue(p,q,h+1/3)*255),g:Math.round(hue(p,q,h)*255),b:Math.round(hue(p,q,h-1/3)*255)}
}

function publishDevelopmentDiagnostics(original: Uint8ClampedArray, recolored: Uint8ClampedArray, mask: Uint8ClampedArray, width: number, height: number, featherRadius: number, outer: EntranceCorners) {
  if(!import.meta.env.DEV)return
  document.querySelector('[data-frame-recolor-diagnostics]')?.remove()
  const points=[outer.topLeft,outer.topRight,outer.bottomRight,outer.bottomLeft],padding=4,x=Math.max(0,Math.floor(Math.min(...points.map(point=>point.x))*width)-padding),y=Math.max(0,Math.floor(Math.min(...points.map(point=>point.y))*height)-padding),right=Math.min(width,Math.ceil(Math.max(...points.map(point=>point.x))*width)+padding),bottom=Math.min(height,Math.ceil(Math.max(...points.map(point=>point.y))*height)+padding),cropWidth=Math.max(1,right-x),cropHeight=Math.max(1,bottom-y)
  const host=document.createElement('div');host.hidden=true;host.dataset.frameRecolorDiagnostics='true';host.dataset.processingResolution=`${width}x${height}`;host.dataset.crop=`${x},${y},${cropWidth},${cropHeight}`;host.dataset.featherRadius=`${featherRadius}px`
  const addCanvas=(label:string,data:Uint8ClampedArray,alphaOnly=false)=>{const canvas=document.createElement('canvas');canvas.width=cropWidth;canvas.height=cropHeight;canvas.dataset.label=label;const context=canvas.getContext('2d');if(!context)return;const visible=context.createImageData(cropWidth,cropHeight);for(let row=0;row<cropHeight;row+=1){for(let column=0;column<cropWidth;column+=1){const sourceOffset=((y+row)*width+x+column)*4,targetOffset=(row*cropWidth+column)*4;if(alphaOnly){const alpha=data[sourceOffset+3];visible.data.set([alpha,alpha,alpha,255],targetOffset)}else visible.data.set(data.subarray(sourceOffset,sourceOffset+4),targetOffset)}}context.putImageData(visible,0,0);host.appendChild(canvas)}
  addCanvas('Original full-resolution frame source',original);addCanvas('Recolored full-resolution frame result',recolored);addCanvas('Feathered mask alpha',mask,true);document.body.appendChild(host)
  console.debug('[home-visualizer:frame-recolor]',{processingResolution:`${width}×${height}`,featherRadius,diagnostics:host})
}

function blob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The frame preview could not be encoded.')), 'image/png'))
}

export async function recolorPhotoFrame(imageSrc: string, inner: EntranceCorners, outer: EntranceCorners, sides: FrameSides, corrections: FrameMaskCorrections, targetColor: string, finishType: 'paint' | 'stain' | 'clad', openings: EntranceCorners[] = [inner]) {
  const image = await loadImage(imageSrc); const width = image.naturalWidth; const height = image.naturalHeight
  const canvas = document.createElement('canvas'); const maskCanvas = document.createElement('canvas'); canvas.width = maskCanvas.width = width; canvas.height = maskCanvas.height = height
  const context = canvas.getContext('2d')!; const maskContext = maskCanvas.getContext('2d')!; context.drawImage(image, 0, 0)
  maskContext.fillStyle = '#fff'
  polygon(maskContext, [outer.topLeft, outer.topRight, outer.bottomRight, outer.bottomLeft], width, height)
  maskContext.globalCompositeOperation = 'destination-out'
  openings.forEach((opening) => polygon(maskContext, [opening.topLeft, opening.topRight, opening.bottomRight, opening.bottomLeft], width, height))
  if (!sides.bottom) polygon(maskContext, [outer.bottomLeft, outer.bottomRight, inner.bottomRight, inner.bottomLeft], width, height)
  maskContext.globalCompositeOperation = 'source-over'
  replay(maskContext, corrections.add, width, height, 'source-over'); replay(maskContext, corrections.remove, width, height, 'destination-out')
  const featherRadius=Math.max(1,Math.min(3,Math.max(width,height)>=5000?2.5:Math.max(width,height)>=2500?1.75:1.25))
  const featherCanvas = document.createElement('canvas'); featherCanvas.width = width; featherCanvas.height = height; const featherContext = featherCanvas.getContext('2d')!; featherContext.filter = `blur(${featherRadius}px)`; featherContext.drawImage(maskCanvas, 0, 0)
  const pixels = context.getImageData(0, 0, width, height); const originalPixels=import.meta.env.DEV?new Uint8ClampedArray(pixels.data):null;const mask = featherContext.getImageData(0, 0, width, height).data; const hardMask=maskContext.getImageData(0,0,width,height).data;const target = parseHex(targetColor);const targetHsl=rgbToHsl(target.r,target.g,target.b)
  let sourceLightnessTotal=0,sourcePixelCount=0
  for(let index=0;index<width*height;index+=1){if(hardMask[index*4+3]<128)continue;const offset=index*4;sourceLightnessTotal+=rgbToHsl(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2]).l;sourcePixelCount+=1}
  const averageSourceLightness=sourcePixelCount?sourceLightnessTotal/sourcePixelCount:.5
  const targetCenter=Math.max(.14,Math.min(.88,targetHsl.l));const contrastScale=targetCenter<.25?.68:targetCenter>.75?.78:.92
  const strength=finishType==='stain'?.7:finishType==='clad'?.82:.78
  for (let index = 0; index < width * height; index += 1) {
    const alpha = mask[index * 4 + 3] / 255 * strength; if (!alpha) continue
    const offset=index*4,sourceHsl=rgbToHsl(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2]);const preservedLightness=Math.max(.035,Math.min(.965,targetCenter+(sourceHsl.l-averageSourceLightness)*contrastScale));const saturation=finishType==='stain'?Math.min(1,targetHsl.s*1.05):targetHsl.s;const colored=hslToRgb(targetHsl.h,saturation,preservedLightness)
    pixels.data[offset]=Math.round(pixels.data[offset]*(1-alpha)+colored.r*alpha);pixels.data[offset+1]=Math.round(pixels.data[offset+1]*(1-alpha)+colored.g*alpha);pixels.data[offset+2]=Math.round(pixels.data[offset+2]*(1-alpha)+colored.b*alpha)
  }
  context.putImageData(pixels, 0, 0);if(originalPixels)publishDevelopmentDiagnostics(originalPixels,pixels.data,mask,width,height,featherRadius,outer);const result = await blob(canvas); canvas.width = canvas.height = maskCanvas.width = maskCanvas.height = featherCanvas.width = featherCanvas.height = 0; return result
}
