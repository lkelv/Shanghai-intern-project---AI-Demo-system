import { useEffect, useRef, useState } from 'react'
import { botMessage, userMessage, type Message } from '../chat'
import { sendChat, saveOrder } from '../api'
import type { ChosenOption, Catalog, StageId } from '../journey'
import catalogData from '../../products.json'

const catalog = catalogData as Catalog

interface ConversionProps {
  sessionId: string
  messages: Message[]
  priorMessages: Message[]
  onAppend: (stage: StageId, ...msgs: Message[]) => void
  chosenOption: ChosenOption | null
  onChoose: (option: ChosenOption) => void
  onContinue: () => void
}

export function Conversion({
  sessionId,
  messages,
  priorMessages,
  onAppend,
  chosenOption,
  onChoose,
  onContinue,
}: ConversionProps) {
  const [typing, setTyping] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const requested = useRef(false)

  // When the screen first opens, ask the AI to present the options and
  // recommend one — using the earlier conversation as context so it always
  // has something concrete to work from.
  useEffect(() => {
    if (requested.current || messages.length > 0) return
    requested.current = true
    ;(async () => {
      setTyping(true)
      try {
        const reply = await sendChat({
          sessionId,
          stage: 'conversion',
          messages: priorMessages,
          nudge: true,
        })
        onAppend('conversion', botMessage(reply))
      } catch {
        onAppend(
          'conversion',
          botMessage("Couldn't reach the assistant. Is the backend running?"),
        )
      }
      setTyping(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSend(text: string) {
    const user = userMessage(text)
    const next = [...messages, user]
    onAppend('conversion', user)
    setTyping(true)
    let reply: string
    try {
      reply = await sendChat({ sessionId, stage: 'conversion', messages: next })
    } catch {
      reply = "Couldn't reach the assistant. Is the backend running?"
    }
    onAppend('conversion', botMessage(reply))
    setTyping(false)
  }

  async function choose(tierId: string) {
    setSaving(tierId)
    try {
      const option = await saveOrder(sessionId, tierId)
      onChoose(option)
    } catch {
      /* ignore for demo */
    }
    setSaving(null)
  }

  return (
    <>
      <header className="flex items-center justify-between bg-wa-header px-4 py-3">
        <div className="leading-tight">
          <p className="font-semibold text-wa-text">Choose your plan</p>
          <p className="font-mono text-[11px] text-wa-muted">{catalog.name}</p>
        </div>
        <span className="font-mono text-[11px] text-wa-muted">
          {catalog.currency}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-wa-bg px-3 py-4">
        {/* AI recommendation + Q&A */}
        <div>
          <p className="mb-2 font-mono text-[11px] text-wa-muted">
            assistant · recommendation
          </p>
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
                    'wa-pop max-w-[85%] px-3 py-2 text-[14px] leading-snug text-wa-text',
                    m.role === 'user'
                      ? 'rounded-lg rounded-tr-sm bg-wa-out'
                      : 'rounded-lg rounded-tl-sm bg-wa-in',
                  ].join(' ')}
                >
                  {m.text}
                </div>
              </li>
            ))}
            {typing && (
              <li className="flex justify-start">
                <div className="flex items-center gap-1 rounded-lg bg-wa-in px-4 py-3">
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

        {/* Options — always shown, presented after the assistant's message */}
        <div className="mt-5 border-t border-wa-divider pt-4">
          <p className="mb-3 font-mono text-[11px] text-wa-muted">
            choose a plan
          </p>
          <ul className="flex flex-col gap-3">
            {catalog.tiers.map((tier) => {
              const selected = chosenOption?.id === tier.id
              return (
                <li
                  key={tier.id}
                  className={[
                    'border bg-wa-panel p-4 transition-colors',
                    selected
                      ? 'border-wa-green'
                      : 'border-wa-divider hover:border-wa-muted',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[16px] font-semibold text-wa-text">
                      {tier.name}
                    </h3>
                    <span className="font-mono text-[18px] font-bold text-wa-text">
                      ${tier.price}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-wa-muted">{tier.blurb}</p>
                  <ul className="mt-3 flex flex-col gap-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2 text-[13px] text-wa-text">
                        <span className="text-wa-green">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => choose(tier.id)}
                    disabled={saving === tier.id}
                    className={[
                      'mt-4 w-full py-2 text-[13px] font-semibold transition-colors',
                      selected
                        ? 'bg-wa-green text-[#04221c]'
                        : 'border border-wa-green text-wa-green hover:bg-wa-green/10',
                    ].join(' ')}
                  >
                    {selected
                      ? '✓ Selected'
                      : saving === tier.id
                        ? 'Saving…'
                        : `Choose ${tier.name}`}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Continue bar */}
      {chosenOption && (
        <button
          type="button"
          onClick={onContinue}
          className="wa-pop flex items-center justify-between bg-wa-green px-4 py-3 text-[14px] font-semibold text-[#04221c]"
        >
          <span>
            Continue to payment · {chosenOption.name} ${chosenOption.price}
          </span>
          <span>→</span>
        </button>
      )}

      {/* Question composer */}
      <Composer onSend={handleSend} disabled={typing} />
    </>
  )
}

function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [input, setInput] = useState('')
  function send() {
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
  }
  return (
    <div className="flex items-center gap-2 bg-wa-header px-3 py-3">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Ask about the plans…"
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
  )
}
