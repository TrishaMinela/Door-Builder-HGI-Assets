import { POPULAR_STYLES } from '../data/popularStyles'
import './PopularStyles.css'

type Props = {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function PopularStyles({ selectedId, onSelect }: Props) {
  return (
    <section className="popular-styles" aria-labelledby="popular-styles-heading">
      <h2 id="popular-styles-heading">Don&apos;t know which door to choose? Start with a popular style.</h2>
      <div className="popular-styles-row">
        {POPULAR_STYLES.map((style) => {
          const selected = selectedId === style.id
          return (
            <button
              key={style.id}
              type="button"
              className={selected ? 'selected' : undefined}
              aria-pressed={selected}
              data-popular-style={style.id}
              onClick={() => onSelect(style.id)}
            >
              <span className="popular-styles-visual">
                <img src={style.thumbnail} alt="" />
              </span>
              <span className="popular-styles-copy">
                <strong>{style.name}</strong>
                <span>{style.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="popular-styles-or">or start from scratch below</p>
    </section>
  )
}
