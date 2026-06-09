import { CheckCircle2, Lock, Trophy, XCircle } from 'lucide-react'
import TeamName from './TeamName'
import { GROUP_LABELS, GROUP_TEAMS, GROUP_WINNER_POINTS } from '../lib/scoring'

export default function GroupPredictionPicker({ predictions, locked, groupResults = {}, onChange }) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-gold" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-widest">Group Winners</h2>
      </div>
      <p className="mt-1 text-sm text-muted">Pick who finishes 1st in each group. Worth 5 points each.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {GROUP_LABELS.map((label) => {
          const teams = GROUP_TEAMS[label]
          const selected = predictions[label] ?? null
          const isGroupLocked = locked[label]
          const actualWinner = groupResults[label]
          const correct = actualWinner && selected === actualWinner

          return (
            <div
              key={label}
              className={`fixture-card border border-border p-4 ${isGroupLocked && !actualWinner ? 'opacity-55' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm font-bold uppercase tracking-widest text-gold">
                  Group {label}
                </span>
                {isGroupLocked && !actualWinner && <Lock size={14} className="text-muted" />}
              </div>

              {actualWinner && (
                <div
                  className={`mb-3 border px-3 py-2 text-sm ${
                    correct ? 'border-pitch/40 bg-pitch/10' : 'border-border bg-stadium'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Result</p>
                  <p className="mt-1 font-semibold text-cream">
                    1st: <TeamName name={actualWinner} size="sm" />
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Your pick: {selected ? <TeamName name={selected} size="sm" /> : '—'}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {correct ? (
                      <>
                        <CheckCircle2 size={14} className="text-pitch" />
                        <span className="text-xs font-semibold text-pitch">+{GROUP_WINNER_POINTS} pts</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-muted" />
                        <span className="text-xs text-muted">0 pts</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {teams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    disabled={isGroupLocked}
                    onClick={() => onChange(label, team)}
                    className={`flex min-h-11 items-center border px-3 py-2 text-left transition-all ${
                      selected === team
                        ? 'border-pitch bg-pitch text-stadium'
                        : 'border-border bg-stadium text-cream hover:border-border-light'
                    } ${isGroupLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <TeamName
                      name={team}
                      size="sm"
                      className={selected === team ? 'text-stadium' : 'text-cream'}
                    />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
