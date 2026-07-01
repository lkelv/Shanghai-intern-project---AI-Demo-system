import { useState } from 'react'
import { ChatHeader } from '../components/ChatHeader'
import { ChatPanel } from '../components/ChatPanel'
import { botMessage, userMessage, type Message } from '../chat'
import { sendChat } from '../api'
import { wantsPlans, type StageId } from '../journey'
import { AdvanceBar } from '../components/AdvanceBar'

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

interface AcquisitionProps {
  sessionId: string
  messages: Message[]
  emailCaptured: boolean
  onAppend: (stage: StageId, ...msgs: Message[]) => void
  onEmail: (email: string) => void
  onAdvance: () => void
}

export function Acquisition({
  sessionId,
  messages,
  emailCaptured,
  onAppend,
  onEmail,
  onAdvance,
}: AcquisitionProps) {
  const [typing, setTyping] = useState(false)

  async function handleSend(text: string) {
    const user = userMessage(text)
    const next = [...messages, user]
    const email = text.match(EMAIL_RE)?.[0]
    if (email) onEmail(email.toLowerCase())

    // If they open by asking about pricing / wanting to buy, move them onward
    // (to the retention follow-up, keeping the journey in order). Still fire the
    // chat call in the background (when an email is present) so the lead is
    // captured to journey.json before we move on.
    if (wantsPlans(text)) {
      onAppend('acquisition', user)
      if (email) {
        sendChat({ sessionId, stage: 'acquisition', messages: next }).catch(
          () => {},
        )
      }
      onAdvance()
      return
    }

    onAppend('acquisition', user)
    setTyping(true)

    let reply: string
    try {
      reply = await sendChat({ sessionId, stage: 'acquisition', messages: next })
    } catch {
      reply =
        "Sorry — I couldn't reach the assistant just now. Make sure the backend is running and try again."
    }
    onAppend('acquisition', botMessage(reply))
    setTyping(false)
  }

  return (
    <>
      <ChatHeader
        title="OnePromise Assistant"
        subtitle="online · replies instantly"
      />
      <ChatPanel
        messages={messages}
        typing={typing}
        onSend={handleSend}
        placeholder="Type a message"
        banner={
          emailCaptured && !typing ? (
            <AdvanceBar label="Continue to follow-up" onClick={onAdvance} />
          ) : null
        }
      />
    </>
  )
}
