import type { HandResult } from '../game'
import type { AutoSpeed } from './types'

export const COIN_VALUE = 100
export const BET_OPTIONS = [1, 2, 3, 5]
export const STARTING_CREDITS = 10_000
export const MIN_BANKROLL = 1_000
export const MAX_BANKROLL = 1_000_000
export const EMPTY_CARDS = Array.from({ length: 5 }, (_, index) => index)

export const AUTO_SPEEDS: Array<{ key: AutoSpeed; label: string; delay: number }> = [
  { key: 'relaxed', label: 'Relaxed', delay: 1_600 },
  { key: 'quick', label: 'Quick', delay: 700 },
  { key: 'turbo', label: 'Turbo', delay: 250 },
]

export const TOP_FOUR_PAYOUTS = new Set<HandResult['key']>([
  'royal',
  'straightFlush',
  'fourKind',
  'fullHouse',
])

export const BANKROLL_OPTIONS = [
  { amount: 5_000, label: 'Quick run', hands: '10+ max-bet hands' },
  { amount: 10_000, label: 'Classic', hands: '20+ max-bet hands' },
  { amount: 25_000, label: 'Long night', hands: '50+ max-bet hands' },
  { amount: 50_000, label: 'High roller', hands: '100+ max-bet hands' },
  { amount: 100_000, label: 'Big table', hands: '200+ max-bet hands' },
]
