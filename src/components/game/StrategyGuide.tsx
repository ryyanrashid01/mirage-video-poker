import { formatCredits, type StrategyAdvice, type StrategyOption } from '../../game'

type StrategyGuideProps = {
  advice: StrategyAdvice
  selected: StrategyOption
  onApply: () => void
}

export function StrategyGuide({ advice, selected, onApply }: StrategyGuideProps) {
  const isBestChoice = selected.mask === advice.recommended.mask

  return (
    <section className="strategy-coach" aria-live="polite">
      <div className="guide-note">
        <span className="guide-seal">♠</span>
        <div className="coach-heading">
          <span><small>TABLE GUIDE</small><b>{advice.holdLabel}</b></span>
          <em>{advice.recommended.exact ? 'Exact combinations' : `${formatCredits(advice.recommended.samples)} sampled deals`}</em>
        </div>
        <p>{advice.explanation}</p>
      </div>
      <div className="coach-metrics">
        <span><b>{(advice.recommended.winChance * 100).toFixed(1)}%</b><small>chance to pay</small></span>
        <span><b>{Math.round(advice.recommended.expectedReturn * 100)}%</b><small>expected back</small></span>
        <span className="odds-breakdown">
          <small>MOST LIKELY WINS</small>
          <b>
            {advice.recommended.outcomes.slice(0, 3).map((outcome) => (
              <i key={outcome.key}>{outcome.label} <strong>{(outcome.chance * 100).toFixed(outcome.chance < 0.01 ? 1 : 0)}%</strong></i>
            ))}
          </b>
        </span>
        {!isBestChoice && <button type="button" className="apply-guide" onClick={onApply}>Use this hold</button>}
      </div>
      <div className={`choice-check ${isBestChoice ? 'best' : ''}`}>
        <span>
          {isBestChoice
            ? 'Good choice—you’re on the strongest line.'
            : `Your current holds return about ${Math.round(selected.expectedReturn * 100)}% of the bet.`}
        </span>
        <details className="guide-method">
          <summary>How is this worked out?</summary>
          <small>It uses every theoretically unseen card, never the hidden deck order. Large draws use stable simulations.</small>
        </details>
      </div>
    </section>
  )
}
