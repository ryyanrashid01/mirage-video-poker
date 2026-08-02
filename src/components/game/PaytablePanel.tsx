import { Info, Sparkles } from 'lucide-react'
import { PAYTABLE, displayPayout, formatCredits, type HandResult } from '../../game'
import { COIN_VALUE } from '../../app/config'

export function PaytablePanel({ bet, result }: { bet: number; result: HandResult | null }) {
  return (
    <aside className="panel paytable-panel">
      <div className="panel-heading">
        <span><small>CLASSIC GAME</small><h2>Jacks or Better</h2></span>
        <Info size={17} />
      </div>
      <div className="paytable-head"><span>HAND</span><span>PAYS</span></div>
      <div className="paytable-list">
        {PAYTABLE.map((row) => (
          <div className={`pay-row ${result?.key === row.key ? 'active' : ''}`} key={row.key}>
            <span>{row.label}</span>
            <b>${formatCredits(displayPayout(row, bet) * COIN_VALUE)}</b>
          </div>
        ))}
      </div>
      <div className="max-note"><Sparkles size={14} /> $500 max bet unlocks the $400,000 royal</div>
    </aside>
  )
}
