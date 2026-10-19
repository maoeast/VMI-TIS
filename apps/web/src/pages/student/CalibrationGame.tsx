import { useState } from 'react';

interface GameProps {
  disabled?: boolean;
  onComplete?: (
    result: 'pass' | 'fail',
    stats: { accuracyRate: number; clicks: number; pops: number },
  ) => void;
}

const POINTS = [
  { id: 1, label: '左上', x: 18, y: 22 },
  { id: 2, label: '右上', x: 82, y: 22 },
  { id: 3, label: '中心', x: 50, y: 50 },
  { id: 4, label: '左下', x: 18, y: 78 },
  { id: 5, label: '右下', x: 82, y: 78 },
];

/**
 * 5 点眼动校准：依次注视并点击 5 个校准点。
 */
export function CalibrationGame({ disabled = false, onComplete }: GameProps) {
  const [calibrated, setCalibrated] = useState<number[]>([]);
  const [message, setMessage] = useState('请依次注视并点击 5 个校准点');

  const clickPoint = (id: number) => {
    if (disabled || calibrated.includes(id)) return;
    const next = [...calibrated, id];
    setCalibrated(next);

    if (next.length === POINTS.length) {
      setMessage('✓ 5 点校准完成');
      onComplete?.('pass', {
        accuracyRate: 1,
        clicks: next.length,
        pops: next.length,
      });
    } else {
      setMessage(`已完成 ${next.length}/5 个校准点`);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0B3946] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-white">眼动 5 点校准</div>
        <div className="text-xs text-teal-100">已完成 {calibrated.length}/5</div>
      </div>
      <div className="relative h-[420px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B3946] to-[#0F4C5C]">
        {POINTS.map((point) => {
          const done = calibrated.includes(point.id);
          return (
            <button
              key={point.id}
              type="button"
              disabled={disabled || done}
              onClick={() => clickPoint(point.id)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              className={
                done
                  ? 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 px-5 py-5 text-sm font-bold text-emerald-950 shadow-lg'
                  : 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-300 bg-teal-500/30 px-6 py-6 text-sm font-bold text-white hover:bg-teal-400/50 disabled:opacity-50'
              }
            >
              {done ? '✓' : point.id}
            </button>
          );
        })}
        <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-teal-100/80">
          {message}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setCalibrated([]);
          setMessage('请依次注视并点击 5 个校准点');
        }}
        className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
      >
        重新校准
      </button>
    </div>
  );
}
