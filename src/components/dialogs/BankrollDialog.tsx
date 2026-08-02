import { ChevronRight, Sparkles, WalletCards, X } from 'lucide-react'
import { BANKROLL_OPTIONS, COIN_VALUE, MAX_BANKROLL, MIN_BANKROLL } from '../../app/config'
import { formatCredits } from '../../game'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/Dialog'

type BankrollDialogProps = {
  open: boolean
  configured: boolean
  draft: string
  normalizedDraft: number
  onDraftChange: (value: string) => void
  onClose: () => void
  onApply: () => void
}

export function BankrollDialog({
  open,
  configured,
  draft,
  normalizedDraft,
  onDraftChange,
  onClose,
  onApply,
}: BankrollDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent overlayClassName="bankroll-backdrop" panelClassName="bankroll-modal" dismissible={configured}>
        {configured && (
          <DialogClose asChild>
            <button type="button" className="modal-close" aria-label="Close"><X /></button>
          </DialogClose>
        )}
        <div className="bankroll-heading">
          <span className="bankroll-mark"><WalletCards size={24} /></span>
          <span>
            <small className="modal-kicker">YOUR TABLE, YOUR STAKES</small>
            <DialogTitle asChild><h2>Choose your bankroll.</h2></DialogTitle>
          </span>
        </div>
        <DialogDescription asChild>
          <p className="modal-lead">Pick how much free-play money sits on the table. It changes the pace of your session—not the odds.</p>
        </DialogDescription>
        <div className="bankroll-options" role="group" aria-label="Starting bankroll presets">
          {BANKROLL_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.amount}
              className={Number(draft) === option.amount ? 'selected' : ''}
              onClick={() => onDraftChange(String(option.amount))}
              aria-pressed={Number(draft) === option.amount}
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
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            aria-label="Custom starting bankroll"
          />
        </label>
        <div className="bankroll-reset-note"><Sparkles size={15} /> Choosing an amount starts a fresh table session. Your player level stays with you.</div>
        <button type="button" className="modal-primary bankroll-start" onClick={onApply}>
          <span><small>STARTING BALANCE</small><b>Play with ${formatCredits(normalizedDraft)}</b></span>
          <ChevronRight size={22} />
        </button>
      </DialogContent>
    </Dialog>
  )
}
