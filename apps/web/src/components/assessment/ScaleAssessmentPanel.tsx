import { useEffect, useRef, useState } from 'react';
import { MonitorUp, X } from 'lucide-react';
import type {
  AssessmentCardChangePayload,
  AssessmentCardType,
  ScaleCode,
} from '@vmi-tis/shared-types';
import { MVPT_4_SCALE_SPEC, TVPS_4_SUBTESTS } from '@vmi-tis/shared-types/assessment-seed';
import type { ScaleScoreResponse } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { BeeryVmiCard } from './BeeryVmiCard';
import { DemMatrix, type DemTest } from './DemMatrix';
import { ScaleStatusBadge } from './ScaleStatusBadge';
import { Tvps4Card, type Tvps4Phase } from './Tvps4Card';
import {
  RecordNumberField,
  type AssessmentRecordForm,
  type NumericRecordField,
} from './RecordSummary';
import {
  getFormScoreSource,
  getScaleStatusBadge,
  getScoreSourceLabel,
  type ScaleFormScoreState,
} from '../../utils/scaleStatus';

interface FieldProps {
  form: AssessmentRecordForm;
  onFieldChange: (field: NumericRecordField, value: string) => void;
}

/** 单个评估卡的远程出示控制（按钮状态由面板统一给出）。 */
interface RemoteControl {
  /** 当前正在学生端出示的就是这张卡。 */
  active: boolean;
  /** 没有当前学生或教师 socket 未连接时为 true。 */
  disabled: boolean;
  onShow: () => void;
}

/**
 * 按子测验与样例题计算呈现阶段：种子里标了 `exposureTimeSec` 的记忆题先呈现
 * 目标图形（倒计时），其余直接进选项。教师端与卡片内部共用这一条规则。
 */
function tvpsPhaseFor(
  subtestCode: string,
  itemIndex: number,
): { phase: Tvps4Phase; remaining: number } {
  const subtest =
    TVPS_4_SUBTESTS.find((entry) => entry.subtestCode === subtestCode) ??
    TVPS_4_SUBTESTS[0];
  const item =
    subtest.sampleDigitalItems[itemIndex] ?? subtest.sampleDigitalItems[0];
  const exposure = item?.exposureTimeSec ?? null;
  return exposure && exposure > 0
    ? { phase: 'target', remaining: exposure }
    : { phase: 'options', remaining: 0 };
}

/** 标准分输入框下的来源提示：数据状态 + 分数来源（规则与报告 / CSV 同源）。 */
function ScoreSourceHint({
  scaleCode,
  state,
  ageYears,
}: {
  scaleCode: ScaleCode;
  state: ScaleFormScoreState;
  ageYears?: number | null;
}) {
  return (
    <p className="mt-1 text-[11px] text-slate-400">
      数据状态：{getScaleStatusBadge(scaleCode).label} · 分数来源：
      {getScoreSourceLabel(getFormScoreSource(scaleCode, state, ageYears))}
    </p>
  );
}

interface BeerySectionProps extends FieldProps {
  scaleResult: ScaleScoreResponse | null;
  beeryItemNumber: number;
  beeryCompleted: boolean;
  scoreSubmitting?: boolean;
  ageYears?: number;
  onBeeryItemNumberChange: (itemNumber: number) => void;
  onScore: (score: 0 | 1) => void;
  onResetScale: () => void;
  onConfirmRawScore: () => void;
  remote: RemoteControl;
}

function BeerySection({
  form,
  scaleResult,
  beeryItemNumber,
  beeryCompleted,
  scoreSubmitting,
  ageYears,
  onFieldChange,
  onBeeryItemNumberChange,
  onScore,
  onResetScale,
  onConfirmRawScore,
  remote,
}: BeerySectionProps) {
  const shouldTerminate = Boolean(scaleResult?.shouldTerminate);
  const zeroCount = scaleResult?.consecutiveZeroCount ?? 0;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              第四步：Beery VMI-6 主测验（30 题）
            </h2>
            <ScaleStatusBadge scaleCode="BEERY_VMI_6" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            逐题判定 1 分（通过）/ 0 分（未通过）；连续 3 题 0
            分触发 R2 自动中止。完成后点「确认原始分」，把本轮累计原始分写入记录原始分，仍可手工修改。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-teal-100 text-teal-800">
            本题卡读取种子 BEERY_VMI_6_ITEMS
          </span>
          <RemoteShowButton
            remote={remote}
            label={`第 ${beeryItemNumber} 题`}
          />
        </div>
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
          <ScoreSourceHint
            scaleCode="BEERY_VMI_6"
            ageYears={ageYears}
            state={{
              hasRawInput: form.beeryVmiRaw.trim() !== '',
              standardScore: form.beeryVmiStd,
            }}
          />
          <p className="text-[11px] text-slate-400">
            「确认原始分」把 R2 的累计原始分写入左侧输入框；留空标准分时由服务端按种子常模换算。
          </p>
        </div>
      </div>
    </section>
  );
}

