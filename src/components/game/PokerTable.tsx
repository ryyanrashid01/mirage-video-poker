import { EMPTY_CARDS } from '../../app/config'
import type { Phase } from '../../app/types'
import { formatCredits, type Card, type HandResult, type StrategyAdvice, type StrategyOption } from '../../game'
import { displayHandLabel } from '../../lib/format'
import { PlayingCard } from '../cards/PlayingCard'
import { StrategyGuide } from './StrategyGuide'
import { WagerConsole } from './WagerConsole'

type PokerTableProps = {
  phase: Phase
  hand: Card[]
  holds: boolean[]
  cardsHeld: number
  result: HandResult | null
  currentPreview: HandResult | null
  recentWin: number
  netResult: number
  coachMode: boolean
  strategyAdvice: StrategyAdvice | null
  selectedStrategy: StrategyOption | undefined
  replacing: boolean
  bet: number
  wager: number
  credits: number
  doubleCount: number
  onToggleHold: (index: number) => void
  onApplyGuide: () => void
  onSelectBet: (coins: number) => void
  onPrimary: () => void
  onDouble: () => void
  onRefill: () => void
}

export function PokerTable(props: PokerTableProps) {
  const {
    phase,
    hand,
    holds,
    cardsHeld,
    result,
    currentPreview,
    recentWin,
    netResult,
    coachMode,
    strategyAdvice,
    selectedStrategy,
    replacing,
    onToggleHold,
    onApplyGuide,
  } = props

  return (
    <section className={`table-stage ${coachMode && strategyAdvice ? 'coach-active' : ''}`} aria-label="Poker table">
      <div className="table-halo" />
      <div className={`hand-callout ${result && result.multiplier > 0 ? 'winner' : ''}`}>
        {phase === 'idle' && <><small>FIVE-CARD DRAW</small><b>Ready when you are</b></>}
        {phase === 'dealt' && <><small>{currentPreview?.multiplier ? 'MADE HAND' : 'YOUR MOVE'}</small><b>{currentPreview?.multiplier ? displayHandLabel(currentPreview) : 'Choose your holds'}</b></>}
        {phase === 'settled' && result && <><small>{result.multiplier ? 'WINNING HAND' : 'NO PAYOUT'}</small><b>{displayHandLabel(result)}</b></>}
      </div>

      <div className="cards-row">
        {phase === 'idle'
          ? EMPTY_CARDS.map((index) => <PlayingCard key={index} index={index} faceDown />)
          : hand.map((card, index) => (
              <PlayingCard
                key={`${card.id}-${index}`}
                card={card}
                index={index}
                held={holds[index]}
                replacing={replacing && !holds[index]}
                coachSuggested={Boolean(coachMode && strategyAdvice?.recommended.holds[index])}
                onClick={phase === 'dealt' ? () => onToggleHold(index) : undefined}
              />
            ))}
      </div>

      <div className="table-instruction">
        {phase === 'idle' && 'Set your bet, then deal a hand'}
        {phase === 'dealt' && `${cardsHeld ? `${cardsHeld} held` : 'Tap cards to hold'} · Draw ${5 - cardsHeld}`}
        {phase === 'settled' && result && (recentWin
          ? netResult > 0
            ? `$${formatCredits(recentWin)} paid · +$${formatCredits(netResult)} net profit`
            : `$${formatCredits(recentWin)} returned · your bet is covered`
          : result.multiplier ? 'Double-or-nothing wager lost · deal again' : result.detail)}
      </div>

      {coachMode && strategyAdvice && selectedStrategy && (
        <StrategyGuide advice={strategyAdvice} selected={selectedStrategy} onApply={onApplyGuide} />
      )}

      <WagerConsole
        bet={props.bet}
        wager={props.wager}
        phase={phase}
        cardsHeld={cardsHeld}
        credits={props.credits}
        recentWin={recentWin}
        doubleCount={props.doubleCount}
        replacing={replacing}
        onSelectBet={props.onSelectBet}
        onPrimary={props.onPrimary}
        onDouble={props.onDouble}
        onRefill={props.onRefill}
      />
    </section>
  )
}
