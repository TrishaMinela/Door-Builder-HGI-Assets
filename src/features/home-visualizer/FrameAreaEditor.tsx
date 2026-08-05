import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { MinusCircle, PlusCircle, RotateCcw } from 'lucide-react'
import type { CleanupStroke } from './CleanupBrushEditor'
import { isValidEntranceCorners, type CornerId, type EntranceCorners, type Point } from './EntranceSelector'
import type { FrameMaskCorrections, FrameSides } from './frameRecolor'

const ORDER: CornerId[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
type Tool = 'adjust' | 'add' | 'remove'
type Props = { imageSrc: string; inner: EntranceCorners; outer: EntranceCorners; sides: FrameSides; corrections: FrameMaskCorrections; dividers?: EntranceCorners[]; wizardMode?: boolean; onOuterChange: (value: EntranceCorners) => void; onSidesChange: (value: FrameSides) => void; onCorrectionsChange: (value: FrameMaskCorrections) => void; onReset: () => void; onConfirm: () => void }

export function FrameAreaEditor({ imageSrc, inner, outer, sides, corrections, dividers = [], wizardMode = false, onOuterChange, onSidesChange, onCorrectionsChange, onReset, onConfirm }: Props) {
  const editorRef=useRef<HTMLDivElement>(null),stageRef=useRef<HTMLDivElement>(null),naturalRef=useRef({width:0,height:0}),dragRef=useRef<{id?:CornerId;pointer:number;stroke?:CleanupStroke}|null>(null)
  const [size,setSize]=useState({width:0,height:0}),[tool,setTool]=useState<Tool>('adjust'),[cursor,setCursor]=useState<Point|null>(null)
  const resize=()=>{const bounds=editorRef.current?.getBoundingClientRect(),natural=naturalRef.current;if(!bounds||!natural.width)return;const scale=Math.min(bounds.width/natural.width,bounds.height/natural.height);setSize({width:natural.width*scale,height:natural.height*scale})}
  useEffect(()=>{const observer=new ResizeObserver(resize);if(editorRef.current)observer.observe(editorRef.current);return()=>observer.disconnect()},[])
  const point=(event:ReactPointerEvent):Point|null=>{const bounds=stageRef.current?.getBoundingClientRect();if(!bounds)return null;return{x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))}}
  const downCorner=(id:CornerId,event:ReactPointerEvent)=>{event.preventDefault();stageRef.current?.setPointerCapture(event.pointerId);dragRef.current={id,pointer:event.pointerId}}
  const downBrush=(event:ReactPointerEvent<HTMLDivElement>)=>{if(tool==='adjust')return;const p=point(event);if(!p)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const stroke={points:[p],radius:.012};dragRef.current={pointer:event.pointerId,stroke};const key=tool==='add'?'add':'remove';onCorrectionsChange({...corrections,[key]:[...corrections[key],stroke]})}
  const move=(event:ReactPointerEvent<HTMLDivElement>)=>{const p=point(event);setCursor(p);const drag=dragRef.current;if(!p||!drag||drag.pointer!==event.pointerId)return;if(drag.id){const candidate={...outer,[drag.id]:p};const contains=candidate.topLeft.x<=inner.topLeft.x&&candidate.topLeft.y<=inner.topLeft.y&&candidate.topRight.x>=inner.topRight.x&&candidate.topRight.y<=inner.topRight.y&&candidate.bottomLeft.x<=inner.bottomLeft.x&&candidate.bottomLeft.y>=inner.bottomLeft.y&&candidate.bottomRight.x>=inner.bottomRight.x&&candidate.bottomRight.y>=inner.bottomRight.y;if(contains&&isValidEntranceCorners(candidate))onOuterChange(candidate)}else if(drag.stroke){const next={...drag.stroke,points:[...drag.stroke.points,p]};drag.stroke=next;const key=tool==='add'?'add':'remove';onCorrectionsChange({...corrections,[key]:[...corrections[key].slice(0,-1),next]})}}
  const points=(ids:CornerId[],value:EntranceCorners)=>ids.map(id=>`${value[id].x*size.width},${value[id].y*size.height}`).join(' ')
  const polygon=(value:EntranceCorners)=>points(ORDER,value)
  const strokePath=(stroke:CleanupStroke)=>stroke.points.map((p,i)=>`${i?'L':'M'}${p.x*size.width},${p.y*size.height}`).join(' ')
  const tools=<div className="frame-tool-controls"><button className={tool==='add'?'active':''} onClick={()=>setTool('add')}><PlusCircle size={16}/> Add to Frame Area</button><button className={tool==='remove'?'active':''} onClick={()=>setTool('remove')}><MinusCircle size={16}/> Remove from Frame Area</button><button onClick={onReset}><RotateCcw size={16}/> Reset Frame Area</button></div>
  return <section className="frame-area-workspace">
    {!wizardMode&&<div className="frame-area-heading"><h3>Define Jamb &amp; Frame</h3><p>Adjust the outside boundary of the photographed frame.</p></div>}
    <div className="frame-side-toggles">{(wizardMode?[['bottom','Include Threshold']]as const:[['top','Top Frame'],['left','Left Frame'],['right','Right Frame'],['bottom','Bottom / Threshold']]as const).map(([key,label])=><label key={key}><input type="checkbox" checked={sides[key]} onChange={event=>onSidesChange({...sides,[key]:event.target.checked})}/> {label}</label>)}</div>
    {wizardMode?<details className="frame-fine-tune"><summary>Fine-Tune Frame Area</summary>{tools}</details>:tools}
    <div ref={editorRef} className="visualizer-editor frame-area-editor"><div ref={stageRef} className={`entrance-image-stage frame-area-stage tool-${tool}`} style={size.width?{width:size.width,height:size.height}:undefined} onPointerDown={downBrush} onPointerMove={move} onPointerUp={()=>{dragRef.current=null}} onPointerCancel={()=>{dragRef.current=null}} onPointerLeave={()=>setCursor(null)}>
      <img src={imageSrc} alt="Uploaded entrance with proposed frame mask" onLoad={event=>{naturalRef.current={width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight};resize()}}/>
      {size.width>0&&<svg className="frame-mask-svg" viewBox={`0 0 ${size.width} ${size.height}`}>
        {sides.top&&<polygon className="frame-mask-ring" points={`${points(['topLeft','topRight'],outer)} ${points(['topRight','topLeft'],inner)}`}/>} {sides.right&&<polygon className="frame-mask-ring" points={`${points(['topRight','bottomRight'],outer)} ${points(['bottomRight','topRight'],inner)}`}/>} {sides.bottom&&<polygon className="frame-mask-ring" points={`${points(['bottomLeft','bottomRight'],outer)} ${points(['bottomRight','bottomLeft'],inner)}`}/>} {sides.left&&<polygon className="frame-mask-ring" points={`${points(['topLeft','bottomLeft'],outer)} ${points(['bottomLeft','topLeft'],inner)}`}/>} {dividers.map((divider,index)=><polygon key={index} className="frame-mask-mullion" points={polygon(divider)}/>)}
        {corrections.add.map((stroke,i)=><path key={`a${i}`} className="frame-mask-add" d={strokePath(stroke)} style={{strokeWidth:stroke.radius*Math.min(size.width,size.height)*2}}/>)}{corrections.remove.map((stroke,i)=><path key={`r${i}`} className="frame-mask-remove" d={strokePath(stroke)} style={{strokeWidth:stroke.radius*Math.min(size.width,size.height)*2}}/>)}
      </svg>}
      {tool==='adjust'&&ORDER.map(id=><button key={id} type="button" className="frame-corner-handle" aria-label={`Adjust outer frame ${id}`} style={{left:`${outer[id].x*100}%`,top:`${outer[id].y*100}%`}} onPointerDown={event=>downCorner(id,event)}/>)}{tool!=='adjust'&&cursor&&<span className="frame-brush-cursor" style={{left:`${cursor.x*100}%`,top:`${cursor.y*100}%`}}/>}
    </div></div>
    {!wizardMode&&<button type="button" className="visualizer-apply-button" onClick={onConfirm}>Confirm Frame Area</button>}
  </section>
}
