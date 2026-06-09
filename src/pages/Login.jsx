import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AuthLayout, { AuthDivider, AuthHero, GoogleButton } from '../components/AuthLayout'
import { friendlyAuthError, signInWithGoogle } from '../lib/authHelpers'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    const { error: oauthError } = await signInWithGoogle()
    if (oauthError) {
      setError({ type: 'error', text: oauthError.message })
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (authError) {
      setError(friendlyAuthError(authError.message))
      return
    }
    navigate('/dashboard')
  }

  return (
    <AuthLayout>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <AuthHero title="Back on the Pitch" subtitle="Log in and make your picks." />

        <div className="fixture-card border border-border p-6">
          <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Log in with Google" />
          <AuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-stadium px-4 py-3 text-white outline-none focus:border-pitch"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-stadium px-4 py-3 text-white outline-none focus:border-pitch"
              />
            </div>

            {error && (
              <div
                className={`border px-4 py-3 text-sm ${
                  error.type === 'verify'
                    ? 'border-gold/30 bg-elevated text-gold'
                    : 'border-red-500/30 bg-red-500/5 text-red-300'
                }`}
              >
                {error.type === 'verify' && <p className="mb-1 font-bold uppercase tracking-wider">Check your inbox</p>}
                {error.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex w-full items-center justify-center gap-2 py-4 font-display text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Log In'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          New here?{' '}
          <Link to="/signup" className="text-pitch hover:underline">
            Join the tournament
          </Link>
        </p>
      </main>
    </AuthLayout>
  )
}
