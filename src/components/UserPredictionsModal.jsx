import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import TeamName from './TeamName'
import { GROUP_LABELS } from '../lib/scoring'
import { ROUNDS } from '../lib/rounds'
import { supabase } from '../lib/supabase'

function winnerLabel(match, side) {
  if (side === 'home') return match.team_home
  if (side === 'away') return match.team_away
  return 'Draw'
}

function MatchPickRow({ match, prediction, hidden }) {
  const score =
    prediction?.predicted_home_score != null && prediction?.predicted_away_score != null
      ? `${prediction.predicted_home_score}–${prediction.predicted_away_score}`
      : null

  return (
    <div className="border-b border-border px-4 py-3 last:border-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TeamName name={match.team_home} size="sm" />
          <span className="text-xs font-bold text-gold">vs</span>
          <TeamName name={match.team_away} size="sm" />
        </div>
        {hidden ? (
          <span className="flex items-center gap-1 text-xs text-muted">
            <EyeOff size={12} />
            Hidden until kickoff
          </span>
        ) : prediction?.predicted_winner ? (
          <div className="text-right text-sm">
            <span className="font-semibold text-pitch">
              {winnerLabel(match, prediction.predicted_winner)}
            </span>
            {score && <span className="ml-2 text-muted">({score})</span>}
          </div>
        ) : (
          <span className="text-xs text-muted">No pick</span>
        )}
      </div>
    </div>
  )
}

export default function UserPredictionsModal({
  groupId,
  userId,
  displayName,
  viewerUserId,
  onClose,
}) {
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState([])
  const [matchPredictions, setMatchPredictions] = useState({})
  const [groupPredictions, setGroupPredictions] = useState({})
  const [groupResults, setGroupResults] = useState({})

  const isSelf = userId === viewerUserId

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: matchData }, { data: predData }, { data: grData }] = await Promise.all([
        supabase.from('matches').select('*').order('match_number'),
        supabase.from('predictions').select('*').eq('group_id', groupId).eq('user_id', userId),
        supabase.from('group_results').select('*'),
      ])

      setMatches(matchData ?? [])

      const mp = {}
      const gp = {}
      for (const p of predData ?? []) {
        if (p.match_id) mp[p.match_id] = p
        else if (p.group_winner_label) gp[p.group_winner_label] = p.predicted_group_winner_team
      }
      setMatchPredictions(mp)
      setGroupPredictions(gp)

      const gr = {}
      for (const r of grData ?? []) gr[r.group_label] = r.winner_team
      setGroupResults(gr)

      setLoading(false)
    }

    load()
  }, [groupId, userId])

  const matchesByRound = useMemo(() => {
    const map = {}
    for (const round of ROUNDS) map[round.key] = []
    for (const m of matches) {
      const key = m.round_key ?? 'group_md1'
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return map
  }, [matches])

  function isMatchRevealed(match) {
    if (isSelf) return true
    return match.status === 'started' || match.status === 'finished'
  }

  function isGroupRevealed(label) {
    if (isSelf) return true
    return !!groupResults[label]
  }

  const revealedMatchCount = matches.filter(
    (m) => isMatchRevealed(m) && matchPredictions[m.id]?.predicted_winner
  ).length
  const hiddenMatchCount = matches.filter((m) => !isMatchRevealed(m)).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-border bg-surface shadow-2xl sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="picks-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold">Predictions</p>
            <h2 id="picks-modal-title" className="mt-1 font-display text-xl font-bold uppercase text-cream sm:text-2xl">
              {displayName}
            </h2>
            {!loading && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Eye size={12} />
                {isSelf
                  ? 'Your picks — hidden ones stay private to others until kickoff'
                  : `${revealedMatchCount} revealed · ${hiddenMatchCount} still hidden`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 p-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 size={28} className="animate-spin text-pitch" />
              <p className="mt-3 text-sm text-muted">Loading picks…</p>
            </div>
          ) : (
            <>
              {ROUNDS.filter((r) => r.type === 'matches').map((round) => {
                const roundMatches = matchesByRound[round.key] ?? []
                if (!roundMatches.length) return null

                return (
                  <section key={round.key} className="mb-8">
                    <h3 className="font-display text-sm font-bold uppercase tracking-widest text-gold">
                      {round.label}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">{round.subtitle}</p>
                    <div className="mt-3 border border-border bg-elevated">
                      {roundMatches.map((match) => (
                        <MatchPickRow
                          key={match.id}
                          match={match}
                          prediction={matchPredictions[match.id]}
                          hidden={!isMatchRevealed(match)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}

              <section>
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-gold">
                  Group Winners
                </h3>
                <p className="mt-0.5 text-xs text-muted">Round 4 picks</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {GROUP_LABELS.map((label) => {
                    const hidden = !isGroupRevealed(label)
                    const pick = groupPredictions[label]

                    return (
                      <div key={label} className="border border-border bg-elevated px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted">
                          Group {label}
                        </p>
                        {hidden ? (
                          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                            <EyeOff size={12} />
                            Hidden until result
                          </p>
                        ) : pick ? (
                          <div className="mt-1">
                            <TeamName name={pick} size="sm" />
                          </div>
                        ) : (
                          <p className="mt-1 text-sm text-muted">No pick</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
