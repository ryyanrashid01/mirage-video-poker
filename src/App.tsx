import { GameDialogs } from './components/dialogs/GameDialogs'
import { PaytablePanel } from './components/game/PaytablePanel'
import { PokerTable } from './components/game/PokerTable'
import { Confetti } from './components/feedback/Confetti'
import { GameToast } from './components/feedback/GameToast'
import { BankStrip } from './components/layout/BankStrip'
import { GameFooter } from './components/layout/GameFooter'
import { GameHeader } from './components/layout/GameHeader'
import { RightRail } from './components/simulator/RightRail'
import { useVideoPoker } from './hooks/useVideoPoker'

function App() {
  const game = useVideoPoker()

  return (
    <main className="game-shell">
      <div className="ambient-layer" />
      <div className="grain" />
      {game.showConfetti && <Confetti />}

      <GameHeader
        level={game.level}
        levelProgress={game.levelProgress}
        rank={game.rank}
        coachMode={game.coachMode}
        muted={game.muted}
        onToggleGuide={game.toggleGuide}
        onToggleMuted={game.toggleMuted}
        onOpenRules={game.openRules}
      />

      <BankStrip
        credits={game.credits}
        streak={game.streak}
        bestWin={game.stats.best}
        onOpenBankroll={game.openBankrollPicker}
      />

      <section className="game-layout" id="game">
        <PaytablePanel bet={game.bet} result={game.result} />

        <PokerTable
          phase={game.phase}
          hand={game.hand}
          holds={game.holds}
          cardsHeld={game.cardsHeld}
          result={game.result}
          currentPreview={game.currentPreview}
          recentWin={game.recentWin}
          netResult={game.netResult}
          coachMode={game.coachMode}
          strategyAdvice={game.strategyAdvice}
          selectedStrategy={game.selectedStrategy}
          replacing={game.replacing}
          bet={game.bet}
          wager={game.wager}
          credits={game.credits}
          doubleCount={game.doubleCount}
          onToggleHold={game.toggleHold}
          onApplyGuide={game.applyRecommendedHold}
          onSelectBet={game.selectBet}
          onPrimary={game.handlePrimary}
          onDouble={game.startDouble}
          onRefill={game.refill}
        />

        <RightRail
          running={game.autoPlay}
          speed={game.autoSpeed}
          pauseOnTopFour={game.pauseOnTopFour}
          pauseReason={game.autoPauseReason}
          hands={game.simulationHands}
          winRate={game.simulationWinRate}
          totalPaid={game.totalPaid}
          totalWagered={game.totalWagered}
          sessionNet={game.sessionNet}
          sessionStartBalance={game.sessionStartBalance}
          history={game.balanceHistory}
          levelProgress={game.levelProgress}
          onToggleAutoplay={game.toggleAutoPlay}
          onSpeedChange={game.setSpeed}
          onPauseOnTopFourChange={game.setPauseOnTopFour}
          onOpenRules={game.openRules}
        />
      </section>

      <GameFooter onOpenRules={game.openRules} />
      <GameToast message={game.toast} />
      <GameDialogs game={game} />
    </main>
  )
}

export default App
