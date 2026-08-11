import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { EntranceCorners, Point } from './EntranceSelector'
import { usePhotoZoom } from './usePhotoZoom'

export type SideliteSide = 'left' | 'right'
export type SideliteOpening = { innerTop: Point; innerBottom: Point; outerTop: Point; outerBottom: Point }
export type SideliteEdges = { left?: SideliteOpening; right?: SideliteOpening }
type Handle = keyof SideliteOpening

export function initializeSideliteEdges(door: EntranceCorners, sides: SideliteSide[]): SideliteEdges {
  const topWidth=door.topRight.x-door.topLeft.x,bottomWidth=door.bottomRight.x-door.bottomLeft.x
  const topGap=Math.max(.012,Math.min(.06,topWidth*.05)),bottomGap=Math.max(.012,Math.min(.06,bottomWidth*.05))
  return {
    ...(sides.includes('left')?{left:{innerTop:{x:Math.max(0,door.topLeft.x-topGap),y:door.topLeft.y},innerBottom:{x:Math.max(0,door.bottomLeft.x-bottomGap),y:door.bottomLeft.y},outerTop:{x:Math.max(0,door.topLeft.x-topGap-.15),y:door.topLeft.y},outerBottom:{x:Math.max(0,door.bottomLeft.x-bottomGap-.17),y:door.bottomLeft.y}}}:{}),
    ...(sides.includes('right')?{right:{innerTop:{x:Math.min(1,door.topRight.x+topGap),y:door.topRight.y},innerBottom:{x:Math.min(1,door.bottomRight.x+bottomGap),y:door.bottomRight.y},outerTop:{x:Math.min(1,door.topRight.x+topGap+.15),y:door.topRight.y},outerBottom:{x:Math.min(1,door.bottomRight.x+bottomGap+.17),y:door.bottomRight.y}}}:{})
  }
}

export function sideliteQuadrilateral(side:SideliteSide,opening:SideliteOpening):EntranceCorners{
  return side==='left'?{topLeft:opening.outerTop,topRight:opening.innerTop,bottomRight:opening.innerBottom,bottomLeft:opening.outerBottom}:{topLeft:opening.innerTop,topRight:opening.outerTop,bottomRight:opening.outerBottom,bottomLeft:opening.innerBottom}
}
export function sideliteOpeningQuads(edges:SideliteEdges){return(['left','right']as SideliteSide[]).flatMap(side=>edges[side]?[sideliteQuadrilateral(side,edges[side]!)]:[])}
export function completeEntranceBoundary(door:EntranceCorners,edges:SideliteEdges):EntranceCorners{return{topLeft:edges.left?.outerTop??door.topLeft,topRight:edges.right?.outerTop??door.topRight,bottomRight:edges.right?.outerBottom??door.bottomRight,bottomLeft:edges.left?.outerBottom??door.bottomLeft}}
export function dividerJambQuads(door:EntranceCorners,edges:SideliteEdges):EntranceCorners[]{const result:EntranceCorners[]=[];if(edges.left)result.push({topLeft:edges.left.innerTop,topRight:door.topLeft,bottomRight:door.bottomLeft,bottomLeft:edges.left.innerBottom});if(edges.right)result.push({topLeft:door.topRight,topRight:edges.right.innerTop,bottomRight:edges.right.innerBottom,bottomLeft:door.bottomRight});return result}

