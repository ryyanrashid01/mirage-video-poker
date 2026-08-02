import { Zap } from 'lucide-react'
import { formatCredits, type Card } from '../../game'
import { PlayingCard } from '../cards/PlayingCard'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/Dialog'

type DoubleOrNothingDialogProps = {
  open: boolean
  card: Card | null
  reveal: boolean
  win: number
  onGuess: (color: 'red' | 'black') => void
  onBankWin: () => void
}

export function DoubleOrNothingDialog({ open, card, reveal, win, onGuess, onBankWin }: DoubleOrNothingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent overlayClassName="double-backdrop" panelClassName="double-modal" dismissible={false}>
        <span className="modal-kicker"><Zap size={14} /> DOUBLE OR NOTHING</span>
        <DialogTitle asChild><h2>Red or black?</h2></DialogTitle>
        <DialogDescription asChild>
          <p>Guess the hidden card and turn <b>${formatCredits(win)}</b> into <b>${formatCredits(win * 2)}.</b></p>
        </DialogDescription>
        {card && (
          <div className={`mystery-card ${reveal ? 'revealed' : ''}`}>
            <div className="mystery-inner">
              <div className="mystery-front"><PlayingCard card={card} index={0} /></div>
              <div className="mystery-back"><PlayingCard index={0} faceDown /></div>
            </div>
          </div>
        )}
        <div className="color-buttons">
          <button type="button" className="red-choice" onClick={() => onGuess('red')} disabled={reveal}><span>♥</span> RED</button>
          <button type="button" className="black-choice" onClick={() => onGuess('black')} disabled={reveal}><span>♠</span> BLACK</button>
        </div>
        <button type="button" className="walk-away" disabled={reveal} onClick={onBankWin}>Keep my win</button>
      </DialogContent>
    </Dialog>
  )
}
