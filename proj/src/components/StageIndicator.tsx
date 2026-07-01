import { STAGES, type StageId } from '../journey'

interface StageIndicatorProps {
  currentIndex: number
  completed: Record<StageId, boolean>
  onJump: (index: number) => void
}

// Four-step progress strip. Steps are clickable so the tester can move between
// stages; completed stages show a check, the current one is highlighted.
export function StageIndicator({
  currentIndex,
  completed,
  onJump,
}: StageIndicatorProps) {
  return (
    <ol className="flex items-stretch">
      {STAGES.map((stage, i) => {
        const isCurrent = i === currentIndex
        const isDone = completed[stage.id]
        return (
          <li key={stage.id} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onJump(i)}
              className={[
                'flex flex-1 flex-col items-center gap-1 px-1 py-2 transition-colors',
                isCurrent ? 'bg-wa-green/15' : 'hover:bg-wa-header/60',
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
              <span
                className={[
                  'max-w-full truncate text-[11px] font-semibold',
                  isCurrent ? 'text-wa-text' : 'text-wa-muted',
                ].join(' ')}
              >
                {stage.label}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <span className="h-px w-2 shrink-0 bg-wa-divider" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
