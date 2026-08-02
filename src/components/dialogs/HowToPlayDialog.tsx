import { Gauge, Lightbulb, X, Zap } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/Dialog'

export function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent panelClassName="rules-modal">
        <DialogClose asChild><button type="button" className="modal-close" aria-label="Close"><X /></button></DialogClose>
        <span className="modal-kicker">THE BASICS</span>
        <DialogTitle asChild><h2>Make the best five-card hand.</h2></DialogTitle>
        <DialogDescription asChild>
          <p className="modal-lead">Deal five cards, hold the ones you like, then draw once to replace the rest. Your final five-card combination determines the payout.</p>
        </DialogDescription>
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
        <button type="button" className="modal-primary" onClick={onClose}>Got it — let's play</button>
      </DialogContent>
    </Dialog>
  )
}
