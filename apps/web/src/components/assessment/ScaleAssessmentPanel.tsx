import type { ScaleScoreResponse } from '../../api/client';
import { BeeryVmiCard } from './BeeryVmiCard';
import { DemMatrix } from './DemMatrix';
import { Tvps4Card } from './Tvps4Card';
import {
  RecordNumberField,
  type AssessmentRecordForm,
  type NumericRecordField,
} from './RecordSummary';

interface FieldProps {
  form: AssessmentRecordForm;
  onFieldChange: (field: NumericRecordField, value: string) => void;
}

interface BeerySectionProps extends FieldProps {
  scaleResult: ScaleScoreResponse | null;
  beeryItemNumber: number;
  beeryCompleted: boolean;
  scoreSubmitting?: boolean;
  onBeeryItemNumberChange: (itemNumber: number) => void;
  onScore: (score: 0 | 1) => void;
  onResetScale: () => void;
  onConfirmRawScore: () => void;
}

function BeerySection({
  form,
  scaleResult,
  beeryItemNumber,
  beeryCompleted,
  scoreSubmitting,
  onFieldChange,
  onBeeryItemNumberChange,
  onScore,
  onResetScale,
  onConfirmRawScore,
}: BeerySectionProps) {
  const shouldTerminate = Boolean(scaleResult?.shouldTerminate);
  const zeroCount = scaleResult?.consecutiveZeroCount ?? 0;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            第四步：Beery VMI-6 主测验（30 题）
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            逐题判定 1 分（通过）/ 0 分（未通过）；连续 3 题 0
            分触发 R2 自动中止。完成后点「确认原始分」，把本轮累计原始分写入记录原始分，仍可手工修改。
          </p>
        </div>
        <span className="badge bg-teal-100 text-teal-800">
          本题卡读取种子 BEERY_VMI_6_ITEMS
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <BeeryVmiCard
          itemNumber={beeryItemNumber}
          onItemNumberChange={onBeeryItemNumberChange}
          onScore={onScore}
          scoreDisabled={
            shouldTerminate || beeryCompleted || Boolean(scoreSubmitting)
          }
        />

        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>本会话已提交</span>
              <span className="font-bold text-slate-800">
                {scaleResult?.submittedItems ?? 0} 题
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>累计原始分</span>
              <span className="font-bold text-slate-800">
                {scaleResult?.totalRawScore ?? 0}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>连续 0 分计数</span>
              <span
                className={
                  zeroCount >= 2
                    ? 'badge bg-rose-100 text-rose-800'
                    : 'badge bg-emerald-100 text-emerald-800'
                }
              >
                {zeroCount}/3
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>当前题号</span>
              <span className="font-semibold text-slate-700">
                {beeryItemNumber}
              </span>
            </div>
          </div>

          {shouldTerminate && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              <div className="font-bold">已自动中止本轮评估</div>
              <p className="mt-1">{scaleResult?.message}</p>
              <p className="mt-1">
                中止时累计原始分：
                {scaleResult?.totalRawScore ?? 0}
                。请先点「确认原始分」写入记录，再重置本轮。
              </p>
            </div>
          )}

          {beeryCompleted && !shouldTerminate && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
              30 题已判完，请确认原始分后继续。
            </div>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={scaleResult === null}
            onClick={onConfirmRawScore}
          >
            确认原始分并写入记录
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={onResetScale}
          >
            重置本轮施测计数
          </button>

          <div className="grid grid-cols-2 gap-2">
            <RecordNumberField
              label="主测验原始分（0–30）"
              field="beeryVmiRaw"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="主测验标准分"
              field="beeryVmiStd"
              form={form}
              onChange={onFieldChange}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            「确认原始分」把 R2 的累计原始分写入左侧输入框；留空标准分时由服务端按种子常模换算。
          </p>
        </div>
      </div>
    </section>
  );
}

