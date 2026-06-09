import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import GroupPredictionPicker from './GroupPredictionPicker'
import LeaderboardTable from './LeaderboardTable'
import LeagueHeader from './LeagueHeader'
import MatchCard from './MatchCard'
import MatchTransparencyModal from './MatchTransparencyModal'
import UserPredictionsModal from './UserPredictionsModal'
import { useConfettiOnCorrectResults } from '../hooks/useConfettiOnCorrectResults'
import { fireGoalConfetti } from '../lib/confetti'
import { isMatchFinished } from '../lib/matchHelpers'
import { GROUP_LABELS } from '../lib/scoring'
import { getRoundInfo } from '../lib/rounds'
import { supabase } from '../lib/supabase'

export default function PredictionsPanel({
  groupId,
  userId,
  title,
  subtitle,
  inviteCode,
  leaderboardSource = 'group',
}) {
  const [tab, setTab] = useState('predictions')
  const [activeRoundKey, setActiveRoundKey] = useState('group_md1')
  const [predictionsOpen, setPredictionsOpen] = useState(true)
  const [matches, setMatches] = useState([])
  const [matchPredictions, setMatchPredictions] = useState({})
  const [groupPredictions, setGroupPredictions] = useState({})
  const [groupResults, setGroupResults] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [roundSubmitted, setRoundSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewingUser, setViewingUser] = useState(null)
  const [transparencyMatch, setTransparencyMatch] = useState(null)

  const roundInfo = getRoundInfo(activeRoundKey)
  const isGroupWinnersRound = activeRoundKey === 'group_winners'

  const loadLeaderboard = useCallback(async () => {
    if (leaderboardSource === 'global') {
      const { data } = await supabase.rpc('get_global_leaderboard')
      setLeaderboard(
        (data ?? []).map((row) => ({
          user_id: row.user_id,
          display_name: row.team_name || row.display_name,
          total_points: row.total_points,
          correct_match_predictions: row.correct_match_predictions,
          correct_group_winner_predictions: row.correct_group_winner_predictions,
          rank: row.rank,
        }))
      )
      return
    }

    const { data: scores } = await supabase.rpc('get_group_leaderboard', {
      p_group_id: groupId,
    })

    if (!scores?.length) {
      setLeaderboard([])
      return
    }

    const userIds = scores.map((s) => s.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, team_name')
      .in('id', userIds)

    const nameMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.team_name || p.display_name])
    )
    setLeaderboard(
      scores.map((s) => ({
        ...s,
        display_name: nameMap[s.user_id] ?? 'Unknown',
      }))
    )
  }, [groupId, leaderboardSource])

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: settings } = await supabase
      .from('tournament_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    const roundKey = settings?.active_round_key ?? 'group_md1'
    setActiveRoundKey(roundKey)
    setPredictionsOpen(settings?.predictions_open ?? true)

    const isWinnersRound = roundKey === 'group_winners'

    const [
      { data: matchData },
      { data: predData },
      { data: grData },
    ] = await Promise.all([
      isWinnersRound
        ? Promise.resolve({ data: [] })
        : supabase
            .from('matches')
            .select('*')
            .eq('round_key', roundKey)
            .eq('visible_for_predictions', true)
            .order('match_date'),
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

    const currentMatchIds = (matchData ?? []).map((m) => m.id)
    const hasRoundPreds = isWinnersRound
      ? GROUP_LABELS.some((l) => gp[l])
      : currentMatchIds.some((id) => mp[id]?.predicted_winner)
    setRoundSubmitted(hasRoundPreds)

    await loadLeaderboard()
    setLoading(false)
  }, [groupId, userId, loadLeaderboard])

  useEffect(() => {
    loadData()
  }, [loadData])

  useConfettiOnCorrectResults(matches, matchPredictions)

  const prevGroupResultsRef = useRef({})
  useEffect(() => {
    for (const label of GROUP_LABELS) {
      const prev = prevGroupResultsRef.current[label]
      const now = groupResults[label]
      prevGroupResultsRef.current[label] = now
      if (now && !prev && groupPredictions[label] === now) {
        fireGoalConfetti()
      }
    }
  }, [groupResults, groupPredictions])

  useEffect(() => {
    const channel = supabase
      .channel(`predictions-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_results' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, loadLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_settings' }, loadData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [groupId, loadData, loadLeaderboard])

  const matchesByGroup = useMemo(() => {
    const map = {}
    for (const label of GROUP_LABELS) map[label] = []
    for (const m of matches) {
      if (m.group_label && map[m.group_label]) map[m.group_label].push(m)
    }
    return map
  }, [matches])

  const knockoutMatches = useMemo(
    () => matches.filter((m) => !m.group_label),
    [matches]
  )

  const groupLockState = useMemo(() => {
    const locked = {}
    for (const label of GROUP_LABELS) {
      locked[label] = !!groupResults[label]
    }
    return locked
  }, [groupResults])

  function isMatchLocked(match) {
    return match.status === 'started' || match.status === 'finished'
  }

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (isGroupWinnersRound) {
      const groupUpserts = []
      for (const label of GROUP_LABELS) {
        if (groupLockState[label]) continue
        const team = groupPredictions[label]
        if (!team) {
          setError(`Pick a group winner for Group ${label}`)
          setSubmitting(false)
          return
        }
        groupUpserts.push({
          user_id: userId,
          group_id: groupId,
          match_id: null,
          predicted_winner: null,
          predicted_home_score: null,
          predicted_away_score: null,
          group_winner_label: label,
          predicted_group_winner_team: team,
        })
      }

      if (groupUpserts.length) {
        const { error: groupError } = await supabase
          .from('predictions')
          .upsert(groupUpserts, { onConflict: 'user_id,group_id,group_winner_label' })
        if (groupError) {
          setError(groupError.message)
          setSubmitting(false)
          return
        }
      }
    } else {
      const matchUpserts = []
      for (const match of matches) {
        if (isMatchLocked(match)) continue
        const pred = matchPredictions[match.id]
        if (!pred?.predicted_winner) {
          setError(`Pick a winner for ${match.team_home} vs ${match.team_away}`)
          setSubmitting(false)
          return
        }
        matchUpserts.push({
          user_id: userId,
          group_id: groupId,
          match_id: match.id,
          predicted_winner: pred.predicted_winner,
          predicted_home_score: pred.predicted_home_score ?? null,
          predicted_away_score: pred.predicted_away_score ?? null,
          group_winner_label: null,
          predicted_group_winner_team: null,
        })
      }

      if (matchUpserts.length) {
        const { error: matchError } = await supabase
          .from('predictions')
          .upsert(matchUpserts, { onConflict: 'user_id,group_id,match_id' })
        if (matchError) {
          setError(matchError.message)
          setSubmitting(false)
          return
        }
      }
    }

    setRoundSubmitted(true)
    setSuccess('Picks saved — tap any match below to edit until kickoff.')
    setSubmitting(false)
    await loadData()
  }

  const finishedMatches = useMemo(
    () => matches.filter(isMatchFinished),
    [matches]
  )

  const allLocked = isGroupWinnersRound
    ? GROUP_LABELS.every((l) => groupLockState[l])
    : matches.length > 0 && matches.every(isMatchLocked)

  if (loading) {
    return <p className="py-16 text-center text-muted uppercase tracking-widest">Loading…</p>
  }

  return (
    <>
      <LeagueHeader
        title={title}
        inviteCode={inviteCode}
        subtitle={subtitle}
        tab={tab}
        onTabChange={setTab}
      />

      {tab === 'leaderboard' ? (
        <div className="mt-6 border border-border bg-elevated">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted">
              {leaderboardSource === 'global' ? 'Global Rankings' : 'League Scoreboard'}
            </h2>
          </div>
          <LeaderboardTable
            rows={leaderboard}
            loading={false}
            showRank={leaderboardSource === 'global'}
            onViewPicks={(row) => setViewingUser(row)}
          />
        </div>
      ) : (
        <>
          <div className="fixture-card mt-6 border border-border px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">{roundInfo.label}</p>
            <p className="mt-1 text-sm text-cream">{roundInfo.subtitle}</p>
            {!predictionsOpen && (
              <p className="mt-2 text-xs text-red-400">Predictions are closed for this round.</p>
            )}
            {roundSubmitted && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-pitch/30 bg-pitch/10 px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pitch" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-pitch">Picks saved</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Tap any match below to edit until kickoff.
                  </p>
                </div>
              </div>
            )}
          </div>

          {finishedMatches.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-widest text-pitch">
                Results &amp; transparency
              </h2>
              <p className="mb-3 text-sm text-muted">
                See how your picks compared — and view everyone&apos;s predictions after full time.
              </p>
              <div className="grid gap-3">
                {finishedMatches.map((match) => (
                  <MatchCard
                    key={`result-${match.id}`}
                    match={match}
                    prediction={matchPredictions[match.id]}
                    locked
                    onChange={() => {}}
                    onViewAllPicks={setTransparencyMatch}
                  />
                ))}
              </div>
            </section>
          )}

          {!isGroupWinnersRound && matches.some((m) => m.group_label) &&
            GROUP_LABELS.filter((l) => (matchesByGroup[l] ?? []).length > 0).map((label) => (
              <section key={label} className="mt-8">
                <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-widest text-gold">
                  Group {label}
                </h2>
                <div className="grid gap-3">
                  {(matchesByGroup[label] ?? [])
                    .filter((m) => !isMatchFinished(m))
                    .map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      prediction={matchPredictions[match.id]}
                      locked={isMatchLocked(match)}
                      onChange={(values) =>
                        setMatchPredictions((prev) => ({ ...prev, [match.id]: { ...prev[match.id], ...values } }))
                      }
                    />
                  ))}
                </div>
              </section>
            ))}

          {!isGroupWinnersRound && knockoutMatches.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-widest">
                {roundInfo.subtitle}
              </h2>
              <div className="grid gap-3">
                {knockoutMatches
                  .filter((m) => !isMatchFinished(m))
                  .map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={matchPredictions[match.id]}
                    locked={isMatchLocked(match)}
                    onChange={(values) =>
                      setMatchPredictions((prev) => ({ ...prev, [match.id]: { ...prev[match.id], ...values } }))
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {isGroupWinnersRound && (
            <GroupPredictionPicker
              predictions={groupPredictions}
              locked={groupLockState}
              groupResults={groupResults}
              onChange={(label, team) =>
                setGroupPredictions((prev) => ({ ...prev, [label]: team }))
              }
            />
          )}

          {matches.length === 0 && !isGroupWinnersRound && (
            <p className="mt-8 text-center text-sm text-muted">
              No matches open for this round yet. Check back when the admin opens the next round.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-4 text-sm text-pitch">{success}</p>}

          {predictionsOpen && !allLocked && (matches.length > 0 || isGroupWinnersRound) && (
            <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-surface/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full py-4 font-display text-sm uppercase tracking-widest disabled:opacity-50"
              >
                {submitting ? 'Saving…' : roundSubmitted ? 'Save changes' : `Submit ${roundInfo.label}`}
              </button>
            </div>
          )}
        </>
      )}
      {viewingUser && (
        <UserPredictionsModal
          groupId={groupId}
          userId={viewingUser.user_id}
          displayName={viewingUser.display_name}
          viewerUserId={userId}
          onClose={() => setViewingUser(null)}
        />
      )}
      {transparencyMatch && (
        <MatchTransparencyModal
          match={transparencyMatch}
          groupId={groupId}
          onClose={() => setTransparencyMatch(null)}
        />
      )}
    </>
  )
}
