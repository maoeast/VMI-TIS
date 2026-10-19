import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: 'teal' | 'sky' | 'amber' | 'rose';
}

const TONES: Record<string, string> = {
  teal: 'bg-teal-50 text-teal-700',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'teal',
}: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="truncate text-xl font-bold text-slate-800">{value}</div>
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}
