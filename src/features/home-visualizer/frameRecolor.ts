import type { CleanupStroke } from './CleanupBrushEditor'
import type { EntranceCorners, Point } from './EntranceSelector'

export type FrameSides = { top: boolean; left: boolean; right: boolean; bottom: boolean }
export type FrameMaskCorrections = { add: CleanupStroke[]; remove: CleanupStroke[] }
export const AUTO_FRAME_MARGIN_PX = 10

type DisplaySize = { width: number; height: number }

function lineIntersection(firstA: Point, firstB: Point, secondA: Point, secondB: Point): Point | null {
  const firstX=firstB.x-firstA.x,firstY=firstB.y-firstA.y,secondX=secondB.x-secondA.x,secondY=secondB.y-secondA.y,denominator=firstX*secondY-firstY*secondX
  if(Math.abs(denominator)<1e-8)return null
  const ratio=((secondA.x-firstA.x)*secondY-(secondA.y-firstA.y)*secondX)/denominator
  return{x:firstA.x+ratio*firstX,y:firstA.y+ratio*firstY}
}

/** Offset the assembly's four perspective edges in base display pixels,
 * including the bottom threshold edge. Coordinates remain normalized and
 * floating-point so the frame follows the entrance perspective. */
export function createAutomaticFrame(assembly: EntranceCorners, displaySize: DisplaySize, marginPx=AUTO_FRAME_MARGIN_PX): EntranceCorners {
  const width=Math.max(1,displaySize.width),height=Math.max(1,displaySize.height)
  const points=[assembly.topLeft,assembly.topRight,assembly.bottomRight,assembly.bottomLeft].map(point=>({x:point.x*width,y:point.y*height}))
  const offsets=[marginPx,marginPx,marginPx,marginPx]
  const lines=points.map((point,index)=>{const next=points[(index+1)%points.length],dx=next.x-point.x,dy=next.y-point.y,length=Math.max(1e-8,Math.hypot(dx,dy)),distance=offsets[index],nx=dy/length*distance,ny=-dx/length*distance;return[{x:point.x+nx,y:point.y+ny},{x:next.x+nx,y:next.y+ny}]as const})
  const expanded=lines.map((line,index)=>lineIntersection(lines[(index+3)%4][0],lines[(index+3)%4][1],line[0],line[1])??line[0])
  const normalized=expanded.map(point=>({x:Math.max(0,Math.min(1,point.x/width)),y:Math.max(0,Math.min(1,point.y/height))}))
  return{topLeft:normalized[0],topRight:normalized[1],bottomRight:normalized[2],bottomLeft:normalized[3]}
}

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

