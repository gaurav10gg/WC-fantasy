import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { syncProfileFromAuth } from '../lib/profileHelpers'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let done = false

    const finish = async (session) => {
      if (done) return
      done = true
      if (session?.user) await syncProfileFromAuth(session.user)
      navigate(session ? '/dashboard' : '/login', { replace: true })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) finish(session)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session)
    })

    const timeout = setTimeout(() => finish(null), 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="stadium-bg flex min-h-screen flex-col items-center justify-center text-center">
      <Loader2 size={32} className="animate-spin text-pitch" />
      <p className="mt-4 font-display text-lg uppercase tracking-widest text-muted">Signing you in</p>
    </div>
  )
}
