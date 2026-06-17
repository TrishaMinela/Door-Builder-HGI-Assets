import type { DoorStyle } from '../types'

type Props = {
  style: DoorStyle
}

export function DoorStyleThumbnail({ style }: Props) {
  return (
    <span className={`door-style-thumbnail door-style-thumbnail-${style.panel}`}>
      <img src={style.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} />
    </span>
  )
}