function contractOpeningForOverlap(opening: EntranceCorners, width: number, height: number, overlap: number): Point[] {
  const points=[opening.topLeft,opening.topRight,opening.bottomRight,opening.bottomLeft],center=points.reduce((sum,point)=>({x:sum.x+point.x/points.length,y:sum.y+point.y/points.length}),{x:0,y:0})
  return points.map(point=>{const dx=(center.x-point.x)*width,dy=(center.y-point.y)*height,distance=Math.hypot(dx,dy);if(!distance)return point;return{x:point.x+dx/distance*overlap/width,y:point.y+dy/distance*overlap/height}})
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
  const MASK_SUPERSAMPLE=4,short=Math.min(width,height),allCorrectionPoints=[...corrections.add,...corrections.remove].flatMap(stroke=>stroke.points),outerPoints=[outer.topLeft,outer.topRight,outer.bottomRight,outer.bottomLeft],boundsPoints=[...outerPoints,...allCorrectionPoints],correctionPadding=Math.max(6,...[...corrections.add,...corrections.remove].map(stroke=>stroke.radius*short+4)),cropLeft=Math.max(0,Math.floor(Math.min(...boundsPoints.map(point=>point.x*width))-correctionPadding)),cropTop=Math.max(0,Math.floor(Math.min(...boundsPoints.map(point=>point.y*height))-correctionPadding)),cropRight=Math.min(width,Math.ceil(Math.max(...boundsPoints.map(point=>point.x*width))+correctionPadding)),cropBottom=Math.min(height,Math.ceil(Math.max(...boundsPoints.map(point=>point.y*height))+correctionPadding)),cropWidth=Math.max(1,cropRight-cropLeft),cropHeight=Math.max(1,cropBottom-cropTop)
  const canvas = document.createElement('canvas'); const maskCanvas = document.createElement('canvas'); canvas.width = width;canvas.height=height;maskCanvas.width=cropWidth*MASK_SUPERSAMPLE;maskCanvas.height=cropHeight*MASK_SUPERSAMPLE
  const context = canvas.getContext('2d')!; const maskContext = maskCanvas.getContext('2d')!;context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image, 0, 0);maskContext.imageSmoothingEnabled=true;maskContext.imageSmoothingQuality='high';maskContext.scale(MASK_SUPERSAMPLE,MASK_SUPERSAMPLE);maskContext.translate(-cropLeft,-cropTop)
  maskContext.fillStyle = '#fff'
  polygon(maskContext, [outer.topLeft, outer.topRight, outer.bottomRight, outer.bottomLeft], width, height)
  maskContext.globalCompositeOperation = 'destination-out'
  // Reuse each exact opening polygon, then contract its mask cutout so the
  // recolored frame extends underneath the product. This shared 4px overlap
  // prevents the original bright/dark photo from appearing between layers.
  const FRAME_UNDERLAP_PX=4
  openings.forEach((opening) => polygon(maskContext, contractOpeningForOverlap(opening,width,height,FRAME_UNDERLAP_PX), width, height))
  if (!sides.bottom) polygon(maskContext, [outer.bottomLeft, outer.bottomRight, inner.bottomRight, inner.bottomLeft], width, height)
  maskContext.globalCompositeOperation = 'source-over'
  replay(maskContext, corrections.add, width, height, 'source-over'); replay(maskContext, corrections.remove, width, height, 'destination-out')
  // Four-times coverage sampling provides a crisp anti-aliased edge without the
  // broad Gaussian feather that previously made frame boundaries look muddy.
  const featherRadius=0
  const finalMaskCanvas=document.createElement('canvas'),hardMaskCanvas=document.createElement('canvas');finalMaskCanvas.width=hardMaskCanvas.width=width;finalMaskCanvas.height=hardMaskCanvas.height=height;const finalMaskContext=finalMaskCanvas.getContext('2d')!,hardMaskContext=hardMaskCanvas.getContext('2d')!;for(const maskOutputContext of [finalMaskContext,hardMaskContext]){maskOutputContext.imageSmoothingEnabled=true;maskOutputContext.imageSmoothingQuality='high';maskOutputContext.drawImage(maskCanvas,0,0,maskCanvas.width,maskCanvas.height,cropLeft,cropTop,cropWidth,cropHeight)}
  const pixels = context.getImageData(0, 0, width, height); const originalPixels=import.meta.env.DEV?new Uint8ClampedArray(pixels.data):null;const mask = finalMaskContext.getImageData(0, 0, width, height).data; const hardMask=hardMaskContext.getImageData(0,0,width,height).data;const target = parseHex(targetColor);const targetHsl=rgbToHsl(target.r,target.g,target.b)
  const sourceLightnessSamples:number[]=[]
  const sampleStep=Math.max(1,Math.ceil(width*height/60000))
  for(let index=0;index<width*height;index+=sampleStep){if(hardMask[index*4+3]<192)continue;const offset=index*4;sourceLightnessSamples.push(rgbToHsl(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2]).l)}
  sourceLightnessSamples.sort((first,second)=>first-second)
  const sourceLightnessCenter=sourceLightnessSamples.length?sourceLightnessSamples[Math.floor(sourceLightnessSamples.length/2)]:.5
  const targetCenter=Math.max(.14,Math.min(.88,targetHsl.l))
  const contrastScale=finishType==='stain'?.78:targetCenter<.25?.64:targetCenter>.75?.68:.74
  const strength=finishType==='stain'?.88:finishType==='clad'?.94:.92
  for (let index = 0; index < width * height; index += 1) {
    const alpha = mask[index * 4 + 3] / 255 * strength; if (!alpha) continue
    const offset=index*4,sourceHsl=rgbToHsl(pixels.data[offset],pixels.data[offset+1],pixels.data[offset+2]);const localVariation=Math.max(-.2,Math.min(.2,sourceHsl.l-sourceLightnessCenter));const preservedLightness=Math.max(.045,Math.min(.955,targetCenter+localVariation*contrastScale));const saturation=finishType==='stain'?Math.min(1,targetHsl.s*1.03):targetHsl.s;const colored=hslToRgb(targetHsl.h,saturation,preservedLightness)
    pixels.data[offset]=Math.round(pixels.data[offset]*(1-alpha)+colored.r*alpha);pixels.data[offset+1]=Math.round(pixels.data[offset+1]*(1-alpha)+colored.g*alpha);pixels.data[offset+2]=Math.round(pixels.data[offset+2]*(1-alpha)+colored.b*alpha)
  }
  context.putImageData(pixels, 0, 0);if(originalPixels)publishDevelopmentDiagnostics(originalPixels,pixels.data,mask,width,height,featherRadius,outer);const result = await blob(canvas);canvas.width=canvas.height=maskCanvas.width=maskCanvas.height=finalMaskCanvas.width=finalMaskCanvas.height=hardMaskCanvas.width=hardMaskCanvas.height=0;return result
}
