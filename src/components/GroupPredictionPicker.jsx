import { Lock, Trophy } from 'lucide-react'
import TeamName from './TeamName'
import { GROUP_LABELS, GROUP_TEAMS } from '../lib/scoring'

export default function GroupPredictionPicker({ predictions, locked, onChange }) {
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

          return (
            <div
              key={label}
              className={`fixture-card border border-border p-4 ${isGroupLocked ? 'opacity-55' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm font-bold uppercase tracking-widest text-gold">
                  Group {label}
                </span>
                {isGroupLocked && <Lock size={14} className="text-muted" />}
              </div>

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
