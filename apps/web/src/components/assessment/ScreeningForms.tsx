import {
  BEHAVIOR_SCREENING_ITEMS,
  MILESTONE_0_TO_6_CHECKLIST,
  RED_ZONE_TRIAGE_ITEMS,
} from '@vmi-tis/shared-types/assessment-seed';

export interface ScreeningSelection {
  red: string[];
  milestones: string[];
  behaviors: string[];
}

interface ScreeningFormsProps {
  value: ScreeningSelection;
  onChange: (next: ScreeningSelection) => void;
  ageMonths?: number;
}

export function ScreeningForms({
  value,
  onChange,
  ageMonths,
}: ScreeningFormsProps) {
  const toggle = (key: keyof ScreeningSelection, code: string) => {
    const current = value[key];
    onChange({
      ...value,
      [key]: current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-rose-900">
          眼科红区预警（勾选命中项，提交后由服务端重算 R1）
        </h3>
        {RED_ZONE_TRIAGE_ITEMS.map((item) => (
          <label
            key={item.code}
            className="flex cursor-pointer items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.red.includes(item.code)}
              onChange={() => toggle('red', item.code)}
            />
            <span>
              <span className="font-semibold text-rose-900">{item.label}</span>
              <span className="mt-0.5 block text-rose-700/80">
                {item.clinicalSign}
              </span>
              <span className="mt-0.5 block text-[10px] text-rose-500">
                转介科室：{item.referralDepartment}
              </span>
            </span>
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold text-slate-800">
          0–6 岁视觉与视觉运动里程碑（勾选未达成项）
        </h3>
        {MILESTONE_0_TO_6_CHECKLIST.map((group) => {
          const isCurrentAge =
            ageMonths !== undefined &&
            ageMonths >= group.minMonths &&
            ageMonths <= group.maxMonths;
          return (
            <details
              key={group.code}
              open={isCurrentAge}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                {group.ageRangeLabel} · {group.visualAndVmiMilestones.length} 项
                {isCurrentAge && (
                  <span className="ml-2 badge bg-teal-100 text-teal-800">
                    当前年龄段
                  </span>
                )}
              </summary>
              <div className="mt-2 space-y-1.5">
                {group.visualAndVmiMilestones.map((text, index) => {
                  const code = `${group.code}-${index}`;
                  return (
                    <label
                      key={code}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={value.milestones.includes(code)}
                        onChange={() => toggle('milestones', code)}
                      />
                      <span>未达成：{text}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-amber-700">
                缺失预警：{group.redFlagWhenAbsent}
              </p>
            </details>
          );
        })}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold text-slate-800">
          日常视觉行为筛查（勾选存在的表现）
        </h3>
        {BEHAVIOR_SCREENING_ITEMS.map((item) => (
          <label
            key={item.code}
            className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={value.behaviors.includes(item.code)}
              onChange={() => toggle('behaviors', item.code)}
            />
            <span>
              <span className="font-semibold text-slate-700">
                {item.question}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                提示层级 {item.mappedShortfallLevel} · 推荐{' '}
                {item.recommendedSopCodes.join('、')}
              </span>
            </span>
          </label>
        ))}
      </section>
    </div>
  );
}
