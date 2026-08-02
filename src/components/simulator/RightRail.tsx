import { ChevronRight, Zap } from 'lucide-react'
import type { AutoSpeed, BalancePoint } from '../../app/types'
import { AutoplayPanel } from './AutoplayPanel'
import { SimulationPanel } from './SimulationPanel'

type RightRailProps = {
  running: boolean
  speed: AutoSpeed
  pauseOnTopFour: boolean
  pauseReason: string
  hands: number
  winRate: number
  totalPaid: number
  totalWagered: number
  sessionNet: number
  sessionStartBalance: number
  history: BalancePoint[]
  levelProgress: number
  onToggleAutoplay: () => void
  onSpeedChange: (speed: AutoSpeed) => void
  onPauseOnTopFourChange: (enabled: boolean) => void
  onOpenRules: () => void
}

export function RightRail(props: RightRailProps) {
  return (
    <aside className="right-rail">
      <AutoplayPanel
        running={props.running}
        speed={props.speed}
        pauseOnTopFour={props.pauseOnTopFour}
        handsPlayed={props.hands}
        pauseReason={props.pauseReason}
        onToggle={props.onToggleAutoplay}
        onSpeedChange={props.onSpeedChange}
        onPauseOnTopFourChange={props.onPauseOnTopFourChange}
      />
      <SimulationPanel
        hands={props.hands}
        winRate={props.winRate}
        totalPaid={props.totalPaid}
        totalWagered={props.totalWagered}
        sessionNet={props.sessionNet}
        sessionStartBalance={props.sessionStartBalance}
        history={props.history}
        levelProgress={props.levelProgress}
      />
      <button type="button" className="tip-card" onClick={props.onOpenRules}>
        <span className="tip-icon"><Zap size={18} /></span>
        <span><small>QUICK TIP</small><b>Keep high pairs and four-card draws</b></span>
        <ChevronRight size={18} />
      </button>
    </aside>
  )
}
