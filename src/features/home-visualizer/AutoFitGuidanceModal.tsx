import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'

type Props = { onRun: () => void; onAdjust: () => void; onClose: () => void }

function Example() {
  return <figure className="auto-fit-example correct"><figcaption><Check size={14}/> Correct — outline the slab</figcaption><svg viewBox="0 0 150 92" role="img" aria-label="Four points tightly outlining the door slab"><rect x="8" y="6" width="134" height="80" rx="3" className="example-wall"/><rect x="39" y="11" width="72" height="70" className="example-frame"/><rect x="57" y="16" width="38" height="60" className="example-door"/><rect x="43" y="16" width="10" height="60" className="example-sidelite"/><rect x="99" y="16" width="8" height="60" className="example-sidelite"/><path d="M55 14 L97 14 L97 78 L55 78 Z" className="example-outline"/><g className="example-points">{[[55,14],[97,14],[97,78],[55,78]].map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r="4"/>)}</g></svg><small>Avoid selecting the frame or sidelites.</small></figure>
}

export function AutoFitGuidanceModal({ onRun, onAdjust, onClose }: Props) {
  const runRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  useEffect(() => {
    runRef.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])

  return <div className="auto-fit-failure-backdrop auto-fit-guidance-backdrop" role="presentation"><section ref={modalRef} className="auto-fit-failure-modal auto-fit-guidance-sheet" role="dialog" aria-modal="true" aria-labelledby="auto-fit-help-title"><button type="button" className="auto-fit-modal-close" aria-label="Close Auto-Fit guidance" onClick={onClose}><X size={20}/></button><span>Auto-Fit tip</span><h2 id="auto-fit-help-title">Before Auto-Fit</h2><p>Place the four points as accurately as possible around the existing door.</p><p>For best results, place each point on the door corner or just outside the door edge.</p><p className="auto-fit-guidance-helper">Keep the outline around the door slab only. Do not include sidelites or the outer frame.</p><div className="auto-fit-examples"><Example/></div><div className="auto-fit-modal-actions"><button ref={runRef} type="button" className="auto-fit-adjust" onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation();onRun()}}>Run Auto-Fit</button><button type="button" className="auto-fit-retry" onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation();onAdjust()}}>Adjust Points First</button></div></section></div>
}
