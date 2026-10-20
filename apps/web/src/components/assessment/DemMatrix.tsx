import { useState } from 'react';
import {
  DEM_AGE_NORMS_TABLE,
  DEM_STIMULUS_MATRICES,
} from '@vmi-tis/shared-types/assessment-seed';

type DemTest = 'A' | 'B' | 'C';

const TESTS: Array<{ key: DemTest; label: string; hint: string }> = [
  { key: 'A', label: 'Test A · 纵列', hint: '左右各 20 个数字' },
  { key: 'B', label: 'Test B · 纵列', hint: '左右各 20 个数字' },
  { key: 'C', label: 'Test C · 横向', hint: '16 行 × 5 列' },
];

function VerticalColumns({
  left,
  right,
}: {
  left: number[];
  right: number[];
}) {
  return (
    <div className="flex justify-center gap-16 rounded-2xl border border-slate-200 bg-white p-6 font-mono text-xl text-slate-800">
      <div className="space-y-1.5">
        {left.map((value, index) => (
          <div key={`l-${index}`}>{value}</div>
        ))}
      </div>
      <div className="space-y-1.5">
        {right.map((value, index) => (
          <div key={`r-${index}`}>{value}</div>
        ))}
      </div>
    </div>
  );
}

export function DemMatrix() {
  const [test, setTest] = useState<DemTest>('A');
  const testA = DEM_STIMULUS_MATRICES.TEST_A_VERTICAL_COLUMNS;
  const testB = DEM_STIMULUS_MATRICES.TEST_B_VERTICAL_COLUMNS;
  const testC = DEM_STIMULUS_MATRICES.TEST_C_HORIZONTAL_16X5_GRID;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TESTS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTest(entry.key)}
            className={
              test === entry.key
                ? 'rounded-xl bg-[#0F4C5C] px-4 py-2 text-left text-xs font-bold text-white'
                : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-xs text-slate-600 hover:bg-slate-50'
            }
          >
            <div>{entry.label}</div>
            <div className="text-[10px] font-normal opacity-70">{entry.hint}</div>
          </button>
        ))}
      </div>

      {test === 'A' && (
        <VerticalColumns
          left={testA.leftColumn20}
          right={testA.rightColumn20}
        />
      )}
      {test === 'B' && (
        <VerticalColumns
          left={testB.leftColumn20}
          right={testB.rightColumn20}
        />
      )}
      {test === 'C' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mx-auto grid max-w-xl grid-cols-5 gap-x-10 gap-y-2 text-center font-mono text-lg text-slate-800">
            {testC.flat().map((value, index) => (
              <span key={index}>{value}</span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-2">年龄</th>
              <th className="px-3 py-2">纵向均值（秒）</th>
              <th className="px-3 py-2">横向均值（秒）</th>
              <th className="px-3 py-2">纵横比</th>
              <th className="px-3 py-2">异常截断</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEM_AGE_NORMS_TABLE.map((row) => (
              <tr key={row.ageYears}>
                <td className="px-3 py-2">{row.ageYears} 岁</td>
                <td className="px-3 py-2">{row.expectedVerticalSecMean}</td>
                <td className="px-3 py-2">{row.expectedHorizontalSecMean}</td>
                <td className="px-3 py-2">{row.expectedRatioMean}</td>
                <td className="px-3 py-2">{row.abnormalRatioCutoff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">
        数字矩阵与年龄常模直接读取 `DEM_STIMULUS_MATRICES` / `DEM_AGE_NORMS_TABLE`；本面板只出示刺激，不自动计分，结果由教师录入原始用时后由后端计算。
      </p>
    </div>
  );
}
