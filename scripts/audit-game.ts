import {
  PAYTABLE,
  analyzeHandStrategy,
  calculatePayout,
  displayPayout,
  evaluateHand,
  type Card,
  type HandKey,
  type Rank,
  type Suit,
} from '../src/game'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const BETS = [1, 2, 3, 5]
const COIN_VALUE = 100

const EXPECTED_COUNTS: Record<HandKey, number> = {
  royal: 4,
  straightFlush: 36,
  fourKind: 624,
  fullHouse: 3_744,
  flush: 5_108,
  straight: 10_200,
  threeKind: 54_912,
  twoPair: 123_552,
  jacksOrBetter: 337_920,
  nothing: 2_062_860,
}

const EXPECTED_MULTIPLIERS: Record<Exclude<HandKey, 'nothing'>, number> = {
  royal: 800,
  straightFlush: 50,
  fourKind: 25,
  fullHouse: 9,
  flush: 6,
  straight: 4,
  threeKind: 3,
  twoPair: 2,
  jacksOrBetter: 1,
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Game audit failed: ${message}`)
}

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}-${suit}` }
}

const deck = SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit)))
assert(deck.length === 52, 'the deck must contain 52 cards')
assert(new Set(deck.map(({ id }) => id)).size === 52, 'every card in the deck must be unique')

const counts = Object.fromEntries(
  Object.keys(EXPECTED_COUNTS).map((key) => [key, 0]),
) as Record<HandKey, number>

let auditedHands = 0
for (let first = 0; first < deck.length - 4; first += 1) {
  for (let second = first + 1; second < deck.length - 3; second += 1) {
    for (let third = second + 1; third < deck.length - 2; third += 1) {
      for (let fourth = third + 1; fourth < deck.length - 1; fourth += 1) {
        for (let fifth = fourth + 1; fifth < deck.length; fifth += 1) {
          const result = evaluateHand([deck[first], deck[second], deck[third], deck[fourth], deck[fifth]])
          counts[result.key] += 1
          auditedHands += 1
        }
      }
    }
  }
}

assert(auditedHands === 2_598_960, `expected 2,598,960 hands, audited ${auditedHands}`)
for (const [key, expected] of Object.entries(EXPECTED_COUNTS) as Array<[HandKey, number]>) {
  assert(counts[key] === expected, `${key} count should be ${expected}, received ${counts[key]}`)
}

assert(PAYTABLE.length === 9, 'the standard paytable must contain nine winning categories')
for (const row of PAYTABLE) {
  const key = row.key as Exclude<HandKey, 'nothing'>
  assert(row.multiplier === EXPECTED_MULTIPLIERS[key], `${row.label} should pay ${EXPECTED_MULTIPLIERS[key]}×`)
  for (const coins of BETS) {
    const result = { key: row.key, label: row.label, multiplier: row.multiplier }
    const calculated = calculatePayout(result, coins, COIN_VALUE)
    const displayed = displayPayout(row, coins) * COIN_VALUE
    assert(calculated === displayed, `${row.label} payout disagrees at a ${coins}-coin bet`)
  }
}

const picturedHand = [
  card('Q', 'spades'),
  card('10', 'clubs'),
  card('10', 'diamonds'),
  card('A', 'diamonds'),
  card('2', 'spades'),
]
const picturedResult = evaluateHand(picturedHand)
assert(picturedResult.key === 'nothing', 'a pair of 10s with one Queen must not pay')
assert(picturedResult.label === 'Pair of 10s', 'the pictured near-miss should be explained clearly')
const picturedAdvice = analyzeHandStrategy(picturedHand, 5, COIN_VALUE)
assert(
  picturedAdvice.recommended.holds.join(',') === 'false,true,true,false,false',
  'the Table Guide should recommend holding the pair of 10s in the pictured hand',
)

for (const rank of RANKS) {
  const pairHand = [
    card(rank, 'spades'),
    card(rank, 'hearts'),
    card('2', 'clubs'),
    card('5', 'diamonds'),
    card('9', 'spades'),
  ]
  const result = evaluateHand(pairHand)
  const shouldPay = ['J', 'Q', 'K', 'A'].includes(rank)
  assert((result.key === 'jacksOrBetter') === shouldPay, `pair eligibility is wrong for ${rank}s`)
}

console.log(`Game audit passed: ${auditedHands.toLocaleString('en-US')} hands, nine payout categories, four wager levels, pictured-hand strategy.`)
console.table(counts)