type Props={imageSrc:string;door:EntranceCorners;edges:SideliteEdges;sides:SideliteSide[];showSideChoice?:boolean;onChooseSide?:(side:SideliteSide)=>void;onChange:(edges:SideliteEdges)=>void}
export function SideliteSelector({imageSrc,door,edges,sides,showSideChoice=false,onChooseSide,onChange}:Props){
  const editorRef=useRef<HTMLDivElement>(null),stageRef=useRef<HTMLDivElement>(null),naturalRef=useRef({width:0,height:0}),dragRef=useRef<{side:SideliteSide;handle:Handle;pointer:number}|null>(null);const[size,setSize]=useState({width:0,height:0})
  const {zoom,pan,isPanning,onWheel,beginPan,movePan,endPan,zoomIn,zoomOut,resetZoom}=usePhotoZoom(editorRef,size)
  useEffect(resetZoom,[imageSrc,resetZoom])
  const resize=()=>{const bounds=editorRef.current?.getBoundingClientRect(),natural=naturalRef.current;if(!bounds||!natural.width)return;const scale=Math.min(bounds.width/natural.width,bounds.height/natural.height);setSize({width:natural.width*scale,height:natural.height*scale})};useEffect(()=>{const observer=new ResizeObserver(resize);if(editorRef.current)observer.observe(editorRef.current);return()=>observer.disconnect()},[])
  const point=(event:ReactPointerEvent):Point|null=>{const bounds=stageRef.current?.getBoundingClientRect();if(!bounds)return null;return{x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))}}
  const move=(event:ReactPointerEvent)=>{const drag=dragRef.current,next=point(event);if(!drag||drag.pointer!==event.pointerId||!next)return;const opening=edges[drag.side];if(!opening)return;const isInner=drag.handle.startsWith('inner'),isTop=drag.handle.endsWith('Top');let min=-Infinity,max=Infinity;if(drag.side==='left'){max=isInner?(isTop?door.topLeft.x:door.bottomLeft.x)-.006:(isTop?opening.innerTop.x:opening.innerBottom.x)-.02}else{min=isInner?(isTop?door.topRight.x:door.bottomRight.x)+.006:(isTop?opening.innerTop.x:opening.innerBottom.x)+.02}const adjusted={x:Math.max(min,Math.min(max,next.x)),y:next.y};onChange({...edges,[drag.side]:{...opening,[drag.handle]:adjusted}})}
  const pts=(value:EntranceCorners)=>[value.topLeft,value.topRight,value.bottomRight,value.bottomLeft].map(p=>`${p.x*size.width},${p.y*size.height}`).join(' '),doorPts=pts(door)
  const doorTop=Math.min(door.topLeft.y,door.topRight.y),doorBottom=Math.max(door.bottomLeft.y,door.bottomRight.y)
  const handles = !showSideChoice ? sides.flatMap((side) => {
    const opening = edges[side]
    if (!opening) return []
    return (['innerTop','innerBottom','outerTop','outerBottom'] as Handle[]).map((handle) => (
      <button key={`${side}-${handle}`} type="button" className={`sidelite-edge-handle ${handle.startsWith('inner')?'inner':''}`} aria-label={`Move ${side} sidelite ${handle}`} style={{left:`${opening[handle].x*100}%`,top:`${opening[handle].y*100}%`}} onPointerDown={(event)=>{event.preventDefault();stageRef.current?.setPointerCapture(event.pointerId);dragRef.current={side,handle,pointer:event.pointerId}}}/>
    ))
  }) : []
  return <div ref={editorRef} className="visualizer-editor sidelite-editor">
    <div ref={stageRef} className={`entrance-image-stage sidelite-stage ${zoom>1?'photo-pan-enabled':''} ${isPanning?'photo-panning':''}`} style={size.width?{width:size.width,height:size.height,transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`}:undefined} onPointerDown={event=>{if(!(event.target as Element).closest('button'))beginPan(event)}} onPointerMove={event=>{if(!movePan(event))move(event)}} onPointerUp={event=>{endPan(event);dragRef.current=null}} onPointerCancel={event=>{endPan(event);dragRef.current=null}} onWheel={onWheel}>
      <img src={imageSrc} alt="Uploaded entrance for sidelite placement" onLoad={event=>{naturalRef.current={width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight};resize()}}/>
      {size.width>0&&<svg className="sidelite-selection-svg" viewBox={`0 0 ${size.width} ${size.height}`}><polygon className="sidelite-door-confirmed" points={doorPts}/>{dividerJambQuads(door,edges).map((quad,index)=><polygon key={`d${index}`} className="sidelite-divider-region" points={pts(quad)}/>)}{(['left','right']as SideliteSide[]).map(side=>edges[side]&&<polygon key={side} className="sidelite-region" points={pts(sideliteQuadrilateral(side,edges[side]!))}/>)}</svg>}
      {showSideChoice&&<><button type="button" className="sidelite-side-zone sidelite-side-zone-left" style={{left:0,top:`${doorTop*100}%`,width:`${Math.max(.12,Math.min(door.topLeft.x,door.bottomLeft.x))*100}%`,height:`${Math.max(.2,doorBottom-doorTop)*100}%`}} onClick={()=>onChooseSide?.('left')}><span>Left</span><small>Left of Door</small></button><button type="button" className="sidelite-side-zone sidelite-side-zone-right" style={{right:0,top:`${doorTop*100}%`,width:`${Math.max(.12,1-Math.max(door.topRight.x,door.bottomRight.x))*100}%`,height:`${Math.max(.2,doorBottom-doorTop)*100}%`}} onClick={()=>onChooseSide?.('right')}><span>Right</span><small>Right of Door</small></button></>}
      {handles}
    </div>
    <div className="visualizer-zoom-controls" role="group" aria-label="Uploaded photo zoom controls"><button type="button" aria-label="Zoom uploaded photo out" disabled={zoom<=1} onClick={zoomOut}><ZoomOut size={17}/></button><span aria-live="polite">{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom uploaded photo in" disabled={zoom>=4} onClick={zoomIn}><ZoomIn size={17}/></button><button type="button" onClick={resetZoom}>Reset Zoom</button></div>
  </div>
}

export type ProductLayer={kind:'door'|'left-sidelite'|'right-sidelite';corners:EntranceCorners;sourceRect:{x:number;y:number;width:number;height:number};flipX?:boolean}
export function productLayers(door:EntranceCorners,edges:SideliteEdges,sourceSides:SideliteSide[],flipDoor=false):ProductLayer[]{const doorWidth=242,sideWidth=80,gap=11,total=doorWidth+sourceSides.length*(sideWidth+gap);const doorX=sourceSides.includes('left')?sideWidth+gap:0;const sourceSide=(target:SideliteSide)=>sourceSides.length===2?target:sourceSides[0]??target;const sourceX=(target:SideliteSide)=>sourceSide(target)==='left'?0:total-sideWidth;const layers:ProductLayer[]=[{kind:'door',corners:door,sourceRect:{x:doorX/total,y:0,width:doorWidth/total,height:1},flipX:flipDoor}];if(edges.left)layers.push({kind:'left-sidelite',corners:sideliteQuadrilateral('left',edges.left),sourceRect:{x:sourceX('left')/total,y:0,width:sideWidth/total,height:1}});if(edges.right)layers.push({kind:'right-sidelite',corners:sideliteQuadrilateral('right',edges.right),sourceRect:{x:sourceX('right')/total,y:0,width:sideWidth/total,height:1}});return layers}
