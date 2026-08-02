import { SUIT_SYMBOL } from './config'
import { createOrderedDeck } from './deck'
import { evaluateHand } from './evaluator'
import { calculatePayout } from './payouts'
import type { Card, HandKey, Rank, StrategyAdvice, StrategyOption } from './types'

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
      explanation: `You already have ${(heldResult.displayLabel ?? heldResult.label).toLowerCase()}. Stand pat—the guaranteed payout beats every draw.`,
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
