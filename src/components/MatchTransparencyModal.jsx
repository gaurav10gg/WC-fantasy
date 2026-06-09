import { useEffect, useState } from 'react'
import { Loader2, Users, X } from 'lucide-react'
import TeamName from './TeamName'
import {
  formatMatchScore,
  formatPredictionScore,
  getMatchPoints,
  getMatchWinnerLabel,
  winnerSideLabel,
} from '../lib/matchHelpers'
import { supabase } from '../lib/supabase'

export default function MatchTransparencyModal({ match, groupId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)

      const [{ data: preds }, { data: members }] = await Promise.all([
        supabase.from('predictions').select('*').eq('group_id', groupId).eq('match_id', match.id),
        supabase.from('group_members').select('user_id').eq('group_id', groupId),
      ])

      const userIds = [...new Set((members ?? []).map((m) => m.user_id))]
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, display_name, team_name').in('id', userIds)
        : { data: [] }

      const nameMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.team_name || p.display_name || 'Unknown'])
      )
      const predMap = Object.fromEntries((preds ?? []).map((p) => [p.user_id, p]))

      const table = userIds
        .map((uid) => {
          const pred = predMap[uid]
          const points = getMatchPoints(pred, match)
          return {
            user_id: uid,
            name: nameMap[uid] ?? 'Unknown',
            pick: pred?.predicted_winner ? winnerSideLabel(match, pred.predicted_winner) : null,
            score: formatPredictionScore(pred),
            points,
          }
        })
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

      setRows(table)
      setLoading(false)
    }

    load()
  }, [match.id, groupId])

  const actualScore = formatMatchScore(match)
  const actualWinner = getMatchWinnerLabel(match)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col border border-border bg-surface shadow-2xl sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="transparency-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gold">
              <Users size={12} />
              All picks
            </p>
            <h2 id="transparency-title" className="mt-2 font-display text-lg font-bold uppercase text-cream">
              <TeamName name={match.team_home} size="sm" />
              <span className="mx-2 text-gold">vs</span>
              <TeamName name={match.team_away} size="sm" />
            </h2>
            <p className="mt-2 text-sm text-muted">
              Result: <span className="font-semibold text-cream">{actualScore}</span>
              {actualWinner && (
                <span className="ml-2">
                  · Winner: <span className="text-pitch">{actualWinner}</span>
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary shrink-0 p-2" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 size={28} className="animate-spin text-pitch" />
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Pick</th>
                  <th className="px-4 py-3 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold uppercase text-cream">{row.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.pick ? (
                        <>
                          <span className="text-cream">{row.pick}</span>
                          {row.score && <span className="ml-1">({row.score})</span>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-display text-lg font-bold tabular-nums ${
                        row.points > 0 ? 'text-pitch-bright' : 'text-muted'
                      }`}
                    >
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
