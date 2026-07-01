interface ChatHeaderProps {
  title: string
  subtitle: string
  online?: boolean
}

export function ChatHeader({ title, subtitle, online = true }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 bg-wa-header px-4 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wa-green font-mono text-sm font-bold text-[#04221c]">
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
    </header>
  )
}
