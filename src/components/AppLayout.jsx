import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-stadium">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-border text-cream"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-display text-lg font-bold uppercase tracking-widest text-cream">
            WC<span className="text-pitch-bright">26</span>
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  )
}
