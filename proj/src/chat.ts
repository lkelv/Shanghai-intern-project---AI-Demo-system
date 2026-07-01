export type Role = 'bot' | 'user'

export interface Message {
  id: string
  role: Role
  text: string
  time: string
}

export function makeId(): string {
  return Math.random().toString(36).slice(2)
}

export function nowTime(): string {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function botMessage(text: string): Message {
  return { id: makeId(), role: 'bot', text, time: nowTime() }
}

export function userMessage(text: string): Message {
  return { id: makeId(), role: 'user', text, time: nowTime() }
}

const GREETING_TEXT =
  "👋 Hi there! I'm the OnePromise assistant. Ask me anything about our AI Training Course, and I can connect you with our team."

// A fresh greeting for the acquisition screen — used on load and on restart.
export function makeGreeting(): Message {
  return botMessage(GREETING_TEXT)
}
