import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BalancePoint } from '../../app/types'
import { formatCredits } from '../../game'
import { formatSignedCredits } from '../../lib/format'

type SimulationPanelProps = {
  hands: number
  winRate: number
  totalPaid: number
  totalWagered: number
  sessionNet: number
  sessionStartBalance: number
  history: BalancePoint[]
  levelProgress: number
}

export function SimulationPanel({
  hands,
  winRate,
  totalPaid,
  totalWagered,
  sessionNet,
  sessionStartBalance,
  history,
  levelProgress,
}: SimulationPanelProps) {
  return (
    <section className="panel stats-panel simulation-panel">
      <div className="panel-heading compact">
        <span><small>LIVE LEDGER</small><h2>Simulation</h2></span>
        <BarChart3 size={18} />
      </div>
      <div className="simulation-metrics">
        <span><b>{hands}</b><small>Hands</small></span>
        <span><b>{winRate}%</b><small>Hit rate</small></span>
        <span><b>${formatCredits(totalPaid)}</b><small>Paid</small></span>
        <span className={sessionNet >= 0 ? 'positive' : 'negative'}><b>{formatSignedCredits(sessionNet)}</b><small>Net P/L</small></span>
      </div>
      <div className="balance-chart" aria-label="Balance history chart">
        {history.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 4, bottom: 2, left: 4 }}>
              <defs>
                <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e6c477" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#e6c477" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hand" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <ReferenceLine y={sessionStartBalance} stroke="rgba(248,243,231,.18)" strokeDasharray="3 3" />
              <Tooltip
                formatter={(value) => [`$${formatCredits(Number(value))}`, 'Balance']}
                labelFormatter={(handNumber) => `Hand ${handNumber}`}
                contentStyle={{ background: '#071a14', border: '1px solid rgba(231,196,119,.25)', borderRadius: 8, fontSize: 11 }}
                itemStyle={{ color: '#f5d98e' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#e6c477" strokeWidth={2} fill="url(#balance-fill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <span className="chart-empty">The balance curve appears after the first hand.</span>
        )}
      </div>
      <div className="ledger-line">
        <span><small>WAGERED</small><b>${formatCredits(totalWagered)}</b></span>
        <span><small>LAST RESULT</small><b>{history.at(-1)?.result ?? '—'}</b></span>
      </div>
      <div className="xp-block">
        <span><small>NEXT LEVEL</small><b>{250 - levelProgress} XP</b></span>
        <div><i style={{ width: `${(levelProgress / 250) * 100}%` }} /></div>
      </div>
    </section>
  )
}
