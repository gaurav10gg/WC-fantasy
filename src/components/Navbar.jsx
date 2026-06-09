import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:py-4">
        <Link
          to={user ? '/dashboard' : '/'}
          className="shrink-0 font-display text-lg font-bold uppercase tracking-widest text-cream sm:text-xl"
        >
          WC<span className="text-pitch-bright">26</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            to="/rankings"
            className="hidden text-xs uppercase tracking-wider text-muted hover:text-gold sm:inline sm:text-sm"
          >
            Rankings
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-xs text-muted hover:text-cream sm:text-sm">
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary min-h-10 px-3 py-2 text-xs font-medium uppercase tracking-wider"
              >
                Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="min-h-10 px-2 py-2 text-xs text-muted hover:text-cream sm:text-sm">
                Log In
              </Link>
              <Link to="/signup" className="btn-primary min-h-10 px-3 py-2 text-xs uppercase tracking-wider">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
