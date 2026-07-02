import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Message } from '../chat'

interface ChatPanelProps {
  messages: Message[]
  typing: boolean
  onSend?: (text: string) => void
  placeholder?: string
  disabled?: boolean
  emptyState?: ReactNode
  // Optional bar shown between the messages and the composer (e.g. a
  // "continue to the next stage" call to action).
  banner?: ReactNode
}

export function ChatPanel({
  messages,
  typing,
  onSend,
  placeholder = 'Type a message',
  disabled = false,
  emptyState,
  banner,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

  function send() {
    const text = input.trim()
    if (!text || disabled || !onSend) return
    onSend(text)
    setInput('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="wa-wallpaper min-h-0 flex-1 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 && emptyState}

        <ul className="flex flex-col gap-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className={
                m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={[
                  'wa-pop max-w-[80%] px-3 py-2 text-[15px] leading-snug text-wa-text',
                  m.role === 'user'
                    ? 'rounded-lg rounded-tr-sm bg-wa-out'
                    : 'rounded-lg rounded-tl-sm bg-wa-in',
                ].join(' ')}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <span className="mt-1 block text-right font-mono text-[10px] text-wa-muted">
                  {m.time}
                </span>
              </div>
            </li>
          ))}

          {typing && (
            <li className="flex justify-start">
              <div className="flex items-center gap-1 rounded-lg rounded-tl-sm bg-wa-in px-4 py-3">
                <span className="wa-dot h-1.5 w-1.5 rounded-full bg-wa-muted" />
                <span
                  className="wa-dot h-1.5 w-1.5 rounded-full bg-wa-muted"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="wa-dot h-1.5 w-1.5 rounded-full bg-wa-muted"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </li>
          )}
        </ul>
      </div>

      {banner}

      {onSend && (
        <div className="flex items-center gap-2 bg-wa-header px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 rounded-lg bg-wa-panel px-4 py-2.5 text-[15px] text-wa-text placeholder:text-wa-muted focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || disabled}
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-wa-green text-[#04221c] transition-opacity disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-6l9-2.5-9-2.5v-6l18 8.5-18 8.5z" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
