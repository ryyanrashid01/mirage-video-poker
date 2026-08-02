import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  analyzeHandStrategy,
  calculatePayout,
  createDeck,
  evaluateHand,
  formatCredits,
  type Card,
  type HandResult,
} from '../game'
import {
  AUTO_SPEEDS,
  BET_OPTIONS,
  COIN_VALUE,
  STARTING_CREDITS,
  TOP_FOUR_PAYOUTS,
} from '../app/config'
import type { AutoSpeed, BalancePoint, Phase, PlayerStats } from '../app/types'
import { displayHandLabel, normalizeBankroll } from '../lib/format'
import { loadBalanceHistory, loadNumber } from '../lib/storage'
import { useGameAudio } from './useGameAudio'

const EMPTY_HOLDS = [false, false, false, false, false]

export function useVideoPoker() {
  const [startingBankroll, setStartingBankroll] = useState(() => loadNumber('mirage-bankroll-choice', STARTING_CREDITS))
  const [credits, setCredits] = useState(() => loadNumber('mirage-credits-v3', STARTING_CREDITS))
  const [bankrollConfigured, setBankrollConfigured] = useState(() => window.localStorage.getItem('mirage-bankroll-ready') === 'true')
  const [bankrollOpen, setBankrollOpen] = useState(() => window.localStorage.getItem('mirage-bankroll-ready') !== 'true')
  const [bankrollDraft, setBankrollDraft] = useState(() => String(loadNumber('mirage-bankroll-choice', STARTING_CREDITS)))
  const [bet, setBet] = useState(1)
  const [phase, setPhase] = useState<Phase>('idle')
  const [hand, setHand] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [holds, setHolds] = useState<boolean[]>(EMPTY_HOLDS)
  const [result, setResult] = useState<HandResult | null>(null)
  const [recentWin, setRecentWin] = useState(0)
  const [lastWager, setLastWager] = useState(0)
  const [streak, setStreak] = useState(0)
  const [xp, setXp] = useState(() => loadNumber('mirage-xp', 85))
  const [stats, setStats] = useState<PlayerStats>(() => ({
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
  const [autoSpeed, setAutoSpeedState] = useState<AutoSpeed>(() => {
    const saved = window.localStorage.getItem('mirage-auto-speed') as AutoSpeed | null
    return saved && AUTO_SPEEDS.some(({ key }) => key === saved) ? saved : 'quick'
  })
  const [pauseOnTopFour, setPauseOnTopFourState] = useState(() => window.localStorage.getItem('mirage-pause-top-four') !== 'false')
  const [autoPauseReason, setAutoPauseReason] = useState('')
  const [howToOpen, setHowToOpen] = useState(false)
  const [doubleOpen, setDoubleOpen] = useState(false)
  const [doubleCard, setDoubleCard] = useState<Card | null>(null)
  const [doubleReveal, setDoubleReveal] = useState(false)
  const [doubleCount, setDoubleCount] = useState(0)
  const [toast, setToast] = useState('Welcome to the Mirage')
  const [showConfetti, setShowConfetti] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const autoTimerRef = useRef<number | null>(null)
  const settleTimerRef = useRef<number | null>(null)
  const doubleTimerRef = useRef<number | null>(null)
  const celebrationTimerRef = useRef<number | null>(null)
  const { playSound, buzz } = useGameAudio(muted)

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
  }, [
    autoSpeed,
    balanceHistory,
    coachMode,
    credits,
    muted,
    pauseOnTopFour,
    sessionStartBalance,
    simulationHands,
    simulationWins,
    startingBankroll,
    stats,
    totalPaid,
    totalWagered,
    xp,
  ])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    if (doubleTimerRef.current) window.clearTimeout(doubleTimerRef.current)
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
  }, [])

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
    setHolds(EMPTY_HOLDS)
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
    settleTimerRef.current = window.setTimeout(() => {
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
        if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = window.setTimeout(() => setShowConfetti(false), 2200)
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

  const selectBet = useCallback((coins: number) => {
    if (phase === 'dealt') return
    setBet(coins)
    playSound('tap')
  }, [phase, playSound])

  const applyRecommendedHold = useCallback(() => {
    if (!strategyAdvice) return
    setHolds(strategyAdvice.recommended.holds)
    playSound('hold')
    buzz()
  }, [buzz, playSound, strategyAdvice])

  const startDouble = useCallback(() => {
    if (!recentWin || doubleCount >= 3) return
    setAutoPlay(false)
    setAutoPauseReason('Paused for double or nothing')
    const doubleDeck = createDeck()
    setCredits((value) => value - recentWin)
    setDoubleCard(doubleDeck[0])
    setDoubleReveal(false)
    setDoubleOpen(true)
    playSound('coin')
  }, [doubleCount, playSound, recentWin])

  const guessColor = useCallback((guess: 'red' | 'black') => {
    if (!doubleCard || doubleReveal) return
    setDoubleReveal(true)
    const isRed = doubleCard.suit === 'hearts' || doubleCard.suit === 'diamonds'
    const won = (guess === 'red') === isRed
    doubleTimerRef.current = window.setTimeout(() => {
      if (won) {
        const doubled = recentWin * 2
        setCredits((value) => value + doubled)
        setRecentWin(doubled)
        setStats((current) => ({ ...current, best: Math.max(current.best, doubled) }))
        setDoubleCount((value) => value + 1)
        setToast(`Double up! +$${formatCredits(doubled)}`)
        setShowConfetti(true)
        if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
        celebrationTimerRef.current = window.setTimeout(() => setShowConfetti(false), 1600)
        playSound('bigWin')
      } else {
        setRecentWin(0)
        setToast('The house got that one')
        playSound('lose')
      }
      setDoubleOpen(false)
      setDoubleReveal(false)
    }, 850)
  }, [doubleCard, doubleReveal, playSound, recentWin])

  const bankDoubleWin = useCallback(() => {
    setCredits((value) => value + recentWin)
    setDoubleOpen(false)
    setToast('Win safely banked')
  }, [recentWin])

  const resetSimulation = useCallback((balance: number, resultLabel: string) => {
    setSessionStartBalance(balance)
    setTotalWagered(0)
    setTotalPaid(0)
    setSimulationHands(0)
    setSimulationWins(0)
    setBalanceHistory([{ hand: 0, balance, payout: 0, result: resultLabel }])
  }, [])

  const refill = useCallback(() => {
    setCredits(startingBankroll)
    resetSimulation(startingBankroll, 'Wallet refill')
    setToast(`Wallet restored to $${formatCredits(startingBankroll)}`)
    playSound('coin')
  }, [playSound, resetSimulation, startingBankroll])

  const openBankrollPicker = useCallback(() => {
    setAutoPlay(false)
    setAutoPauseReason('')
    setBankrollDraft(String(startingBankroll))
    setBankrollOpen(true)
    playSound('tap')
  }, [playSound, startingBankroll])

  const closeBankrollPicker = useCallback(() => {
    if (!bankrollConfigured) return
    setBankrollDraft(String(startingBankroll))
    setBankrollOpen(false)
  }, [bankrollConfigured, startingBankroll])

  const applyStartingBankroll = useCallback(() => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    if (doubleTimerRef.current) window.clearTimeout(doubleTimerRef.current)
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
    setHolds(EMPTY_HOLDS)
    setResult(null)
    setRecentWin(0)
    setLastWager(0)
    setStreak(0)
    setStats({ hands: 0, wins: 0, best: 0 })
    resetSimulation(nextBankroll, 'Session start')
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
  }, [bankrollDraft, playSound, resetSimulation])

  const toggleAutoPlay = useCallback(() => {
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
  }, [autoPlay, credits, gameOver, openBankrollPicker, playSound, wager])

  const toggleGuide = useCallback(() => {
    setCoachMode((value) => !value)
    setToast(coachMode ? 'Table Guide turned off' : 'Table Guide is ready to help')
    playSound('tap')
  }, [coachMode, playSound])

  const toggleMuted = useCallback(() => setMuted((value) => !value), [])

  const openRules = useCallback(() => setHowToOpen(true), [])
  const closeRules = useCallback(() => setHowToOpen(false), [])

  const setSpeed = useCallback((speed: AutoSpeed) => {
    setAutoSpeedState(speed)
    playSound('tap')
  }, [playSound])

  const setPauseOnTopFour = useCallback((enabled: boolean) => {
    setPauseOnTopFourState(enabled)
    playSound('tap')
  }, [playSound])

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
      if (event.key.toLowerCase() === 'm' && phase !== 'dealt') selectBet(5)
      if (event.code === 'Space') {
        event.preventDefault()
        handlePrimary()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [autoPlay, bankrollOpen, doubleOpen, gameOver, handlePrimary, howToOpen, phase, selectBet, toggleHold])

  return {
    startingBankroll,
    credits,
    bankrollConfigured,
    bankrollOpen,
    bankrollDraft,
    normalizedBankrollDraft,
    bet,
    wager,
    phase,
    hand,
    holds,
    cardsHeld,
    result,
    currentPreview,
    recentWin,
    netResult,
    streak,
    xp,
    level,
    levelProgress,
    rank,
    stats,
    simulationHands,
    simulationWinRate,
    sessionStartBalance,
    totalWagered,
    totalPaid,
    balanceHistory,
    sessionNet,
    muted,
    coachMode,
    strategyAdvice,
    selectedStrategy,
    autoPlay,
    autoSpeed,
    pauseOnTopFour,
    autoPauseReason,
    howToOpen,
    doubleOpen,
    doubleCard,
    doubleReveal,
    doubleCount,
    toast,
    showConfetti,
    replacing,
    gameOver,
    selectBet,
    toggleHold,
    applyRecommendedHold,
    handlePrimary,
    startDouble,
    guessColor,
    bankDoubleWin,
    refill,
    openBankrollPicker,
    closeBankrollPicker,
    applyStartingBankroll,
    setBankrollDraft,
    toggleAutoPlay,
    toggleGuide,
    toggleMuted,
    openRules,
    closeRules,
    setSpeed,
    setPauseOnTopFour,
  }
}

export type VideoPokerController = ReturnType<typeof useVideoPoker>
