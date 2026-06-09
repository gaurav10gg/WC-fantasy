import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LeaderboardTable from '../components/LeaderboardTable'
import UserPredictionsModal from '../components/UserPredictionsModal'
import Navbar from '../components/Navbar'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Rankings() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState('')
  const [competing, setCompeting] = useState(false)
  const [globalGroupId, setGlobalGroupId] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)

  useEffect(() => {
    loadRankings()

    const channel = supabase
      .channel('global-rankings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, loadRankings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadRankings)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!user) {
      setTeamName('')
      setCompeting(false)
      return
    }

    async function loadUserStatus() {
      const { data: prof } = await supabase
        .from('profiles')
        .select('team_name, display_name')
        .eq('id', user.id)
        .single()
      setTeamName(prof?.team_name || prof?.display_name || 'Your team')

      const { data: gId } = await supabase.rpc('get_global_group_id')
      setGlobalGroupId(gId)
      if (!gId) {
        setCompeting(false)
        return
      }

      const { data: member } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', gId)
        .eq('user_id', user.id)
        .maybeSingle()

      setCompeting(!!member)
    }

    loadUserStatus()
  }, [user])

  async function loadRankings() {
    const { data } = await supabase.rpc('get_global_leaderboard')
    setRows(
      (data ?? []).map((row) => ({
        user_id: row.user_id,
        display_name: row.team_name || row.display_name,
        total_points: row.total_points,
        correct_match_predictions: row.correct_match_predictions,
        correct_group_winner_predictions: row.correct_group_winner_predictions,
        rank: row.rank,
      }))
    )
    setLoading(false)
  }

  const onLeaderboard = user && rows.some((row) => row.user_id === user.id)
  const isCompeting = competing || onLeaderboard

  return (
    <div className="min-h-screen bg-stadium">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Public</p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-widest sm:text-4xl">
          Global Rankings
        </h1>
        <p className="mt-2 text-sm text-muted">
          {user ? (
            isCompeting ? (
              <>
                You&apos;re competing as <span className="text-cream">{teamName}</span>. Picks in your{' '}
                <Link to="/dashboard" className="text-pitch hover:underline">
                  leagues
                </Link>{' '}
                count here — or{' '}
                <Link to="/play" className="text-pitch hover:underline">
                  make picks
                </Link>{' '}
                directly.
              </>
            ) : (
              <>
                Logged in as <span className="text-cream">{teamName}</span>.{' '}
                <Link to="/dashboard" className="text-pitch hover:underline">
                  Join a league
                </Link>{' '}
                or{' '}
                <Link to="/play" className="text-pitch hover:underline">
                  enter the tournament
                </Link>{' '}
                to appear on the board.
              </>
            )
          ) : (
            <>
              Worldwide leaderboard.{' '}
              <Link to="/signup" className="text-pitch hover:underline">
                Sign up
              </Link>{' '}
              to compete.
            </>
          )}
        </p>

        <div className="fixture-card mt-8">
          <LeaderboardTable
            rows={rows}
            loading={loading}
            showRank
            onViewPicks={user && globalGroupId ? (row) => setViewingUser(row) : undefined}
          />
        </div>
        {!user && (
          <p className="mt-3 text-center text-xs text-muted">
            <Link to="/login" className="text-pitch hover:underline">
              Log in
            </Link>{' '}
            to view player picks after kickoff.
          </p>
        )}
      </main>

      {viewingUser && globalGroupId && user && (
        <UserPredictionsModal
          groupId={globalGroupId}
          userId={viewingUser.user_id}
          displayName={viewingUser.display_name}
          viewerUserId={user.id}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  )
}
