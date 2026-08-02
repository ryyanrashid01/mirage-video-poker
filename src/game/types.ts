export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export type Card = {
  suit: Suit
  rank: Rank
  id: string
}

export type HandKey =
  | 'royal'
  | 'straightFlush'
  | 'fourKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeKind'
  | 'twoPair'
  | 'jacksOrBetter'
  | 'nothing'

export type HandResult = {
  key: HandKey
  label: string
  multiplier: number
  detail?: string
  displayLabel?: string
}

export type StrategyOutcome = {
  key: HandKey
  label: string
  chance: number
}

export type StrategyOption = {
  mask: number
  holds: boolean[]
  expectedPayout: number
  expectedReturn: number
  winChance: number
  outcomes: StrategyOutcome[]
  samples: number
  exact: boolean
}

export type StrategyAdvice = {
  recommended: StrategyOption
  options: StrategyOption[]
  holdLabel: string
  explanation: string
}
