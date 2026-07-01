import type { Message } from './chat'

export type StageId = 'acquisition' | 'retention' | 'conversion' | 'payment'

export interface StageDef {
  id: StageId
  label: string
  hint: string
}

export const STAGES: StageDef[] = [
  { id: 'acquisition', label: 'Acquisition', hint: 'First contact' },
  { id: 'retention', label: 'Retention', hint: 'Follow-up' },
  { id: 'conversion', label: 'Conversion', hint: 'Choose a plan' },
  { id: 'payment', label: 'Payment', hint: 'Checkout' },
]

export interface ProductTier {
  id: string
  name: string
  price: number
  blurb: string
  features: string[]
}

export interface Catalog {
  name: string
  currency: string
  tiers: ProductTier[]
}

export interface ChosenOption {
  id: string
  name: string
  price: number
}

export interface PaymentInfo {
  status: 'paid'
  cardName: string
  last4: string
  amount: number
  currency: string
  receiptNo: string
  paidAt: string
}

// Client-side view of the run. The backend journey.json is the source of truth;
// this mirror drives the UI and persists across reloads via localStorage.
export interface RunState {
  sessionId: string
  stageIndex: number
  messages: Record<StageId, Message[]>
  email: string | null
  need: string | null
  chosenOption: ChosenOption | null
  payment: PaymentInfo | null
}
