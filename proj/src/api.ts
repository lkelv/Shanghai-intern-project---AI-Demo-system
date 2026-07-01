import type { Message } from './chat'
import type { ChosenOption, PaymentInfo, StageId } from './journey'

// Convert our UI messages to the {role, content} shape the backend/LLM expects.
function toWire(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text,
  }))
}

interface ChatArgs {
  sessionId: string
  stage: StageId
  messages: Message[]
  nudge?: boolean
  context?: { option?: ChosenOption }
}

// One API for every screen. Returns the assistant's reply text.
export async function sendChat({
  sessionId,
  stage,
  messages,
  nudge = false,
  context,
}: ChatArgs): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      stage,
      nudge,
      context,
      messages: toWire(messages),
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data.reply as string
}

export async function saveOrder(
  sessionId: string,
  optionId: string,
): Promise<ChosenOption> {
  const res = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, optionId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Could not save order')
  return data.chosenOption as ChosenOption
}

interface PaymentArgs {
  sessionId: string
  cardName: string
  cardNumber: string
}

export async function savePayment({
  sessionId,
  cardName,
  cardNumber,
}: PaymentArgs): Promise<PaymentInfo> {
  const res = await fetch('/api/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, cardName, cardNumber }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Payment failed')
  return data.payment as PaymentInfo
}
