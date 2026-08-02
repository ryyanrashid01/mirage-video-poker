import { Flame, Trophy } from 'lucide-react'
import { formatCredits } from '../../game'

type BankStripProps = {
  credits: number
  streak: number
  bestWin: number
  onOpenBankroll: () => void
}

export function BankStrip({ credits, streak, bestWin, onOpenBankroll }: BankStripProps) {
  return (
    <section className="bank-strip" aria-label="Player balance and session status">
      <button type="button" className="balance-block balance-button" onClick={onOpenBankroll} aria-label={`Balance $${formatCredits(credits)}. Choose a new starting balance.`}>
        <small>BALANCE <span>CHANGE</span></small>
        <strong><i>$</i>{formatCredits(credits)}</strong>
      </button>
      <span className="bank-divider" />
      <div className="mini-stat">
        <Flame size={17} />
        <span><small>STREAK</small><b>{streak} {streak === 1 ? 'win' : 'wins'}</b></span>
      </div>
      <div className="mini-stat desktop-stat">
        <Trophy size={17} />
        <span><small>BEST WIN</small><b>${formatCredits(bestWin)}</b></span>
      </div>
      <div className="session-chip">FREE PLAY</div>
    </section>
  )
}
