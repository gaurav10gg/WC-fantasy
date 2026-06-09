import { CalendarClock } from 'lucide-react'
import { useKickoffCountdown } from '../hooks/useKickoffCountdown'
import { formatCountdown } from '../lib/matchHelpers'
import { PREDICTIONS_OPEN_HOURS_BEFORE_KICKOFF } from '../lib/rounds'

function formatKickoff(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function NextRoundBanner({ nextRound, firstKickoff, opensAt }) {
  const opensAtIso = opensAt instanceof Date ? opensAt.toISOString() : opensAt
  const parts = useKickoffCountdown(opensAtIso, !!opensAtIso)
  const picksUnlocked = parts.expired

  return (
    <div className="fixture-card mt-4 border border-gold/30 bg-gold/5 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Next round</p>
          <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-cream">
            {nextRound.label}
          </h3>
          <p className="mt-0.5 text-sm text-muted">{nextRound.subtitle}</p>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            <span className="text-cream">{nextRound.label} fixtures</span> open for predictions{' '}
            <span className="font-semibold text-cream">
              {PREDICTIONS_OPEN_HOURS_BEFORE_KICKOFF} hours before
            </span>{' '}
            the first match kicks off. Finish your current-round picks first — the next round unlocks
            automatically on that schedule.
          </p>

          <div className="mt-4 border border-border bg-surface/80 px-4 py-3">
            {picksUnlocked ? (
              <p className="text-sm font-semibold text-pitch">
                Picks for {nextRound.label} are unlocked — fixtures will appear when the round goes
                live.
              </p>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Picks unlock in
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-wide text-gold sm:text-3xl">
                  {formatCountdown(parts)}
                </p>
              </>
            )}
            <p className="mt-2 text-xs text-muted">
              First kickoff: <span className="text-cream">{formatKickoff(firstKickoff)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
