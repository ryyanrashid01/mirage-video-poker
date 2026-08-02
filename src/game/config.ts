import type { HandKey, Rank, Suit } from './types'

export const PAYTABLE: Array<{ key: HandKey; label: string; multiplier: number }> = [
  { key: 'royal', label: 'Royal flush', multiplier: 800 },
  { key: 'straightFlush', label: 'Straight flush', multiplier: 50 },
  { key: 'fourKind', label: 'Four of a kind', multiplier: 25 },
  { key: 'fullHouse', label: 'Full house', multiplier: 9 },
  { key: 'flush', label: 'Flush', multiplier: 6 },
  { key: 'straight', label: 'Straight', multiplier: 4 },
  { key: 'threeKind', label: 'Three of a kind', multiplier: 3 },
  { key: 'twoPair', label: 'Two pair', multiplier: 2 },
  { key: 'jacksOrBetter', label: 'Pair of Jacks or better', multiplier: 1 },
]

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

export const RANK_FROM_VALUE = Object.fromEntries(
  Object.entries(RANK_VALUE).map(([rank, value]) => [value, rank]),
) as Record<number, Rank>

export const RANK_NAME: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace',
}

export const RANK_PAIR_NAME: Record<Rank, string> = {
  '2': '2s', '3': '3s', '4': '4s', '5': '5s', '6': '6s', '7': '7s', '8': '8s', '9': '9s', '10': '10s',
  J: 'Jacks', Q: 'Queens', K: 'Kings', A: 'Aces',
}
