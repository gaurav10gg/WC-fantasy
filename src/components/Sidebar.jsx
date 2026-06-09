import { useEffect, useState } from 'react'
import { Globe, Home, LogOut, Shield, Swords, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/play', label: 'Play', icon: Swords },
  { to: '/rankings', label: 'Rankings', icon: Globe },
  { to: '/admin', label: 'Admin', icon: Shield },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [leagues, setLeagues] = useState([])
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    if (!user) return
    loadSidebar()
  }, [user, location.pathname])

  async function loadSidebar() {
    const [{ data: prof }, { data: memberships }] = await Promise.all([
      supabase.from('profiles').select('team_name, display_name').eq('id', user.id).single(),
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
    ])
    setTeamName(prof?.team_name || prof?.display_name || 'Player')

    if (memberships?.length) {
      const ids = memberships.map((m) => m.group_id)
      const { data } = await supabase
        .from('groups')
        .select('id, name, invite_code')
        .in('id', ids)
        .eq('is_global', false)
        .order('created_at')
      setLeagues(data ?? [])
    } else {
      setLeagues([])
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-5">
        <Link to="/dashboard" onClick={onClose} className="font-display text-2xl font-bold uppercase tracking-widest text-cream">
          WC<span className="text-pitch-bright">26</span>
        </Link>
        <button type="button" onClick={onClose} className="text-muted lg:hidden" aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <div className="border-b border-border px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Signed in as</p>
        <p className="mt-0.5 truncate font-display text-lg font-semibold uppercase text-cream">{teamName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-muted">Menu</p>
        <ul className="mt-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
            return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? 'border-l-2 border-pitch bg-pitch/10 text-pitch-bright'
                      : 'border-l-2 border-transparent text-muted hover:bg-elevated hover:text-cream'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {leagues.length > 0 && (
          <>
            <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-muted">Your Leagues</p>
            <ul className="mt-2 space-y-1">
              {leagues.map((g) => {
                const active = location.pathname === `/group/${g.id}`
                return (
                  <li key={g.id}>
                    <Link
                      to={`/group/${g.id}`}
                      onClick={onClose}
                      className={`block px-3 py-2 transition-colors ${
                        active ? 'bg-gold/10 text-gold-bright' : 'text-muted hover:bg-elevated hover:text-cream'
                      }`}
                    >
                      <span className="block truncate font-display text-sm font-semibold uppercase">{g.name}</span>
                      <span className="font-mono text-[10px] tracking-widest opacity-70">{g.invite_code}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <ThemeToggle className="flex-1 !w-auto" />
          <button
            type="button"
            onClick={handleLogout}
            className="btn-secondary flex flex-1 items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-wider"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-2xl">{sidebarContent}</aside>
        </div>
      )}
    </>
  )
}
