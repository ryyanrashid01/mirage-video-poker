import { Sparkles } from 'lucide-react'

export function GameToast({ message }: { message: string }) {
  if (!message) return null
  return <div className="toast" role="status"><Sparkles size={16} /> {message}</div>
}
