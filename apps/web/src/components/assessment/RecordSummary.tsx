import type { AssessmentMeta, AssessmentRecord } from '@vmi-tis/shared-types';
import type { AssessmentRecordsResponse } from '../../api/client';
import { evalPhaseLabel, formatDate, levelLabel } from '../../utils/format';
import { EVAL_PHASE_OPTIONS, type EvalPhaseKey } from './StudentPhaseSelector';

/**
 * 评估记录草稿：字段名与 `POST /api/assessments/records` 的 DTO 对齐。
 * 数值统一以字符串承载输入框内容，保存时才转成 number。
 * 这份字段形状由汇总步骤独占，其他步骤面板只引用，避免两处字段清单漂移。
 */
export interface AssessmentRecordForm {
  npcCm: string;
  accomFacilityCpm: string;
  tvps4Std: string;
  mvpt4RawScore: string;
  mvpt4ItemScores45: string;
  mvpt4Std: string;
  beeryVmiStd: string;
  beeryVmiRaw: string;
  beeryVpStd: string;
  beeryVpRaw: string;
  beeryMcStd: string;
  beeryMcRaw: string;
  quadrupedHoldSec: string;
  classroomCopyAccuracyPct: string;
  tvpsDIS: string;
  tvpsMEM: string;
  tvpsSPA: string;
  tvpsCON: string;
  tvpsSEQ: string;
  tvpsFGR: string;
  tvpsCLO: string;
  demAVerticalSec: string;
  demBVerticalSec: string;
  demCHorizontalSec: string;
  demOmissionErrors: string;
  demAdditionErrors: string;
  stabilityPass: boolean;
  classroomAdaptationPass: boolean;
  nsucoPursuit: number;
  nsucoSaccade: number;
}

export type RecordFormField = keyof AssessmentRecordForm;

/** 承载数字输入框的字段（字符串承载输入值）。 */
export type NumericRecordField = {
  [K in keyof AssessmentRecordForm]: AssessmentRecordForm[K] extends string
    ? K
    : never;
}[keyof AssessmentRecordForm];

export const EMPTY_RECORD_FORM: AssessmentRecordForm = {
  npcCm: '',
  accomFacilityCpm: '',
  tvps4Std: '',
  mvpt4RawScore: '',
  mvpt4ItemScores45: '',
  mvpt4Std: '',
  beeryVmiStd: '',
  beeryVmiRaw: '',
  beeryVpStd: '',
  beeryVpRaw: '',
  beeryMcStd: '',
  beeryMcRaw: '',
  quadrupedHoldSec: '',
  classroomCopyAccuracyPct: '',
  tvpsDIS: '',
  tvpsMEM: '',
  tvpsSPA: '',
  tvpsCON: '',
  tvpsSEQ: '',
  tvpsFGR: '',
  tvpsCLO: '',
  demAVerticalSec: '',
  demBVerticalSec: '',
  demCHorizontalSec: '',
  demOmissionErrors: '',
  demAdditionErrors: '',
  stabilityPass: true,
  classroomAdaptationPass: true,
  nsucoPursuit: 3,
  nsucoSaccade: 3,
};

const MEASUREMENT_FIELDS: NumericRecordField[] = [
  'npcCm',
  'accomFacilityCpm',
  'tvps4Std',
  'mvpt4RawScore',
  'mvpt4Std',
  'beeryVmiStd',
  'beeryVmiRaw',
  'beeryVpStd',
  'beeryVpRaw',
  'beeryMcStd',
  'beeryMcRaw',
  'quadrupedHoldSec',
  'classroomCopyAccuracyPct',
  'tvpsDIS',
  'tvpsMEM',
  'tvpsSPA',
  'tvpsCON',
  'tvpsSEQ',
  'tvpsFGR',
  'tvpsCLO',
  'demAVerticalSec',
  'demBVerticalSec',
  'demCHorizontalSec',
  'demOmissionErrors',
  'demAdditionErrors',
];

/** 第 5 步保存前判定“至少一项视光/量表数据”；红区 L0 只带初筛时由调用方豁免。 */
export function hasAnyMeasurement(form: AssessmentRecordForm): boolean {
  return (
    MEASUREMENT_FIELDS.some((field) => form[field].trim() !== '') ||
    /^[01]{45}$/.test(form.mvpt4ItemScores45)
  );
}

