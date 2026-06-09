import { CheckCircle2, XCircle } from 'lucide-react'
import {
  formatMatchScore,
  formatPredictionScore,
  getMatchPoints,
  getMatchWinnerLabel,
  winnerSideLabel,
} from '../lib/matchHelpers'

export default function MatchResultSummary({ match, prediction }) {
  const actualScore = formatMatchScore(match)
  const predictedScore = formatPredictionScore(prediction)
  const actualWinner = getMatchWinnerLabel(match)
  const predictedWinner = prediction?.predicted_winner
    ? winnerSideLabel(match, prediction.predicted_winner)
    : null
  const points = getMatchPoints(prediction, match)
  const correct = points > 0

  return (
    <div
      className={`mt-4 border px-3 py-3 ${
        correct ? 'border-pitch/40 bg-pitch/10' : 'border-border bg-stadium'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Final result</p>
        <span
          className={`font-display text-lg font-bold tabular-nums ${
            correct ? 'text-pitch-bright' : 'text-cream'
          }`}
        >
          {actualScore ?? '—'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Your pick</p>
          <p className="mt-0.5 font-semibold text-cream">
            {predictedWinner ?? '—'}
            {predictedScore && <span className="ml-1 text-muted">({predictedScore})</span>}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Actual winner</p>
          <p className="mt-0.5 font-semibold text-cream">{actualWinner ?? '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {correct ? (
          <>
            <CheckCircle2 size={16} className="text-pitch" />
            <span className="text-sm font-semibold text-pitch">
              +{points} pts{points > 2 ? ' (incl. exact score)' : ''}
            </span>
          </>
        ) : (
          <>
            <XCircle size={16} className="text-muted" />
            <span className="text-sm text-muted">0 pts this match</span>
          </>
        )}
      </div>
    </div>
  )
}
