import { useEffect, useRef, useState } from 'react'
import { greeting, nowTime, type Message } from './chat'

function makeId() {
  return Math.random().toString(36).slice(2)
}

function App() {
  const [messages, setMessages] = useState<Message[]>([greeting])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

  async function send() {
    const text = input.trim()
    if (!text || typing) return

    const userMsg: Message = {
      id: makeId(),
      role: 'user',
      text,
      time: nowTime(),
    }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setTyping(true)

    // Ask the local backend, which holds the OpenRouter key and system prompt.
    let reply: string
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      reply = data.reply
    } catch {
      reply =
        "Sorry — I couldn't reach the assistant just now. Please make sure the backend is running and try again."
    }

    setMessages((m) => [
      ...m,
      { id: makeId(), role: 'bot', text: reply, time: nowTime() },
    ])
    setTyping(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex min-h-full items-stretch justify-center bg-[#0a0f12] sm:items-center sm:py-8">
      <div className="wa-rise flex h-[100svh] w-full flex-col bg-wa-panel sm:h-[760px] sm:max-w-[460px] sm:border sm:border-wa-divider">
        {/* Header */}
        <header className="flex items-center gap-3 bg-wa-header px-4 py-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-wa-green font-mono text-sm font-bold text-[#04221c]">
            OP
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-semibold text-wa-text">
              OnePromise Assistant
            </p>
            <p className="flex items-center gap-1.5 text-xs text-wa-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-wa-green" />
              online · replies instantly
            </p>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="wa-wallpaper flex-1 overflow-y-auto px-4 py-5"
        >
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
                    'wa-pop max-w-[78%] px-3 py-2 text-[15px] leading-snug text-wa-text',
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

        {/* Composer */}
        <div className="flex items-center gap-2 bg-wa-header px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message"
            className="flex-1 rounded-lg bg-wa-panel px-4 py-2.5 text-[15px] text-wa-text placeholder:text-wa-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || typing}
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-wa-green text-[#04221c] transition-opacity disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-6l9-2.5-9-2.5v-6l18 8.5-18 8.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
