import { useState } from 'react'
import { ChatHeader } from '../components/ChatHeader'
import { ChatPanel } from '../components/ChatPanel'
import { botMessage, userMessage, type Message } from '../chat'
import { sendChat } from '../api'
import { wantsPlans, type StageId } from '../journey'
import { AdvanceBar } from '../components/AdvanceBar'
import { useT } from '../i18n'

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
  const { t, lang } = useT()
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
        lang,
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
      reply = await sendChat({
        sessionId,
        stage: 'retention',
        messages: next,
        lang,
      })
    } catch {
      reply = "Couldn't reach the assistant. Is the backend running?"
    }
    onAppend('retention', botMessage(reply))
    setTyping(false)
  }

  return (
    <>
      <ChatHeader title={t('ret.title')} subtitle={t('ret.subtitle')} />

      {/* Trigger row — simulates time passing so the AI reaches back out. */}
      <div className="flex items-center justify-between gap-2 border-b border-wa-divider bg-wa-panel px-4 py-2.5">
        <span className="font-mono text-[11px] text-wa-muted">
          {t('ret.simulate')}
        </span>
        <button
          type="button"
          onClick={nextDay}
          disabled={typing}
          className="flex items-center gap-1.5 bg-wa-green px-3 py-1.5 text-[12px] font-semibold text-[#04221c] transition-opacity disabled:opacity-40"
        >
          {t('ret.nextDay')} ⏭
        </button>
      </div>

      <ChatPanel
        messages={messages}
        typing={typing}
        onSend={handleSend}
        placeholder={t('ret.replyPlaceholder')}
        banner={
          followedUp && !typing ? (
            <AdvanceBar label={t('ret.seePlans')} onClick={onAdvance} />
          ) : null
        }
        emptyState={
          <div className="mx-auto mt-10 max-w-[80%] text-center">
            <p className="text-[15px] text-wa-text">{t('ret.emptyTitle')}</p>
            <p className="mt-1 text-[13px] text-wa-muted">
              {t('ret.emptyHint', { btn: t('ret.nextDay') })}
            </p>
          </div>
        }
      />
    </>
  )
}
