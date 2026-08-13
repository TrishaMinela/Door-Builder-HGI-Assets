import type { CornerId, EntranceCorners, Point } from './EntranceSelector'

export const SNAP_ENTER_DISTANCE_PX=7
export const SNAP_RELEASE_DISTANCE_PX=10
export const SHIFT_SNAP_ENTER_DISTANCE_PX=18
export const DOUBLE_SNAP_DISTANCE_PX=4

type SnapKey='previous'|'next'|`extra-x-${number}`|`extra-y-${number}`
export type SnapState={primary:SnapKey|null;secondary:SnapKey|null}
export type SnapGuides={x?:number;y?:number;line?:[Point,Point]}
const ORDER:CornerId[]=['topLeft','topRight','bottomRight','bottomLeft']

type Candidate={key:SnapKey;line:[Point,Point];point:Point;distance:number}
function project(point:Point,a:Point,b:Point,size:{width:number;height:number}){const px=point.x*size.width,py=point.y*size.height,ax=a.x*size.width,ay=a.y*size.height,bx=b.x*size.width,by=b.y*size.height,dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;if(!length)return{point,distance:Number.POSITIVE_INFINITY};const ratio=((px-ax)*dx+(py-ay)*dy)/length,projectedPx={x:ax+ratio*dx,y:ay+ratio*dy},projected={x:projectedPx.x/size.width,y:projectedPx.y/size.height};return{point:projected,distance:Math.hypot(px-projectedPx.x,py-projectedPx.y)}}
function intersection(first:[Point,Point],second:[Point,Point]):Point|null{const [a,b]=first,[c,d]=second,firstX=b.x-a.x,firstY=b.y-a.y,secondX=d.x-c.x,secondY=d.y-c.y,denominator=firstX*secondY-firstY*secondX;if(Math.abs(denominator)<1e-8)return null;const ratio=((c.x-a.x)*secondY-(c.y-a.y)*secondX)/denominator;return{x:a.x+ratio*firstX,y:a.y+ratio*firstY}}

export function freeDragWithMagneticSnap(corners:EntranceCorners,id:CornerId,requested:Point,size:{width:number;height:number},state:SnapState,shift=false,extra?:{x?:number[];y?:number[]}):{point:Point;state:SnapState;guides:SnapGuides}{
  const index=ORDER.indexOf(id),previous=corners[ORDER[(index+3)%4]],next=corners[ORDER[(index+1)%4]],enter=shift?SHIFT_SNAP_ENTER_DISTANCE_PX:SNAP_ENTER_DISTANCE_PX
  const previousEdge=(index+3)%4,nextEdge=index
  const anchoredLine=(anchor:Point,edgeIndex:number):[Point,Point]=>edgeIndex===0||edgeIndex===2?[anchor,{x:anchor.x+1,y:anchor.y}]:[anchor,{x:anchor.x,y:anchor.y+1}]
  // A green alignment now represents a visibly straight architectural edge:
  // top/bottom are horizontal and left/right are vertical. Only the active
  // point moves, and it remains free to slide along the selected anchor line.
  const lines:Array<{key:SnapKey;line:[Point,Point]}>= [
    {key:'previous',line:anchoredLine(previous,previousEdge)},
    {key:'next',line:anchoredLine(next,nextEdge)},
    ...(extra?.x??[]).map((x,targetIndex)=>({key:`extra-x-${targetIndex}` as SnapKey,line:[{x,y:0},{x,y:1}] as [Point,Point]})),
    ...(extra?.y??[]).map((y,targetIndex)=>({key:`extra-y-${targetIndex}` as SnapKey,line:[{x:0,y},{x:1,y}] as [Point,Point]})),
  ]
  const candidates:Candidate[]=lines.map(target=>({...target,...project(requested,...target.line,size)})).sort((a,b)=>a.distance-b.distance)
  const active=state.primary?candidates.find(candidate=>candidate.key===state.primary):undefined
  const primary=active&&active.distance<=SNAP_RELEASE_DISTANCE_PX?active:candidates[0]?.distance<=enter?candidates[0]:undefined
  if(!primary)return{point:requested,state:emptySnapState(),guides:{}}
  // A second line is allowed only very near both lines and their intersection.
  // Otherwise the point projects to one line and remains completely free to
  // slide along it using the raw pointer's parallel component.
  const secondary=candidates.find(candidate=>candidate.key!==primary.key&&candidate.distance<=DOUBLE_SNAP_DISTANCE_PX)
  const crossing=secondary&&primary.distance<=DOUBLE_SNAP_DISTANCE_PX?intersection(primary.line,secondary.line):null
  const crossingDistance=crossing?Math.hypot((requested.x-crossing.x)*size.width,(requested.y-crossing.y)*size.height):Number.POSITIVE_INFINITY
  const useDouble=Boolean(crossing&&crossingDistance<=DOUBLE_SNAP_DISTANCE_PX)
  return{point:useDouble?crossing!:primary.point,state:{primary:primary.key,secondary:useDouble?secondary!.key:null},guides:{line:primary.line}}
}

export const emptySnapState=():SnapState=>({primary:null,secondary:null})
