import { NSUCO_STANDARD_SCALE } from '@vmi-tis/shared-types/assessment-seed';

const FACTOR_LABELS: Record<string, string> = {
  ability: '完成能力',
  accuracy: '准确性',
  headMovement: '头部代偿',
  bodyMovement: '身体代偿',
};

interface NsucoPanelProps {
  pursuit: number;
  saccade: number;
  onChange: (field: 'pursuit' | 'saccade', value: number) => void;
}

export function NsucoPanel({ pursuit, saccade, onChange }: NsucoPanelProps) {
  return (
    <div className="space-y-3">
      {NSUCO_STANDARD_SCALE.map((rubric) => {
        const field = rubric.dimension === 'PURSUIT' ? 'pursuit' : 'saccade';
        const score = field === 'pursuit' ? pursuit : saccade;
        return (
          <div
            key={rubric.dimension}
            className="rounded-xl border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800">
                {rubric.dimensionCn}
              </div>
              <label className="text-[11px] text-slate-500">
                评分
                <select
                  className="input ml-2 w-20"
                  value={score}
                  onChange={(event) =>
                    onChange(field, Number(event.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {rubric.testInstruction}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {Object.entries(rubric.scoringFactors).map(
                ([factor, descriptions]) => (
                  <div
                    key={factor}
                    className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600"
                  >
                    <span className="font-semibold text-slate-700">
                      {FACTOR_LABELS[factor] ?? factor}：
                    </span>
                    {descriptions[score as 1 | 2 | 3 | 4 | 5]}
                  </div>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
