import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { syncProfileFromAuth } from '../lib/profileHelpers'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const oauthError = params.get('error_description') || params.get('error')

      if (oauthError) {
        if (!cancelled) setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
        return
      }

      try {
        let session = null

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          session = data.session
        } else {
          const { data: { session: existing } } = await supabase.auth.getSession()
          session = existing
        }

        if (cancelled) return

        if (session?.user) {
          syncProfileFromAuth(session.user).catch(() => {})
          navigate('/dashboard', { replace: true })
          return
        }

        setError('Sign-in could not be completed. Please try again.')
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Sign-in failed. Please try again.')
        }
      }
    }

    handleCallback()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (error) {
    return (
      <div className="stadium-bg flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="mb-2 font-display text-lg uppercase tracking-widest text-red-300">Sign-in failed</p>
        <p className="mb-6 max-w-md text-sm text-muted">{error}</p>
        <Link
          to="/login"
          className="btn-primary px-6 py-3 font-display text-sm uppercase tracking-widest"
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="stadium-bg flex min-h-screen flex-col items-center justify-center text-center">
      <Loader2 size={32} className="animate-spin text-pitch" />
      <p className="mt-4 font-display text-lg uppercase tracking-widest text-muted">Signing you in</p>
    </div>
  )
}
