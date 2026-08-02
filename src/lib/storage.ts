import type { BalancePoint } from '../app/types'

export function loadNumber(key: string, fallback: number) {
  const stored = window.localStorage.getItem(key)
  const parsed = stored ? Number(stored) : fallback
  return Number.isFinite(parsed) ? parsed : fallback
}

export function loadBalanceHistory(fallbackHand: number, fallbackBalance: number): BalancePoint[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem('mirage-sim-history-v1') ?? '[]')
    if (
      Array.isArray(parsed)
      && parsed.length
      && parsed.every((point): point is BalancePoint => {
        if (!point || typeof point !== 'object') return false
        const candidate = point as Partial<BalancePoint>
        return Number.isFinite(candidate.hand)
          && Number.isFinite(candidate.balance)
          && Number.isFinite(candidate.payout)
          && typeof candidate.result === 'string'
      })
    ) {
      return parsed.slice(-120)
    }
  } catch {
    // Ignore malformed local data and start a clean simulator history.
  }

  return [{ hand: fallbackHand, balance: fallbackBalance, payout: 0, result: 'Session start' }]
}
