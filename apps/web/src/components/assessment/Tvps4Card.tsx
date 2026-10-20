import { useEffect, useState } from 'react';
import { TVPS_4_SUBTESTS } from '@vmi-tis/shared-types/assessment-seed';

export function Tvps4Card({
  revealAnswer = true,
}: {
  revealAnswer?: boolean;
}) {
  const [subtestCode, setSubtestCode] = useState(
    TVPS_4_SUBTESTS[0].subtestCode,
  );
  const [itemIndex, setItemIndex] = useState(0);
  const [phase, setPhase] = useState<'target' | 'options'>('options');
  const [remaining, setRemaining] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const subtest =
    TVPS_4_SUBTESTS.find((entry) => entry.subtestCode === subtestCode) ??
    TVPS_4_SUBTESTS[0];
  const items = subtest.sampleDigitalItems;
  const item = items[itemIndex] ?? items[0];

  useEffect(() => {
    setSelectedOption(null);
    if (!item) return;
    if (item.exposureTimeSec && item.exposureTimeSec > 0) {
      setPhase('target');
      setRemaining(item.exposureTimeSec);
      return;
    }
    setPhase('options');
    setRemaining(0);
  }, [subtestCode, itemIndex, item]);

  useEffect(() => {
    if (phase !== 'target' || remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, remaining]);

  useEffect(() => {
    if (phase === 'target' && remaining === 0 && item?.exposureTimeSec) {
      setPhase('options');
    }
  }, [phase, remaining, item]);

  if (!item) {
    return <p className="text-xs text-slate-400">该子测验暂无样例题卡。</p>;
  }

  const showTarget = item.exposureTimeSec === null || phase === 'target';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">
          子测验
          <select
            className="input mt-1 w-64"
            value={subtestCode}
            onChange={(event) => {
              setSubtestCode(
                event.target.value as (typeof TVPS_4_SUBTESTS)[number]['subtestCode'],
              );
              setItemIndex(0);
            }}
          >
            {TVPS_4_SUBTESTS.map((entry) => (
              <option key={entry.subtestCode} value={entry.subtestCode}>
                {entry.subtestOrder}. {entry.nameCn}（{entry.subtestCode}）
              </option>
            ))}
          </select>
        </label>
        <span className="badge bg-slate-100 text-slate-700">
          样例 {itemIndex + 1}/{items.length}
        </span>
        {item.exposureTimeSec !== null && (
          <span className="badge bg-amber-100 text-amber-800">
            记忆呈现 {item.exposureTimeSec} 秒
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-800">{item.promptText}</p>

        {showTarget && (
          <div className="mt-4 rounded-xl bg-[#0F4C5C] p-8 text-center text-white">
            <div className="text-xs text-teal-200">目标图形</div>
            <div className="mt-2 text-lg font-bold">{item.targetShapeDesc}</div>
            {item.exposureTimeSec !== null && (
              <div className="mt-2 text-xs text-teal-100">
                倒计时 {remaining} 秒
              </div>
            )}
          </div>
        )}

        {phase === 'options' && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {item.optionsDesc.map((option, index) => {
              const label = option.replace('(正确)', '').trim();
              const isSelected = selectedOption === index;
              const isCorrect = index === item.correctOptionIndex;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedOption(index)}
                  className={
                    isSelected
                      ? revealAnswer
                        ? isCorrect
                          ? 'rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-left text-xs font-semibold text-emerald-900'
                          : 'rounded-xl border-2 border-rose-400 bg-rose-50 px-3 py-3 text-left text-xs font-semibold text-rose-900'
                        : 'rounded-xl border-2 border-teal-500 bg-teal-50 px-3 py-3 text-left text-xs font-semibold text-teal-900'
                      : 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs text-slate-700 hover:bg-slate-100'
                  }
                >
                  <span className="mr-1 font-bold">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {label}
                  {revealAnswer && isSelected && (isCorrect ? ' ✅' : ' ❌')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="btn-secondary"
          disabled={itemIndex === 0}
          onClick={() => setItemIndex((value) => Math.max(0, value - 1))}
        >
          上一题
        </button>
        <span className="text-slate-400">
          {subtest.nameCn} · 连续 {subtest.ceilingConsecutiveZeros} 题 0 分中止
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={itemIndex >= items.length - 1}
          onClick={() =>
            setItemIndex((value) => Math.min(items.length - 1, value + 1))
          }
        >
          下一题
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        种子文件只提供 TVPS-4 的代表性样例题卡，不是完整 18 题题库；本面板不出具正式分数。
      </p>
    </div>
  );
}
