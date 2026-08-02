import { BadgeHelp, Lightbulb, Volume2, VolumeX } from 'lucide-react'

type GameHeaderProps = {
  level: number
  levelProgress: number
  rank: string
  coachMode: boolean
  muted: boolean
  onToggleGuide: () => void
  onToggleMuted: () => void
  onOpenRules: () => void
}

export function GameHeader({
  level,
  levelProgress,
  rank,
  coachMode,
  muted,
  onToggleGuide,
  onToggleMuted,
  onOpenRules,
}: GameHeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#game" aria-label="Mirage video poker home">
        <span className="brand-mark">♠</span>
        <span><b>MIRAGE</b><small>VIDEO POKER</small></span>
      </a>

      <div className="rank-pill">
        <span className="rank-medallion">{level}</span>
        <span className="rank-copy"><small>{rank}</small><b>Level {level}</b></span>
        <span className="rank-track"><i style={{ width: `${(levelProgress / 250) * 100}%` }} /></span>
      </div>

      <nav className="header-actions" aria-label="Game controls">
        <button type="button" className={`coach-toggle ${coachMode ? 'active' : ''}`} onClick={onToggleGuide} aria-pressed={coachMode}>
          <Lightbulb size={18} /> <span>Guide</span><i>{coachMode ? 'ON' : 'OFF'}</i>
        </button>
        <button type="button" className="icon-button" onClick={onToggleMuted} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <button type="button" className="how-button" onClick={onOpenRules}>
          <BadgeHelp size={18} /> <span>How to play</span>
        </button>
      </nav>
    </header>
  )
}
