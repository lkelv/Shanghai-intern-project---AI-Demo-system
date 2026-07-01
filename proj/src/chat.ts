export type Role = 'bot' | 'user'

export interface Message {
  id: string
  role: Role
  text: string
  time: string
}

export function nowTime(): string {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const GREETING_TEXT =
  "👋 Hi there! I'm the OnePromise assistant. Ask me anything, and I can connect you with our team."

// A fresh greeting message — used on first load and whenever the chat restarts.
export function makeGreeting(): Message {
  return {
    id: `greeting-${Math.random().toString(36).slice(2)}`,
    role: 'bot',
    text: GREETING_TEXT,
    time: nowTime(),
  }
}
