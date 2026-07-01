import { useState } from 'react'
import { ChatHeader } from '../components/ChatHeader'
import { ChatPanel } from '../components/ChatPanel'
import { botMessage, userMessage, type Message } from '../chat'
import { sendChat } from '../api'
import { wantsPlans, type StageId } from '../journey'
import { AdvanceBar } from '../components/AdvanceBar'

interface RetentionProps {
  sessionId: string
  messages: Message[]
  onAppend: (stage: StageId, ...msgs: Message[]) => void
  onAdvance: () => void
}

export function Retention({
  sessionId,
  messages,
  onAppend,
  onAdvance,
}: RetentionProps) {
  const [typing, setTyping] = useState(false)
  const followedUp = messages.some((m) => m.role === 'bot')

  async function nextDay() {
    setTyping(true)
    let reply: string
    try {
      reply = await sendChat({
        sessionId,
        stage: 'retention',
        messages,
        nudge: true,
      })
    } catch {
      reply = "Couldn't reach the assistant. Is the backend running?"
    }
    onAppend('retention', botMessage(reply))
    setTyping(false)
  }

  async function handleSend(text: string) {
    // If the customer asks to see plans/pricing, take them straight to the
    // Conversion screen (which lays the options out properly) instead of
    // answering with a wall of text here.
    if (wantsPlans(text)) {
      onAppend('retention', userMessage(text))
      onAdvance()
      return
    }

    const user = userMessage(text)
    const next = [...messages, user]
    onAppend('retention', user)
    setTyping(true)
    let reply: string
    try {
      reply = await sendChat({ sessionId, stage: 'retention', messages: next })
    } catch {
      reply = "Couldn't reach the assistant. Is the backend running?"
    }
    onAppend('retention', botMessage(reply))
    setTyping(false)
  }

  return (
    <>
      <ChatHeader title="OnePromise · Follow-up" subtitle="day 2 · re-engaging" />

      {/* Trigger row — simulates time passing so the AI reaches back out. */}
      <div className="flex items-center justify-between gap-2 border-b border-wa-divider bg-wa-panel px-4 py-2.5">
        <span className="font-mono text-[11px] text-wa-muted">
          simulate the passage of time
        </span>
        <button
          type="button"
          onClick={nextDay}
          disabled={typing}
          className="flex items-center gap-1.5 bg-wa-green px-3 py-1.5 text-[12px] font-semibold text-[#04221c] transition-opacity disabled:opacity-40"
        >
          Next day ⏭
        </button>
      </div>

      <ChatPanel
        messages={messages}
        typing={typing}
        onSend={handleSend}
        placeholder="Reply to the follow-up…"
        banner={
          followedUp && !typing ? (
            <AdvanceBar label="See the plans" onClick={onAdvance} />
          ) : null
        }
        emptyState={
          <div className="mx-auto mt-10 max-w-[80%] text-center">
            <p className="text-[15px] text-wa-text">A day goes by…</p>
            <p className="mt-1 text-[13px] text-wa-muted">
              Hit <span className="font-semibold">Next day</span> to have the
              assistant follow up and re-engage the customer.
            </p>
          </div>
        }
      />
    </>
  )
}
