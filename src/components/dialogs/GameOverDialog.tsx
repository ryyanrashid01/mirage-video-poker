import { ChevronRight } from 'lucide-react'
import { formatCredits } from '../../game'
import { formatSignedCredits } from '../../lib/format'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/Dialog'

type GameOverDialogProps = {
  open: boolean
  credits: number
  hands: number
  sessionNet: number
  onChooseBankroll: () => void
}

export function GameOverDialog({ open, credits, hands, sessionNet, onChooseBankroll }: GameOverDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent overlayClassName="game-over-backdrop" panelClassName="game-over-modal" dismissible={false}>
        <span className="game-over-mark">♠</span>
        <span className="modal-kicker">TABLE CLOSED</span>
        <DialogTitle asChild><h2>Game over.</h2></DialogTitle>
        <DialogDescription asChild>
          <p className="modal-lead">Your balance fell below the $100 minimum wager. Choose a new bankroll to begin another simulation.</p>
        </DialogDescription>
        <div className="game-over-stats">
          <span><small>FINAL BALANCE</small><b>${formatCredits(credits)}</b></span>
          <span><small>HANDS PLAYED</small><b>{hands}</b></span>
          <span className={sessionNet >= 0 ? 'positive' : 'negative'}><small>NET P/L</small><b>{formatSignedCredits(sessionNet)}</b></span>
        </div>
        <button type="button" className="modal-primary game-over-action" onClick={onChooseBankroll}>
          <span>Choose a new bankroll</span><ChevronRight size={20} />
        </button>
      </DialogContent>
    </Dialog>
  )
}
