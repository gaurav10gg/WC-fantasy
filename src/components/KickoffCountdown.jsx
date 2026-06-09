import { Clock } from 'lucide-react'
import { useKickoffCountdown } from '../hooks/useKickoffCountdown'
import { formatCountdown } from '../lib/matchHelpers'

export default function KickoffCountdown({ matchDate, urgent = false }) {
  const parts = useKickoffCountdown(matchDate, !!matchDate)

  if (!matchDate || parts.expired) return null

  const soon = parts.totalMs < 1000 * 60 * 60

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold tracking-wide ${
        soon || urgent ? 'text-gold' : 'text-muted'
      }`}
    >
      <Clock size={12} className={soon ? 'animate-pulse' : ''} />
      Kickoff in {formatCountdown(parts)}
    </span>
  )
}
