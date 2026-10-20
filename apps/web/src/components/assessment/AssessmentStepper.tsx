interface AssessmentStepperProps {
  steps: Array<{ index: number; title: string; hint?: string }>;
  current: number;
  disabled?: number[];
  onSelect: (step: number) => void;
}

function stepCircleClass(isCurrent: boolean, isDone: boolean, isDisabled: boolean) {
  if (isDisabled) {
    return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400';
  }
  if (isCurrent) {
    return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F4C5C] text-xs font-bold text-white';
  }
  if (isDone) {
    return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800';
  }
  return 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600';
}

export function AssessmentStepper({
  steps,
  current,
  disabled = [],
  onSelect,
}: AssessmentStepperProps) {
  return (
    <ol className="mb-4 flex flex-wrap items-stretch gap-1.5 rounded-xl bg-white p-1.5 shadow-sm">
      {steps.map((step) => {
        const isCurrent = step.index === current;
        const isDisabled = disabled.includes(step.index);
        const isDone = step.index < current && !isDisabled;
        return (
          <li key={step.index} className="min-w-[150px] flex-1">
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(step.index)}
              className={
                isCurrent
                  ? 'flex w-full items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-left'
                  : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
              }
            >
              <span
                className={stepCircleClass(isCurrent, isDone, isDisabled)}
              >
                {step.index}
              </span>
              <span className="min-w-0">
                <span
                  className={
                    isDisabled
                      ? 'block truncate text-xs font-bold text-slate-400'
                      : 'block truncate text-xs font-bold text-slate-700'
                  }
                >
                  {step.title}
                </span>
                {step.hint && (
                  <span className="block truncate text-[10px] text-slate-400">
                    {step.hint}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
