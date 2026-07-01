import {
  STAGES,
  type ChosenOption,
  type PaymentInfo,
  type StageId,
} from '../journey'

interface DevPanelProps {
  sessionId: string
  stageIndex: number
  completed: Record<StageId, boolean>
  email: string | null
  need: string | null
  chosenOption: ChosenOption | null
  payment: PaymentInfo | null
  onJump: (index: number) => void
  onReset: () => void
}

// Dev-only instrument panel. Not part of the customer-facing product — it shows
// which stage the tester is on, lets them jump between stages, reset the run,
// and see exactly what has been written to journey.json so far.
export function DevPanel({
  sessionId,
  stageIndex,
  completed,
  email,
  need,
  chosenOption,
  payment,
  onJump,
  onReset,
}: DevPanelProps) {
  return (
    <aside className="flex shrink-0 flex-col gap-5 border-wa-divider bg-[#0d1418] px-4 py-5 md:h-[100svh] md:w-64 md:overflow-y-auto md:border-r">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-tight text-wa-green">
          ◆ dev panel
        </span>
        <button
          type="button"
          onClick={onReset}
          title="Start a fresh run"
          className="flex items-center gap-1 border border-wa-divider px-2 py-1 font-mono text-[10px] text-wa-muted transition-colors hover:border-wa-green hover:text-wa-text"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          reset
        </button>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-wa-muted">
        not shown to the customer — jump between stages and watch the captured
        record grow.
      </p>

      {/* Stage stepper */}
      <ol className="flex flex-col">
        {STAGES.map((stage, i) => {
          const isCurrent = i === stageIndex
          const isDone = completed[stage.id]
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                className={[
                  'flex w-full items-center gap-2.5 border-l-2 px-2.5 py-2 text-left transition-colors',
                  isCurrent
                    ? 'border-wa-green bg-wa-green/10'
                    : 'border-transparent hover:bg-wa-header/60',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-5 w-5 shrink-0 place-items-center font-mono text-[11px] font-bold',
                    isCurrent
                      ? 'bg-wa-green text-[#04221c]'
                      : isDone
                        ? 'bg-wa-green/30 text-wa-green'
                        : 'bg-wa-divider text-wa-muted',
                  ].join(' ')}
                >
                  {isDone && !isCurrent ? '✓' : i + 1}
                </span>
                <span className="leading-tight">
                  <span
                    className={[
                      'block text-[13px] font-semibold',
                      isCurrent ? 'text-wa-text' : 'text-wa-muted',
                    ].join(' ')}
                  >
                    {stage.label}
                  </span>
                  <span className="block font-mono text-[10px] text-wa-muted">
                    {stage.hint}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* Live captured record */}
      <div className="border-t border-wa-divider pt-4">
        <p className="mb-2 font-mono text-[10px] text-wa-muted">
          captured → journey.json
        </p>
        <dl className="flex flex-col gap-2">
          <DataRow label="session" value={sessionId.slice(0, 8)} mono />
          <DataRow label="email" value={email} />
          <DataRow label="need" value={need} />
          <DataRow
            label="plan"
            value={
              chosenOption
                ? `${chosenOption.name} · $${chosenOption.price}`
                : null
            }
          />
          <DataRow
            label="payment"
            value={payment ? `PAID · ${payment.receiptNo}` : null}
            good={!!payment}
          />
        </dl>
      </div>
    </aside>
  )
}

function DataRow({
  label,
  value,
  mono = false,
  good = false,
}: {
  label: string
  value: string | null
  mono?: boolean
  good?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10px] text-wa-muted">{label}</dt>
      <dd
        className={[
          'break-words text-[12px]',
          mono ? 'font-mono' : '',
          value ? (good ? 'text-wa-green' : 'text-wa-text') : 'text-wa-divider',
        ].join(' ')}
      >
        {value || '—'}
      </dd>
    </div>
  )
}
