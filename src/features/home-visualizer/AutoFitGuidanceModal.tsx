import { useEffect, useRef } from 'react'
import { Check, X, XCircle } from 'lucide-react'

type Props = { onRun: () => void; onAdjust: () => void; onClose: () => void }

function Example({ correct }: { correct: boolean }) {
  return <figure className={`auto-fit-example ${correct ? 'correct' : 'incorrect'}`}><figcaption>{correct ? <><Check size={14}/> Correct</> : <><XCircle size={14}/> Incorrect</>}</figcaption><svg viewBox="0 0 150 116" role="img" aria-label={correct ? 'Door alone inside a four-point outline' : 'Outline extending into the frame, sidelite, and porch'}><rect x="8" y="8" width="134" height="100" rx="3" className="example-wall"/><rect x="39" y="18" width="72" height="82" className="example-frame"/><rect x="57" y="24" width="38" height="71" className="example-door"/><rect x="43" y="24" width="10" height="71" className="example-sidelite"/><rect x="99" y="24" width="8" height="71" className="example-sidelite"/><path d={correct ? 'M55 22 L97 22 L97 97 L55 97 Z' : 'M28 13 L123 20 L132 108 L45 105 Z'} className="example-outline"/><g className="example-points">{(correct ? [[55,22],[97,22],[97,97],[55,97]] : [[28,13],[123,20],[132,108],[45,105]]).map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r="4"/>)}</g></svg></figure>
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

  return <div className="auto-fit-failure-backdrop" role="presentation"><section ref={modalRef} className="auto-fit-failure-modal" role="dialog" aria-modal="true" aria-labelledby="auto-fit-help-title"><button type="button" className="auto-fit-modal-close" aria-label="Close Auto-Fit guidance" onClick={onClose}><X size={20}/></button><span>Placement guidance</span><h2 id="auto-fit-help-title">Help Auto-Fit Find Your Door</h2><p>Move the four points so the existing door is roughly inside the outline.</p><div className="auto-fit-examples"><Example correct/><Example correct={false}/></div><ol><li>Keep each point close to a corner of the door.</li><li>Do not include the surrounding frame or sidelites.</li><li>The points can be slightly inside or outside the exact edge.</li></ol><div className="auto-fit-modal-actions"><button ref={runRef} type="button" className="auto-fit-adjust" onClick={onRun}>Got It, Run Auto-Fit</button><button type="button" className="auto-fit-retry" onClick={onAdjust}>Adjust Points First</button></div></section></div>
}
