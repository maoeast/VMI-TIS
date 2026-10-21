import { OPTOMETRY_NORMS } from '@vmi-tis/shared-types/assessment-seed';
import { NsucoPanel } from './NsucoPanel';
import { ScaleStatusBadge } from './ScaleStatusBadge';
import {
  RecordNumberField,
  type AssessmentRecordForm,
  type NumericRecordField,
} from './RecordSummary';

interface OptometryPanelProps {
  form: AssessmentRecordForm;
  ageYears?: number;
  onFieldChange: (field: NumericRecordField, value: string) => void;
  onBooleanChange: (
    field: 'stabilityPass' | 'classroomAdaptationPass',
    value: boolean,
  ) => void;
  onNsucoChange: (field: 'pursuit' | 'saccade', value: number) => void;
}

export function OptometryPanel({
  form,
  ageYears,
  onFieldChange,
  onBooleanChange,
  onNsucoChange,
}: OptometryPanelProps) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800">第三步：视光与眼动</h2>
        <ScaleStatusBadge scaleCode="OPTOMETRY_NORMS" />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        本步可跳过：未录入的指标保存时按服务端的达标兼容缺省参与定级。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RecordNumberField
          label="NPC 集合近点（cm）"
          field="npcCm"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="调节灵活度（cpm）"
          field="accomFacilityCpm"
          form={form}
          onChange={onFieldChange}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        NPC 正常不高于 {OPTOMETRY_NORMS.npcCutoffCm.normalMax} cm，大于{' '}
        {OPTOMETRY_NORMS.npcCutoffCm.insufficiencyThreshold} cm 提示集合不足；
        调节灵活度正常不低于{' '}
        {OPTOMETRY_NORMS.accomFacilityCpmCutoff.normalMin} cpm，低于{' '}
        {OPTOMETRY_NORMS.accomFacilityCpmCutoff.lagThreshold} cpm 提示调节滞后。
        {ageYears !== undefined &&
          ` 该年龄最小预期调节幅度约 ${OPTOMETRY_NORMS.minExpectedAccomAmplitudeD(
            ageYears,
          )} D。`}
      </p>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-bold text-slate-700">
            NSUCO 眼动标准化观察
          </h3>
          <ScaleStatusBadge scaleCode="NSUCO" />
        </div>
        <div className="mt-2">
          <NsucoPanel
            pursuit={form.nsucoPursuit}
            saccade={form.nsucoSaccade}
            onChange={onNsucoChange}
          />
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-bold text-slate-700">稳定性与课堂应用</h3>
        <div className="mt-2 space-y-2 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.stabilityPass}
              onChange={(event) =>
                onBooleanChange('stabilityPass', event.target.checked)
              }
            />
            身体稳定 / 前庭本体评估达标
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.classroomAdaptationPass}
              onChange={(event) =>
                onBooleanChange(
                  'classroomAdaptationPass',
                  event.target.checked,
                )
              }
            />
            课堂抄写 / 文具使用补充评估达标
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RecordNumberField
              label="四点爬行维持（秒）"
              field="quadrupedHoldSec"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="课堂抄写正确率（%）"
              field="classroomCopyAccuracyPct"
              form={form}
              onChange={onFieldChange}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
