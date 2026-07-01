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

// Conversion is styled as a storefront / pricing page — a different "app" from
// the WhatsApp chat, with a small AI shopping assistant plugged in.
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

  // On open, have the assistant present the options and recommend one, using
  // the earlier conversation as context so it always has something concrete.
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
    <div className="flex min-h-0 flex-1 flex-col bg-white text-neutral-900">
      {/* Store app header */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center bg-neutral-900 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">OnePromise Store</p>
            <p className="font-mono text-[10px] text-neutral-400">
              store / ai-training-course
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-neutral-400">
          {catalog.currency}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <h2 className="text-[21px] font-semibold tracking-tight">
          Choose your plan
        </h2>
        <p className="mt-0.5 text-[13px] text-neutral-500">{catalog.name}</p>

        {/* AI shopping-assistant recommendation */}
        {(messages.length > 0 || typing) && (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
              <span>★</span> Recommended for you
            </p>
            <div className="flex flex-col gap-2">
              {messages.map((m) =>
                m.role === 'bot' ? (
                  <p
                    key={m.id}
                    className="whitespace-pre-wrap text-[13.5px] leading-snug text-neutral-800"
                  >
                    {m.text}
                  </p>
                ) : (
                  <p
                    key={m.id}
                    className="self-end bg-neutral-900 px-2.5 py-1 text-[12.5px] text-white"
                  >
                    {m.text}
                  </p>
                ),
              )}
              {typing && (
                <span className="flex items-center gap-1">
                  <span className="wa-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span
                    className="wa-dot h-1.5 w-1.5 rounded-full bg-emerald-500"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <span
                    className="wa-dot h-1.5 w-1.5 rounded-full bg-emerald-500"
                    style={{ animationDelay: '0.4s' }}
                  />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pricing cards */}
        <ul className="mt-5 flex flex-col gap-3">
          {catalog.tiers.map((tier) => {
            const selected = chosenOption?.id === tier.id
            return (
              <li
                key={tier.id}
                className={[
                  'relative border bg-white p-4 transition-colors',
                  selected
                    ? 'border-emerald-500 ring-1 ring-emerald-500'
                    : tier.popular
                      ? 'border-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400',
                ].join(' ')}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-4 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[17px] font-semibold">{tier.name}</h3>
                  <span className="font-mono text-[20px] font-bold">
                    ${tier.price}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-neutral-500">{tier.blurb}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[13px] text-neutral-700">
                      <span className="text-emerald-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => choose(tier.id)}
                  disabled={saving === tier.id}
                  className={[
                    'mt-4 w-full py-2.5 text-[13px] font-semibold transition-colors',
                    selected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 text-white hover:bg-neutral-700',
                  ].join(' ')}
                >
                  {selected
                    ? '✓ Selected'
                    : saving === tier.id
                      ? 'Adding…'
                      : `Choose ${tier.name}`}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Continue to checkout */}
      {chosenOption && (
        <button
          type="button"
          onClick={onContinue}
          className="wa-pop flex items-center justify-between bg-emerald-600 px-4 py-3.5 text-[14px] font-semibold text-white"
        >
          <span>
            Checkout · {chosenOption.name} ${chosenOption.price}
          </span>
          <span>→</span>
        </button>
      )}

      {/* Assistant question box (store help widget) */}
      <Composer onSend={handleSend} disabled={typing} />
    </div>
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
    <div className="flex items-center gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-2.5">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
        placeholder="Ask the assistant about the plans…"
        disabled={disabled}
        className="flex-1 border border-neutral-300 bg-white px-3 py-2 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={send}
        disabled={!input.trim() || disabled}
        aria-label="Send message"
        className="grid h-10 w-10 shrink-0 place-items-center bg-neutral-900 text-white transition-opacity disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 20.5v-6l9-2.5-9-2.5v-6l18 8.5-18 8.5z" />
        </svg>
      </button>
    </div>
  )
}
