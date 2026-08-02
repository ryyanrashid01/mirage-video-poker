import type { CSSProperties } from 'react'
import { SUIT_SYMBOL, type Card } from '../../game'

type PlayingCardProps = {
  card?: Card
  held?: boolean
  onClick?: () => void
  index: number
  faceDown?: boolean
  replacing?: boolean
  coachSuggested?: boolean
}

export function PlayingCard({
  card,
  held,
  onClick,
  index,
  faceDown = false,
  replacing = false,
  coachSuggested = false,
}: PlayingCardProps) {
  const red = card?.suit === 'hearts' || card?.suit === 'diamonds'
  const style = { '--card-index': index } as CSSProperties

  return (
    <button
      type="button"
      className={`playing-card ${faceDown ? 'card-back' : ''} ${held ? 'is-held' : ''} ${replacing ? 'is-replacing' : ''} ${coachSuggested ? 'coach-suggested' : ''}`}
      style={style}
      onClick={onClick}
      disabled={!onClick}
      aria-label={faceDown ? 'Face-down card' : `${card?.rank} of ${card?.suit}${held ? ', held' : ''}`}
      aria-pressed={onClick ? held : undefined}
    >
      {faceDown || !card ? (
        <span className="card-back-art" aria-hidden="true"><span>♠</span></span>
      ) : (
        <>
          <span className={`card-corner top ${red ? 'red' : ''}`}><b>{card.rank}</b><i>{SUIT_SYMBOL[card.suit]}</i></span>
          <span className={`card-suit ${red ? 'red' : ''}`}>{SUIT_SYMBOL[card.suit]}</span>
          <span className={`card-corner bottom ${red ? 'red' : ''}`}><b>{card.rank}</b><i>{SUIT_SYMBOL[card.suit]}</i></span>
          <span className="card-shine" />
        </>
      )}
      {held && <span className="hold-ribbon">HELD</span>}
      {coachSuggested && !held && <span className="coach-card-badge">HOLD</span>}
      {onClick && <span className="card-key">{index + 1}</span>}
    </button>
  )
}
