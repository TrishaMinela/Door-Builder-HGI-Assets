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

// Presentation only: these messages/bar are not backend progress reports.
export function useAiGenerationLoading(generating: boolean, result: string, error: string) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(8)
  const [messageIndex, setMessageIndex] = useState(0)
  const wasGenerating = useRef(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (generating) {
      if (!wasGenerating.current) {
        startedAt.current = performance.now()
        setPhase('waiting'); setProgress(8); setMessageIndex(0)
      }
      wasGenerating.current = true
      const progressTimer = window.setInterval(() => {
        const elapsed = performance.now() - startedAt.current
        setProgress(Math.min(88, 8 + 80 * (1 - Math.exp(-elapsed / 32_000))))
      }, 500)
      const messageTimer = window.setInterval(() => {
        setMessageIndex(index => (index + 1) % AI_LOADING_MESSAGES.length)
      }, 5_000)
      return () => { clearInterval(progressTimer); clearInterval(messageTimer) }
    }
    if (!wasGenerating.current) return
    wasGenerating.current = false
    if (error || !result) {
      setPhase('idle')
      return
    }
    setProgress(100); setPhase('completing')
    const fadeTimer = window.setTimeout(() => setPhase('fading'), 450)
    const removeTimer = window.setTimeout(() => setPhase('idle'), 750)
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
  }, [generating, result, error])

  return { visible: generating || phase !== 'idle', phase, progress, message: AI_LOADING_MESSAGES[messageIndex] }
}

export function AiGenerationLoading({ state }: { state: ReturnType<typeof useAiGenerationLoading> }) {
  if (!state.visible) return null
  const complete = state.phase === 'completing' || state.phase === 'fading'
  return <div className={`ai-photo-loading-overlay ${state.phase === 'fading' ? 'is-fading' : ''}`}>
    <div className="ai-photo-loading-content" role="status" aria-live="polite" aria-atomic="true">
      <span className="ai-photo-loading-icon" aria-hidden="true">{complete ? <Check size={25}/> : <Sparkles size={25}/>}</span>
      <h3>{complete ? 'Your AI visualization is ready' : 'Creating your AI visualization'}</h3>
      <p className="ai-photo-loading-message">{complete ? 'Ready to see your new entrance.' : state.message}</p>
      <div className="ai-photo-loading-track" role="progressbar" aria-label={complete ? 'AI visualization complete' : 'AI generation in progress'} aria-valuemin={0} aria-valuemax={100} {...(complete ? { 'aria-valuenow': 100 } : {})}>
        <span style={{ width: `${state.progress}%` }}/>
      </div>
      <small>{complete ? ' ' : 'This may take a minute or two.'}</small>
    </div>
  </div>
}
