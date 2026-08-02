import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  BadgeHelp,
  BarChart3,
  ChevronRight,
  Flame,
  Gift,
  Gauge,
  Info,
  Lightbulb,
  Pause,
  Play,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
type AutoSpeed = 'relaxed' | 'quick' | 'turbo'
type BalancePoint = { hand: number; balance: number; payout: number; result: string }

const COIN_VALUE = 100
const BET_OPTIONS = [1, 2, 3, 5]
const AUTO_SPEEDS: Array<{ key: AutoSpeed; label: string; delay: number }> = [
  { key: 'relaxed', label: 'Relaxed', delay: 1_600 },
  { key: 'quick', label: 'Quick', delay: 700 },
  { key: 'turbo', label: 'Turbo', delay: 250 },
]
const TOP_FOUR_PAYOUTS = new Set<HandResult['key']>(['royal', 'straightFlush', 'fourKind', 'fullHouse'])
const STARTING_CREDITS = 10_000
const MIN_BANKROLL = 1_000
const MAX_BANKROLL = 1_000_000
const BANKROLL_OPTIONS = [
  { amount: 5_000, label: 'Quick run', hands: '10+ max-bet hands' },
  { amount: 10_000, label: 'Classic', hands: '20+ max-bet hands' },
  { amount: 25_000, label: 'Long night', hands: '50+ max-bet hands' },
  { amount: 50_000, label: 'High roller', hands: '100+ max-bet hands' },
  { amount: 100_000, label: 'Big table', hands: '200+ max-bet hands' },
]
const EMPTY_CARDS = Array.from({ length: 5 }, (_, index) => index)

function loadNumber(key: string, fallback: number) {
  const stored = window.localStorage.getItem(key)
  const parsed = stored ? Number(stored) : fallback
  return Number.isFinite(parsed) ? parsed : fallback
}

function loadBalanceHistory(fallbackHand: number, fallbackBalance: number): BalancePoint[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('mirage-sim-history-v1') ?? '[]')
    if (Array.isArray(parsed) && parsed.length && parsed.every((point) =>
      Number.isFinite(point.hand) && Number.isFinite(point.balance) && Number.isFinite(point.payout) && typeof point.result === 'string')) {
      return parsed.slice(-120)
    }
  } catch {
    // Start a clean chart if stored simulator data is malformed.
  }
  return [{ hand: fallbackHand, balance: fallbackBalance, payout: 0, result: 'Session start' }]
}

function normalizeBankroll(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return STARTING_CREDITS
  return Math.min(MAX_BANKROLL, Math.max(MIN_BANKROLL, Math.round(parsed / COIN_VALUE) * COIN_VALUE))
}

function displayHandLabel(result: HandResult) {
  return result.displayLabel ?? result.label
}