/** 「远程出示」按钮：已出示时提示点此重发，socket 或学生缺失时禁用。 */
function RemoteShowButton({
  remote,
  label,
}: {
  remote: RemoteControl;
  label: string;
}) {
  return (
    <button
      type="button"
      className="btn-secondary inline-flex items-center gap-1"
      disabled={remote.disabled}
      onClick={remote.onShow}
      title={remote.disabled ? '需要先选择学生且教师端实时通道已连接' : label}
    >
      <MonitorUp className="h-4 w-4" />
      {remote.active ? '已出示 · 重发' : '远程出示'}
    </button>
  );
}

function TvpsSection({
  form,
  onFieldChange,
  remote,
  subtestCode,
  itemIndex,
  phase,
  remaining,
  ageYears,
  onSubtestCodeChange,
  onItemIndexChange,
  onPhaseChange,
  onRemainingChange,
}: FieldProps & {
  remote: RemoteControl;
  subtestCode: string;
  itemIndex: number;
  phase: Tvps4Phase;
  remaining: number;
  ageYears?: number;
  onSubtestCodeChange: (code: string) => void;
  onItemIndexChange: (index: number) => void;
  onPhaseChange: (phase: Tvps4Phase) => void;
  onRemainingChange: (remaining: number) => void;
}) {
  const tvpsRawFilled = [
    form.tvpsDIS,
    form.tvpsMEM,
    form.tvpsSPA,
    form.tvpsCON,
    form.tvpsSEQ,
    form.tvpsFGR,
    form.tvpsCLO,
  ].every((value) => value.trim() !== '');

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              第四步：TVPS-4 视觉感知（样例题卡 + 手工原始分）
            </h2>
            <ScaleStatusBadge scaleCode="TVPS_4" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            种子文件只为 7 个子测验各提供 1 道代表性样例题卡，不包含 18
            题完整题库，因此系统不逐题判分、不伪造题目。请按官方题册施测后，在下方手工录入 7
            项原始分（0–18）。
          </p>
        </div>
        <RemoteShowButton remote={remote} label="TVPS-4 样例题卡" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tvps4Card
          subtestCode={subtestCode}
          onSubtestCodeChange={onSubtestCodeChange}
          itemIndex={itemIndex}
          onItemIndexChange={onItemIndexChange}
          phase={phase}
          onPhaseChange={onPhaseChange}
          remaining={remaining}
          onRemainingChange={onRemainingChange}
        />
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
          <ScoreSourceHint
            scaleCode="TVPS_4"
            ageYears={ageYears}
            state={{ hasRawInput: tvpsRawFilled, standardScore: form.tvps4Std }}
          />
          <p className="mt-2 text-[11px] text-slate-400">
            7 项原始分全部填写时，服务端用种子 calculateTvps4ProfileNorms
            换算综合标准分；只填部分时仅保存已填项。
          </p>
        </div>
      </div>
    </section>
  );
}

function DemSection({
  form,
  onFieldChange,
  remote,
  test,
  onTestChange,
}: FieldProps & {
  remote: RemoteControl;
  test: DemTest;
  onTestChange: (test: DemTest) => void;
}) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              第四步：DEM 发育性眼动（刺激矩阵 + 手工原始用时）
            </h2>
            <ScaleStatusBadge scaleCode="DEM" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            用下方刺激矩阵完成 Test A / B / C 后录入用时与错误数；5
            项全部填写才由服务端换算。
          </p>
        </div>
        <RemoteShowButton remote={remote} label={`DEM Test ${test}`} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DemMatrix test={test} onTestChange={onTestChange} />
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

