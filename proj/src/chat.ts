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

const GREETING_TEXT: Record<'en' | 'zh', string> = {
  en: "👋 Hi there! I'm the OnePromise assistant. Ask me anything about our AI Training Course, and I can connect you with our team.",
  zh: '👋 你好！我是 OnePromise 助手。关于我们的 AI 培训课程，欢迎随时咨询，我也可以帮你联系团队。',
}

// A fresh greeting for the acquisition screen — used on load and on restart.
// Given a stable id so we can detect a still-untouched chat and swap languages.
export function makeGreeting(lang: 'en' | 'zh' = 'en'): Message {
  return { id: 'greeting', role: 'bot', text: GREETING_TEXT[lang], time: nowTime() }
}