function formatSignedCredits(amount: number) {
  if (amount === 0) return '$0'
  return `${amount > 0 ? '+' : '−'}$${formatCredits(Math.abs(amount))}`
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
  const [startingBankroll, setStartingBankroll] = useState(() => loadNumber('mirage-bankroll-choice', STARTING_CREDITS))
  const [credits, setCredits] = useState(() => loadNumber('mirage-credits-v3', STARTING_CREDITS))
  const [bankrollConfigured, setBankrollConfigured] = useState(() => window.localStorage.getItem('mirage-bankroll-ready') === 'true')
  const [bankrollOpen, setBankrollOpen] = useState(() => window.localStorage.getItem('mirage-bankroll-ready') !== 'true')
  const [bankrollDraft, setBankrollDraft] = useState(() => String(loadNumber('mirage-bankroll-choice', STARTING_CREDITS)))
  const [bet, setBet] = useState(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [hand, setHand] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false])
  const [result, setResult] = useState<HandResult | null>(null)
  const [recentWin, setRecentWin] = useState(0)
  const [lastWager, setLastWager] = useState(0)
  const [streak, setStreak] = useState(0)
  const [xp, setXp] = useState(() => loadNumber('mirage-xp', 85))
  const [stats, setStats] = useState<Stats>(() => ({
    hands: loadNumber('mirage-hands', 0),
    wins: loadNumber('mirage-wins', 0),
    best: loadNumber('mirage-best-v2', 0),
  }))
  const [simulationHands, setSimulationHands] = useState(() => loadNumber('mirage-sim-hands-v1', 0))
  const [simulationWins, setSimulationWins] = useState(() => loadNumber('mirage-sim-wins-v1', 0))
  const [sessionStartBalance, setSessionStartBalance] = useState(() => loadNumber('mirage-sim-start-v1', credits))
  const [totalWagered, setTotalWagered] = useState(() => loadNumber('mirage-sim-wagered-v1', 0))
  const [totalPaid, setTotalPaid] = useState(() => loadNumber('mirage-sim-paid-v1', 0))
  const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>(() => loadBalanceHistory(simulationHands, credits))
  const [muted, setMuted] = useState(() => window.localStorage.getItem('mirage-muted') === 'true')
  const [coachMode, setCoachMode] = useState(() => window.localStorage.getItem('mirage-coach') === 'true')
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoSpeed, setAutoSpeed] = useState<AutoSpeed>(() => {
    const saved = window.localStorage.getItem('mirage-auto-speed') as AutoSpeed | null
    return saved && AUTO_SPEEDS.some(({ key }) => key === saved) ? saved : 'quick'
  })
  const [pauseOnTopFour, setPauseOnTopFour] = useState(() => window.localStorage.getItem('mirage-pause-top-four') !== 'false')
  const [autoPauseReason, setAutoPauseReason] = useState('')
  const [howToOpen, setHowToOpen] = useState(false)
  const [doubleOpen, setDoubleOpen] = useState(false)
  const [doubleCard, setDoubleCard] = useState<Card | null>(null)
  const [doubleReveal, setDoubleReveal] = useState(false)
  const [doubleCount, setDoubleCount] = useState(0)
  const [toast, setToast] = useState('Welcome to the Mirage')
  const [showConfetti, setShowConfetti] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)
  const autoTimerRef = useRef<number | null>(null)

  const wager = bet * COIN_VALUE
  const cardsHeld = holds.filter(Boolean).length
  const level = Math.floor(xp / 250) + 1
  const levelProgress = xp % 250
  const simulationWinRate = simulationHands ? Math.round((simulationWins / simulationHands) * 100) : 0
  const rank = level >= 8 ? 'High Roller' : level >= 4 ? 'Card Sharp' : 'Rising Player'
  const normalizedBankrollDraft = normalizeBankroll(bankrollDraft)
  const netResult = recentWin - lastWager
  const sessionNet = credits - sessionStartBalance
  const gameOver = credits < COIN_VALUE && phase !== 'dealt'
  const autoDelay = AUTO_SPEEDS.find(({ key }) => key === autoSpeed)?.delay ?? 700

  const currentPreview = useMemo(() => (hand.length === 5 ? evaluateHand(hand) : null), [hand])
  const strategyAdvice = useMemo(
    () => (coachMode || autoPlay) && phase === 'dealt' && hand.length === 5
      ? analyzeHandStrategy(hand, bet, COIN_VALUE)
      : null,
    [autoPlay, bet, coachMode, hand, phase],
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
    window.localStorage.setItem('mirage-credits-v3', String(credits))
    window.localStorage.setItem('mirage-bankroll-choice', String(startingBankroll))
    window.localStorage.setItem('mirage-xp', String(xp))
    window.localStorage.setItem('mirage-hands', String(stats.hands))
    window.localStorage.setItem('mirage-wins', String(stats.wins))
    window.localStorage.setItem('mirage-best-v2', String(stats.best))
    window.localStorage.setItem('mirage-muted', String(muted))
    window.localStorage.setItem('mirage-coach', String(coachMode))
    window.localStorage.setItem('mirage-auto-speed', autoSpeed)
    window.localStorage.setItem('mirage-pause-top-four', String(pauseOnTopFour))
    window.localStorage.setItem('mirage-sim-hands-v1', String(simulationHands))
    window.localStorage.setItem('mirage-sim-wins-v1', String(simulationWins))
    window.localStorage.setItem('mirage-sim-start-v1', String(sessionStartBalance))
    window.localStorage.setItem('mirage-sim-wagered-v1', String(totalWagered))
    window.localStorage.setItem('mirage-sim-paid-v1', String(totalPaid))
    window.localStorage.setItem('mirage-sim-history-v1', JSON.stringify(balanceHistory))
  }, [autoSpeed, balanceHistory, coachMode, credits, muted, pauseOnTopFour, sessionStartBalance, simulationHands, simulationWins, startingBankroll, stats, totalPaid, totalWagered, xp])

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
    setTotalWagered((value) => value + wager)
    setHand(freshDeck.slice(0, 5))
    setDeck(freshDeck.slice(5))
    setHolds([false, false, false, false, false])
    setResult(null)
    setRecentWin(0)
    setLastWager(wager)
    setDoubleCount(0)
    setPhase('dealt')
    setToast('Pick the cards you want to keep')
    playSound('deal')
    buzz()
  }, [buzz, credits, playSound, wager])

  const draw = useCallback((forcedHolds?: boolean[]) => {
    if (phase !== 'dealt' || replacing) return
    const activeHolds = forcedHolds ?? holds
    setReplacing(true)
    playSound('draw')
    window.setTimeout(() => {
      let deckIndex = 0
      const nextHand = hand.map((card, index) => activeHolds[index] ? card : deck[deckIndex++])
      const nextResult = evaluateHand(nextHand)
      const payout = calculatePayout(nextResult, bet, COIN_VALUE)
      const nextBalance = credits + payout
      const handNumber = simulationHands + 1
      setHand(nextHand)
      setDeck((cards) => cards.slice(deckIndex))
      setResult(nextResult)
      setRecentWin(payout)
      setPhase('settled')
      setReplacing(false)
      setTotalPaid((value) => value + payout)
      setSimulationHands((value) => value + 1)
      setSimulationWins((value) => value + (payout > 0 ? 1 : 0))
      setBalanceHistory((current) => [
        ...current,
        { hand: handNumber, balance: nextBalance, payout, result: displayHandLabel(nextResult) },
      ].slice(-120))
      setStats((current) => ({
        hands: current.hands + 1,
        wins: current.wins + (payout > 0 ? 1 : 0),
        best: Math.max(current.best, payout),
      }))

      if (payout > 0) {
        const netProfit = payout - wager
        setCredits((value) => value + payout)
        setStreak((value) => value + 1)
        setXp((value) => value + 25 + Math.min(75, nextResult.multiplier * 3))
        setToast(netProfit > 0
          ? `${displayHandLabel(nextResult)}! $${formatCredits(payout)} paid · +$${formatCredits(netProfit)} net`
          : `${displayHandLabel(nextResult)}! $${formatCredits(payout)} returned · bet covered`)
        setShowConfetti(nextResult.multiplier >= 4)
        playSound(nextResult.multiplier >= 4 ? 'bigWin' : 'win')
        buzz()
        window.setTimeout(() => setShowConfetti(false), 2200)
      } else {
        setStreak(0)
        setXp((value) => value + 8)
        setToast(nextResult.detail ?? 'No win this hand — the next one is yours')
        playSound('lose')
      }

      if (TOP_FOUR_PAYOUTS.has(nextResult.key) && autoPlay && pauseOnTopFour) {
        setAutoPlay(false)
        setAutoPauseReason(`Paused to celebrate ${displayHandLabel(nextResult)}`)
      } else if (nextBalance < COIN_VALUE) {
        setAutoPlay(false)
        setAutoPauseReason('Game over — bankroll below $100')
      } else if (autoPlay && nextBalance < wager) {
        const affordableBet = BET_OPTIONS.filter((coins) => coins * COIN_VALUE <= nextBalance).at(-1) ?? 1
        setBet(affordableBet)
      }
    }, 270)
  }, [autoPlay, bet, buzz, credits, deck, hand, holds, pauseOnTopFour, phase, playSound, replacing, simulationHands, wager])

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
    setAutoPlay(false)
    setAutoPauseReason('Paused for double or nothing')
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
    setCredits(startingBankroll)
    setSessionStartBalance(startingBankroll)
    setTotalWagered(0)
    setTotalPaid(0)
    setSimulationHands(0)
    setSimulationWins(0)
    setBalanceHistory([{ hand: 0, balance: startingBankroll, payout: 0, result: 'Wallet refill' }])
    setToast(`Wallet restored to $${formatCredits(startingBankroll)}`)
    playSound('coin')
  }

  const openBankrollPicker = () => {
    setAutoPlay(false)
    setAutoPauseReason('')
    setBankrollDraft(String(startingBankroll))
    setBankrollOpen(true)
    playSound('tap')
  }

  const closeBankrollPicker = () => {
    if (!bankrollConfigured) return
    setBankrollDraft(String(startingBankroll))
    setBankrollOpen(false)
  }

  const applyStartingBankroll = () => {
    const nextBankroll = normalizeBankroll(bankrollDraft)
    setStartingBankroll(nextBankroll)
    setCredits(nextBankroll)
    setBankrollDraft(String(nextBankroll))
    setBankrollConfigured(true)
    setBankrollOpen(false)
    setBet(1)
    setPhase('idle')
    setHand([])
    setDeck([])
    setHolds([false, false, false, false, false])
    setResult(null)
    setRecentWin(0)
    setLastWager(0)
    setStreak(0)
    setStats({ hands: 0, wins: 0, best: 0 })
    setSessionStartBalance(nextBankroll)
    setTotalWagered(0)
    setTotalPaid(0)
    setSimulationHands(0)
    setSimulationWins(0)
    setBalanceHistory([{ hand: 0, balance: nextBankroll, payout: 0, result: 'Session start' }])
    setAutoPlay(false)
    setAutoPauseReason('')
    setDoubleOpen(false)
    setDoubleCard(null)
    setDoubleReveal(false)
    setDoubleCount(0)
    setShowConfetti(false)
    setReplacing(false)
    window.localStorage.setItem('mirage-bankroll-ready', 'true')
    setToast(`Your $${formatCredits(nextBankroll)} table is ready`)
    playSound('coin')
  }

  const toggleAutoPlay = () => {
    if (autoPlay) {
      setAutoPlay(false)
      setAutoPauseReason('Paused by player')
      playSound('tap')
      return
    }
    if (gameOver) {
      openBankrollPicker()
      return
    }
    if (credits < wager) {
      const affordableBet = BET_OPTIONS.filter((coins) => coins * COIN_VALUE <= credits).at(-1) ?? 1
      setBet(affordableBet)
    }
    setAutoPauseReason('')
    setAutoPlay(true)
    playSound('deal')
  }

  useEffect(() => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    if (!autoPlay || gameOver || bankrollOpen || howToOpen || doubleOpen || replacing) return

    if (phase === 'dealt') {
      if (!strategyAdvice) return
      const recommendedHolds = strategyAdvice.recommended.holds
      const holdDelay = Math.max(70, Math.round(autoDelay * 0.5))
      const drawDelay = Math.max(120, Math.round(autoDelay * 0.35))
      autoTimerRef.current = window.setTimeout(() => {
        setHolds(recommendedHolds)
        autoTimerRef.current = window.setTimeout(() => draw(recommendedHolds), drawDelay)
      }, holdDelay)
    } else {
      autoTimerRef.current = window.setTimeout(deal, autoDelay)
    }

    return () => {
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    }
  }, [autoDelay, autoPlay, bankrollOpen, deal, doubleOpen, draw, gameOver, howToOpen, phase, replacing, strategyAdvice])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (autoPlay || bankrollOpen || howToOpen || doubleOpen || gameOver) return
      if (event.key >= '1' && event.key <= '5') toggleHold(Number(event.key) - 1)
      if (event.key.toLowerCase() === 'm' && phase !== 'dealt') setBet(5)
      if (event.code === 'Space') {
        event.preventDefault()
        handlePrimary()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [autoPlay, bankrollOpen, doubleOpen, gameOver, handlePrimary, howToOpen, phase, toggleHold])

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
        <button className="balance-block balance-button" onClick={openBankrollPicker} aria-label={`Balance $${formatCredits(credits)}. Choose a new starting balance.`}>
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
                    onClick={phase === 'dealt' ? () => toggleHold(index) : undefined}
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
            <div className="wager-panel">
              <div className="wager-heading">
                <span>
                  <small>TABLE WAGER</small>
                  <b>${formatCredits(wager)} <i>{bet === 5 ? 'MAX BET' : 'PER HAND'}</i></b>
                </span>
                <button className={`max-bet ${bet === 5 ? 'selected' : ''}`} disabled={phase === 'dealt'} onClick={() => { setBet(5); playSound('tap') }}>
                  <Sparkles size={13} /> MAX
                </button>
              </div>
              <div className="coin-options" role="group" aria-label="Bet amount">
                {BET_OPTIONS.map((coin) => (
                  <button
                    key={coin}
                    className={bet === coin ? 'selected' : ''}
                    onClick={() => { setBet(coin); playSound('tap') }}
                    disabled={phase === 'dealt'}
                    aria-label={`Bet $${formatCredits(coin * COIN_VALUE)}`}
                  ><i aria-hidden="true" /><b>${formatCredits(coin * COIN_VALUE)}</b></button>
                ))}
              </div>
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

            <button className="primary-action" onClick={handlePrimary} disabled={replacing}>
              <span>
                <small>{phase === 'dealt' ? `${cardsHeld} HELD · ${5 - cardsHeld} TO DRAW` : phase === 'settled' ? `NEXT HAND · $${formatCredits(wager)}` : `PLAY $${formatCredits(wager)}`}</small>
                <b>{phase === 'dealt' ? 'DRAW' : phase === 'settled' ? 'DEAL AGAIN' : 'DEAL'}</b>
              </span>
              <i className="action-arrow"><ChevronRight size={22} /></i>
            </button>
          </div>
        </section>

        <aside className="right-rail">
          <section className="panel autoplay-panel">
            <div className="panel-heading compact">
              <span><small>SIMULATION MODE</small><h2>Autoplay</h2></span>
              <Gauge size={18} />
            </div>
            <div className="autoplay-body">
              <button className={`autoplay-master ${autoPlay ? 'running' : ''}`} onClick={toggleAutoPlay}>
                <i>{autoPlay ? <Pause size={18} /> : <Play size={18} />}</i>
                <span><b>{autoPlay ? 'Pause simulation' : 'Start simulation'}</b><small>Uses the Table Guide’s best hold</small></span>
                <em>{autoPlay ? 'LIVE' : 'READY'}</em>
              </button>
              <div className="speed-setting">
                <span><small>SPEED</small><b>{AUTO_SPEEDS.find(({ key }) => key === autoSpeed)?.label}</b></span>
                <div role="group" aria-label="Autoplay speed">
                  {AUTO_SPEEDS.map((speed) => (
                    <button
                      key={speed.key}
                      className={autoSpeed === speed.key ? 'selected' : ''}
                      onClick={() => setAutoSpeed(speed.key)}
                      aria-label={`${speed.label} autoplay speed`}
                      aria-pressed={autoSpeed === speed.key}
                    >{speed.label[0]}</button>
                  ))}
                </div>
              </div>
              <button className={`top-four-toggle ${pauseOnTopFour ? 'active' : ''}`} onClick={() => setPauseOnTopFour((value) => !value)} aria-pressed={pauseOnTopFour}>
                <span><Sparkles size={15} /><b>Pause on top four</b></span>
                <i>{pauseOnTopFour ? 'ON' : 'OFF'}</i>
                <small>Full house, four of a kind, straight flush or royal flush</small>
              </button>
              <div className={`autoplay-status ${autoPlay ? 'live' : ''}`}>
                <i /> {autoPlay ? `Running · ${formatCredits(simulationHands)} hands played` : autoPauseReason || 'Waiting to start'}
              </div>
            </div>
          </section>

          <section className="panel stats-panel simulation-panel">
            <div className="panel-heading compact">
              <span><small>LIVE LEDGER</small><h2>Simulation</h2></span>
              <BarChart3 size={18} />
            </div>
            <div className="simulation-metrics">
              <span><b>{simulationHands}</b><small>Hands</small></span>
              <span><b>{simulationWinRate}%</b><small>Hit rate</small></span>
              <span><b>${formatCredits(totalPaid)}</b><small>Paid</small></span>
              <span className={sessionNet >= 0 ? 'positive' : 'negative'}><b>{formatSignedCredits(sessionNet)}</b><small>Net P/L</small></span>
            </div>
            <div className="balance-chart" aria-label="Balance history chart">
              {balanceHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceHistory} margin={{ top: 8, right: 4, bottom: 2, left: 4 }}>
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
              <span><small>LAST RESULT</small><b>{balanceHistory.at(-1)?.result ?? '—'}</b></span>
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

      {bankrollOpen && (
        <div className="modal-backdrop bankroll-backdrop" onMouseDown={closeBankrollPicker}>
          <section className="modal bankroll-modal" role="dialog" aria-modal="true" aria-labelledby="bankroll-title" onMouseDown={(event) => event.stopPropagation()}>
            {bankrollConfigured && <button className="modal-close" onClick={closeBankrollPicker} aria-label="Close"><X /></button>}
            <div className="bankroll-heading">
              <span className="bankroll-mark"><WalletCards size={24} /></span>
              <span><small className="modal-kicker">YOUR TABLE, YOUR STAKES</small><h2 id="bankroll-title">Choose your bankroll.</h2></span>
            </div>
            <p className="modal-lead">Pick how much free-play money sits on the table. It changes the pace of your session—not the odds.</p>
            <div className="bankroll-options" role="group" aria-label="Starting bankroll presets">
              {BANKROLL_OPTIONS.map((option) => (
                <button
                  key={option.amount}
                  className={Number(bankrollDraft) === option.amount ? 'selected' : ''}
                  onClick={() => { setBankrollDraft(String(option.amount)); playSound('tap') }}
                  aria-pressed={Number(bankrollDraft) === option.amount}
                >
                  <span><b>${formatCredits(option.amount)}</b><small>{option.label}</small></span>
                  <em>{option.hands}</em>
                </button>
              ))}
            </div>
            <label className="custom-bankroll">
              <span><b>Custom bankroll</b><small>${formatCredits(MIN_BANKROLL)}–${formatCredits(MAX_BANKROLL)}, rounded to the nearest $100</small></span>
              <i>$</i>
              <input
                type="number"
                min={MIN_BANKROLL}
                max={MAX_BANKROLL}
                step={COIN_VALUE}
                inputMode="numeric"
                value={bankrollDraft}
                onChange={(event) => setBankrollDraft(event.target.value)}
                aria-label="Custom starting bankroll"
              />
            </label>
            <div className="bankroll-reset-note"><Sparkles size={15} /> Choosing an amount starts a fresh table session. Your player level stays with you.</div>
            <button className="modal-primary bankroll-start" onClick={applyStartingBankroll}>
              <span><small>STARTING BALANCE</small><b>Play with ${formatCredits(normalizedBankrollDraft)}</b></span>
              <ChevronRight size={22} />
            </button>
          </section>
        </div>
      )}

      {gameOver && !bankrollOpen && !doubleOpen && (
        <div className="modal-backdrop game-over-backdrop">
          <section className="modal game-over-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
            <span className="game-over-mark">♠</span>
            <span className="modal-kicker">TABLE CLOSED</span>
            <h2 id="game-over-title">Game over.</h2>
            <p className="modal-lead">Your balance fell below the $100 minimum wager. Choose a new bankroll to begin another simulation.</p>
            <div className="game-over-stats">
              <span><small>FINAL BALANCE</small><b>${formatCredits(credits)}</b></span>
              <span><small>HANDS PLAYED</small><b>{simulationHands}</b></span>
              <span className={sessionNet >= 0 ? 'positive' : 'negative'}><small>NET P/L</small><b>{formatSignedCredits(sessionNet)}</b></span>
            </div>
            <button className="modal-primary game-over-action" onClick={openBankrollPicker}>
              <span>Choose a new bankroll</span><ChevronRight size={20} />
            </button>
          </section>
        </div>
      )}

      {howToOpen && (
        <div className="modal-backdrop" onMouseDown={() => setHowToOpen(false)}>
          <section className="modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHowToOpen(false)} aria-label="Close"><X /></button>
            <span className="modal-kicker">THE BASICS</span>
            <h2 id="rules-title">Make the best five-card hand.</h2>
            <p className="modal-lead">Deal five cards, hold the ones you like, then draw once to replace the rest. Your final five-card combination determines the payout.</p>
            <div className="rule-steps">
              <span><i>1</i><b>Set a bet</b><small>Choose $100, $200, $300 or $500. The $500 bet unlocks the full royal bonus.</small></span>
              <span><i>2</i><b>Hold cards</b><small>Tap any cards worth keeping. You can hold all five—or none.</small></span>
              <span><i>3</i><b>Draw once</b><small>Unheld cards are replaced and your final hand pays automatically.</small></span>
            </div>
            <div className="qualifying-pair">
              <span className="pair-example"><i>Q♠</i><i>Q♦</i></span>
              <span><b>“Jacks or Better” means a matching pair.</b><small>JJ, QQ, KK and AA pay. One Queen alone does not, and pairs of 10s or lower do not.</small></span>
            </div>
            <div className="double-explainer">
              <Zap size={22} />
              <span><b>Feeling lucky?</b><small>After a win, risk it on red or black to double the prize. You can try up to three times.</small></span>
            </div>
            <div className="double-explainer coach-explainer">
              <Lightbulb size={22} />
              <span><b>Learn while you play</b><small>Turn on Table Guide to see the strongest hold, payout probability and expected return for each hand.</small></span>
            </div>
            <div className="double-explainer simulator-explainer">
              <Gauge size={22} />
              <span><b>Run a simulation</b><small>Autoplay follows the Table Guide, tracks every hand and can pause automatically for the four biggest payout categories.</small></span>
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
