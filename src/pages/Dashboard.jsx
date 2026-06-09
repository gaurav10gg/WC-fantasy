import { useEffect, useState } from 'react'
import { ArrowRight, Globe, Plus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import InviteCodeBox from '../components/InviteCodeBox'
import { useAuth } from '../lib/auth'
import { generateInviteCode } from '../lib/scoring'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leagues, setLeagues] = useState([])
  const [globalEnrolled, setGlobalEnrolled] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [leagueName, setLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    loadDashboard()
  }, [user])

  async function loadDashboard() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('team_name, display_name').eq('id', user.id).single()
    setTeamName(prof?.team_name ?? prof?.display_name ?? '')

    const { data: gId } = await supabase.rpc('get_global_group_id')
    if (gId) {
      const { data: member } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', gId)
        .eq('user_id', user.id)
        .maybeSingle()
      setGlobalEnrolled(!!member)
    }

    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    if (memberships?.length) {
      const ids = memberships.map((m) => m.group_id)
      const { data } = await supabase.from('groups').select('*').in('id', ids).eq('is_global', false).order('created_at')
      setLeagues(data ?? [])
    } else {
      setLeagues([])
    }
    setLoading(false)
  }

  async function createLeague(e) {
    e.preventDefault()
    if (!leagueName.trim()) return
    setBusy(true)
    setError('')

    let inviteCode = generateInviteCode()
    let attempts = 0

    while (attempts < 5) {
      const { data, error: insertError } = await supabase
        .from('groups')
        .insert({ name: leagueName.trim(), invite_code: inviteCode, created_by: user.id, is_global: false })
        .select()
        .single()

      if (!insertError) {
        await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id })
        await supabase.rpc('ensure_global_enrollment')
        if (globalEnrolled) {
          await supabase.rpc('copy_global_predictions_to_league', { p_league_id: data.id })
        }
        setLeagueName('')
        navigate(`/group/${data.id}`)
        return
      }

      if (insertError.code === '23505') {
        inviteCode = generateInviteCode()
        attempts++
        continue
      }

      setError(insertError.message)
      setBusy(false)
      return
    }

    setError('Could not generate a unique invite code. Try again.')
    setBusy(false)
  }

  async function joinLeague(e) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setError('Invite code must be 6 characters.')
      return
    }

    setBusy(true)
    setError('')

    const { data: groupId, error: joinError } = await supabase.rpc('join_group_by_invite', {
      p_invite_code: code,
      p_copy_global: globalEnrolled,
    })

    if (joinError) {
      setError(joinError.message.includes('not found') ? 'League not found. Check the invite code.' : joinError.message)
      setBusy(false)
      return
    }

    navigate(`/group/${groupId}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Dashboard</p>
        <h1 className="mt-1 font-display text-4xl font-bold uppercase tracking-tight text-cream sm:text-5xl">
          Welcome back
        </h1>
        <p className="mt-2 text-muted">Make picks, climb the table, run your leagues.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 xl:col-span-2">
          <section className="fixture-card border-gold/30 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/30 bg-gold/5">
                <Globe size={24} className="text-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-gold">Global Tournament</p>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase text-cream">
                  {globalEnrolled ? teamName : 'Compete Worldwide'}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {globalEnrolled
                    ? 'Your league picks count here too — one set of predictions for everything.'
                    : 'Join a friend league or enter solo — picks in any league count for global rankings.'}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link to="/play" className="btn-primary flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest">
                    {globalEnrolled ? 'Make Picks' : 'Enter Tournament'}
                    <ArrowRight size={16} />
                  </Link>
                  <Link to="/rankings" className="btn-secondary py-3 text-center text-xs uppercase tracking-widest">
                    Global Rankings
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="fixture-card p-6">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-muted" />
              <h2 className="font-display text-xl font-bold uppercase tracking-wide text-cream">Friend Leagues</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Picks you save here also count on the global leaderboard.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <form onSubmit={createLeague} className="border border-border bg-stadium p-5">
                <div className="flex items-center gap-2 text-muted">
                  <Plus size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Create</h3>
                </div>
                <input
                  type="text"
                  required
                  placeholder="League name"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="input-field mt-3"
                />
                <button type="submit" disabled={busy} className="btn-primary mt-3 w-full py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                  Create League
                </button>
              </form>

              <form onSubmit={joinLeague} className="border border-border bg-stadium p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Join with code</h3>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-char code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="input-field mt-3 font-mono uppercase tracking-widest"
                />
                <button type="submit" disabled={busy} className="btn-secondary mt-3 w-full py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                  Join League
                </button>
              </form>
            </div>
          </section>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Right column — leagues */}
        <aside className="xl:col-span-1">
          <div className="fixture-card sticky top-6 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-cream">Your Leagues</h2>
            {loading ? (
              <p className="mt-4 text-sm text-muted">Loading…</p>
            ) : leagues.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No leagues yet. Create one or join with a code.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {leagues.map((g) => (
                  <li key={g.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <Link
                      to={`/group/${g.id}`}
                      className="group inline-flex items-center gap-1 font-display text-lg font-bold uppercase text-cream hover:text-pitch-bright"
                    >
                      {g.name}
                      <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                    <div className="mt-2">
                      <InviteCodeBox code={g.invite_code} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
