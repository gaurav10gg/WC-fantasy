import { ArrowRight, Globe, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import Flag from '../components/Flag'
import Navbar from '../components/Navbar'
import { HERO_TEAMS } from '../lib/flags'
import { GROUP_TEAMS } from '../lib/scoring'

export default function Landing() {
  return (
    <div className="stadium-bg relative min-h-screen overflow-hidden">
      <div className="pitch-lines pointer-events-none absolute inset-0" aria-hidden />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 text-center sm:py-20">
        <div className="flex flex-wrap justify-center gap-2">
          {HERO_TEAMS.map((team) => (
            <Flag key={team} team={team} size="xl" className="!h-7 !w-10 shadow-md" />
          ))}
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.35em] text-gold">
          USA · Mexico · Canada 2026
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-cream sm:text-7xl">
          Call Every
          <br />
          <span className="text-pitch-bright">Match</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base text-muted sm:text-lg">
          Round-by-round predictions. Global rankings. Mate leagues.
          No spreadsheets — just football.
        </p>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Link
            to="/signup"
            className="btn-primary flex min-h-14 items-center justify-center gap-2 px-8 py-4 font-display text-base uppercase tracking-widest sm:min-h-12"
          >
            Join Tournament
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="btn-secondary flex min-h-14 items-center justify-center px-8 py-4 font-display text-base uppercase tracking-widest sm:min-h-12"
          >
            Log In
          </Link>
        </div>

        <Link
          to="/rankings"
          className="mt-6 inline-flex items-center gap-2 text-sm text-pitch-bright hover:underline"
        >
          <Globe size={16} />
          Global rankings
          <ArrowRight size={14} />
        </Link>

        <div className="mt-16 border-t border-border pt-10 text-left">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted">
            48 nations · 12 groups · 1 trophy
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(GROUP_TEAMS)
              .slice(0, 4)
              .map(([label, teams]) => (
                <div key={label} className="fixture-card border border-border p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">Group {label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {teams.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-xs text-muted">
                        <Flag team={t} size="xs" />
                        <span className="truncate uppercase">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>

        <p className="mt-12 flex items-center justify-center gap-1.5 text-sm text-muted">
          Developed with
          <Heart size={14} className="fill-pitch text-pitch" aria-hidden />
          by <span className="font-semibold text-cream">Gaurav</span>
        </p>
      </main>
    </div>
  )
}
