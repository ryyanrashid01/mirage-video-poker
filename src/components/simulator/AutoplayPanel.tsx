import { Gauge, Pause, Play, Sparkles } from 'lucide-react'
import { AUTO_SPEEDS } from '../../app/config'
import type { AutoSpeed } from '../../app/types'
import { formatCredits } from '../../game'
import { Switch } from '../ui/Switch'

type AutoplayPanelProps = {
  running: boolean
  speed: AutoSpeed
  pauseOnTopFour: boolean
  handsPlayed: number
  pauseReason: string
  onToggle: () => void
  onSpeedChange: (speed: AutoSpeed) => void
  onPauseOnTopFourChange: (enabled: boolean) => void
}

export function AutoplayPanel({
  running,
  speed,
  pauseOnTopFour,
  handsPlayed,
  pauseReason,
  onToggle,
  onSpeedChange,
  onPauseOnTopFourChange,
}: AutoplayPanelProps) {
  const activeSpeed = AUTO_SPEEDS.find(({ key }) => key === speed)

  return (
    <section className="panel autoplay-panel">
      <div className="panel-heading compact">
        <span><small>SIMULATION MODE</small><h2>Autoplay</h2></span>
        <Gauge size={18} />
      </div>
      <div className="autoplay-body">
        <button type="button" className={`autoplay-master ${running ? 'running' : ''}`} onClick={onToggle}>
          <i>{running ? <Pause size={18} /> : <Play size={18} />}</i>
          <span><b>{running ? 'Pause simulation' : 'Start simulation'}</b><small>Plays the strongest statistical hold</small></span>
          <em>{running ? 'LIVE' : 'READY'}</em>
        </button>

        <div className="speed-setting">
          <span><small>SPEED</small><b>{activeSpeed?.label}</b></span>
          <div role="group" aria-label="Autoplay speed">
            {AUTO_SPEEDS.map((option) => (
              <button
                type="button"
                key={option.key}
                className={speed === option.key ? 'selected' : ''}
                onClick={() => onSpeedChange(option.key)}
                aria-label={`${option.label} autoplay speed`}
                aria-pressed={speed === option.key}
              >{option.label[0]}</button>
            ))}
          </div>
        </div>

        <div className="pause-setting">
          <span className="pause-setting-icon"><Sparkles size={15} /></span>
          <label htmlFor="pause-top-four">
            <b>Pause on top four</b>
            <small>Full house or better</small>
          </label>
          <Switch
            id="pause-top-four"
            checked={pauseOnTopFour}
            onCheckedChange={onPauseOnTopFourChange}
            aria-label="Pause autoplay on the top four payouts"
          />
        </div>

        <div className={`autoplay-status ${running ? 'live' : ''}`}>
          <i /> {running ? `Running · ${formatCredits(handsPlayed)} hands played` : pauseReason || 'Waiting to start'}
        </div>
      </div>
    </section>
  )
}
