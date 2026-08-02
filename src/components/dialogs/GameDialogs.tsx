import type { VideoPokerController } from '../../hooks/useVideoPoker'
import { BankrollDialog } from './BankrollDialog'
import { DoubleOrNothingDialog } from './DoubleOrNothingDialog'
import { GameOverDialog } from './GameOverDialog'
import { HowToPlayDialog } from './HowToPlayDialog'

export function GameDialogs({ game }: { game: VideoPokerController }) {
  return (
    <>
      <BankrollDialog
        open={game.bankrollOpen}
        configured={game.bankrollConfigured}
        draft={game.bankrollDraft}
        normalizedDraft={game.normalizedBankrollDraft}
        onDraftChange={game.setBankrollDraft}
        onClose={game.closeBankrollPicker}
        onApply={game.applyStartingBankroll}
      />
      <GameOverDialog
        open={game.gameOver && !game.bankrollOpen && !game.doubleOpen}
        credits={game.credits}
        hands={game.simulationHands}
        sessionNet={game.sessionNet}
        onChooseBankroll={game.openBankrollPicker}
      />
      <HowToPlayDialog open={game.howToOpen} onClose={game.closeRules} />
      <DoubleOrNothingDialog
        open={game.doubleOpen}
        card={game.doubleCard}
        reveal={game.doubleReveal}
        win={game.recentWin}
        onGuess={game.guessColor}
        onBankWin={game.bankDoubleWin}
      />
    </>
  )
}
