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

export const greeting: Message = {
  id: 'greeting',
  role: 'bot',
  text: "👋 Hi there! I'm the OnePromise assistant. Ask me anything, and I can connect you with our team.",
  time: nowTime(),
}
