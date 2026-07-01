import { useEffect, useState } from 'react'
import { makeGreeting, type Message } from './chat'
import { STAGES, type ChosenOption, type PaymentInfo, type RunState, type StageId } from './journey'
import { StageIndicator } from './components/StageIndicator'
import { Acquisition } from './screens/Acquisition'
import { Retention } from './screens/Retention'
import { Conversion } from './screens/Conversion'
import { Payment } from './screens/Payment'

const STORAGE_KEY = 'op_run_v2'

function newSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sess-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

function freshRun(): RunState {
  return {
    sessionId: newSessionId(),
    stageIndex: 0,
    messages: {
      acquisition: [makeGreeting()],
      retention: [],
      conversion: [],
      payment: [],
    },
    email: null,
    need: null,
    chosenOption: null,
    payment: null,
  }
}

function loadRun(): RunState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as RunState
      if (parsed?.sessionId && parsed.messages) return parsed
    }
  } catch {
    /* fall through to a fresh run */
  }
  return freshRun()
}

function App() {
  const [run, setRun] = useState<RunState>(loadRun)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(run))
    } catch {
      /* storage full / unavailable — non-fatal for the demo */
    }
  }, [run])

  function update(partial: Partial<RunState>) {
    setRun((r) => ({ ...r, ...partial }))
  }

  function appendMessage(stage: StageId, ...msgs: Message[]) {
    setRun((r) => ({
      ...r,
      messages: { ...r.messages, [stage]: [...r.messages[stage], ...msgs] },
    }))
  }

  function goToStage(index: number) {
    setRun((r) => ({ ...r, stageIndex: Math.max(0, Math.min(3, index)) }))
  }

  function reset() {
    const fresh = freshRun()
    setRun(fresh)
  }

  const completed: Record<StageId, boolean> = {
    acquisition: run.email != null,
    retention: run.messages.retention.some((m) => m.role === 'bot'),
    conversion: run.chosenOption != null,
    payment: run.payment != null,
  }

  const stage = STAGES[run.stageIndex]

  return (
    <div className="flex min-h-full items-stretch justify-center bg-[#0a0f12] sm:items-center sm:py-8">
      <div className="wa-rise flex h-[100svh] w-full flex-col overflow-hidden bg-wa-panel sm:h-[820px] sm:max-w-[460px] sm:border sm:border-wa-divider">
        {/* Title row: app name + reset */}
        <div className="flex items-center justify-between border-b border-wa-divider bg-wa-panel px-3 py-2">
          <span className="font-mono text-[11px] tracking-tight text-wa-muted">
            OnePromise · journey demo
          </span>
          <button
            type="button"
            onClick={reset}
            title="Start a fresh run"
            className="flex shrink-0 items-center gap-1.5 border border-wa-divider px-2.5 py-1 font-mono text-[11px] text-wa-muted transition-colors hover:border-wa-green hover:text-wa-text"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>

        {/* Progress */}
        <div className="border-b border-wa-divider bg-wa-panel">
          <StageIndicator
            currentIndex={run.stageIndex}
            completed={completed}
            onJump={goToStage}
          />
        </div>

        {/* Active screen */}
        <div className="flex min-h-0 flex-1 flex-col">
          {stage.id === 'acquisition' && (
            <Acquisition
              sessionId={run.sessionId}
              messages={run.messages.acquisition}
              onAppend={appendMessage}
              onEmail={(email) => update({ email })}
            />
          )}
          {stage.id === 'retention' && (
            <Retention
              sessionId={run.sessionId}
              messages={run.messages.retention}
              onAppend={appendMessage}
            />
          )}
          {stage.id === 'conversion' && (
            <Conversion
              sessionId={run.sessionId}
              messages={run.messages.conversion}
              onAppend={appendMessage}
              chosenOption={run.chosenOption}
              onChoose={(option: ChosenOption) => update({ chosenOption: option })}
              onContinue={() => goToStage(3)}
            />
          )}
          {stage.id === 'payment' && (
            <Payment
              sessionId={run.sessionId}
              chosenOption={run.chosenOption}
              email={run.email}
              payment={run.payment}
              messages={run.messages.payment}
              onAppend={appendMessage}
              onPaid={(payment: PaymentInfo) => update({ payment })}
            />
          )}
        </div>

        {/* Stage nav footer */}
        <div className="flex items-center justify-between border-t border-wa-divider bg-wa-header px-3 py-2">
          <button
            type="button"
            onClick={() => goToStage(run.stageIndex - 1)}
            disabled={run.stageIndex === 0}
            className="px-2 py-1 font-mono text-[11px] text-wa-muted transition-colors hover:text-wa-text disabled:opacity-30"
          >
            ← Back
          </button>
          <span className="font-mono text-[11px] text-wa-muted">
            {run.stageIndex + 1} / {STAGES.length} · {stage.label}
          </span>
          <button
            type="button"
            onClick={() => goToStage(run.stageIndex + 1)}
            disabled={run.stageIndex === STAGES.length - 1}
            className="px-2 py-1 font-mono text-[11px] font-semibold text-wa-green transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
