import { RANKS, SUITS } from './config'
import type { Card } from './types'

export function createOrderedDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({ suit, rank, id: `${rank}-${suit}` })),
  )
}

export function createDeck(): Card[] {
  const deck = createOrderedDeck()

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  return deck
}