function TvpsSection({ form, onFieldChange }: FieldProps) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">
        第四步：TVPS-4 视觉感知（样例题卡 + 手工原始分）
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        种子文件只为 7 个子测验各提供 1 道代表性样例题卡，不包含 18
        题完整题库，因此系统不逐题判分、不伪造题目。请按官方题册施测后，在下方手工录入 7
        项原始分（0–18）。
      </p>
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tvps4Card />
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <RecordNumberField
              label="DIS"
              field="tvpsDIS"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="MEM"
              field="tvpsMEM"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="SPA"
              field="tvpsSPA"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="CON"
              field="tvpsCON"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="SEQ"
              field="tvpsSEQ"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="FGR"
              field="tvpsFGR"
              form={form}
              onChange={onFieldChange}
            />
            <RecordNumberField
              label="CLO"
              field="tvpsCLO"
              form={form}
              onChange={onFieldChange}
            />
          </div>
          <div className="mt-2">
            <RecordNumberField
              label="TVPS-4 综合标准分（可直接录入手册结果）"
              field="tvps4Std"
              form={form}
              onChange={onFieldChange}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            7 项原始分全部填写时，服务端用种子 calculateTvps4ProfileNorms
            换算综合标准分；只填部分时仅保存已填项。
          </p>
        </div>
      </div>
    </section>
  );
}

function DemSection({ form, onFieldChange }: FieldProps) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">
        第四步：DEM 发育性眼动（刺激矩阵 + 手工原始用时）
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        用下方刺激矩阵完成 Test A / B / C 后录入用时与错误数；5
        项全部填写才由服务端换算。
      </p>
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DemMatrix />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RecordNumberField
            label="Test A 纵向（秒）"
            field="demAVerticalSec"
            form={form}
            onChange={onFieldChange}
          />
          <RecordNumberField
            label="Test B 纵向（秒）"
            field="demBVerticalSec"
            form={form}
            onChange={onFieldChange}
          />
          <RecordNumberField
            label="Test C 横向（秒）"
            field="demCHorizontalSec"
            form={form}
            onChange={onFieldChange}
          />
          <RecordNumberField
            label="漏读字数"
            field="demOmissionErrors"
            form={form}
            onChange={onFieldChange}
          />
          <RecordNumberField
            label="多读字数"
            field="demAdditionErrors"
            form={form}
            onChange={onFieldChange}
          />
        </div>
      </div>
    </section>
  );
}

function SupplementSection({ form, onFieldChange }: FieldProps) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">
        第四步：Beery VP / MC 与 MVPT-3 手工录入
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        补充测验原始分可独立录入；留空不参与换算。MVPT-3
        仅作定级输入的兼容替代，不写入 TVPS-4 标准分列。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <RecordNumberField
          label="Beery VP 原始分"
          field="beeryVpRaw"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="Beery VP 标准分"
          field="beeryVpStd"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="Beery MC 原始分"
          field="beeryMcRaw"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="Beery MC 标准分"
          field="beeryMcStd"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="MVPT-3 标准分"
          field="mvpt3Std"
          form={form}
          onChange={onFieldChange}
        />
      </div>
    </section>
  );
}

interface ScaleAssessmentPanelProps extends FieldProps {
  scaleResult: ScaleScoreResponse | null;
  beeryItemNumber: number;
  beeryCompleted: boolean;
  scoreSubmitting?: boolean;
  onBeeryItemNumberChange: (itemNumber: number) => void;
  onScore: (score: 0 | 1) => void;
  onResetScale: () => void;
  onConfirmRawScore: () => void;
}

export function ScaleAssessmentPanel({
  form,
  scaleResult,
  beeryItemNumber,
  beeryCompleted,
  scoreSubmitting,
  onFieldChange,
  onBeeryItemNumberChange,
  onScore,
  onResetScale,
  onConfirmRawScore,
}: ScaleAssessmentPanelProps) {
  return (
    <div className="space-y-5">
      <BeerySection
        form={form}
        scaleResult={scaleResult}
        beeryItemNumber={beeryItemNumber}
        beeryCompleted={beeryCompleted}
        scoreSubmitting={scoreSubmitting}
        onFieldChange={onFieldChange}
        onBeeryItemNumberChange={onBeeryItemNumberChange}
        onScore={onScore}
        onResetScale={onResetScale}
        onConfirmRawScore={onConfirmRawScore}
      />
      <TvpsSection form={form} onFieldChange={onFieldChange} />
      <DemSection form={form} onFieldChange={onFieldChange} />
      <SupplementSection form={form} onFieldChange={onFieldChange} />
    </div>
  );
}
