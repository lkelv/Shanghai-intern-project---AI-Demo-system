interface ChatHeaderProps {
  title: string
  subtitle: string
  online?: boolean
}

export function ChatHeader({ title, subtitle, online = true }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 bg-wa-header px-3 py-2.5">
      <svg
        className="shrink-0 text-wa-muted"
        width="12"
        height="18"
        viewBox="0 0 12 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 2 2 10l8 8" />
      </svg>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wa-green font-mono text-[13px] font-bold text-[#04221c]">
        OP
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-semibold text-wa-text">{title}</p>
        <p className="flex items-center gap-1.5 text-xs text-wa-muted">
          {online && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-wa-green" />
          )}
          {subtitle}
        </p>
      </div>
      {/* Messaging-app affordances — decorative, sell the WhatsApp look */}
      <div className="flex items-center gap-4 text-wa-muted">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.5-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2z" />
        </svg>
      </div>
    </header>
  )
}
