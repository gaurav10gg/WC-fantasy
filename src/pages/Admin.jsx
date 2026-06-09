import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GROUP_LABELS, GROUP_TEAMS } from '../lib/scoring'
import { ROUNDS } from '../lib/rounds'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? ''

export default function Admin() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [matches, setMatches] = useState([])
  const [activeRound, setActiveRound] = useState('group_md1')
  const [results, setResults] = useState({})
  const [groupWinners, setGroupWinners] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [koHome, setKoHome] = useState('')
  const [koAway, setKoAway] = useState('')
  const [koRound, setKoRound] = useState('round_of_32')

  useEffect(() => {
    if (authenticated) loadMatches()
  }, [authenticated])

  async function loadMatches() {
    setLoading(true)
    const [{ data: matchData }, { data: grData }, { data: settings }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date'),
      supabase.from('group_results').select('*'),
      supabase.from('tournament_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    setMatches(matchData ?? [])
    setActiveRound(settings?.active_round_key ?? 'group_md1')
    const gw = {}
    for (const gr of grData ?? []) gw[gr.group_label] = gr.winner_team
    setGroupWinners(gw)
    setLoading(false)
  }

  const matchesByGroup = useMemo(() => {
    const map = {}
    for (const label of GROUP_LABELS) map[label] = []
    for (const m of matches) {
      if (m.group_label) map[m.group_label]?.push(m)
    }
    return map
  }, [matches])

  function handleLogin(e) {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Invalid admin password.')
    }
  }

  async function advanceRound(roundKey) {
    setMessage('')
    setError('')
    const { error: rpcError } = await supabase.rpc('admin_advance_round', {
      p_password: ADMIN_PASSWORD,
      p_round_key: roundKey,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Opened ${roundKey} for predictions.`)
    await loadMatches()
  }

  async function addKnockoutMatch(e) {
    e.preventDefault()
    if (!koHome.trim() || !koAway.trim()) return
    setMessage('')
    setError('')
    const { error: rpcError } = await supabase.rpc('admin_add_knockout_match', {
      p_password: ADMIN_PASSWORD,
      p_round_key: koRound,
      p_team_home: koHome.trim(),
      p_team_away: koAway.trim(),
      p_match_date: new Date().toISOString(),
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setKoHome('')
    setKoAway('')
    setMessage(`Added knockout match to ${koRound}.`)
    await loadMatches()
  }

  function setResult(matchId, side, value) {
    setResults((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value === '' ? '' : parseInt(value, 10),
      },
    }))
  }

  async function saveResult(matchId) {
    setMessage('')
    setError('')
    const r = results[matchId]
    if (r?.home == null || r?.away == null || r.home === '' || r.away === '') {
      setError('Enter both scores.')
      return
    }
    const { error: rpcError } = await supabase.rpc('admin_update_match', {
      p_password: ADMIN_PASSWORD,
      p_match_id: matchId,
      p_result_home: r.home,
      p_result_away: r.away,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('Result saved.')
    await loadMatches()
  }

  async function markStarted(matchId) {
    setMessage('')
    setError('')
    const { error: rpcError } = await supabase.rpc('admin_mark_match_started', {
      p_password: ADMIN_PASSWORD,
      p_match_id: matchId,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('Match locked.')
    await loadMatches()
  }

  async function saveGroupWinner(label, team) {
    setMessage('')
    setError('')
    const { error: rpcError } = await supabase.rpc('admin_set_group_winner', {
      p_password: ADMIN_PASSWORD,
      p_group_label: label,
      p_winner_team: team,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Group ${label} winner set.`)
    await loadMatches()
  }

  if (!ADMIN_PASSWORD) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
          <p className="text-red-400">VITE_ADMIN_PASSWORD is not set in .env.local</p>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md py-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-widest">Admin</h1>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full border border-border bg-surface px-4 py-3 text-base text-white outline-none focus:border-pitch"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="w-full border border-pitch bg-pitch py-3 text-xs font-bold uppercase tracking-widest text-stadium">
              Enter
            </button>
          </form>
          <button type="button" onClick={() => navigate('/dashboard')} className="mt-4 w-full text-sm text-muted hover:text-white">
            Back
          </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-8">
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest sm:text-3xl">Admin</h1>
        <p className="mt-2 text-sm text-muted">Active round: <span className="text-pitch">{activeRound}</span></p>

        {message && <p className="mt-4 text-sm text-pitch">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <section className="mt-8 border border-border bg-surface p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Open Prediction Round</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ROUNDS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => advanceRound(r.key)}
                className={`min-h-10 border px-3 py-2 text-xs uppercase tracking-wider ${
                  activeRound === r.key ? 'border-pitch bg-pitch text-stadium' : 'border-border hover:border-pitch'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 border border-border bg-surface p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Add Knockout Match</h2>
          <form onSubmit={addKnockoutMatch} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select
              value={koRound}
              onChange={(e) => setKoRound(e.target.value)}
              className="min-h-10 border border-border bg-stadium px-3 text-sm text-white"
            >
              {ROUNDS.filter((r) => r.type === 'matches' && r.key.startsWith('round')).map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Home team"
              value={koHome}
              onChange={(e) => setKoHome(e.target.value)}
              className="min-h-10 flex-1 border border-border bg-stadium px-3 text-white"
            />
            <input
              type="text"
              placeholder="Away team"
              value={koAway}
              onChange={(e) => setKoAway(e.target.value)}
              className="min-h-10 flex-1 border border-border bg-stadium px-3 text-white"
            />
            <button type="submit" className="min-h-10 border border-pitch px-4 text-xs font-bold uppercase text-pitch">
              Add
            </button>
          </form>
        </section>

        {loading ? (
          <p className="mt-8 text-muted">Loading…</p>
        ) : (
          GROUP_LABELS.map((label) => (
            <section key={label} className="mt-10">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-lg font-bold uppercase tracking-widest sm:text-xl">
                  Group {label}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={groupWinners[label] ?? ''}
                    onChange={(e) => setGroupWinners((prev) => ({ ...prev, [label]: e.target.value }))}
                    className="min-h-10 flex-1 border border-border bg-stadium px-3 text-sm text-white sm:flex-none"
                  >
                    <option value="">1st place…</option>
                    {GROUP_TEAMS[label].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => groupWinners[label] && saveGroupWinner(label, groupWinners[label])}
                    className="min-h-10 border border-border px-4 text-xs uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(matchesByGroup[label] ?? []).map((match) => (
                  <div key={match.id} className="border border-border bg-surface p-4">
                    <p className="font-display text-sm font-semibold uppercase">
                      {match.team_home} vs {match.team_away}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {match.round_key} · {match.status}
                      {match.status === 'finished' && (
                        <span className="ml-2 text-pitch">{match.result_home}–{match.result_away}</span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {match.status !== 'finished' && (
                        <>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="H"
                            value={results[match.id]?.home ?? ''}
                            onChange={(e) => setResult(match.id, 'home', e.target.value)}
                            className="h-10 w-14 border border-border bg-stadium text-center text-white"
                          />
                          <span>:</span>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="A"
                            value={results[match.id]?.away ?? ''}
                            onChange={(e) => setResult(match.id, 'away', e.target.value)}
                            className="h-10 w-14 border border-border bg-stadium text-center text-white"
                          />
                          <button type="button" onClick={() => saveResult(match.id)} className="min-h-10 border border-pitch px-3 text-xs font-bold uppercase text-pitch">
                            Save
                          </button>
                        </>
                      )}
                      {match.status === 'upcoming' && (
                        <button type="button" onClick={() => markStarted(match.id)} className="min-h-10 border border-border px-3 text-xs uppercase text-muted">
                          Lock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
    </div>
  )
}