export function RecordNumberField({
  label,
  field,
  form,
  onChange,
}: {
  label: string;
  field: NumericRecordField;
  form: AssessmentRecordForm;
  onChange: (field: NumericRecordField, value: string) => void;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        type="number"
        value={form[field]}
        onChange={(event) => onChange(field, event.target.value)}
        className="input mt-1"
      />
    </label>
  );
}

function textOrEmpty(value: string): string {
  return value.trim() === '' ? '未录入' : value;
}

function withUnit(value: string, unit: string): string {
  return value.trim() === '' ? '未录入' : `${value} ${unit}`;
}

function pairText(left: string, right: string): string {
  if (left.trim() === '' && right.trim() === '') return '未录入';
  return `${left.trim() === '' ? '—' : left} / ${right.trim() === '' ? '—' : right}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs last:border-0">
      <span className="text-slate-500">{label}</span>
      <span
        className={
          value === '未录入'
            ? 'text-slate-300'
            : 'text-right font-semibold text-slate-800'
        }
      >
        {value}
      </span>
    </div>
  );
}

function FormSummarySection({
  studentName,
  evalPhase,
  form,
}: {
  studentName: string;
  evalPhase: EvalPhaseKey;
  form: AssessmentRecordForm;
}) {
  const tvpsEntries: Array<[string, string]> = [
    ['DIS', form.tvpsDIS],
    ['MEM', form.tvpsMEM],
    ['SPA', form.tvpsSPA],
    ['CON', form.tvpsCON],
    ['SEQ', form.tvpsSEQ],
    ['FGR', form.tvpsFGR],
    ['CLO', form.tvpsCLO],
  ];
  const tvpsFilled = tvpsEntries.filter(([, value]) => value.trim() !== '');
  const tvpsText =
    tvpsFilled.length === 0
      ? '未录入'
      : tvpsFilled.length < tvpsEntries.length
        ? `仅填写 ${tvpsFilled.length}/7 项（需 7 项齐全才换算）`
        : tvpsFilled.map(([code, value]) => `${code} ${value}`).join(' · ');
  const demTimeText =
    form.demAVerticalSec.trim() === '' &&
    form.demBVerticalSec.trim() === '' &&
    form.demCHorizontalSec.trim() === ''
      ? '未录入'
      : `A ${form.demAVerticalSec || '—'} · B ${
          form.demBVerticalSec || '—'
        } · C ${form.demCHorizontalSec || '—'}（秒）`;
  const demErrorText =
    form.demOmissionErrors.trim() === '' &&
    form.demAdditionErrors.trim() === ''
      ? '未录入'
      : `${form.demOmissionErrors || '—'} / ${
          form.demAdditionErrors || '—'
        }`;

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">
        记录汇总 · {evalPhaseLabel(evalPhase)}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        学生：{studentName}。以下为即将提交的字段；未录入项不写入明细，但服务端会按达标缺省参与定级（可能高估层级）。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold text-teal-800">视光与眼动</h3>
          <SummaryRow label="NPC" value={withUnit(form.npcCm, 'cm')} />
          <SummaryRow
            label="调节灵活度"
            value={withUnit(form.accomFacilityCpm, 'cpm')}
          />
          <SummaryRow
            label="NSUCO 追视 / 扫视"
            value={`${form.nsucoPursuit} / 5 · ${form.nsucoSaccade} / 5`}
          />
          <SummaryRow
            label="四点爬行维持"
            value={withUnit(form.quadrupedHoldSec, '秒')}
          />
          <SummaryRow
            label="课堂抄写正确率"
            value={withUnit(form.classroomCopyAccuracyPct, '%')}
          />
        </div>

        <div>
          <h3 className="text-xs font-bold text-teal-800">稳定性与课堂应用</h3>
          <SummaryRow
            label="身体稳定 / 前庭本体"
            value={form.stabilityPass ? '达标' : '未达标'}
          />
          <SummaryRow
            label="课堂抄写 / 文具使用"
            value={form.classroomAdaptationPass ? '达标' : '未达标'}
          />
        </div>

        <div>
          <h3 className="text-xs font-bold text-teal-800">Beery VMI-6</h3>
          <SummaryRow label="主测验原始分" value={textOrEmpty(form.beeryVmiRaw)} />
          <SummaryRow label="主测验标准分" value={textOrEmpty(form.beeryVmiStd)} />
          <SummaryRow
            label="VP 原始分 / 标准分"
            value={pairText(form.beeryVpRaw, form.beeryVpStd)}
          />
          <SummaryRow
            label="MC 原始分 / 标准分"
            value={pairText(form.beeryMcRaw, form.beeryMcStd)}
          />
        </div>

        <div>
          <h3 className="text-xs font-bold text-teal-800">TVPS-4 / MVPT-4</h3>
          <SummaryRow label="TVPS-4 标准分" value={textOrEmpty(form.tvps4Std)} />
          <SummaryRow
            label="MVPT-4 原始分 / 标准分"
            value={pairText(form.mvpt4RawScore, form.mvpt4Std)}
          />
          <SummaryRow
            label="MVPT-4 逐题已评（未满 45 不入库）"
            value={`${form.mvpt4ItemScores45.replace(/-/g, '').length} / 45`}
          />
          <SummaryRow label="TVPS 七项原始分" value={tvpsText} />
        </div>

        <div className="sm:col-span-2">
          <h3 className="text-xs font-bold text-teal-800">DEM 原始输入</h3>
          <SummaryRow label="Test A / Test B / Test C" value={demTimeText} />
          <SummaryRow label="漏读 / 多读" value={demErrorText} />
        </div>
      </div>
    </section>
  );
}

function SaveReportSection({
  saving,
  canSave,
  blockedReason,
  savedRecord,
  recordMeta,
  report,
  onSave,
  onResetAssessment,
}: {
  saving: boolean;
  canSave: boolean;
  blockedReason?: string;
  savedRecord: AssessmentRecord | null;
  recordMeta: AssessmentMeta | null;
  report: { recordId: string; url: string } | null;
  onSave: () => void;
  onResetAssessment?: () => void;
}) {
  const savedReport =
    savedRecord && report?.recordId === savedRecord.id ? report.url : null;

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">保存、定级与报告</h2>
      <p className="mt-1 text-xs text-slate-500">
        保存后由服务端调用种子纯函数自动定级并回写学生层级；报告为 HTML，
        可直接打印或另存为 PDF。
      </p>

      <button
        type="button"
        className="btn-primary mt-4 w-full"
        disabled={!canSave || saving || Boolean(savedRecord)}
        onClick={onSave}
      >
        {saving ? '保存中…' : savedRecord ? '已保存' : '保存评估记录并自动定级'}
      </button>
      {blockedReason && (
        <p className="mt-2 text-[11px] font-semibold text-rose-600">
          {blockedReason}
        </p>
      )}

      {savedRecord && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
          <div className="font-bold">
            已保存 · 自动定级 {levelLabel(savedRecord.autoLevel ?? '')}
          </div>
          <div className="mt-1 text-[11px] text-teal-800/80">
            记录 ID：{savedRecord.id} · 阶段：
            {evalPhaseLabel(savedRecord.evalPhase)}
          </div>
          {savedReport ? (
            <a
              className="mt-2 inline-block font-semibold underline"
              href={savedReport}
              target="_blank"
              rel="noreferrer"
            >
              打开本次 HTML 评估报告
            </a>
          ) : (
            <p className="mt-2 text-[11px] text-teal-800/80">
              报告尚未生成或生成失败；可在下方历史评估中重新生成。
            </p>
          )}
        </div>
      )}

      {savedRecord && onResetAssessment && (
        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          onClick={onResetAssessment}
        >
          新建一次评估（清空草稿）
        </button>
      )}

      {recordMeta && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
          <div className="font-bold">
            {recordMeta.grading.recommendedLevelLabel}
          </div>
          <p className="mt-1">{recordMeta.grading.clinicalBottleneckAnalysis}</p>
          <p className="mt-1">
            推荐操作卡：
            {recordMeta.grading.recommendedSopCardCodes.join('、') || '无'}
          </p>
          {recordMeta.dem && (
            <p className="mt-1">DEM：{recordMeta.dem.summaryText}</p>
          )}
          {recordMeta.tvps4 && (
            <p className="mt-1">
              TVPS-4 综合标准分：{recordMeta.tvps4.overallStandardScore}
            </p>
          )}
          {recordMeta.mvpt4 && (
            <div className="mt-1">
              <p>
                MVPT-4 标准分：{recordMeta.mvpt4.standardScore ?? '未录入'}（
                {recordMeta.mvpt4.normApplied ? '内置参考换算' : '手册录入'}）
              </p>
              <p>
                MVPT-4 薄弱维度：
                {recordMeta.mvpt4.weakestDomains.length > 0
                  ? recordMeta.mvpt4.weakestDomains
                      .map(
                        (domain) =>
                          `${domain.domainNameCn} ${domain.accuracyPct}%`,
                      )
                      .join('、')
                  : '无（未录入逐题或各维度 ≥65%）'}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function HistorySection({
  records,
  report,
  onGenerateReport,
}: {
  records: AssessmentRecordsResponse | null;
  report: { recordId: string; url: string } | null;
  onGenerateReport: (recordId: string) => void;
}) {
  const groups = records?.groups ?? {};

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800">
        历史评估（按评估阶段分组）
      </h2>
      {report && (
        <div className="card border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          最近生成的报告（HTML）：
          <a
            className="ml-1 font-semibold underline"
            href={report.url}
            target="_blank"
            rel="noreferrer"
          >
            {report.url}
          </a>
        </div>
      )}
      {EVAL_PHASE_OPTIONS.map((phase) => {
        const group = groups[phase.value] ?? [];
        return (
          <section key={phase.value} className="card p-5">
            <h3 className="text-sm font-bold text-slate-800">
              {phase.label}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {group.length} 条
              </span>
            </h3>
            {group.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">暂无记录</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2">日期</th>
                      <th className="px-3 py-2">Beery 原始分</th>
                      <th className="px-3 py-2">Beery 标准分</th>
                      <th className="px-3 py-2">TVPS-4</th>
                      <th className="px-3 py-2">NPC</th>
                      <th className="px-3 py-2">调节灵活度</th>
                      <th className="px-3 py-2">定级</th>
                      <th className="px-3 py-2 text-right">报告</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-2 text-slate-500">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          {record.beeryVmiRaw ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          {record.beeryVmiStd ?? '—'}
                        </td>
                        <td className="px-3 py-2">{record.tvps4Std ?? '—'}</td>
                        <td className="px-3 py-2">{record.npcCm ?? '—'} cm</td>
                        <td className="px-3 py-2">
                          {record.accomFacilityCpm ?? '—'} cpm
                        </td>
                        <td className="px-3 py-2">
                          <span className="badge bg-teal-100 text-teal-800">
                            {record.autoLevel ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs font-semibold text-teal-700 hover:underline"
                            onClick={() => onGenerateReport(record.id)}
                          >
                            生成报告
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface RecordSummaryProps {
  studentName: string;
  evalPhase: EvalPhaseKey;
  form: AssessmentRecordForm;
  saving: boolean;
  canSave: boolean;
  blockedReason?: string;
  savedRecord: AssessmentRecord | null;
  recordMeta: AssessmentMeta | null;
  report: { recordId: string; url: string } | null;
  records: AssessmentRecordsResponse | null;
  onSave: () => void;
  onGenerateReport: (recordId: string) => void;
  onResetAssessment?: () => void;
}

export function RecordSummary({
  studentName,
  evalPhase,
  form,
  saving,
  canSave,
  blockedReason,
  savedRecord,
  recordMeta,
  report,
  records,
  onSave,
  onGenerateReport,
  onResetAssessment,
}: RecordSummaryProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <FormSummarySection
          studentName={studentName}
          evalPhase={evalPhase}
          form={form}
        />
        <SaveReportSection
          saving={saving}
          canSave={canSave}
          blockedReason={blockedReason}
          savedRecord={savedRecord}
          recordMeta={recordMeta}
          report={report}
          onSave={onSave}
          onResetAssessment={onResetAssessment}
        />
      </div>
      <HistorySection
        records={records}
        report={report}
        onGenerateReport={onGenerateReport}
      />
    </div>
  );
}
