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

export const PAYTABLE: Array<{ key: HandKey; label: string; multiplier: number }> = [
  { key: 'royal', label: 'Royal flush', multiplier: 800 },
  { key: 'straightFlush', label: 'Straight flush', multiplier: 50 },
  { key: 'fourKind', label: 'Four of a kind', multiplier: 25 },
  { key: 'fullHouse', label: 'Full house', multiplier: 9 },
  { key: 'flush', label: 'Flush', multiplier: 6 },
  { key: 'straight', label: 'Straight', multiplier: 4 },
  { key: 'threeKind', label: 'Three of a kind', multiplier: 3 },
  { key: 'twoPair', label: 'Two pair', multiplier: 2 },
  { key: 'jacksOrBetter', label: 'Jacks or better', multiplier: 1 },
]

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

export function createDeck(): Card[] {
  const deck = createOrderedDeck()

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function createOrderedDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({ suit, rank, id: `${rank}-${suit}` })),
  )
}

export function evaluateHand(hand: Card[]): HandResult {
  if (hand.length !== 5) return { key: 'nothing', label: 'No win', multiplier: 0 }

  const values = hand.map((card) => RANK_VALUE[card.rank]).sort((a, b) => a - b)
  const uniqueValues = [...new Set(values)]
  const counts = Object.values(
    values.reduce<Record<number, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b - a)
  const flush = hand.every((card) => card.suit === hand[0].suit)
  const wheel = uniqueValues.join(',') === '2,3,4,5,14'
  const straight = uniqueValues.length === 5 && (values[4] - values[0] === 4 || wheel)
  const royal = straight && flush && values[0] === 10

  if (royal) return { key: 'royal', label: 'Royal flush', multiplier: 800 }
  if (straight && flush) return { key: 'straightFlush', label: 'Straight flush', multiplier: 50 }
  if (counts[0] === 4) return { key: 'fourKind', label: 'Four of a kind', multiplier: 25 }
  if (counts[0] === 3 && counts[1] === 2) return { key: 'fullHouse', label: 'Full house', multiplier: 9 }
  if (flush) return { key: 'flush', label: 'Flush', multiplier: 6 }
  if (straight) return { key: 'straight', label: 'Straight', multiplier: 4 }
  if (counts[0] === 3) return { key: 'threeKind', label: 'Three of a kind', multiplier: 3 }
  if (counts[0] === 2 && counts[1] === 2) return { key: 'twoPair', label: 'Two pair', multiplier: 2 }

  const pairs = Object.entries(
    values.reduce<Record<number, number>>((acc, value) => {
      acc[value] = (acc[value] ?? 0) + 1
      return acc
    }, {}),
  )
  const qualifyingPair = pairs.some(([value, count]) => count === 2 && Number(value) >= 11)
  if (qualifyingPair) return { key: 'jacksOrBetter', label: 'Jacks or better', multiplier: 1 }

  return { key: 'nothing', label: 'No win', multiplier: 0 }
}

export function calculatePayout(result: HandResult, coins: number, coinValue: number): number {
  if (result.key === 'royal') {
    const coinMultiplier = coins === 5 ? 800 : 250
    return coinMultiplier * coins * coinValue
  }
  return result.multiplier * coins * coinValue
}

export function displayPayout(row: (typeof PAYTABLE)[number], coins: number): number {
  if (row.key === 'royal') return coins === 5 ? 4000 : 250 * coins
  return row.multiplier * coins
}

export function formatCredits(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount)
}

function seedFromHand(hand: Card[], salt: number): number {
  let seed = 2166136261 ^ salt
  for (const char of hand.map((card) => card.id).join('|')) {
    seed ^= char.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }
  return seed >>> 0
}

function seededRandom(seed: number) {
  let value = seed
  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function combinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]]
  const result: T[][] = []
  const current: T[] = []

  const visit = (start: number) => {
    if (current.length === count) {
      result.push([...current])
      return
    }
    for (let index = start; index <= items.length - (count - current.length); index += 1) {
      current.push(items[index])
      visit(index + 1)
      current.pop()
    }
  }

  visit(0)
  return result
}

function sampleDraws(cards: Card[], count: number, total: number, seed: number): Card[][] {
  const random = seededRandom(seed)
  return Array.from({ length: total }, () => {
    const picked = new Set<number>()
    while (picked.size < count) picked.add(Math.floor(random() * cards.length))
    return [...picked].map((index) => cards[index])
  })
}

function displayCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`
}

function describeRecommendation(hand: Card[], option: StrategyOption): { holdLabel: string; explanation: string } {
  const held = hand.filter((_, index) => option.holds[index])
  const holdLabel = held.length ? `Hold ${held.map(displayCard).join('  ')}` : 'Draw five new cards'
  const heldResult = held.length === 5 ? evaluateHand(held) : null

  if (heldResult?.multiplier) {
    return {
      holdLabel,
      explanation: `You already have ${heldResult.label.toLowerCase()}. Stand pat—the guaranteed payout beats every draw.`,
    }
  }

  if (!held.length) {
    return {
      holdLabel,
      explanation: 'There is no strong made hand or profitable draw to anchor. A clean five-card redraw has the best long-run value.',
    }
  }

  const sameSuit = held.every((card) => card.suit === held[0].suit)
  const royalRanks = new Set<Rank>(['10', 'J', 'Q', 'K', 'A'])
  const royalDraw = sameSuit && held.length >= 2 && held.every((card) => royalRanks.has(card.rank))
  const rankCounts = held.reduce<Record<string, number>>((counts, card) => {
    counts[card.rank] = (counts[card.rank] ?? 0) + 1
    return counts
  }, {})
  const largestGroup = Math.max(...Object.values(rankCounts))

  if (royalDraw) {
    return {
      holdLabel,
      explanation: `These ${held.length} suited high cards preserve a premium royal-flush path while still making strong pairs, straights and flushes.`,
    }
  }
  if (sameSuit && held.length >= 3) {
    return {
      holdLabel,
      explanation: `This ${held.length}-card flush draw creates the strongest mix of flush, straight and high-card pair outcomes.`,
    }
  }
  if (largestGroup >= 2) {
    const groupName = largestGroup === 4 ? 'four of a kind' : largestGroup === 3 ? 'three of a kind' : 'pair'
    return {
      holdLabel,
      explanation: `Keep the ${groupName}. Made groups are valuable foundations for pairs, trips, full houses and four of a kind.`,
    }
  }
  if (held.length === 4) {
    return {
      holdLabel,
      explanation: 'This four-card draw has the best one-card improvement paths. One fresh card gives it the highest expected return.',
    }
  }
  return {
    holdLabel,
    explanation: `${held.length === 1 ? 'This card keeps' : `These ${held.length} cards keep`} the most valuable high-card and straight possibilities alive while releasing weak kickers.`,
  }
}

/**
 * Compares all 32 possible hold choices. One- and two-card draws are exact;
 * larger search spaces use seeded Monte Carlo samples so advice stays fast and stable.
 */
export function analyzeHandStrategy(hand: Card[], coins: number, coinValue: number): StrategyAdvice {
  const unavailable = new Set(hand.map((card) => card.id))
  const unseen = createOrderedDeck().filter((card) => !unavailable.has(card.id))
  const wager = coins * coinValue

  const options = Array.from({ length: 32 }, (_, mask): StrategyOption => {
    const holds = hand.map((_, index) => Boolean(mask & (1 << index)))
    const held = hand.filter((_, index) => holds[index])
    const drawCount = 5 - held.length
    const exact = drawCount <= 2
    const draws = exact
      ? combinations(unseen, drawCount)
      : sampleDraws(unseen, drawCount, drawCount === 3 ? 3200 : 4200, seedFromHand(hand, mask))
    const outcomeCounts = new Map<HandKey, { label: string; count: number }>()
    let totalPayout = 0
    let winningDraws = 0

    for (const drawn of draws) {
      const result = evaluateHand([...held, ...drawn])
      const payout = calculatePayout(result, coins, coinValue)
      totalPayout += payout
      if (payout > 0) winningDraws += 1
      const current = outcomeCounts.get(result.key)
      outcomeCounts.set(result.key, { label: result.label, count: (current?.count ?? 0) + 1 })
    }

    const samples = draws.length
    const expectedPayout = totalPayout / samples
    const outcomes = [...outcomeCounts.entries()]
      .filter(([key]) => key !== 'nothing')
      .map(([key, value]) => ({ key, label: value.label, chance: value.count / samples }))
      .sort((a, b) => b.chance - a.chance)

    return {
      mask,
      holds,
      expectedPayout,
      expectedReturn: wager ? expectedPayout / wager : 0,
      winChance: winningDraws / samples,
      outcomes,
      samples,
      exact,
    }
  })

  const recommended = options.reduce((best, option) =>
    option.expectedPayout > best.expectedPayout ? option : best,
  )
  const description = describeRecommendation(hand, recommended)
  return { recommended, options, ...description }
}
