export type Phase = 'idle' | 'dealt' | 'settled'
export type PlayerStats = { hands: number; wins: number; best: number }
export type AutoSpeed = 'relaxed' | 'quick' | 'turbo'
export type SoundKind = 'tap' | 'hold' | 'deal' | 'draw' | 'coin' | 'win' | 'bigWin' | 'lose'

export type BalancePoint = {
  hand: number
  balance: number
  payout: number
  result: string
}
