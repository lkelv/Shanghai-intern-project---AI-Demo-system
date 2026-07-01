import { useState } from 'react'
import { ChatHeader } from '../components/ChatHeader'
import { ChatPanel } from '../components/ChatPanel'
import { botMessage, userMessage, type Message } from '../chat'
import { sendChat } from '../api'
import type { StageId } from '../journey'

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

interface AcquisitionProps {
  sessionId: string
  messages: Message[]
  onAppend: (stage: StageId, ...msgs: Message[]) => void
  onEmail: (email: string) => void
}

export function Acquisition({
  sessionId,
  messages,
  onAppend,
  onEmail,
}: AcquisitionProps) {
  const [typing, setTyping] = useState(false)

  async function handleSend(text: string) {
    const user = userMessage(text)
    const next = [...messages, user]
    onAppend('acquisition', user)
    setTyping(true)

    const email = text.match(EMAIL_RE)?.[0]
    if (email) onEmail(email.toLowerCase())

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
      />
    </>
  )
}
