import { RANK_FROM_VALUE, RANK_NAME, RANK_PAIR_NAME, RANK_VALUE } from './config'
import type { Card, HandResult } from './types'

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
  const pair = pairs.find(([, count]) => count === 2)
  if (pair && Number(pair[0]) >= 11) {
    const pairRank = RANK_FROM_VALUE[Number(pair[0])]
    return {
      key: 'jacksOrBetter',
      label: 'Pair of Jacks or better',
      displayLabel: `Pair of ${RANK_PAIR_NAME[pairRank]}`,
      multiplier: 1,
    }
  }

  if (pair) {
    const pairRank = RANK_FROM_VALUE[Number(pair[0])]
    return {
      key: 'nothing',
      label: `Pair of ${RANK_PAIR_NAME[pairRank]}`,
      multiplier: 0,
      detail: 'Only a pair of Jacks, Queens, Kings or Aces pays.',
    }
  }

  const highRank = RANK_FROM_VALUE[values[4]]
  return {
    key: 'nothing',
    label: `${RANK_NAME[highRank]} high`,
    multiplier: 0,
    detail: 'You need at least a pair of Jacks or better to win.',
  }
}
