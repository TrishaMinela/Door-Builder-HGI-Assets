import { builderUx } from '../../config/builderUx'
import { findMyDoorHref } from './launch'
import './FindMyDoorLink.css'

type Props = { dealerSlug: string | null; variant: 'home' | 'step' }

export function FindMyDoorLink({ dealerSlug, variant }: Props) {
  if (!builderUx.showFindMyDoorEntry) return null
  const href = findMyDoorHref(dealerSlug)
  if (variant === 'home') {
    return <a className="find-my-door-home" href={href}>Find My Door</a>
  }
  return <p className="find-my-door-step"><a href={href}>Find My Door</a><span>Upload a photo of your home and we’ll recommend a door.</span></p>
}
