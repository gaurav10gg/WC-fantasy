import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function InviteCodeBox({ code }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback for older browsers */
      const input = document.createElement('input')
      input.value = code
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group mt-4 w-full border-2 border-dashed border-gold/40 bg-elevated px-4 py-3 text-left transition-all hover:border-gold hover:bg-gold/5 active:scale-[0.99] sm:w-auto sm:min-w-[220px]"
    >
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Invite code · tap to copy
          </span>
          <span className="mt-1 block font-mono text-2xl font-bold tracking-[0.35em] text-gold-bright sm:text-3xl">
            {code}
          </span>
        </span>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors ${
            copied
              ? 'border-pitch bg-pitch/10 text-pitch-bright'
              : 'border-border-light text-muted group-hover:border-gold group-hover:text-gold'
          }`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </span>
      </span>
      {copied && (
        <span className="mt-2 block text-xs font-bold uppercase tracking-wider text-pitch-bright">
          Copied to clipboard
        </span>
      )}
    </button>
  )
}
