interface AdvanceBarProps {
  label: string
  onClick: () => void
}

// The customer-facing "move to the next stage" call to action. Shown once a
// stage's goal is met so the tester can walk the journey in order.
export function AdvanceBar({ label, onClick }: AdvanceBarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-pop flex items-center justify-between bg-wa-green px-4 py-3 text-[14px] font-semibold text-[#04221c] transition-opacity hover:opacity-90"
    >
      <span>{label}</span>
      <span>→</span>
    </button>
  )
}
