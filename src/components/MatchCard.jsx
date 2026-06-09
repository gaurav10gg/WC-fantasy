import { Lock, Minus } from 'lucide-react'
import Flag from './Flag'
import TeamName from './TeamName'

export default function MatchCard({ match, prediction, locked, onChange }) {
  const selected = prediction?.predicted_winner ?? null

  function pick(winner) {
    if (locked) return
    onChange({
      predicted_winner: winner,
      predicted_home_score: prediction?.predicted_home_score ?? null,
      predicted_away_score: prediction?.predicted_away_score ?? null,
    })
  }

  function setScore(side, value) {
    if (locked) return
    const num = value === '' ? null : parseInt(value, 10)
    onChange({
      predicted_winner: selected,
      predicted_home_score: side === 'home' ? num : (prediction?.predicted_home_score ?? null),
      predicted_away_score: side === 'away' ? num : (prediction?.predicted_away_score ?? null),
    })
  }

  const options = [
    { key: 'home', label: match.team_home },
    { key: 'draw', label: 'Draw' },
    { key: 'away', label: match.team_away },
  ]

  return (
    <div className={`fixture-card border border-border p-4 ${locked ? 'opacity-55' : ''}`}>
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-muted">
        <span className="text-gold/80">
          {match.group_label ? `Group ${match.group_label}` : 'Knockout'}
        </span>
        {locked && (
          <span className="flex items-center gap-1 text-muted">
            <Lock size={12} />
            Locked
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-col items-center gap-3 border-b border-border pb-4 sm:flex-row sm:justify-between">
        <TeamName name={match.team_home} size="md" />
        <span className="font-display text-xl font-bold tracking-widest text-gold">VS</span>
        <TeamName name={match.team_away} size="md" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={locked}
            onClick={() => pick(opt.key)}
            className={`flex min-h-12 items-center justify-center gap-2 border px-3 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
              selected === opt.key
                ? 'border-pitch bg-pitch text-stadium'
                : 'border-border bg-stadium text-cream hover:border-border-light'
            } ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.key === 'draw' ? (
              <Minus size={16} strokeWidth={3} />
            ) : (
              <Flag team={opt.label} size="sm" />
            )}
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="uppercase tracking-wider">Exact score (+1)</span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          disabled={locked}
          value={prediction?.predicted_home_score ?? ''}
          onChange={(e) => setScore('home', e.target.value)}
          className="h-10 w-14 border border-border bg-stadium text-center text-base text-cream"
          placeholder="—"
        />
        <span className="font-bold text-gold">:</span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          disabled={locked}
          value={prediction?.predicted_away_score ?? ''}
          onChange={(e) => setScore('away', e.target.value)}
          className="h-10 w-14 border border-border bg-stadium text-center text-base text-cream"
          placeholder="—"
        />
      </div>
    </div>
  )
}
