import {
  STAGES,
  type ChosenOption,
  type PaymentInfo,
  type StageId,
} from '../journey'
import { useT } from '../i18n'

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
  const { lang, setLang, t, tTier } = useT()
  return (
    <aside className="flex shrink-0 flex-col gap-5 border-wa-divider bg-[#0d1418] px-4 py-5 md:h-[100svh] md:w-64 md:overflow-y-auto md:border-r">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-tight text-wa-green">
          ◆ {t('dev.title')}
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
          {t('dev.reset')}
        </button>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-wa-muted">
        {t('dev.desc')}
      </p>

      {/* Language toggle — translates the whole UI. */}
      <div>
        <p className="mb-1.5 font-mono text-[10px] text-wa-muted">
          {t('dev.translate')}
        </p>
        <div className="flex border border-wa-divider">
          {(['en', 'zh'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={[
                'flex-1 py-1.5 text-[12px] font-semibold transition-colors',
                lang === l
                  ? 'bg-wa-green text-[#04221c]'
                  : 'text-wa-muted hover:text-wa-text',
              ].join(' ')}
            >
              {l === 'en' ? 'English' : '中文'}
            </button>
          ))}
        </div>
      </div>

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
                    {t(`stage.${stage.id}.label`)}
                  </span>
                  <span className="block font-mono text-[10px] text-wa-muted">
                    {t(`stage.${stage.id}.hint`)}
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
          {t('dev.captured')}
        </p>
        <dl className="flex flex-col gap-2">
          <DataRow label={t('dev.session')} value={sessionId.slice(0, 8)} mono />
          <DataRow label={t('dev.email')} value={email} />
          <DataRow label={t('dev.need')} value={need} />
          <DataRow
            label={t('dev.plan')}
            value={
              chosenOption
                ? `${tTier(chosenOption.id)?.name ?? chosenOption.name} · $${chosenOption.price}`
                : null
            }
          />
          <DataRow
            label={t('dev.payment')}
            value={payment ? `${t('dev.paid')} · ${payment.receiptNo}` : null}
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
