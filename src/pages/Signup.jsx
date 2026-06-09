import { useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AuthLayout, { AuthDivider, AuthHero, GoogleButton } from '../components/AuthLayout'
import { friendlyAuthError, signInWithGoogle } from '../lib/authHelpers'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [verifySent, setVerifySent] = useState(false)

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

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(friendlyAuthError(authError.message))
      return
    }

    // No session = email confirmation required
    if (data.user && !data.session) {
      setVerifySent(true)
      return
    }

    // Auto-confirm enabled (rare) — go straight in
    window.location.href = '/dashboard'
  }

  if (verifySent) {
    return (
      <AuthLayout>
        <Navbar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-elevated">
            <Mail size={32} className="text-gold" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-widest text-cream">Check Your Email</h1>
          <p className="mt-4 text-muted">
            We sent a verification link to <span className="text-white">{email}</span>.
          </p>
          <div className="mt-8 border border-gold/20 bg-elevated p-5 text-left text-sm">
            <p className="font-bold uppercase tracking-wider text-gold">Before you can log in:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
              <li>Open the email from WC26 Predictor</li>
              <li>Click <span className="text-cream">Confirm your mail</span></li>
              <li>Come back and log in with your email + password</li>
            </ol>
          </div>
          <Link
            to="/login"
            className="btn-primary mt-8 inline-flex items-center gap-2 px-8 py-3 font-display text-sm uppercase tracking-widest"
          >
            Go to Login
            <ArrowRight size={16} />
          </Link>
        </main>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <AuthHero title="Join the Squad" subtitle="Pick winners. Talk trash. Climb the table." />

        <div className="fixture-card border border-border p-6">
          <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />
          <AuthDivider />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">Your name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What mates call you"
                className="w-full border border-border bg-stadium px-4 py-3 text-white outline-none placeholder:text-muted/50 focus:border-pitch"
              />
            </div>
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
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-stadium px-4 py-3 text-white outline-none focus:border-pitch"
              />
            </div>

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error.text}
              </div>
            )}

            <p className="text-xs text-muted">
              Email sign-up requires verification — we’ll send you a link before you can log in.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 font-display text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Signing up…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Already in?{' '}
          <Link to="/login" className="text-pitch hover:underline">
            Log in
          </Link>
        </p>
      </main>
    </AuthLayout>
  )
}
