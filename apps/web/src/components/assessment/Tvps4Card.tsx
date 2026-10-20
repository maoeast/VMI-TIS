import { useEffect, useState } from 'react';
import { TVPS_4_SUBTESTS } from '@vmi-tis/shared-types/assessment-seed';

export type Tvps4Phase = 'target' | 'options';

interface Tvps4CardProps {
  revealAnswer?: boolean;
  /** 只读出示（学生端远程卡）：隐藏子测验选择与翻题按钮，只跟随教师端。 */
  readOnly?: boolean;
  /** 受控子测验编码；不传时使用组件内部状态（原行为）。 */
  subtestCode?: string;
  onSubtestCodeChange?: (code: string) => void;
  /** 受控样例题索引。 */
  itemIndex?: number;
  onItemIndexChange?: (index: number) => void;
  /** 受控阶段：target 记忆呈现 → options 选项。 */
  phase?: Tvps4Phase;
  onPhaseChange?: (phase: Tvps4Phase) => void;
  /** 受控记忆呈现剩余秒数（教师端计时，学生端只展示）。 */
  remaining?: number;
  onRemainingChange?: (remaining: number) => void;
}

export function Tvps4Card({
  revealAnswer = true,
  readOnly = false,
  subtestCode: controlledSubtestCode,
  onSubtestCodeChange,
  itemIndex: controlledItemIndex,
  onItemIndexChange,
  phase: controlledPhase,
  onPhaseChange,
  remaining: controlledRemaining,
  onRemainingChange,
}: Tvps4CardProps) {
  const [internalSubtestCode, setInternalSubtestCode] = useState<string>(
    TVPS_4_SUBTESTS[0].subtestCode,
  );
  const [internalItemIndex, setInternalItemIndex] = useState(0);
  const [internalPhase, setInternalPhase] = useState<Tvps4Phase>('options');
  const [internalRemaining, setInternalRemaining] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const subtestCode = controlledSubtestCode ?? internalSubtestCode;
  const itemIndex = controlledItemIndex ?? internalItemIndex;
  const phase = controlledPhase ?? internalPhase;
  const remaining = controlledRemaining ?? internalRemaining;

  // 受控时值由父级持有、这里只回调；非受控时写内部状态。两条路径共用同一套
  // 计时与阶段推进，学生端本地出示（不传 props）行为与改造前一致。
  const changeSubtestCode = (next: string) => {
    if (controlledSubtestCode === undefined) setInternalSubtestCode(next);
    onSubtestCodeChange?.(next);
  };
  const changeItemIndex = (next: number) => {
    if (controlledItemIndex === undefined) setInternalItemIndex(next);
    onItemIndexChange?.(next);
  };
  const changePhase = (next: Tvps4Phase) => {
    if (controlledPhase === undefined) setInternalPhase(next);
    onPhaseChange?.(next);
  };
  const changeRemaining = (next: number) => {
    if (controlledRemaining === undefined) setInternalRemaining(next);
    onRemainingChange?.(next);
  };

  const subtest =
    TVPS_4_SUBTESTS.find((entry) => entry.subtestCode === subtestCode) ??
    TVPS_4_SUBTESTS[0];
  const items = subtest.sampleDigitalItems;
  const item = items[itemIndex] ?? items[0];

  useEffect(() => {
    setSelectedOption(null);
    if (!item) return;
    if (item.exposureTimeSec && item.exposureTimeSec > 0) {
      changePhase('target');
      changeRemaining(item.exposureTimeSec);
      return;
    }
    changePhase('options');
    changeRemaining(0);
    // change* 已按受控/非受控落值，依赖只跟题卡本身。
  }, [subtestCode, itemIndex, item]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'target' || remaining <= 0) return;
    const timer = setTimeout(() => {
      changeRemaining(Math.max(0, remaining - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'target' && remaining === 0 && item?.exposureTimeSec) {
      changePhase('options');
    }
  }, [phase, remaining, item]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) {
    return <p className="text-xs text-slate-400">该子测验暂无样例题卡。</p>;
  }

  const showTarget = item.exposureTimeSec === null || phase === 'target';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {readOnly ? (
          <span className="badge bg-slate-100 text-slate-700">
            {subtest.nameCn}（{subtest.subtestCode}）· 样例 {itemIndex + 1}/
            {items.length} · 由教师端出题
          </span>
        ) : (
          <>
            <label className="text-xs font-semibold text-slate-600">
              子测验
              <select
                className="input mt-1 w-64"
                value={subtestCode}
                onChange={(event) => {
                  changeSubtestCode(event.target.value);
                  // 非受控（学生端本地出示）沿用「换子测验回到第 1 题」；
                  // 受控时翻题由父级决定，避免同一事件里两次写入互相覆盖。
                  if (controlledItemIndex === undefined) {
                    changeItemIndex(0);
                  }
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
          </>
        )}
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

      {!readOnly && (
        <>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="btn-secondary"
              disabled={itemIndex === 0}
              onClick={() => changeItemIndex(Math.max(0, itemIndex - 1))}
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
                changeItemIndex(Math.min(items.length - 1, itemIndex + 1))
              }
            >
              下一题
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            种子文件只提供 TVPS-4 的代表性样例题卡，不是完整 18 题题库；本面板不出具正式分数。
          </p>
        </>
      )}
    </div>
  );
}
