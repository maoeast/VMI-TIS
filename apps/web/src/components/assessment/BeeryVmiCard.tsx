import { useState } from 'react';
import { BEERY_VMI_6_ITEMS } from '@vmi-tis/shared-types/assessment-seed';

export function BeeryVmiCard() {
  const [itemNumber, setItemNumber] = useState(1);
  const item =
    BEERY_VMI_6_ITEMS.find((entry) => entry.itemNumber === itemNumber) ??
    BEERY_VMI_6_ITEMS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">
          题号
          <select
            className="input mt-1 w-64"
            value={itemNumber}
            onChange={(event) => setItemNumber(Number(event.target.value))}
          >
            {BEERY_VMI_6_ITEMS.map((entry) => (
              <option key={entry.itemNumber} value={entry.itemNumber}>
                {entry.itemNumber}. {entry.titleCn}
              </option>
            ))}
          </select>
        </label>
        <span className="badge bg-slate-100 text-slate-700">
          发展月龄 {item.developmentalAgeLabel}
        </span>
        {item.isShortFormIncluded && (
          <span className="badge bg-teal-100 text-teal-800">短表 2–7 岁</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start">
        <svg
          viewBox="0 0 160 160"
          className="h-44 w-44 shrink-0 text-[#0F4C5C]"
          role="img"
          aria-label={item.titleCn}
        >
          {item.svgRenderPaths.map((path, index) => (
            <path
              key={index}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div className="text-xs text-slate-600">
          <div className="text-sm font-bold text-slate-800">{item.titleCn}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {item.titleEn} · {item.stimulusSvgType}
          </div>
          <p className="mt-3">
            <span className="font-semibold text-emerald-700">通过标准：</span>
            {item.scoringCriteriaPass}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-rose-700">失败特征：</span>
            {item.scoringCriteriaFail}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        SVG 范图直接读取种子文件的 `svgRenderPaths`；本面板用于出示与对照，不自动计分。
      </p>
    </div>
  );
}
