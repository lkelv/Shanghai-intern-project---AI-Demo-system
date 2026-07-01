// Temporary client-side conversation logic for the FRONTEND demo only.
// Later this whole module is replaced by a call to the local backend, which
// owns the OpenRouter API key and the real system prompt. Keeping it isolated
// here means swapping in the real LLM is a one-function change in App.tsx.

export type Role = 'bot' | 'user'

export interface Message {
  id: string
  role: Role
  text: string
  time: string
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i

export interface BotState {
  askedForDetails: boolean
  email: string | null
  need: string | null
}

export const initialBotState: BotState = {
  askedForDetails: false,
  email: null,
  need: null,
}

export interface BotResult {
  reply: string
  state: BotState
  // Set once we have both an email and a described need — the App captures
  // this as a "lead" (which the backend will persist to leads.json later).
  lead: { email: string; need: string } | null
}

// Pure, deterministic stand-in for the model. Follows the guided flow:
// greet → answer → ask for email + need → confirm follow-up.
export function getBotReply(input: string, state: BotState): BotResult {
  const text = input.trim()
  const foundEmail = text.match(EMAIL_RE)?.[0] ?? null
  const next: BotState = { ...state }

  if (foundEmail) next.email = foundEmail

  // Whatever isn't the email on this turn is treated as the described need.
  const stripped = text.replace(EMAIL_RE, '').trim()
  if (!next.need && stripped.length > 2) next.need = stripped

  const firstTurn = !state.askedForDetails
  next.askedForDetails = true

  // Both pieces present (possibly from a single message) — capture the lead.
  if (next.email && next.need) {
    return {
      reply: `Thanks — got it. I've noted ${next.email} and passed your request along to the OnePromise team. Someone will follow up shortly. Anything else in the meantime?`,
      state: next,
      lead: { email: next.email, need: next.need },
    }
  }

  // Have a need but no email yet.
  if (next.need && !next.email) {
    return {
      reply: firstTurn
        ? "Hi! I'm the OnePromise assistant — happy to help with that. So we can follow up properly, what's the best email to reach you on?"
        : "Happy to get that moving. What's the best email to reach you on?",
      state: next,
      lead: null,
    }
  }

  // Have an email but nothing on what they need.
  if (next.email && !next.need) {
    return {
      reply:
        'Got your email, thanks. Could you tell me a little about what you need help with so I can route it to the right person?',
      state: next,
      lead: null,
    }
  }

  // Nothing useful yet — greet and prompt for both.
  return {
    reply:
      "Hi! I'm the OnePromise assistant — happy to help. So we can follow up properly, what's your email and a quick line on what you're looking for?",
    state: next,
    lead: null,
  }
}

export const greeting: Message = {
  id: 'greeting',
  role: 'bot',
  text: "👋 Hi there! I'm the OnePromise assistant. Ask me anything, and I can connect you with our team.",
  time: nowTime(),
}

export function nowTime(): string {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
