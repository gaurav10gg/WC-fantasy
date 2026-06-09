import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PredictionsPanel from '../components/PredictionsPanel'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Play() {
  const { user } = useAuth()
  const [globalGroupId, setGlobalGroupId] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [profile, setProfile] = useState(null)
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  async function loadProfile() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    setTeamName(prof?.team_name ?? prof?.display_name ?? '')

    const { data: gId } = await supabase.rpc('get_global_group_id')
    setGlobalGroupId(gId)

    if (gId) {
      let { data: member } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', gId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!member) {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)

        if (memberships?.length) {
          const { data: friendLeagues } = await supabase
            .from('groups')
            .select('id')
            .in('id', memberships.map((m) => m.group_id))
            .eq('is_global', false)
            .limit(1)

          if (friendLeagues?.length) {
            await supabase.rpc('ensure_global_enrollment')
            const { data: enrolled } = await supabase
              .from('group_members')
              .select('id')
              .eq('group_id', gId)
              .eq('user_id', user.id)
              .maybeSingle()
            member = enrolled
          }
        }
      }

      setEnrolled(!!member)
    }
    setLoading(false)
  }

  async function handleJoinGlobal(e) {
    e.preventDefault()
    if (!teamName.trim()) return
    setJoining(true)
    setError('')

    const { data, error: joinError } = await supabase.rpc('join_global_tournament', {
      p_team_name: teamName.trim(),
    })

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    setGlobalGroupId(data)
    setEnrolled(true)
    setJoining(false)
    await loadProfile()
  }

  if (loading) {
    return <p className="py-20 text-center text-muted">Loading…</p>
  }

  if (!enrolled) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="fixture-card p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Global Tournament</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase text-cream">Enter the Tournament</h1>
          <p className="mt-2 text-sm text-muted">
            Pick a team name for the worldwide leaderboard — or join a friend league and your picks there count automatically.
          </p>
          <form onSubmit={handleJoinGlobal} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">Team name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="input-field"
                placeholder="Your team name"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={joining} className="btn-primary w-full py-4 text-sm uppercase tracking-widest disabled:opacity-50">
              {joining ? 'Joining…' : 'Enter Tournament'}
            </button>
          </form>
          <Link to="/rankings" className="mt-4 block text-center text-sm text-pitch-bright hover:underline">
            View global rankings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PredictionsPanel
        groupId={globalGroupId}
        userId={user.id}
        title="Global Tournament"
        subtitle={`Team: ${profile?.team_name || profile?.display_name}`}
        leaderboardSource="global"
      />
    </div>
  )
}
