export function GameFooter({ onOpenRules }: { onOpenRules: () => void }) {
  return (
    <footer>
      <span>Mirage is a free-play game · No real-money wagering</span>
      <span>Paytable updates with your bet · <button type="button" onClick={onOpenRules}>Game rules</button></span>
    </footer>
  )
}