/** MVPT-4 45 题记分台：实物图册施测，软件只记分。 */
function Mvpt4Section({
  form,
  onFieldChange,
  ageYears,
}: FieldProps & { ageYears?: number }) {
  const scores = Array.from({ length: 45 }, (_, index) => {
    const char = form.mvpt4ItemScores45[index];
    return char === '1' ? 1 : char === '0' ? 0 : null;
  });
  const scoredCount = scores.filter((value) => value !== null).length;
  const correctCount = scores.filter((value) => value === 1).length;
  const weakDomains = MVPT_4_SCALE_SPEC.domainSections
    .map((section) => {
      const fullyScored = section.itemNumbers.every(
        (itemNumber) => scores[itemNumber - 1] !== null,
      );
      if (!fullyScored) return null;
      const hits = section.itemNumbers.reduce(
        (sum, itemNumber) => sum + (scores[itemNumber - 1] === 1 ? 1 : 0),
        0,
      );
      const accuracyPct = Math.round((hits / section.itemNumbers.length) * 100);
      return accuracyPct < 65
        ? {
            name: section.domainNameCn,
            accuracyPct,
            cards: section.matchedSopCards.join('、'),
          }
        : null;
    })
    .filter(
      (item): item is { name: string; accuracyPct: number; cards: string } =>
        item !== null,
    );
  const [memRemaining, setMemRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (memRemaining === null || memRemaining <= 0) return;
    const timer = setTimeout(
      () => setMemRemaining((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [memRemaining]);

  const updateScore = (itemNumber: number, value: string) => {
    const next: string[] = Array.from({ length: 45 }, (_, index) => {
      const char = form.mvpt4ItemScores45[index];
      return char === '1' ? '1' : char === '0' ? '0' : '-';
    });
    next[itemNumber - 1] = value === '' ? '-' : value;
    onFieldChange('mvpt4ItemScores45', next.join(''));
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              第四步：MVPT-4 记分台（45 题）
            </h2>
            <ScaleStatusBadge scaleCode="MVPT_4" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            用医院采购的 MVPT-4 实物图册施测；本面板只记分，不内置官方图版。
            逐题选择 1/0；MEM 题组 19–27 点「开始 5 秒」提示呈现与遮挡。
          </p>
        </div>
        <span className="badge bg-teal-100 text-teal-800">
          已评 {scoredCount}/45 · 正确 {correctCount}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {MVPT_4_SCALE_SPEC.domainSections.map((section) => (
          <div
            key={section.domainCode}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700">
                {section.domainNameCn}
              </h3>
              <span className="text-[11px] text-slate-400">
                题 {section.itemNumbers[0]}–
                {section.itemNumbers[section.itemNumbers.length - 1]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {section.standardCueText}
            </p>
            {section.exposureTimeSec === 5 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => setMemRemaining(5)}
                >
                  开始 5 秒呈现
                </button>
                {memRemaining !== null && (
                  <span className="text-[11px] font-semibold text-amber-700">
                    {memRemaining > 0
                      ? `呈现中 ${memRemaining}s`
                      : '遮挡，请学生指认'}
                  </span>
                )}
              </div>
            )}
            <div className="mt-2 grid grid-cols-9 gap-1">
              {section.itemNumbers.map((itemNumber) => (
                <label
                  key={itemNumber}
                  className="text-center text-[10px] text-slate-500"
                >
                  {itemNumber}
                  <select
                    value={
                      scores[itemNumber - 1] === null
                        ? ''
                        : String(scores[itemNumber - 1])
                    }
                    onChange={(event) =>
                      updateScore(itemNumber, event.target.value)
                    }
                    className="input mt-0.5 h-8 p-0 text-center text-xs"
                  >
                    <option value="">—</option>
                    <option value="1">1</option>
                    <option value="0">0</option>
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RecordNumberField
          label="MVPT-4 原始分（0–45；留空按逐题汇总）"
          field="mvpt4RawScore"
          form={form}
          onChange={onFieldChange}
        />
        <RecordNumberField
          label="MVPT-4 标准分（手册录入；14 岁以上必填）"
          field="mvpt4Std"
          form={form}
          onChange={onFieldChange}
        />
      </div>
      <ScoreSourceHint
        scaleCode="MVPT_4"
        ageYears={ageYears}
        state={{
          hasRawInput:
            form.mvpt4RawScore.trim() !== '' ||
            /^[01]{45}$/.test(form.mvpt4ItemScores45),
          standardScore: form.mvpt4Std,
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onFieldChange('mvpt4RawScore', String(correctCount))}
        >
          把正确数填入原始分
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => onFieldChange('mvpt4ItemScores45', '')}
        >
          清空逐题
        </button>
        <span className="text-[11px] text-slate-400">
          14 岁以上自动换算不生效，请按手册录入标准分；4–13
          岁留空标准分时服务端按内置锚点参考换算。
        </span>
      </div>
      <div className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
        {scoredCount < 45
          ? `逐题已评 ${scoredCount}/45：只有 45 题全部判定，逐题才会随记录保存；当前不解析薄弱维度。`
          : weakDomains.length > 0
            ? `薄弱维度（正确率 <65%）：${weakDomains
                .map(
                  (domain) =>
                    `${domain.name} ${domain.accuracyPct}%（${domain.cards}）`,
                )
                .join('；')}`
            : '薄弱维度：无（各维度正确率均 ≥65%）。'}
      </div>
    </section>
  );
}

function SupplementSection({ form, onFieldChange }: FieldProps) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800">
          第四步：Beery VP / MC 补充录入
        </h2>
        <ScaleStatusBadge scaleCode="BEERY_VMI_6" />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        补充测验原始分可独立录入；留空不参与换算。MVPT-4
        记分台在上方单独录入。
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
      </div>
    </section>
  );
}

interface ScaleAssessmentPanelProps extends FieldProps {
  scaleResult: ScaleScoreResponse | null;
  beeryItemNumber: number;
  beeryCompleted: boolean;
  scoreSubmitting?: boolean;
  ageYears?: number;
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
  ageYears,
  onFieldChange,
  onBeeryItemNumberChange,
  onScore,
  onResetScale,
  onConfirmRawScore,
}: ScaleAssessmentPanelProps) {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const emitAssessmentCard = useAppStore(
    (state) => state.teacherEmitAssessmentCard,
  );

  // 远程出示状态只在第 4 步页面内有效，不进全局 store。
  const [showing, setShowing] = useState<{
    cardType: AssessmentCardType;
    studentId: string;
  } | null>(null);
  // TVPS-4 当前题卡状态由面板持有：教师翻子测验/题、5 秒倒计时推进阶段都在
  // 这里算，再随远程出示发给学生端（学生端只读展示，不自行改阶段）。
  const [tvpsSubtestCode, setTvpsSubtestCode] = useState<string>(
    TVPS_4_SUBTESTS[0].subtestCode,
  );
  const [tvpsItemIndex, setTvpsItemIndex] = useState(0);
  const [tvpsPhase, setTvpsPhase] = useState<Tvps4Phase>('options');
  const [tvpsRemaining, setTvpsRemaining] = useState(0);
  const [demTest, setDemTest] = useState<DemTest>('A');

  // 正在出示的卡只在「出示时的学生 === 当前学生」时有效；切学生后自动作废。
  const showingCardType =
    showing && showing.studentId === activeStudentId
      ? showing.cardType
      : null;

  const buildPayload = (
    cardType: AssessmentCardType,
    studentId: string,
  ): AssessmentCardChangePayload => {
    if (cardType === 'beery') {
      return {
        event: 'ASSESSMENT_CARD_CHANGE',
        studentId,
        action: 'show',
        cardType,
        beeryItemNumber,
      };
    }
    if (cardType === 'tvps4') {
      return {
        event: 'ASSESSMENT_CARD_CHANGE',
        studentId,
        action: 'show',
        cardType,
        tvpsSubtestCode,
        tvpsItemIndex,
        tvpsPhase,
        tvpsRemaining,
      };
    }
    return {
      event: 'ASSESSMENT_CARD_CHANGE',
      studentId,
      action: 'show',
      cardType,
      demTest,
    };
  };

  const hide = () => {
    if (!activeStudentId || !emitAssessmentCard) return;
    emitAssessmentCard({
      event: 'ASSESSMENT_CARD_CHANGE',
      studentId: activeStudentId,
      action: 'hide',
      cardType: null,
    });
    setShowing(null);
  };

  const show = (cardType: AssessmentCardType) => {
    if (!activeStudentId || !emitAssessmentCard) return;
    if (showingCardType === cardType) {
      // 同一张卡已在出示：状态没变、下面的 effect 不会重跑，「重发」直接发一次。
      emitAssessmentCard(buildPayload(cardType, activeStudentId));
      return;
    }
    setShowing({ cardType, studentId: activeStudentId });
  };

  // 出示后切题、翻子测验、倒计时推进阶段都自动重发；含 TVPS 每秒剩余秒数，
  // 学生端按 `tvpsRemaining` 展示倒计时。学生端不补发历史帧。
  useEffect(() => {
    if (!showingCardType || !activeStudentId || !emitAssessmentCard) return;
    emitAssessmentCard(buildPayload(showingCardType, activeStudentId));
    // buildPayload 由上面这些状态拼装，依赖已逐一列出。
  }, [
    showingCardType,
    activeStudentId,
    emitAssessmentCard,
    beeryItemNumber,
    tvpsSubtestCode,
    tvpsItemIndex,
    tvpsPhase,
    tvpsRemaining,
    demTest,
  ]);

  // 切学生：收起远程卡（旧学生的卡不跟到新学生）。
  useEffect(() => {
    setShowing(null);
  }, [activeStudentId]);

  // 离开第 4 步（组件卸载）时收回，避免学生端停在一张没人收的卡上。
  const showingRef = useRef(showing);
  showingRef.current = showing;
  const emitRef = useRef(emitAssessmentCard);
  emitRef.current = emitAssessmentCard;
  useEffect(
    () => () => {
      const current = showingRef.current;
      const emit = emitRef.current;
      if (current && emit) {
        emit({
          event: 'ASSESSMENT_CARD_CHANGE',
          studentId: current.studentId,
          action: 'hide',
          cardType: null,
        });
      }
    },
    [],
  );

  const changeTvpsSubtest = (code: string) => {
    const next = tvpsPhaseFor(code, 0);
    setTvpsSubtestCode(code);
    setTvpsItemIndex(0);
    setTvpsPhase(next.phase);
    setTvpsRemaining(next.remaining);
  };

  const changeTvpsItem = (index: number) => {
    const next = tvpsPhaseFor(tvpsSubtestCode, index);
    setTvpsItemIndex(index);
    setTvpsPhase(next.phase);
    setTvpsRemaining(next.remaining);
  };

  const remoteDisabled = !activeStudentId || !emitAssessmentCard;
  const remoteFor = (cardType: AssessmentCardType): RemoteControl => ({
    active: showingCardType === cardType,
    disabled: remoteDisabled,
    onShow: () => show(cardType),
  });

  const tvpsSubtest =
    TVPS_4_SUBTESTS.find((entry) => entry.subtestCode === tvpsSubtestCode) ??
    TVPS_4_SUBTESTS[0];
  const showingLabel =
    showingCardType === 'beery'
      ? `Beery VMI-6 第 ${beeryItemNumber} 题`
      : showingCardType === 'tvps4'
        ? `TVPS-4 ${tvpsSubtest.nameCn} · 样例 ${tvpsItemIndex + 1} · ${
            tvpsPhase === 'target' ? `记忆呈现 ${tvpsRemaining} 秒` : '选项'
          }`
        : showingCardType === 'dem'
          ? `DEM Test ${demTest}`
          : null;

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <MonitorUp className="h-4 w-4 text-[#0F4C5C]" />
              双屏评估出示
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {showingLabel
                ? `学生 Pad 正在显示：${showingLabel}；切题、翻子测验、换矩阵会自动跟随。`
                : '未出示：学生 Pad 保持当前画面。点任一张卡的「远程出示」把题卡推到学生端。'}
            </p>
            {!activeStudentId && (
              <p className="mt-1 text-xs text-amber-700">
                请先在顶部选择学生，才能把题卡出示到学生 Pad。
              </p>
            )}
            {!emitAssessmentCard && (
              <p className="mt-1 text-xs text-amber-700">
                教师端实时通道未连接（WebSocket 发送槽为空），出示按钮暂不可用。
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-1"
            disabled={!showingCardType || !emitAssessmentCard}
            onClick={hide}
          >
            <X className="h-4 w-4" />
            收回评估卡
          </button>
        </div>
      </section>

      <BeerySection
        form={form}
        scaleResult={scaleResult}
        beeryItemNumber={beeryItemNumber}
        beeryCompleted={beeryCompleted}
        scoreSubmitting={scoreSubmitting}
        ageYears={ageYears}
        onFieldChange={onFieldChange}
        onBeeryItemNumberChange={onBeeryItemNumberChange}
        onScore={onScore}
        onResetScale={onResetScale}
        onConfirmRawScore={onConfirmRawScore}
        remote={remoteFor('beery')}
      />
      <TvpsSection
        form={form}
        onFieldChange={onFieldChange}
        remote={remoteFor('tvps4')}
        subtestCode={tvpsSubtestCode}
        itemIndex={tvpsItemIndex}
        phase={tvpsPhase}
        remaining={tvpsRemaining}
        ageYears={ageYears}
        onSubtestCodeChange={changeTvpsSubtest}
        onItemIndexChange={changeTvpsItem}
        onPhaseChange={setTvpsPhase}
        onRemainingChange={setTvpsRemaining}
      />
      <Mvpt4Section form={form} onFieldChange={onFieldChange} ageYears={ageYears} />
      <DemSection
        form={form}
        onFieldChange={onFieldChange}
        remote={remoteFor('dem')}
        test={demTest}
        onTestChange={setDemTest}
      />
      <SupplementSection form={form} onFieldChange={onFieldChange} />
    </div>
  );
}
