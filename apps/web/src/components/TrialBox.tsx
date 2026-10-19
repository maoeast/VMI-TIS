import { Check, X } from 'lucide-react';

interface TrialBoxProps {
  index: number;
  result?: 'pass' | 'fail' | null;
  active?: boolean;
}

export function TrialBox({ index, result, active = false }: TrialBoxProps) {
  return (
    <div
      className={
        result === 'pass'
          ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
          : result === 'fail'
            ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-300'
            : active
              ? 'flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-teal-500 bg-teal-50 text-teal-700'
              : 'flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400'
      }
      title={`第 ${index} 回合`}
    >
      {result === 'pass' ? (
        <Check className="h-4 w-4" />
      ) : result === 'fail' ? (
        <X className="h-4 w-4" />
      ) : (
        <span className="text-xs font-mono">{index}</span>
      )}
    </div>
  );
}
