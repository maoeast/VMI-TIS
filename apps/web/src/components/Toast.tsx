import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function Toast() {
  const toast = useAppStore((state) => state.toast);

  if (!toast) return null;

  const Icon =
    toast.kind === 'success'
      ? CheckCircle2
      : toast.kind === 'error'
        ? XCircle
        : Info;

  const tone =
    toast.kind === 'success'
      ? 'border-emerald-300 text-emerald-900'
      : toast.kind === 'error'
        ? 'border-rose-300 text-rose-900'
        : 'border-teal-300 text-teal-900';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-xl ${tone}`}
      role="status"
    >
      <Icon className="h-5 w-5" />
      {toast.message}
    </div>
  );
}
