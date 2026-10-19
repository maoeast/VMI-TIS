import { useState } from 'react';

interface GameProps {
  disabled?: boolean;
  onComplete?: (
    result: 'pass' | 'fail',
    stats: { accuracyRate: number; clicks: number; pops: number },
  ) => void;
}

const TARGETS = new Set([1, 6, 11, 16]);
const SYMBOLS = ['▲', '●', '■', '◆', '▼', '★', '69'];
const TARGET_SYMBOL = '★';

/**
 * 森林找星星：24 格中按顺序找出 4 颗星，训练图形-背景分离与按序扫描。
 */
export function StarGame({ disabled = false, onComplete }: GameProps) {
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState(0);
  const [message, setMessage] = useState('按从左到右、从上到下的顺序找出 4 颗星');

  const reset = () => {
    setFound([]);
    setWrong(0);
    setMessage('按从左到右、从上到下的顺序找出 4 颗星');
  };

  const clickCell = (index: number) => {
    if (disabled) return;
    if (found.includes(index)) return;

    if (!TARGETS.has(index)) {
      setWrong((value) => value + 1);
      setMessage('再看看，这一格不是目标');
      return;
    }

    const nextFound = [...found, index];
    setFound(nextFound);

    if (nextFound.length === TARGETS.size) {
      const clicks = nextFound.length + wrong;
      const accuracyRate = nextFound.length / clicks;
      setMessage('🎉 恭喜闯关成功！全部 4 个目标都找到了');
      onComplete?.(accuracyRate >= 0.8 ? 'pass' : 'fail', {
        accuracyRate,
        clicks,
        pops: nextFound.length,
      });
    } else {
      setMessage(`已找到 ${nextFound.length}/4 颗星，继续按顺序找`);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0B3946] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-white">森林找星星</div>
        <div className="text-xs text-teal-100">
          已找到 {found.length}/4 · 误点 {wrong} 次
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 24 }, (_, index) => {
          const isTarget = TARGETS.has(index);
          const isFound = found.includes(index);
          const symbol = isTarget
            ? TARGET_SYMBOL
            : SYMBOLS[index % SYMBOLS.length];
          return (
            <button
              key={index}
              type="button"
              disabled={disabled || isFound}
              onClick={() => clickCell(index)}
              className={
                isFound
                  ? 'flex h-14 items-center justify-center rounded-xl bg-emerald-200 text-lg font-bold text-emerald-900'
                  : 'flex h-14 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-700 hover:border-2 hover:border-teal-400 disabled:opacity-50'
              }
            >
              {isFound ? '🌟' : symbol}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-teal-100">{message}</div>
        <button
          type="button"
          disabled={disabled}
          onClick={reset}
          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          重新开始
        </button>
      </div>
    </div>
  );
}
