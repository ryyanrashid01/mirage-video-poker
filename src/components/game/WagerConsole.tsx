import { ChevronRight, Gift, Sparkles, Zap } from 'lucide-react'
import { BET_OPTIONS, COIN_VALUE } from '../../app/config'
import type { Phase } from '../../app/types'
import { formatCredits } from '../../game'

type WagerConsoleProps = {
  bet: number
  wager: number
  phase: Phase
  cardsHeld: number
  credits: number
  recentWin: number
  doubleCount: number
  replacing: boolean
  onSelectBet: (coins: number) => void
  onPrimary: () => void
  onDouble: () => void
  onRefill: () => void
}

export function WagerConsole({
  bet,
  wager,
  phase,
  cardsHeld,
  credits,
  recentWin,
  doubleCount,
  replacing,
  onSelectBet,
  onPrimary,
  onDouble,
  onRefill,
}: WagerConsoleProps) {
  return (
    <div className="bet-console">
      <div className="wager-panel">
        <div className="wager-heading">
          <span><small>TABLE WAGER</small><b>${formatCredits(wager)} <i>{bet === 5 ? 'MAX BET' : 'PER HAND'}</i></b></span>
          <button type="button" className={`max-bet ${bet === 5 ? 'selected' : ''}`} disabled={phase === 'dealt'} onClick={() => onSelectBet(5)}>
            <Sparkles size={13} /> MAX
          </button>
        </div>
        <div className="coin-options" role="group" aria-label="Bet amount">
          {BET_OPTIONS.map((coin) => (
            <button
              type="button"
              key={coin}
              className={bet === coin ? 'selected' : ''}
              onClick={() => onSelectBet(coin)}
              disabled={phase === 'dealt'}
              aria-label={`Bet $${formatCredits(coin * COIN_VALUE)}`}
              aria-pressed={bet === coin}
            ><i aria-hidden="true" /><b>${formatCredits(coin * COIN_VALUE)}</b></button>
          ))}
        </div>
        <div className="win-actions">
          {phase === 'settled' && recentWin > 0 ? (
            <>
              <button type="button" className="double-button" onClick={onDouble} disabled={doubleCount >= 3}><Zap size={16} /> Double</button>
              <span>{doubleCount}/3 tries</span>
            </>
          ) : credits < wager ? (
            <button type="button" className="refill-button" onClick={onRefill}><Gift size={16} /> Free refill</button>
          ) : (
            <span className="shortcut-hint"><kbd>SPACE</kbd> deal · <kbd>1–5</kbd> hold</span>
          )}
        </div>
      </div>

      <button type="button" className="primary-action" onClick={onPrimary} disabled={replacing}>
        <span>
          <small>{phase === 'dealt' ? `${cardsHeld} HELD · ${5 - cardsHeld} TO DRAW` : phase === 'settled' ? `NEXT HAND · $${formatCredits(wager)}` : `PLAY $${formatCredits(wager)}`}</small>
          <b>{phase === 'dealt' ? 'DRAW' : phase === 'settled' ? 'DEAL AGAIN' : 'DEAL'}</b>
        </span>
        <i className="action-arrow"><ChevronRight size={22} /></i>
      </button>
    </div>
  )
}
