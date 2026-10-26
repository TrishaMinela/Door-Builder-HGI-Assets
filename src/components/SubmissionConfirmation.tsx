import { ArrowRight, Check, Eye } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import './SubmissionConfirmation.css'

type Props = {
  fullName: string
  onContinue: () => void
  onReview: () => void
}

/** Confirmation for the completed quote/PDF flow only. No submission side effects. */
export function SubmissionConfirmation({ fullName, onContinue, onReview }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    // The form may have been scrolled to its submit button. Start the new
    // confirmation at its heading instead of retaining that stale scroll offset.
    window.scrollTo({ top: 0, behavior: 'instant' })
    heading.current?.closest('main')?.scrollTo({ top: 0, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
  }, [])
  return <div className="success visualizer-form-confirmation submission-confirmation">
    <span className="submission-confirmation-icon" aria-hidden="true"><Check size={32} /></span>
    <small>Configuration received</small>
    <h1 id="customer-form-title" ref={heading} tabIndex={-1}>Thanks, {fullName}.</h1>
    <p>Your configuration PDF has been prepared. You can now see the same configured door on a photo of your home.</p>
    <div className="submission-confirmation-next">
      <h2>Next: View your door on your home</h2>
      <p>Upload a clear entrance photo and follow the guided placement steps.</p>
    </div>
    <div className="submission-confirmation-actions">
      <button className="post-submit-visualizer-button" type="button" onClick={onContinue}>
        <Eye size={19} aria-hidden="true" /><span>Continue to Home Visualizer</span><ArrowRight size={17} aria-hidden="true" />
      </button>
      <button className="submission-confirmation-review" type="button" onClick={onReview}>Return to Review</button>
    </div>
  </div>
}
