import InviteCodeBox from './InviteCodeBox'

export default function LeagueHeader({ title, inviteCode, subtitle, tab, onTabChange }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {inviteCode && (
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Private League</p>
          )}
          <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-tight text-cream sm:text-5xl">
            {title}
          </h1>
          <div className="mt-2 h-1 w-16 bg-pitch" />

          {inviteCode ? (
            <InviteCodeBox code={inviteCode} />
          ) : (
            subtitle && (
              <p className="mt-3 text-sm uppercase tracking-widest text-muted">{subtitle}</p>
            )
          )}
        </div>

        <div className="flex w-full shrink-0 border border-border sm:w-auto">
          {['predictions', 'leaderboard'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest sm:flex-none sm:px-5 ${
                tab === t ? 'bg-pitch text-stadium' : 'text-muted hover:text-cream'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
