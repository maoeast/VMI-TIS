import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type {
  AssessmentMeta,
  AssessmentRecord,
  AssessmentTriageReferral,
} from '@vmi-tis/shared-types';
import {
  BEHAVIOR_SCREENING_ITEMS,
  MILESTONE_0_TO_6_CHECKLIST,
  OPTOMETRY_NORMS,
  RED_ZONE_TRIAGE_ITEMS,
} from '@vmi-tis/shared-types/assessment-seed';
import {
  assessmentApi,
  parseJson,
  resolveApiUrl,
  studentApi,
  triageApi,
  type AssessmentRecordsResponse,
  type ScaleScoreResponse,
  type StudentDetail,
} from '../../api/client';
import { AssessmentCardPanel } from '../../components/assessment/AssessmentCardPanel';
import { NsucoPanel } from '../../components/assessment/NsucoPanel';
import {
  ScreeningForms,
  type ScreeningSelection,
} from '../../components/assessment/ScreeningForms';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import {
  evalPhaseLabel,
  formatDate,
  formatDateTime,
  levelLabel,
  triageBadgeClass,
  triageLabel,
} from '../../utils/format';

type TabKey = 'scale' | 'triage' | 'cards' | 'records';

const EMPTY_RECORD_FORM = {
  npcCm: '',
  accomFacilityCpm: '',
  tvps4Std: '',
  mvpt3Std: '',
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

function monthsBetween(birthDate: Date, now = new Date()): number {
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());
  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export function AssessmentPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);

  const [tab, setTab] = useState<TabKey>('scale');
  const [sessionId] = useState(() => `scale-${Date.now()}`);
  const [itemIndex, setItemIndex] = useState(1);
  const [scaleResult, setScaleResult] = useState<ScaleScoreResponse | null>(null);
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [recordResult, setRecordResult] = useState<AssessmentRecord | null>(null);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [screening, setScreening] = useState<ScreeningSelection>({
    red: [],
    milestones: [],
    behaviors: [],
  });
  const [recordMeta, setRecordMeta] = useState<AssessmentMeta | null>(null);
  const [triageResult, setTriageResult] = useState<AssessmentTriageReferral | null>(null);
  const [referrals, setReferrals] = useState<AssessmentTriageReferral[]>([]);
  const [referralForms, setReferralForms] = useState<
    Record<string, { hospitalName: string; hospitalDiagnosis: string }>
  >({});

  const [records, setRecords] = useState<AssessmentRecordsResponse | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const loadReferrals = async () => {
    if (!activeStudentId) return;
    try {
      setReferrals(await triageApi.list(activeStudentId));
    } catch {
      setReferrals([]);
    }
  };

  const loadRecords = async () => {
    if (!activeStudentId) return;
    try {
      setRecords(await assessmentApi.records(activeStudentId));
    } catch {
      setRecords(null);
    }
  };

  const loadStudent = async () => {
    if (!activeStudentId) {
      setStudent(null);
      return;
    }
    try {
      setStudent(await studentApi.get(activeStudentId));
    } catch {
      setStudent(null);
    }
  };

  useEffect(() => {
    setRecordResult(null);
    setRecordMeta(null);
    setRecordForm(EMPTY_RECORD_FORM);
    setScreening({ red: [], milestones: [], behaviors: [] });
    void loadReferrals();
    void loadRecords();
    void loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  const updateRecordField = (
    key: keyof typeof EMPTY_RECORD_FORM,
    value: string | boolean | number,
  ) => {
    setRecordForm((prev) => ({ ...prev, [key]: value }) as typeof prev);
  };

  const numberOrUndefined = (value: string): number | undefined =>
    value.trim() === '' ? undefined : Number(value);

  const birthDate = student ? new Date(String(student.birthDate)) : undefined;
  const ageMonths = birthDate ? monthsBetween(birthDate) : undefined;
  const ageYears = ageMonths !== undefined ? ageMonths / 12 : undefined;

  const numberField = (
    key: keyof typeof EMPTY_RECORD_FORM,
    label: string,
  ) => (
    <label key={key} className="text-xs font-semibold text-slate-600">
      {label}
      <input
        type="number"
        value={String(recordForm[key])}
        onChange={(event) => updateRecordField(key, event.target.value)}
        className="input mt-1"
      />
    </label>
  );


  const submitScore = async (score: number) => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    try {
      const result = await assessmentApi.submitScaleScore({
        studentId: activeStudentId,
        evalPhase: 'BASELINE',
        sessionId,
        itemIndex,
        score,
      });
      setScaleResult(result);
      if (!result.shouldTerminate) {
        setItemIndex((value) => value + 1);
      }
      if (result.shouldTerminate) {
        showToast(result.message ?? '已触发连续 3 题 0 分中止', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const resetScale = async () => {
    if (!activeStudentId) return;
    try {
      await assessmentApi.submitScaleScore({
        studentId: activeStudentId,
        evalPhase: 'BASELINE',
        sessionId,
        reset: true,
      });
      setScaleResult(null);
      setItemIndex(1);
      showToast('本轮施测计数已重置', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const saveRecord = async () => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    const tvps4RawScores =
      recordForm.tvpsDIS !== '' &&
      recordForm.tvpsMEM !== '' &&
      recordForm.tvpsSPA !== '' &&
      recordForm.tvpsCON !== '' &&
      recordForm.tvpsSEQ !== '' &&
      recordForm.tvpsFGR !== '' &&
      recordForm.tvpsCLO !== ''
        ? {
            DIS: Number(recordForm.tvpsDIS),
            MEM: Number(recordForm.tvpsMEM),
            SPA: Number(recordForm.tvpsSPA),
            CON: Number(recordForm.tvpsCON),
            SEQ: Number(recordForm.tvpsSEQ),
            FGR: Number(recordForm.tvpsFGR),
            CLO: Number(recordForm.tvpsCLO),
          }
        : undefined;
    const demRaw =
      recordForm.demAVerticalSec !== '' &&
      recordForm.demBVerticalSec !== '' &&
      recordForm.demCHorizontalSec !== '' &&
      recordForm.demOmissionErrors !== '' &&
      recordForm.demAdditionErrors !== ''
        ? {
            testAVerticalSec: Number(recordForm.demAVerticalSec),
            testBVerticalSec: Number(recordForm.demBVerticalSec),
            testCHorizontalRawSec: Number(recordForm.demCHorizontalSec),
            omissionErrors: Number(recordForm.demOmissionErrors),
            additionErrors: Number(recordForm.demAdditionErrors),
          }
        : undefined;

    try {
      const record = await assessmentApi.createRecord({
        studentId: activeStudentId,
        evalPhase: 'BASELINE',
        npcCm: numberOrUndefined(recordForm.npcCm),
        accomFacilityCpm: numberOrUndefined(recordForm.accomFacilityCpm),
        tvps4Std: numberOrUndefined(recordForm.tvps4Std),
        mvpt3Std: numberOrUndefined(recordForm.mvpt3Std),
        beeryVmiStd: numberOrUndefined(recordForm.beeryVmiStd),
        beeryVmiRaw: numberOrUndefined(recordForm.beeryVmiRaw),
        beeryVpStd: numberOrUndefined(recordForm.beeryVpStd),
        beeryVpRaw: numberOrUndefined(recordForm.beeryVpRaw),
        beeryMcStd: numberOrUndefined(recordForm.beeryMcStd),
        beeryMcRaw: numberOrUndefined(recordForm.beeryMcRaw),
        tvps4RawScores,
        demRaw,
        quadrupedHoldSec: numberOrUndefined(recordForm.quadrupedHoldSec),
        classroomCopyAccuracyPct: numberOrUndefined(
          recordForm.classroomCopyAccuracyPct,
        ),
        nsucoScore: {
          pursuit: recordForm.nsucoPursuit,
          saccade: recordForm.nsucoSaccade,
        },
        stabilityPass: recordForm.stabilityPass,
        classroomAdaptationPass: recordForm.classroomAdaptationPass,
      });
      setRecordResult(record);
      setRecordMeta(
        parseJson<AssessmentMeta | null>(record.assessmentMetaJson, null),
      );
      showToast(`评估已保存，自动定级 ${record.autoLevel}`, 'success');
      await loadRecords();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const submitTriage = async () => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    const redItems = RED_ZONE_TRIAGE_ITEMS.filter((item) =>
      screening.red.includes(item.code),
    ).map((item) => ({
      item: item.label,
      score: item.category === 'ACUITY_REFRACTION' ? 2.5 : 1,
    }));
    const milestoneItems = MILESTONE_0_TO_6_CHECKLIST.flatMap((group) =>
      group.visualAndVmiMilestones.map((text, index) => ({
        code: `${group.code}-${index}`,
        text,
      })),
    )
      .filter((entry) => screening.milestones.includes(entry.code))
      .map((entry) => ({ item: `里程碑未达成：${entry.text}`, score: 1 }));
    const behaviorItems = BEHAVIOR_SCREENING_ITEMS.filter((item) =>
      screening.behaviors.includes(item.code),
    ).map((item) => ({ item: item.question, score: 1 }));
    const allBehaviorItems = [
      ...redItems,
      ...milestoneItems,
      ...behaviorItems,
    ];
    try {
      const result = await triageApi.submit({
        studentId: activeStudentId,
        behaviorItems: allBehaviorItems,
        redZoneItems: [],
      });
      setTriageResult(result);
      showToast(
        result.isRedZone
          ? `命中红区，已生成转介单 ${result.referralCode}`
          : '初筛通过，学生进入绿区',
        result.isRedZone ? 'error' : 'success',
      );
      await loadReferrals();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const updateReferralForm = (
    referralId: string,
    field: 'hospitalName' | 'hospitalDiagnosis',
    value: string,
  ) => {
    setReferralForms((prev) => ({
      ...prev,
      [referralId]: {
        hospitalName: prev[referralId]?.hospitalName ?? '',
        hospitalDiagnosis: prev[referralId]?.hospitalDiagnosis ?? '',
        [field]: value,
      },
    }));
  };

  const uploadReferral = async (referralId: string) => {
    const form = referralForms[referralId];
    if (!form?.hospitalName.trim()) {
      showToast('请填写接诊医院名称', 'error');
      return;
    }
    try {
      await triageApi.uploadReferral({
        referralId,
        hospitalName: form.hospitalName.trim(),
        hospitalDiagnosis: form.hospitalDiagnosis.trim() || undefined,
        receiptFileUrl: '/uploads/receipt-demo.pdf',
      });
      showToast('回执已上传，等待视光师审核', 'success');
      await loadReferrals();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const auditReferral = async (
    referralId: string,
    auditStatus: 'APPROVED' | 'REJECTED',
  ) => {
    try {
      await triageApi.audit({
        referralId,
        auditStatus,
        auditedBy: '陈明 (视光师)',
        hospitalDiagnosis:
          referralForms[referralId]?.hospitalDiagnosis || undefined,
      });
      showToast(
        auditStatus === 'APPROVED' ? '回执审核通过，已解锁训练' : '回执已驳回',
        auditStatus === 'APPROVED' ? 'success' : 'error',
      );
      await loadReferrals();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const generateReport = async (recordId: string) => {
    try {
      const result = await assessmentApi.generateReport(recordId);
      const resolved = resolveApiUrl(result.reportFileUrl);
      setReportUrl(resolved);
      window.open(resolved, '_blank', 'noopener,noreferrer');
      showToast('评估报告已生成', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const lastThree = scaleResult?.lastThree ?? [];
  const zeroCount = scaleResult?.consecutiveZeroCount ?? 0;

  return (
    <div>
      <PageHeader
        title="评估中心"
        description="电子量表施测、入案初筛红区熔断、专科评估报告库"
        actions={
          <button type="button" className="btn-secondary" onClick={() => { void loadReferrals(); void loadRecords(); }}>
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm">
        {[
          ['scale', '① 电子量表施测台'],
          ['triage', '② 初筛与红区转介'],
          ['cards', '③ 量表题卡'],
          ['records', '④ 评估报告库'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as TabKey)}
            className={
              tab === key
                ? 'rounded-lg bg-[#0F4C5C] px-3.5 py-2 text-xs font-bold text-white'
                : 'rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'scale' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">逐题判分与 R2 中止</h2>
            <p className="mt-1 text-xs text-slate-500">
              每题计 0 / 1 分；最近连续 3 题均为 0 分时自动中止本轮测验。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={scaleResult?.shouldTerminate}
                className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void submitScore(1)}
              >
                <ClipboardCheck className="mx-auto mb-1 h-5 w-5" />
                通过（1 分）
              </button>
              <button
                type="button"
                disabled={scaleResult?.shouldTerminate}
                className="rounded-2xl border-2 border-rose-300 bg-white px-4 py-5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void submitScore(0)}
              >
                <AlertTriangle className="mx-auto mb-1 h-5 w-5" />
                未通过（0 分）
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
              <span className="font-semibold text-slate-600">
                第 {itemIndex} 题 · 本会话已提交 {scaleResult?.submittedItems ?? 0} 题
                · 累计原始分 {scaleResult?.totalRawScore ?? 0}
              </span>
              <span
                className={
                  zeroCount >= 2
                    ? 'badge bg-rose-100 text-rose-800'
                    : 'badge bg-emerald-100 text-emerald-800'
                }
              >
                连续 0 分计数：{zeroCount}/3
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {lastThree.map((score, index) => (
                <span
                  key={`${index}-${score}`}
                  className={
                    score === 0
                      ? 'badge bg-rose-100 text-rose-800'
                      : 'badge bg-emerald-100 text-emerald-800'
                  }
                >
                  {score}
                </span>
              ))}
              <button type="button" className="ml-auto text-xs font-semibold text-teal-700 hover:underline" onClick={() => void resetScale()}>
                重置本轮
              </button>
            </div>

            {scaleResult?.shouldTerminate && (
              <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
                <div className="font-bold">已自动中止本轮评估</div>
                <p className="mt-1">{scaleResult.message}</p>
                <p className="mt-1">
                  中止时累计原始分：{scaleResult.totalRawScore}；请先记录该分数，再重置本轮。
                </p>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">评估指标与自动定级</h2>
            <p className="mt-1 text-xs text-slate-500">
              原始分优先调用种子函数换算；留空时使用标准分或兼容缺省。保存后回写学生当前层级。
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-700">视光与眼动</h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {numberField('npcCm', 'NPC（cm）')}
                  {numberField('accomFacilityCpm', '调节灵活度（cpm）')}
                  {numberField('tvps4Std', 'TVPS-4 标准分')}
                  {numberField('mvpt3Std', 'MVPT-3 标准分')}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  NPC 正常不高于 {OPTOMETRY_NORMS.npcCutoffCm.normalMax} cm，大于{' '}
                  {OPTOMETRY_NORMS.npcCutoffCm.insufficiencyThreshold} cm 提示集合不足；
                  调节灵活度正常不低于{' '}
                  {OPTOMETRY_NORMS.accomFacilityCpmCutoff.normalMin} cpm，低于{' '}
                  {OPTOMETRY_NORMS.accomFacilityCpmCutoff.lagThreshold} cpm 提示调节滞后。
                  {ageYears !== undefined &&
                    ` 该年龄最小预期调节幅度约 ${OPTOMETRY_NORMS.minExpectedAccomAmplitudeD(ageYears)} D。`}
                </p>
                <div className="mt-3">
                  <NsucoPanel
                    pursuit={recordForm.nsucoPursuit}
                    saccade={recordForm.nsucoSaccade}
                    onChange={(field, value) =>
                      updateRecordField(
                        field === 'pursuit' ? 'nsucoPursuit' : 'nsucoSaccade',
                        value,
                      )
                    }
                  />
                </div>
              </div>

              <details open className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">
                  Beery VMI-6（原始分优先）
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {numberField('beeryVmiRaw', '主测验原始分（0–30）')}
                  {numberField('beeryVmiStd', '主测验标准分')}
                  {numberField('beeryVpRaw', 'VP 补充原始分')}
                  {numberField('beeryVpStd', 'VP 标准分')}
                  {numberField('beeryMcRaw', 'MC 补充原始分')}
                  {numberField('beeryMcStd', 'MC 标准分')}
                </div>
              </details>

              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">
                  TVPS-4 七项原始分（全部填写才换算）
                </summary>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {numberField('tvpsDIS', 'DIS')}
                  {numberField('tvpsMEM', 'MEM')}
                  {numberField('tvpsSPA', 'SPA')}
                  {numberField('tvpsCON', 'CON')}
                  {numberField('tvpsSEQ', 'SEQ')}
                  {numberField('tvpsFGR', 'FGR')}
                  {numberField('tvpsCLO', 'CLO')}
                </div>
              </details>

              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">
                  DEM 原始输入（全部填写才换算）
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {numberField('demAVerticalSec', 'Test A 纵向（秒）')}
                  {numberField('demBVerticalSec', 'Test B 纵向（秒）')}
                  {numberField('demCHorizontalSec', 'Test C 横向（秒）')}
                  {numberField('demOmissionErrors', '漏读字数')}
                  {numberField('demAdditionErrors', '多读字数')}
                </div>
              </details>

              <div>
                <h3 className="text-xs font-bold text-slate-700">稳定性与课堂应用</h3>
                <div className="mt-2 space-y-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={recordForm.stabilityPass}
                      onChange={(event) =>
                        updateRecordField('stabilityPass', event.target.checked)
                      }
                    />
                    身体稳定 / 前庭本体评估达标
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={recordForm.classroomAdaptationPass}
                      onChange={(event) =>
                        updateRecordField(
                          'classroomAdaptationPass',
                          event.target.checked,
                        )
                      }
                    />
                    课堂抄写 / 文具使用补充评估达标
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {numberField('quadrupedHoldSec', '四点爬行维持（秒）')}
                    {numberField('classroomCopyAccuracyPct', '课堂抄写正确率（%）')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="btn-primary" onClick={() => void saveRecord()}>
                保存评估记录
              </button>
              {recordResult && (
                <span className="badge bg-teal-100 text-teal-800">
                  自动定级：{levelLabel(recordResult.autoLevel ?? '')}
                </span>
              )}
            </div>

            {recordMeta && (
              <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
                <div className="font-bold">
                  {recordMeta.grading.recommendedLevelLabel}
                </div>
                <p className="mt-1">{recordMeta.grading.clinicalBottleneckAnalysis}</p>
                <p className="mt-1">
                  推荐操作卡：{recordMeta.grading.recommendedSopCardCodes.join('、')}
                </p>
                {recordMeta.dem && (
                  <p className="mt-1">DEM：{recordMeta.dem.summaryText}</p>
                )}
                {recordMeta.tvps4 && (
                  <p className="mt-1">
                    TVPS-4 综合标准分：{recordMeta.tvps4.overallStandardScore}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'triage' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">入案第一层初筛</h2>
            <p className="mt-1 text-xs text-slate-500">
              红区、里程碑与行为筛查均读取种子常量；提交后由服务端重新计算 R1 红区。
            </p>
            <div className="mt-4">
              <ScreeningForms
                value={screening}
                onChange={setScreening}
                ageMonths={ageMonths}
              />
            </div>
            <button type="button" className="btn-primary mt-4" onClick={() => void submitTriage()}>
              <ShieldAlert className="mr-1 inline h-4 w-4" />
              提交初筛
            </button>
            {triageResult && (
              <div
                className={
                  triageResult.isRedZone
                    ? 'mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900'
                    : 'mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900'
                }
              >
                <div className="font-bold">
                  {triageResult.isRedZone ? '红区锁定' : '绿区通过'}
                </div>
                <div className="mt-1">
                  转介单号：{triageResult.referralCode ?? '无需转介'} · 审核状态：
                  {triageResult.auditStatus}
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  红区项：{triageResult.redZoneItemsJson}
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">眼科转介与回执核验</h2>
            <p className="mt-1 text-xs text-slate-500">
              上传回执 → 回执待审核；审核通过解锁训练，驳回则回到红区锁定。
            </p>
            <div className="mt-4 space-y-3">
              {referrals.length === 0 && (
                <p className="text-xs text-slate-400">暂无转介记录</p>
              )}
              {referrals.map((referral) => {
                const form = referralForms[referral.id] ?? {
                  hospitalName: '',
                  hospitalDiagnosis: '',
                };
                const redItems = parseJson<string[]>(referral.redZoneItemsJson, []);
                return (
                  <div key={referral.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-700">
                        {referral.referralCode ?? '绿区初筛'}
                      </span>
                      <span className={`badge ${triageBadgeClass(referral.isRedZone ? 'RED_ZONE_LOCKED' : 'GREEN_ACTIVE')}`}>
                        {triageLabel(referral.isRedZone ? 'RED_ZONE_LOCKED' : 'GREEN_ACTIVE')}
                      </span>
                      <span className="text-slate-500">{referral.auditStatus}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      红区项：{redItems.length ? redItems.join('、') : '无'}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={form.hospitalName}
                        onChange={(event) =>
                          updateReferralForm(referral.id, 'hospitalName', event.target.value)
                        }
                        placeholder="接诊医院名称"
                        className="input"
                      />
                      <input
                        value={form.hospitalDiagnosis}
                        onChange={(event) =>
                          updateReferralForm(referral.id, 'hospitalDiagnosis', event.target.value)
                        }
                        placeholder="医院诊断结论"
                        className="input"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={() => void uploadReferral(referral.id)}>
                        上传回执
                      </button>
                      <button type="button" className="btn-primary" onClick={() => void auditReferral(referral.id, 'APPROVED')}>
                        审核通过
                      </button>
                      <button type="button" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100" onClick={() => void auditReferral(referral.id, 'REJECTED')}>
                        驳回
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === 'cards' && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-slate-800">量表题卡</h2>
          <p className="mt-1 text-xs text-slate-500">
            Beery VMI-6 / TVPS-4 / DEM 题卡直接读取种子常量；教师端与学生端共用，出示不自动计分。
          </p>
          <div className="mt-4">
            <AssessmentCardPanel />
          </div>
        </section>
      )}

      {tab === 'records' && (
        <div className="space-y-4">
          {reportUrl && (
            <div className="card border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              报告已生成：
              <a className="ml-1 font-semibold underline" href={reportUrl} target="_blank" rel="noreferrer">
                {reportUrl}
              </a>
            </div>
          )}
          {(['BASELINE', 'STAGE_8W', 'TRANSITION'] as const).map((phase) => {
            const group = records?.groups?.[phase] ?? [];
            return (
              <section key={phase} className="card p-5">
                <h2 className="text-sm font-bold text-slate-800">
                  {evalPhaseLabel(phase)}
                  <span className="ml-2 text-xs font-normal text-slate-400">{group.length} 条</span>
                </h2>
                {group.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">暂无记录</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="table-head">
                        <tr>
                          <th className="px-3 py-2">日期</th>
                          <th className="px-3 py-2">NPC</th>
                          <th className="px-3 py-2">调节灵活度</th>
                          <th className="px-3 py-2">Beery VMI</th>
                          <th className="px-3 py-2">TVPS-4</th>
                          <th className="px-3 py-2">定级</th>
                          <th className="px-3 py-2 text-right">报告</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.map((record) => (
                          <tr key={record.id}>
                            <td className="px-3 py-2 text-slate-500">{formatDate(record.createdAt)}</td>
                            <td className="px-3 py-2">{record.npcCm ?? '—'} cm</td>
                            <td className="px-3 py-2">{record.accomFacilityCpm ?? '—'} cpm</td>
                            <td className="px-3 py-2">{record.beeryVmiStd ?? '—'}</td>
                            <td className="px-3 py-2">{record.tvps4Std ?? '—'}</td>
                            <td className="px-3 py-2">
                              <span className="badge bg-teal-100 text-teal-800">{record.autoLevel ?? '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => void generateReport(record.id)}>
                                <FileText className="mr-1 inline h-3.5 w-3.5" />
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
          <p className="text-[11px] text-slate-400">
            最近一次评估：
            {records?.records?.[0]
              ? `${formatDateTime(records.records[0].createdAt)} · 定级 ${
                  records.records[0].autoLevel ?? '—'
                }`
              : '暂无'}
          </p>
        </div>
      )}
    </div>
  );
}
