import { PAYTABLE } from './config'
import type { HandResult } from './types'

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
