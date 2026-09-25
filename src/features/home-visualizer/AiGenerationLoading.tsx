import { useEffect, useRef, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'

export const AI_LOADING_MESSAGES = [
  'Analyzing your doorway',
  'Getting a feel for your entrance',
  'Preparing your selected door',
  'Lining up the proportions',
  'Matching the details',
  'Building a realistic fit',
  'Blending it into your home',
  'Checking the final look',
  'Fine-tuning the details',
  'Making it look natural',
  'Your new entrance is taking shape',
  'Almost there',
  'Adding the finishing touches',
  'Polishing your visualization',
  'Finalizing the result',
]

type Phase = 'idle' | 'waiting' | 'completing' | 'fading'

function useIllustrativeProgress(active: boolean, succeeded: boolean, failed: boolean, cap: number, timeConstant: number) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const wasActive = useRef(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (active) {
      if (!wasActive.current) {
        startedAt.current = performance.now()
        setPhase('waiting'); setProgress(0)
      }
      wasActive.current = true
      const timer = window.setInterval(() => {
        const elapsed = performance.now() - startedAt.current
        setProgress(current => Math.max(current, Math.min(cap, cap * (1 - Math.exp(-elapsed / timeConstant)))))
      }, 150)
      return () => clearInterval(timer)
    }
    if (!wasActive.current) return
    wasActive.current = false
    if (failed || !succeeded) { setProgress(0); setPhase('idle'); return }
    setProgress(100); setPhase('completing')
    const fadeTimer = window.setTimeout(() => setPhase('fading'), 400)
    const removeTimer = window.setTimeout(() => { setProgress(0); setPhase('idle') }, 700)
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
  }, [active, succeeded, failed, cap, timeConstant])

  return { visible: active || phase !== 'idle', phase, progress }
}

// Presentation only: these messages/bar are not backend progress reports.
export function useAiGenerationLoading(generating: boolean, result: string, error: string) {
  const [messageIndex, setMessageIndex] = useState(0)
  const progressState = useIllustrativeProgress(generating, Boolean(result), Boolean(error), 94, 42_000)

  useEffect(() => {
    if (generating) {
      setMessageIndex(0)
      const messageTimer = window.setInterval(() => {
        setMessageIndex(index => (index + 1) % AI_LOADING_MESSAGES.length)
      }, 5_000)
      return () => clearInterval(messageTimer)
    }
  }, [generating])

  return { ...progressState, message: AI_LOADING_MESSAGES[messageIndex] }
}

export function AiGenerationLoading({ state }: { state: ReturnType<typeof useAiGenerationLoading> }) {
  if (!state.visible) return null
  const complete = state.phase === 'completing' || state.phase === 'fading'
  return <div className={`ai-photo-loading-overlay ${state.phase === 'fading' ? 'is-fading' : ''}`}>
    <div className="ai-photo-loading-content" role="status" aria-live="polite" aria-atomic="true">
      <span className="ai-photo-loading-icon" aria-hidden="true">{complete ? <Check size={25}/> : <Sparkles size={25}/>}</span>
      <h3>{complete ? 'Your AI visualization is ready' : 'Creating your AI visualization'}</h3>
      <p className="ai-photo-loading-message">{complete ? 'Ready to see your new entrance.' : state.message}</p>
      <strong className="ai-photo-loading-percentage">{Math.round(state.progress)}%</strong>
      <div className="ai-photo-loading-track" role="progressbar" aria-label={complete ? 'AI visualization complete' : 'AI generation in progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.progress)}>
        <span style={{ width: `${state.progress}%` }}/>
      </div>
      <small>{complete ? ' ' : 'This may take a minute or two.'}</small>
    </div>
  </div>
}

export function useEntranceDetectionLoading(analyzing: boolean, succeeded: boolean, failed: boolean) {
  return useIllustrativeProgress(analyzing, succeeded, failed, 95, 4_200)
}

export function EntranceDetectionLoading({ state }: { state: ReturnType<typeof useEntranceDetectionLoading> }) {
  if (!state.visible) return null
  const complete = state.phase === 'completing' || state.phase === 'fading'
  return <div className={`ai-photo-loading-overlay ai-entrance-analysis-overlay ${state.phase === 'fading' ? 'is-fading' : ''}`}>
    <div className="ai-photo-loading-content" role="status" aria-live="polite" aria-atomic="true">
      <span className="ai-photo-loading-icon" aria-hidden="true">{complete ? <Check size={25}/> : <Sparkles size={25}/>}</span>
      <h3>{complete ? 'Entrance analysis complete' : 'Analyzing your existing entrance'}</h3>
      <p className="ai-photo-loading-message">{complete ? 'We found the details needed to choose the best fit.' : 'We’re identifying the doorway, sidelites, and other entry details.'}</p>
      <strong className="ai-photo-loading-percentage">{Math.round(state.progress)}%</strong>
      <div className="ai-photo-loading-track" role="progressbar" aria-label={complete ? 'Entrance analysis complete' : 'Entrance analysis in progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.progress)}>
        <span style={{ width: `${state.progress}%` }}/>
      </div>
    </div>
  </div>
}
