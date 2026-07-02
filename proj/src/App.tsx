import { useEffect, useState } from 'react'
import { makeGreeting, type Message } from './chat'
import { STAGES, type ChosenOption, type PaymentInfo, type RunState, type StageId } from './journey'
import { DevPanel } from './components/DevPanel'
import { PhoneStatusBar } from './components/PhoneStatusBar'
import { Acquisition } from './screens/Acquisition'
import { Retention } from './screens/Retention'
import { Conversion } from './screens/Conversion'
import { Payment } from './screens/Payment'

const STORAGE_KEY = 'op_run_v2'

// Which phone-chrome tint each stage's "app" uses.
const STATUS_VARIANT: Record<StageId, 'whatsapp' | 'store' | 'checkout'> = {
  acquisition: 'whatsapp',
  retention: 'whatsapp',
  conversion: 'store',
  payment: 'checkout',
}

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
    <div className="flex min-h-[100svh] flex-col bg-[#0a0f12] md:flex-row">
      {/* Dev-only instrument — not part of the customer product */}
      <DevPanel
        sessionId={run.sessionId}
        stageIndex={run.stageIndex}
        completed={completed}
        email={run.email}
        need={run.need}
        chosenOption={run.chosenOption}
        payment={run.payment}
        onJump={goToStage}
        onReset={reset}
      />

      {/* The product: just the chat / options */}
      <main className="flex flex-1 items-stretch justify-center md:items-center md:py-8">
        <div className="wa-rise flex h-[100svh] w-full flex-col overflow-hidden bg-wa-panel md:h-[780px] md:max-w-[460px] md:border md:border-wa-divider">
          <PhoneStatusBar variant={STATUS_VARIANT[stage.id]} />

          {stage.id === 'acquisition' && (
            <Acquisition
              sessionId={run.sessionId}
              messages={run.messages.acquisition}
              emailCaptured={run.email != null}
              onAppend={appendMessage}
              onEmail={(email) => update({ email })}
              onAdvance={() => goToStage(1)}
              onSkipToPlans={() => goToStage(2)}
            />
          )}
          {stage.id === 'retention' && (
            <Retention
              sessionId={run.sessionId}
              messages={run.messages.retention}
              onAppend={appendMessage}
              onAdvance={() => goToStage(2)}
            />
          )}
          {stage.id === 'conversion' && (
            <Conversion
              sessionId={run.sessionId}
              messages={run.messages.conversion}
              priorMessages={[
                ...run.messages.acquisition,
                ...run.messages.retention,
              ]}
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
      </main>
    </div>
  )
}

export default App
