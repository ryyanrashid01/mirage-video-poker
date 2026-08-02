import { formatCredits, type HandResult } from '../game'
import { COIN_VALUE, MAX_BANKROLL, MIN_BANKROLL, STARTING_CREDITS } from '../app/config'

export function normalizeBankroll(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return STARTING_CREDITS
  return Math.min(MAX_BANKROLL, Math.max(MIN_BANKROLL, Math.round(parsed / COIN_VALUE) * COIN_VALUE))
}

export function displayHandLabel(result: HandResult) {
  return result.displayLabel ?? result.label
}

export function formatSignedCredits(amount: number) {
  if (amount === 0) return '$0'
  return `${amount > 0 ? '+' : '−'}$${formatCredits(Math.abs(amount))}`
}
