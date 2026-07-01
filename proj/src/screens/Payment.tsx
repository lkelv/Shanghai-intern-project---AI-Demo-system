import { useEffect, useRef, useState } from 'react'
import { botMessage, type Message } from '../chat'
import { sendChat, savePayment } from '../api'
import type { ChosenOption, PaymentInfo, StageId } from '../journey'

interface PaymentProps {
  sessionId: string
  chosenOption: ChosenOption | null
  email: string | null
  payment: PaymentInfo | null
  messages: Message[]
  onAppend: (stage: StageId, ...msgs: Message[]) => void
  onPaid: (payment: PaymentInfo) => void
}

export function Payment({
  sessionId,
  chosenOption,
  email,
  payment,
  messages,
  onAppend,
  onPaid,
}: PaymentProps) {
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [paying, setPaying] = useState(false)
  const confirmed = useRef(false)

  // After payment lands, ask the AI to confirm the order (once).
  useEffect(() => {
    if (!payment || confirmed.current || messages.length > 0) return
    confirmed.current = true
    ;(async () => {
      try {
        const reply = await sendChat({
          sessionId,
          stage: 'payment',
          messages: [],
          nudge: true,
          context: chosenOption ? { option: chosenOption } : undefined,
        })
        onAppend('payment', botMessage(reply))
      } catch {
        /* confirmation is best-effort */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment])

  const digits = cardNumber.replace(/\D/g, '')
  const canPay = cardName.trim().length > 1 && digits.length >= 12 && !paying

  async function pay() {
    if (!canPay) return
    setPaying(true)
    try {
      const info = await savePayment({ sessionId, cardName, cardNumber })
      onPaid(info)
    } catch {
      /* ignore for demo */
    }
    setPaying(false)
  }

  if (!chosenOption) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-neutral-100 px-6 text-center">
        <p className="text-[14px] text-neutral-500">
          No plan selected yet. Go back to the Conversion stage and choose one.
        </p>
      </div>
    )
  }

  // ---- Receipt ----
  if (payment) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-neutral-100 text-neutral-900">
        <CheckoutHeader />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-[380px] wa-pop">
          <div className="border border-neutral-300 bg-white">
            <div className="flex items-center gap-3 border-b border-neutral-200 bg-emerald-600 px-5 py-4 text-white">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg">
                ✓
              </span>
              <div className="leading-tight">
                <p className="font-semibold">Payment successful</p>
                <p className="font-mono text-[11px] text-emerald-100">
                  {payment.receiptNo}
                </p>
              </div>
            </div>
            <dl className="divide-y divide-neutral-200 px-5 text-[13px]">
              <Row label="Item" value={`${chosenOption.name} — ${payment.currency} $${payment.amount}`} />
              <Row label="Card" value={`${payment.cardName} · •••• ${payment.last4}`} />
              <Row label="Email" value={email || '—'} />
              <Row
                label="Paid"
                value={new Date(payment.paidAt).toLocaleString()}
              />
              <Row label="Status" value="PAID" strong />
            </dl>
          </div>

          {messages.length > 0 && (
            <div className="mt-4 border-l-2 border-emerald-500 bg-white px-4 py-3 text-[14px] text-neutral-800">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-neutral-400">
                assistant
              </p>
              {messages.map((m) => (
                <p key={m.id} className="whitespace-pre-wrap">
                  {m.text}
                </p>
              ))}
            </div>
          )}

          <p className="mt-4 text-center font-mono text-[11px] text-neutral-400">
            demo · no real payment was taken · saved to journey.json
          </p>
        </div>
        </div>
      </div>
    )
  }

  // ---- Checkout form ----
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-100 text-neutral-900">
      <CheckoutHeader />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-[380px]">
        {/* Order summary */}
        <div className="flex items-center justify-between border border-neutral-300 bg-white px-4 py-3">
          <div>
            <p className="text-[14px] font-medium">{chosenOption.name}</p>
            <p className="text-[12px] text-neutral-500">OnePromise AI Course</p>
          </div>
          <span className="font-mono text-[18px] font-bold">
            ${chosenOption.price}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-neutral-600">
            Card details
          </span>
          <CardBrands />
        </div>

        {/* Card form */}
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Name on card">
            <input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Jane Customer"
              className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-neutral-900"
            />
          </Field>
          <Field label="Card number">
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCard(e.target.value))}
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              className="w-full border border-neutral-300 bg-white px-3 py-2.5 font-mono text-[14px] outline-none focus:border-neutral-900"
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Expiry">
              <input
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full border border-neutral-300 bg-white px-3 py-2.5 font-mono text-[14px] outline-none focus:border-neutral-900"
              />
            </Field>
            <Field label="CVC">
              <input
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                placeholder="123"
                className="w-full border border-neutral-300 bg-white px-3 py-2.5 font-mono text-[14px] outline-none focus:border-neutral-900"
              />
            </Field>
          </div>
        </div>

        <button
          type="button"
          onClick={pay}
          disabled={!canPay}
          className="mt-5 flex w-full items-center justify-center gap-2 bg-neutral-900 py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {paying ? 'Processing…' : `Pay $${chosenOption.price}`}
        </button>
        <p className="mt-3 text-center font-mono text-[11px] text-neutral-400">
          No real money moves — this is a mock checkout.
        </p>
        </div>
      </div>
    </div>
  )
}

function CheckoutHeader() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-900" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <p className="text-[15px] font-semibold text-neutral-900">
          Secure checkout
        </p>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-400">
        test mode
      </span>
    </header>
  )
}

function CardBrands() {
  const brands = [
    { label: 'VISA', cls: 'text-[#1a1f71]' },
    { label: 'MC', cls: 'text-[#eb001b]' },
    { label: 'AMEX', cls: 'text-[#2e77bc]' },
  ]
  return (
    <div className="flex items-center gap-1">
      {brands.map((b) => (
        <span
          key={b.label}
          className={`border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold ${b.cls}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={
          strong ? 'font-semibold text-emerald-700' : 'text-neutral-900'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-[12px] font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  )
}

function formatCard(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
