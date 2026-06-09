import { Trophy } from 'lucide-react'

export default function AuthLayout({ children }) {
  return (
    <div className="stadium-bg relative min-h-screen overflow-hidden">
      <div className="pitch-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function AuthHero({ title, subtitle }) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-elevated">
        <Trophy size={28} className="text-gold" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.35em] text-gold">WC26 Predictor</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-widest text-cream sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
    </div>
  )
}

export function GoogleButton({ onClick, loading, label = 'Continue with Google' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex min-h-12 w-full items-center justify-center gap-3 border border-border bg-elevated py-3 font-display text-sm font-bold uppercase tracking-wider text-cream transition-colors hover:border-border-light disabled:opacity-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {loading ? 'Redirecting…' : label}
    </button>
  )
}

export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-widest text-muted">or email</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
