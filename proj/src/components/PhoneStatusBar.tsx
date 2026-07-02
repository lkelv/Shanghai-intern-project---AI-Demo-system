interface PhoneStatusBarProps {
  // Which app is on screen — sets the tint so the phone chrome matches the app.
  variant: 'whatsapp' | 'store' | 'checkout'
}

const STYLES = {
  whatsapp: { bg: 'bg-wa-header', text: 'text-wa-text', label: 'WhatsApp' },
  store: { bg: 'bg-white', text: 'text-neutral-900', label: 'Store' },
  checkout: { bg: 'bg-white', text: 'text-neutral-900', label: 'Pay' },
} as const

// A thin iOS-style status bar. It's the same phone across the journey; only the
// app below it changes — which is the whole point of showing it.
export function PhoneStatusBar({ variant }: PhoneStatusBarProps) {
  const s = STYLES[variant]
  return (
    <div
      className={`flex items-center justify-between px-4 pt-1.5 pb-1 ${s.bg} ${s.text}`}
    >
      <span className="text-[12px] font-semibold tracking-tight">9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <path d="M8 2C5 2 2.4 3.1.6 4.9l1.4 1.4C3.5 4.8 5.6 4 8 4s4.5.8 6 2.3l1.4-1.4C13.6 3.1 11 2 8 2zm0 4c-1.6 0-3.1.6-4.2 1.7L8 12l4.2-4.3C11.1 6.6 9.6 6 8 6z" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
          <rect x="22.5" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  )
}
