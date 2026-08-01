import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  BadgeHelp,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Gift,
  Info,
  Lightbulb,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import {
  PAYTABLE,
  SUIT_SYMBOL,
  analyzeHandStrategy,
  calculatePayout,
  createDeck,
  displayPayout,
  evaluateHand,
  formatCredits,
  type Card,
  type HandResult,
} from './game'

type Phase = 'idle' | 'dealt' | 'settled'
type Stats = { hands: number; wins: number; best: number }

const COIN_VALUE = 100
const BET_OPTIONS = [1, 2, 3, 5]
const STARTING_CREDITS = 120_000
const MISSION_REWARD = 10_000
const EMPTY_CARDS = Array.from({ length: 5 }, (_, index) => index)

function loadNumber(key: string, fallback: number) {
  const stored = window.localStorage.getItem(key)
  const parsed = stored ? Number(stored) : fallback
  return Number.isFinite(parsed) ? parsed : fallback
}

function PlayingCard({
  card,
  held,
  onClick,
  index,
  faceDown = false,
  replacing = false,
  coachSuggested = false,
}: {
  card?: Card
  held?: boolean
  onClick?: () => void
  index: number
  faceDown?: boolean
  replacing?: boolean
  coachSuggested?: boolean
}) {
  const red = card?.suit === 'hearts' || card?.suit === 'diamonds'
  const style = { '--card-index': index } as CSSProperties

  return (
    <button
      className={`playing-card ${faceDown ? 'card-back' : ''} ${held ? 'is-held' : ''} ${replacing ? 'is-replacing' : ''} ${coachSuggested ? 'coach-suggested' : ''}`}
      style={style}
      onClick={onClick}
      disabled={!onClick}
      aria-label={faceDown ? 'Face-down card' : `${card?.rank} of ${card?.suit}${held ? ', held' : ''}`}
      aria-pressed={onClick ? held : undefined}
    >
      {faceDown || !card ? (
        <span className="card-back-art" aria-hidden="true">
          <span>♠</span>
        </span>
      ) : (
        <>
          <span className={`card-corner top ${red ? 'red' : ''}`}>
            <b>{card.rank}</b>
            <i>{SUIT_SYMBOL[card.suit]}</i>
          </span>
          <span className={`card-suit ${red ? 'red' : ''}`}>{SUIT_SYMBOL[card.suit]}</span>
          <span className={`card-corner bottom ${red ? 'red' : ''}`}>
            <b>{card.rank}</b>
            <i>{SUIT_SYMBOL[card.suit]}</i>
          </span>
          <span className="card-shine" />
        </>
      )}
      {held && <span className="hold-ribbon">HELD</span>}
      {coachSuggested && !held && <span className="coach-card-badge">HOLD</span>}
      {onClick && <span className="card-key">{index + 1}</span>}
    </button>
  )
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 32 }, (_, index) => (
        <i
          key={index}
          style={{
            '--x': `${(index * 37) % 100}vw`,
            '--delay': `${(index % 8) * 0.07}s`,
            '--spin': `${index % 2 ? 540 : -540}deg`,
            '--color': ['#e7c477', '#f46f61', '#54b899', '#f6f0df'][index % 4],
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function App() {
  const [credits, setCredits] = useState(() => loadNumber('mirage-credits-v2', STARTING_CREDITS))
  const [bet, setBet] = useState(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [hand, setHand] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false])
  const [result, setResult] = useState<HandResult | null>(null)
  const [recentWin, setRecentWin] = useState(0)
  const [streak, setStreak] = useState(0)
  const [missionWins, setMissionWins] = useState(0)
  const [missionClaimed, setMissionClaimed] = useState(false)
  const [xp, setXp] = useState(() => loadNumber('mirage-xp', 85))
  const [stats, setStats] = useState<Stats>(() => ({
    hands: loadNumber('mirage-hands', 0),
    wins: loadNumber('mirage-wins', 0),
    best: loadNumber('mirage-best-v2', 0),
  }))
  const [muted, setMuted] = useState(() => window.localStorage.getItem('mirage-muted') === 'true')
  const [coachMode, setCoachMode] = useState(() => window.localStorage.getItem('mirage-coach') === 'true')
  const [howToOpen, setHowToOpen] = useState(false)
  const [doubleOpen, setDoubleOpen] = useState(false)
  const [doubleCard, setDoubleCard] = useState<Card | null>(null)
  const [doubleReveal, setDoubleReveal] = useState(false)
  const [doubleCount, setDoubleCount] = useState(0)
  const [toast, setToast] = useState('Welcome to the Mirage')
  const [showConfetti, setShowConfetti] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)

  const wager = bet * COIN_VALUE
  const cardsHeld = holds.filter(Boolean).length
  const level = Math.floor(xp / 250) + 1
  const levelProgress = xp % 250
  const winRate = stats.hands ? Math.round((stats.wins / stats.hands) * 100) : 0
  const rank = level >= 8 ? 'High Roller' : level >= 4 ? 'Card Sharp' : 'Rising Player'

  const currentPreview = useMemo(() => (hand.length === 5 ? evaluateHand(hand) : null), [hand])
  const strategyAdvice = useMemo(
    () => coachMode && phase === 'dealt' && hand.length === 5
      ? analyzeHandStrategy(hand, bet, COIN_VALUE)
      : null,
    [bet, coachMode, hand, phase],
  )
  const selectedMask = holds.reduce((mask, held, index) => held ? mask | (1 << index) : mask, 0)
  const selectedStrategy = strategyAdvice?.options.find((option) => option.mask === selectedMask)

  const playSound = useCallback((kind: 'tap' | 'hold' | 'deal' | 'draw' | 'coin' | 'win' | 'bigWin' | 'lose') => {
    if (muted) return
    try {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext
      const audio = audioRef.current ?? new AudioCtor()
      audioRef.current = audio
      void audio.resume()
      const now = audio.currentTime
      const notes = kind === 'bigWin'
        ? [392, 523, 659, 784, 1047]
        : kind === 'win'
          ? [523, 659, 784]
          : kind === 'lose'
            ? [180, 145]
            : kind === 'deal'
              ? [220, 285, 350]
              : kind === 'draw'
                ? [310, 390]
                : kind === 'coin'
                  ? [880, 1175]
                  : kind === 'hold'
                    ? [480, 610]
                    : [410]
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type = kind === 'win' || kind === 'bigWin' || kind === 'coin' ? 'sine' : 'triangle'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, now + index * 0.08)
        gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.025 : kind === 'bigWin' ? 0.075 : 0.05, now + index * 0.08 + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.16)
        oscillator.connect(gain).connect(audio.destination)
        oscillator.start(now + index * 0.08)
        oscillator.stop(now + index * 0.08 + 0.18)
      })

      if (kind === 'deal' || kind === 'draw') {
        const duration = kind === 'deal' ? 0.2 : 0.13
        const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate)
        const data = buffer.getChannelData(0)
        for (let index = 0; index < data.length; index += 1) {
          const envelope = 1 - index / data.length
          data[index] = (Math.random() * 2 - 1) * envelope
        }
        const source = audio.createBufferSource()
        const filter = audio.createBiquadFilter()
        const noiseGain = audio.createGain()
        source.buffer = buffer
        filter.type = 'bandpass'
        filter.frequency.value = kind === 'deal' ? 1350 : 1900
        noiseGain.gain.value = 0.035
        source.connect(filter).connect(noiseGain).connect(audio.destination)
        source.start(now)
      }
    } catch {
      // Sound is a progressive enhancement; the game remains fully playable without it.
    }
  }, [muted])

  const buzz = useCallback(() => {
    if (!muted && navigator.vibrate) navigator.vibrate(12)
  }, [muted])

  useEffect(() => {
    window.localStorage.setItem('mirage-credits-v2', String(credits))
    window.localStorage.setItem('mirage-xp', String(xp))
    window.localStorage.setItem('mirage-hands', String(stats.hands))
    window.localStorage.setItem('mirage-wins', String(stats.wins))
    window.localStorage.setItem('mirage-best-v2', String(stats.best))
    window.localStorage.setItem('mirage-muted', String(muted))
    window.localStorage.setItem('mirage-coach', String(coachMode))
  }, [coachMode, credits, muted, stats, xp])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const deal = useCallback(() => {
    if (credits < wager) {
      setToast('Not enough credits — grab a free refill')
      playSound('lose')
      return
    }
    const freshDeck = createDeck()
    setCredits((value) => value - wager)
    setHand(freshDeck.slice(0, 5))
    setDeck(freshDeck.slice(5))
    setHolds([false, false, false, false, false])
    setResult(null)
    setRecentWin(0)
    setDoubleCount(0)
    setPhase('dealt')
    setToast('Pick the cards you want to keep')
    playSound('deal')
    buzz()
  }, [buzz, credits, playSound, wager])

  const draw = useCallback(() => {
    if (phase !== 'dealt') return
    setReplacing(true)
    playSound('draw')
    window.setTimeout(() => {
      let deckIndex = 0
      const nextHand = hand.map((card, index) => holds[index] ? card : deck[deckIndex++])
      const nextResult = evaluateHand(nextHand)
      const payout = calculatePayout(nextResult, bet, COIN_VALUE)
      setHand(nextHand)
      setDeck((cards) => cards.slice(deckIndex))
      setResult(nextResult)
      setRecentWin(payout)
      setPhase('settled')
      setReplacing(false)
      setStats((current) => ({
        hands: current.hands + 1,
        wins: current.wins + (payout > 0 ? 1 : 0),
        best: Math.max(current.best, payout),
      }))

      if (payout > 0) {
        setCredits((value) => value + payout)
        setStreak((value) => value + 1)
        setXp((value) => value + 25 + Math.min(75, nextResult.multiplier * 3))
        setToast(`${nextResult.label}! +$${formatCredits(payout)}`)
        setShowConfetti(nextResult.multiplier >= 4)
        setMissionWins((current) => {
          const next = Math.min(3, current + 1)
          if (next === 3 && !missionClaimed) {
            setMissionClaimed(true)
            setCredits((value) => value + MISSION_REWARD)
            window.setTimeout(() => setToast(`Mission complete · +$${formatCredits(MISSION_REWARD)}`), 650)
          }
          return next
        })
        playSound(nextResult.multiplier >= 4 ? 'bigWin' : 'win')
        buzz()
        window.setTimeout(() => setShowConfetti(false), 2200)
      } else {
        setStreak(0)
        setXp((value) => value + 8)
        setToast('No win this hand — the next one is yours')
        playSound('lose')
      }
    }, 270)
  }, [bet, buzz, deck, hand, holds, missionClaimed, phase, playSound])

  const handlePrimary = useCallback(() => {
    if (phase === 'dealt') draw()
    else deal()
  }, [deal, draw, phase])

  const toggleHold = useCallback((index: number) => {
    if (phase !== 'dealt') return
    setHolds((current) => current.map((held, cardIndex) => cardIndex === index ? !held : held))
    playSound('hold')
    buzz()
  }, [buzz, phase, playSound])

  const startDouble = () => {
    if (!recentWin || doubleCount >= 3) return
    const doubleDeck = createDeck()
    setCredits((value) => value - recentWin)
    setDoubleCard(doubleDeck[0])
    setDoubleReveal(false)
    setDoubleOpen(true)
    playSound('coin')
  }

  const guessColor = (guess: 'red' | 'black') => {
    if (!doubleCard || doubleReveal) return
    setDoubleReveal(true)
    const isRed = doubleCard.suit === 'hearts' || doubleCard.suit === 'diamonds'
    const won = (guess === 'red') === isRed
    window.setTimeout(() => {
      if (won) {
        const doubled = recentWin * 2
        setCredits((value) => value + doubled)
        setRecentWin(doubled)
        setStats((current) => ({ ...current, best: Math.max(current.best, doubled) }))
        setDoubleCount((value) => value + 1)
        setToast(`Double up! +$${formatCredits(doubled)}`)
        setShowConfetti(true)
        window.setTimeout(() => setShowConfetti(false), 1600)
        playSound('bigWin')
      } else {
        setRecentWin(0)
        setToast('The house got that one')
        playSound('lose')
      }
      setDoubleOpen(false)
      setDoubleReveal(false)
    }, 850)
  }

  const refill = () => {
    setCredits(STARTING_CREDITS)
    setToast('Free-play wallet refilled')
    playSound('win')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (howToOpen || doubleOpen) return
      if (event.key >= '1' && event.key <= '5') toggleHold(Number(event.key) - 1)
      if (event.key.toLowerCase() === 'm' && phase !== 'dealt') setBet(5)
      if (event.code === 'Space') {
        event.preventDefault()
        handlePrimary()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [doubleOpen, handlePrimary, howToOpen, phase, toggleHold])

  return (
    <main className="game-shell">
      <div className="ambient-layer" />
      <div className="grain" />
      {showConfetti && <Confetti />}

      <header className="topbar">
        <a className="brand" href="#game" aria-label="Mirage video poker home">
          <span className="brand-mark">♠</span>
          <span>
            <b>MIRAGE</b>
            <small>VIDEO POKER</small>
          </span>
        </a>

        <div className="rank-pill">
          <span className="rank-medallion">{level}</span>
          <span className="rank-copy">
            <small>{rank}</small>
            <b>Level {level}</b>
          </span>
          <span className="rank-track"><i style={{ width: `${(levelProgress / 250) * 100}%` }} /></span>
        </div>

        <nav className="header-actions" aria-label="Game controls">
          <button
            className={`coach-toggle ${coachMode ? 'active' : ''}`}
            onClick={() => {
              setCoachMode((value) => !value)
              setToast(coachMode ? 'Table Guide turned off' : 'Table Guide is ready to help')
              playSound('tap')
            }}
            aria-pressed={coachMode}
          >
            <Lightbulb size={18} /> <span>Guide</span><i>{coachMode ? 'ON' : 'OFF'}</i>
          </button>
          <button className="icon-button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Turn sound on' : 'Mute sound'}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button className="how-button" onClick={() => setHowToOpen(true)}>
            <BadgeHelp size={18} /> <span>How to play</span>
          </button>
        </nav>
      </header>

      <section className="bank-strip" aria-label="Player balance and session status">
        <div className="balance-block">
          <small>BALANCE</small>
          <strong><i>$</i>{formatCredits(credits)}</strong>
        </div>
        <span className="bank-divider" />
        <div className="mini-stat">
          <Flame size={17} />
          <span><small>STREAK</small><b>{streak} {streak === 1 ? 'win' : 'wins'}</b></span>
        </div>
        <div className="mini-stat desktop-stat">
          <Trophy size={17} />
          <span><small>BEST WIN</small><b>${formatCredits(stats.best)}</b></span>
        </div>
        <div className="session-chip">FREE PLAY</div>
      </section>

      <section className="game-layout" id="game">
        <aside className="panel paytable-panel">
          <div className="panel-heading">
            <span>
              <small>CLASSIC GAME</small>
              <h2>Jacks or Better</h2>
            </span>
            <Info size={17} />
          </div>
          <div className="paytable-head">
            <span>HAND</span><span>PAYS</span>
          </div>
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

        <section className={`table-stage ${strategyAdvice ? 'coach-active' : ''}`} aria-label="Poker table">
          <div className="table-halo" />
          <div className={`hand-callout ${result && result.multiplier > 0 ? 'winner' : ''}`}>
            {phase === 'idle' && <><small>FIVE-CARD DRAW</small><b>Ready when you are</b></>}
            {phase === 'dealt' && <><small>{currentPreview?.multiplier ? 'MADE HAND' : 'YOUR MOVE'}</small><b>{currentPreview?.multiplier ? currentPreview.label : 'Choose your holds'}</b></>}
            {phase === 'settled' && result && <><small>{result.multiplier ? 'WINNING HAND' : 'FINAL HAND'}</small><b>{result.multiplier ? result.label : 'So close — deal again'}</b></>}
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
                    coachSuggested={Boolean(strategyAdvice?.recommended.holds[index])}
                    onClick={phase === 'dealt' ? () => toggleHold(index) : undefined}
                  />
                ))}
          </div>

          <div className="table-instruction">
            {phase === 'idle' && 'Set your bet, then deal a hand'}
            {phase === 'dealt' && `${cardsHeld ? `${cardsHeld} held` : 'Tap cards to hold'} · Draw ${5 - cardsHeld}`}
            {phase === 'settled' && (recentWin ? `$${formatCredits(recentWin)} added to your balance` : 'New hand, new luck')}
          </div>

          {strategyAdvice && selectedStrategy && (
            <section className="strategy-coach" aria-live="polite">
              <div className="guide-note">
                <span className="guide-seal">♠</span>
                <div className="coach-heading">
                  <span><small>TABLE GUIDE</small><b>{strategyAdvice.holdLabel}</b></span>
                  <em>{strategyAdvice.recommended.exact ? 'Exact combinations' : `${formatCredits(strategyAdvice.recommended.samples)} sampled deals`}</em>
                </div>
                <p>{strategyAdvice.explanation}</p>
              </div>
              <div className="coach-metrics">
                <span><b>{(strategyAdvice.recommended.winChance * 100).toFixed(1)}%</b><small>chance to pay</small></span>
                <span><b>{Math.round(strategyAdvice.recommended.expectedReturn * 100)}%</b><small>expected back</small></span>
                <span className="odds-breakdown">
                  <small>MOST LIKELY WINS</small>
                  <b>
                    {strategyAdvice.recommended.outcomes.slice(0, 3).map((outcome) => (
                      <i key={outcome.key}>{outcome.label} <strong>{(outcome.chance * 100).toFixed(outcome.chance < 0.01 ? 1 : 0)}%</strong></i>
                    ))}
                  </b>
                </span>
                {selectedStrategy.mask !== strategyAdvice.recommended.mask && (
                  <button className="apply-guide" onClick={() => { setHolds(strategyAdvice.recommended.holds); playSound('hold'); buzz() }}>
                    Use this hold
                  </button>
                )}
              </div>
              <div className={`choice-check ${selectedStrategy.mask === strategyAdvice.recommended.mask ? 'best' : ''}`}>
                <span>
                  {selectedStrategy.mask === strategyAdvice.recommended.mask
                    ? 'Good choice—you’re on the strongest line.'
                    : `Your current holds return about ${Math.round(selectedStrategy.expectedReturn * 100)}% of the bet.`}
                </span>
                <details className="guide-method">
                  <summary>How is this worked out?</summary>
                  <small>It uses every theoretically unseen card, never the hidden deck order. Large draws use stable simulations.</small>
                </details>
              </div>
            </section>
          )}

          <div className="bet-console">
            <div className="bet-picker">
              <span className="control-label">BET</span>
              <div className="coin-options" role="group" aria-label="Bet amount">
                {BET_OPTIONS.map((coin) => (
                  <button
                    key={coin}
                    className={bet === coin ? 'selected' : ''}
                    onClick={() => { setBet(coin); playSound('tap') }}
                    disabled={phase === 'dealt'}
                    aria-label={`Bet $${formatCredits(coin * COIN_VALUE)}`}
                  >${formatCredits(coin * COIN_VALUE)}</button>
                ))}
              </div>
              <button className="max-bet" disabled={phase === 'dealt'} onClick={() => { setBet(5); playSound('tap') }}>
                MAX
              </button>
            </div>

            <button className="primary-action" onClick={handlePrimary} disabled={replacing}>
              <span>
                <small>{phase === 'dealt' ? `${cardsHeld} CARDS HELD` : `$${formatCredits(wager)} BET`}</small>
                <b>{phase === 'dealt' ? 'DRAW' : phase === 'settled' ? 'DEAL AGAIN' : 'DEAL'}</b>
              </span>
              <ChevronRight size={24} />
            </button>

            <div className="win-actions">
              {phase === 'settled' && recentWin > 0 ? (
                <>
                  <button className="double-button" onClick={startDouble} disabled={doubleCount >= 3}>
                    <Zap size={16} /> Double
                  </button>
                  <span>{doubleCount}/3 tries</span>
                </>
              ) : credits < wager ? (
                <button className="refill-button" onClick={refill}><Gift size={16} /> Free refill</button>
              ) : (
                <span className="shortcut-hint"><kbd>SPACE</kbd> deal · <kbd>1–5</kbd> hold</span>
              )}
            </div>
          </div>
        </section>

        <aside className="right-rail">
          <section className="panel mission-panel">
            <div className="panel-heading compact">
              <span><small>TONIGHT'S MISSION</small><h2>Hot Hand</h2></span>
              <Target size={18} />
            </div>
            <p>Win three hands in this session.</p>
            <div className="mission-progress">
              {[0, 1, 2].map((index) => <i key={index} className={missionWins > index ? 'done' : ''}>{missionWins > index ? '✓' : index + 1}</i>)}
            </div>
            <div className="reward-line">
              <span><Gift size={16} /> Reward</span>
              <b>{missionClaimed ? 'Claimed!' : `+$${formatCredits(MISSION_REWARD)}`}</b>
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="panel-heading compact">
              <span><small>YOUR TABLE</small><h2>Session</h2></span>
              <CircleDollarSign size={18} />
            </div>
            <div className="stats-grid">
              <span><b>{stats.hands}</b><small>Hands</small></span>
              <span><b>{winRate}%</b><small>Win rate</small></span>
            </div>
            <div className="xp-block">
              <span><small>NEXT LEVEL</small><b>{250 - levelProgress} XP</b></span>
              <div><i style={{ width: `${(levelProgress / 250) * 100}%` }} /></div>
            </div>
          </section>

          <button className="tip-card" onClick={() => setHowToOpen(true)}>
            <span className="tip-icon"><Zap size={18} /></span>
            <span><small>QUICK TIP</small><b>Keep high pairs and four-card draws</b></span>
            <ChevronRight size={18} />
          </button>
        </aside>
      </section>

      <footer>
        <span>Mirage is a free-play game · No real-money wagering</span>
        <span>Paytable updates with your bet · <button onClick={() => setHowToOpen(true)}>Game rules</button></span>
      </footer>

      {toast && <div className="toast" role="status"><Sparkles size={16} /> {toast}</div>}

      {howToOpen && (
        <div className="modal-backdrop" onMouseDown={() => setHowToOpen(false)}>
          <section className="modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHowToOpen(false)} aria-label="Close"><X /></button>
            <span className="modal-kicker">THE BASICS</span>
            <h2 id="rules-title">Make the best five-card hand.</h2>
            <p className="modal-lead">Deal five cards, hold the ones you like, then draw once to replace the rest. Jacks or better starts the payouts.</p>
            <div className="rule-steps">
              <span><i>1</i><b>Set a bet</b><small>Choose $100, $200, $300 or $500. The $500 bet unlocks the full royal bonus.</small></span>
              <span><i>2</i><b>Hold cards</b><small>Tap any cards worth keeping. You can hold all five—or none.</small></span>
              <span><i>3</i><b>Draw once</b><small>Unheld cards are replaced and your final hand pays automatically.</small></span>
            </div>
            <div className="double-explainer">
              <Zap size={22} />
              <span><b>Feeling lucky?</b><small>After a win, risk it on red or black to double the prize. You can try up to three times.</small></span>
            </div>
            <div className="double-explainer coach-explainer">
              <Lightbulb size={22} />
              <span><b>Learn while you play</b><small>Turn on Table Guide to see the strongest hold, payout probability and expected return for each hand.</small></span>
            </div>
            <button className="modal-primary" onClick={() => setHowToOpen(false)}>Got it — let's play</button>
          </section>
        </div>
      )}

      {doubleOpen && doubleCard && (
        <div className="modal-backdrop double-backdrop">
          <section className="modal double-modal" role="dialog" aria-modal="true" aria-labelledby="double-title">
            <span className="modal-kicker"><Zap size={14} /> DOUBLE OR NOTHING</span>
            <h2 id="double-title">Red or black?</h2>
            <p>Guess the hidden card and turn <b>${formatCredits(recentWin)}</b> into <b>${formatCredits(recentWin * 2)}.</b></p>
            <div className={`mystery-card ${doubleReveal ? 'revealed' : ''}`}>
              <div className="mystery-inner">
                <div className="mystery-front"><PlayingCard card={doubleCard} index={0} /></div>
                <div className="mystery-back"><PlayingCard index={0} faceDown /></div>
              </div>
            </div>
            <div className="color-buttons">
              <button className="red-choice" onClick={() => guessColor('red')} disabled={doubleReveal}><span>♥</span> RED</button>
              <button className="black-choice" onClick={() => guessColor('black')} disabled={doubleReveal}><span>♠</span> BLACK</button>
            </div>
            <button className="walk-away" disabled={doubleReveal} onClick={() => { setCredits((value) => value + recentWin); setDoubleOpen(false); setToast('Win safely banked') }}>
              Keep my win
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

export default App
