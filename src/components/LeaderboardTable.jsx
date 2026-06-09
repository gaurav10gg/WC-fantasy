export default function LeaderboardTable({ rows, loading, showRank = false }) {
  if (loading) {
    return <p className="py-12 text-center text-muted uppercase tracking-widest">Loading scoreboard…</p>
  }

  if (!rows.length) {
    return <p className="py-12 text-center text-sm text-muted">No players yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted">
            <th className="w-14 px-3 py-3 sm:px-4">#</th>
            <th className="px-3 py-3 sm:px-4">Team</th>
            <th className="px-3 py-3 text-right sm:px-4">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const rank = showRank && row.rank != null ? row.rank : i + 1
            const isLeader = rank === 1

            return (
              <tr key={row.user_id} className="border-b border-border">
                <td className="relative px-3 py-4 sm:px-4 sm:py-5">
                  <span
                    className={`absolute left-1 top-1/2 -translate-y-1/2 font-display text-4xl font-bold leading-none sm:left-2 sm:text-5xl ${
                      isLeader ? 'text-gold/15' : 'text-cream/5'
                    }`}
                    aria-hidden
                  >
                    {rank}
                  </span>
                  <span className={`relative text-sm font-bold ${isLeader ? 'text-gold' : 'text-muted'}`}>
                    {rank}
                  </span>
                </td>
                <td className="relative px-3 py-4 sm:px-4 sm:py-5">
                  <div
                    className={`font-display text-base font-bold uppercase tracking-wide sm:text-lg ${
                      isLeader ? 'text-gold-bright' : 'text-cream'
                    }`}
                  >
                    {row.display_name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {row.correct_match_predictions} matches · {row.correct_group_winner_predictions} groups
                  </div>
                </td>
                <td className="px-3 py-4 text-right sm:px-4 sm:py-5">
                  <span
                    className={`font-display text-2xl font-bold tabular-nums sm:text-3xl ${
                      isLeader ? 'text-pitch-bright' : 'text-cream'
                    }`}
                  >
                    {row.total_points}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
