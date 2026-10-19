import { useEffect, useState } from 'react';
import { Eye, LockKeyhole } from 'lucide-react';

interface EyeRestOverlayProps {
  open: boolean;
  onUnlock: () => void;
  onRestFinished: () => void;
}

/**
 * 15 分钟数字训练硬锁遮罩：
 * 全屏不可跳过；20 秒远眺只关闭遮罩，重置额度必须由教师授权码完成。
 */
export function EyeRestOverlay({
  open,
  onUnlock,
  onRestFinished,
}: EyeRestOverlayProps) {
  const [remaining, setRemaining] = useState(20);

  useEffect(() => {
    if (!open) return;
    setRemaining(20);
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-400/20 text-teal-300">
        <Eye className="h-10 w-10" />
      </div>
      <h2 className="mt-5 text-2xl font-bold">护眼远眺休息</h2>
      <p className="mt-2 max-w-md text-sm text-slate-300">
        本次课数字训练已达 15 分钟上限。请看向 6 米外的远处物体，放松睫状肌。
      </p>
      <div className="mt-6 text-5xl font-black tabular-nums text-teal-300">
        {remaining}s
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onUnlock}
          className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-teal-300"
        >
          <LockKeyhole className="h-4 w-4" />
          教师授权解锁
        </button>
        <button
          type="button"
          disabled={remaining > 0}
          onClick={onRestFinished}
          className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {remaining > 0 ? `休息结束（${remaining}s）` : '休息结束，关闭遮罩'}
        </button>
      </div>
      <p className="mt-6 text-[11px] text-slate-500">
        教师授权码解锁会将额度重置为 900 秒；20 秒远眺只关闭遮罩，不重置额度。
      </p>
    </div>
  );
}
