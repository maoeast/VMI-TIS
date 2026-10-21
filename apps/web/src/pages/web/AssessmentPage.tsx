import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import type {
  AssessmentMeta,
  AssessmentRecord,
  AssessmentTriageReferral,
} from '@vmi-tis/shared-types';
import { EvalPhase } from '@vmi-tis/shared-types';
import {
  BEERY_VMI_6_ITEMS,
  BEHAVIOR_SCREENING_ITEMS,
  MILESTONE_0_TO_6_CHECKLIST,
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
import { AssessmentStepper } from '../../components/assessment/AssessmentStepper';
import { OptometryPanel } from '../../components/assessment/OptometryPanel';
import {
  EMPTY_RECORD_FORM,
  RecordSummary,
  hasAnyMeasurement,
  type AssessmentRecordForm,
  type NumericRecordField,
  type RecordFormField,
} from '../../components/assessment/RecordSummary';
import { ScaleAssessmentPanel } from '../../components/assessment/ScaleAssessmentPanel';
import {
  ScreeningForms,
  type ScreeningSelection,
} from '../../components/assessment/ScreeningForms';
import {
  StudentPhaseSelector,
  type EvalPhaseKey,
} from '../../components/assessment/StudentPhaseSelector';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import {
  evalPhaseLabel,
  triageBadgeClass,
  triageLabel,
} from '../../utils/format';

const STEP_DEFS = [
  { index: 1, title: '选学生与阶段', hint: '对象与阶段' },
  { index: 2, title: '初筛与红区', hint: 'R1 门禁' },
  { index: 3, title: '视光与眼动', hint: '可跳过' },
  { index: 4, title: '量表施测', hint: 'Beery / R2' },
  { index: 5, title: '汇总与报告', hint: '保存与定级' },
];

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

  const [step, setStep] = useState(1);
  const [evalPhase, setEvalPhase] = useState<EvalPhaseKey>(EvalPhase.BASELINE);
  const [sessionId, setSessionId] = useState(() => `scale-${Date.now()}`);
  const [beeryItemNumber, setBeeryItemNumber] = useState(1);
  const [scaleResult, setScaleResult] = useState<ScaleScoreResponse | null>(null);
  const [recordForm, setRecordForm] =
    useState<AssessmentRecordForm>(EMPTY_RECORD_FORM);
  const [savedRecord, setSavedRecord] = useState<AssessmentRecord | null>(null);
  const [recordMeta, setRecordMeta] = useState<AssessmentMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const scoredItems = useRef<Set<number>>(new Set());
  const [report, setReport] = useState<{ recordId: string; url: string } | null>(
    null,
  );

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [screening, setScreening] = useState<ScreeningSelection>({
    red: [],
    milestones: [],
    behaviors: [],
  });
  const [triageResult, setTriageResult] =
    useState<AssessmentTriageReferral | null>(null);
  const [referrals, setReferrals] = useState<AssessmentTriageReferral[]>([]);
  const [referralForms, setReferralForms] = useState<
    Record<string, { hospitalName: string; hospitalDiagnosis: string }>
  >({});

  const [records, setRecords] = useState<AssessmentRecordsResponse | null>(null);

  const isStillActiveStudent = (studentId: string) =>
    useAppStore.getState().activeStudentId === studentId;

  const loadReferrals = async () => {
    const studentId = activeStudentId;
    if (!studentId) return;
    try {
      const data = await triageApi.list(studentId);
      if (!isStillActiveStudent(studentId)) return;
      setReferrals(data);
    } catch {
      if (!isStillActiveStudent(studentId)) return;
      setReferrals([]);
    }
  };

  const loadRecords = async () => {
    const studentId = activeStudentId;
    if (!studentId) return;
    try {
      const data = await assessmentApi.records(studentId);
      if (!isStillActiveStudent(studentId)) return;
      setRecords(data);
    } catch {
      if (!isStillActiveStudent(studentId)) return;
      setRecords(null);
    }
  };

  const loadStudent = async () => {
    const studentId = activeStudentId;
    if (!studentId) {
      setStudent(null);
      return;
    }
    try {
      const data = await studentApi.get(studentId);
      if (!isStillActiveStudent(studentId)) return;
      setStudent(data);
    } catch {
      if (!isStillActiveStudent(studentId)) return;
      setStudent(null);
    }
  };

  useEffect(() => {
    setStep(1);
    setSessionId(`scale-${Date.now()}`);
    setBeeryItemNumber(1);
    setScaleResult(null);
    scoredItems.current.clear();
    setRecordForm(EMPTY_RECORD_FORM);
    setSavedRecord(null);
    setRecordMeta(null);
    setReport(null);
    setScreening({ red: [], milestones: [], behaviors: [] });
    setTriageResult(null);
    setReferralForms({});
    void loadReferrals();
    void loadRecords();
    void loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  const updateRecordField = (
    field: RecordFormField,
    value: string | boolean | number,
  ) => {
    setRecordForm(
      (prev) => ({ ...prev, [field]: value }) as AssessmentRecordForm,
    );
  };

  const updateNumberField = (field: NumericRecordField, value: string) => {
    updateRecordField(field, value);
  };

  const numberOrUndefined = (value: string): number | undefined =>
    value.trim() === '' ? undefined : Number(value);

  const birthDate = student ? new Date(String(student.birthDate)) : undefined;
  const ageMonths =
    birthDate && !Number.isNaN(birthDate.getTime())
      ? monthsBetween(birthDate)
      : undefined;
  const ageYears = ageMonths !== undefined ? ageMonths / 12 : undefined;

  const triageStatus: string = student?.triageStatus ?? 'PENDING_SCREENING';
  const waitingScreening = triageStatus === 'PENDING_SCREENING';
  const redZoneGated =
    triageStatus === 'RED_ZONE_LOCKED' ||
    triageStatus === 'REFERRAL_UPLOADED';

  const disabledSteps = !activeStudentId
    ? [2, 3, 4, 5]
    : waitingScreening
      ? [3, 4, 5]
      : redZoneGated
        ? [3, 4]
        : [];

  const beeryCompleted =
    (scaleResult?.submittedItems ?? 0) >= BEERY_VMI_6_ITEMS.length;

  const changeEvalPhase = (next: EvalPhaseKey) => {
    if (next === evalPhase) return;
    setEvalPhase(next);
    setSessionId(`scale-${Date.now()}`);
    setBeeryItemNumber(1);
    setScaleResult(null);
    scoredItems.current.clear();
    setRecordForm(EMPTY_RECORD_FORM);
    setSavedRecord(null);
    setRecordMeta(null);
    setReport(null);
    showToast(
      `已切换到${evalPhaseLabel(next)}，评估草稿已清空，R2 按新阶段独立计数`,
      'info',
    );
  };

  const submitScore = async (score: 0 | 1) => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    if (waitingScreening || redZoneGated) {
      showToast('当前学生被初筛/红区门禁拦截，暂不能施测量表', 'error');
      return;
    }
    if (submittingScore) return;
    if (scoredItems.current.has(beeryItemNumber)) {
      showToast('该题已判分，不能重复计分；如需重测请先重置本轮', 'error');
      return;
    }
    setSubmittingScore(true);
    try {
      const itemNumber = beeryItemNumber;
      const result = await assessmentApi.submitScaleScore({
        studentId: activeStudentId,
        evalPhase,
        sessionId,
        itemIndex: itemNumber,
        score,
      });
      scoredItems.current.add(itemNumber);
      setScaleResult(result);
      if (result.shouldTerminate) {
        showToast(result.message ?? '已触发连续 3 题 0 分中止', 'error');
      } else {
        setBeeryItemNumber((value) =>
          Math.min(BEERY_VMI_6_ITEMS.length, value + 1),
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSubmittingScore(false);
    }
  };

  const resetScale = async () => {
    if (!activeStudentId) return;
    try {
      await assessmentApi.submitScaleScore({
        studentId: activeStudentId,
        evalPhase,
        sessionId,
        reset: true,
      });
      setScaleResult(null);
      setBeeryItemNumber(1);
      scoredItems.current.clear();
      setRecordForm((prev) => ({ ...prev, beeryVmiRaw: '' }));
      showToast('本轮施测计数已重置', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const confirmRawScore = () => {
    if (!scaleResult) {
      showToast('还没有可确认的 R2 判分结果', 'error');
      return;
    }
    updateRecordField('beeryVmiRaw', String(scaleResult.totalRawScore));
    showToast(
      `已将本轮累计原始分 ${scaleResult.totalRawScore} 写入 Beery 主测验原始分`,
      'success',
    );
  };

  const generateReport = async (recordId: string, openInNewTab = true) => {
    try {
      const result = await assessmentApi.generateReport(recordId);
      const resolved = resolveApiUrl(result.reportFileUrl);
      setReport({ recordId, url: resolved });
      if (openInNewTab) {
        window.open(resolved, '_blank', 'noopener,noreferrer');
      }
      showToast('评估报告已生成（HTML）', 'success');
      await loadRecords();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const saveRecord = async () => {
    if (savedRecord) {
      showToast('本次评估已保存；如需重新录入请点「新建一次评估」', 'info');
      return;
    }
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    if (waitingScreening) {
      showToast('请先在第 2 步提交初筛', 'error');
      return;
    }
    if (!redZoneGated && !hasAnyMeasurement(recordForm)) {
      showToast('请至少录入一项视光或量表数据后再保存', 'error');
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

    setSaving(true);
    try {
      const record = await assessmentApi.createRecord({
        studentId: activeStudentId,
        evalPhase,
        npcCm: numberOrUndefined(recordForm.npcCm),
        accomFacilityCpm: numberOrUndefined(recordForm.accomFacilityCpm),
        tvps4Std: numberOrUndefined(recordForm.tvps4Std),
        mvpt4RawScore: numberOrUndefined(recordForm.mvpt4RawScore),
        mvpt4ItemScores45: /^[01]{45}$/.test(recordForm.mvpt4ItemScores45)
          ? recordForm.mvpt4ItemScores45
              .split('')
              .map((value) => (value === '1' ? 1 : 0) as 0 | 1)
          : undefined,
        mvpt4Std: numberOrUndefined(recordForm.mvpt4Std),
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
      setSavedRecord(record);
      setRecordMeta(
        parseJson<AssessmentMeta | null>(record.assessmentMetaJson, null),
      );
      showToast(`评估已保存，自动定级 ${record.autoLevel}`, 'success');
      await loadRecords();
      await loadStudent();

      // 报告失败不阻塞保存：保存结果与定级已落在页面上。
      try {
        const reportResult = await assessmentApi.generateReport(record.id);
        setReport({
          recordId: record.id,
          url: resolveApiUrl(reportResult.reportFileUrl),
        });
        await loadRecords();
      } catch (reportErr) {
        showToast(
          `评估已保存，但报告生成失败：${
            reportErr instanceof Error ? reportErr.message : String(reportErr)
          }`,
          'error',
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetAssessment = () => {
    setStep(1);
    setSessionId(`scale-${Date.now()}`);
    setBeeryItemNumber(1);
    setScaleResult(null);
    setRecordForm(EMPTY_RECORD_FORM);
    setSavedRecord(null);
    setRecordMeta(null);
    setReport(null);
    scoredItems.current.clear();
    showToast('已清空本次评估草稿，可开始一次新的评估', 'info');
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
        // 结构化编码是主路径；红色文本行为项保留作第二道防线。
        redZoneCodes: screening.red,
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
      // 门禁读取服务端 triageStatus，提交后立即刷新。
      await loadStudent();
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
      await loadStudent();
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
      await loadStudent();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const nextStep =
    step === 1
      ? 2
      : step === 2
        ? redZoneGated
          ? 5
          : 3
        : step === 3
          ? 4
          : step === 4
            ? 5
            : null;
  const nextDisabled =
    (step === 1 && !activeStudentId) ||
    (step === 2 && waitingScreening) ||
    ((step === 3 || step === 4) && (waitingScreening || redZoneGated));

  let prevStep = step - 1;
  while (prevStep > 1 && disabledSteps.includes(prevStep)) {
    prevStep -= 1;
  }

  const gateMessage = !activeStudentId
    ? '请先在顶部选择学生'
    : waitingScreening
      ? '待初筛：请先在第 2 步提交初筛问卷'
      : redZoneGated
        ? '红区 / 回执待审核：步骤 3–4 已禁用，可保存初筛级 L0 记录（会把当前层级回写为 L0）'
        : '绿区放行：可完成完整评估';

  const canSave =
    Boolean(activeStudentId) &&
    !waitingScreening &&
    !savedRecord &&
    (redZoneGated || hasAnyMeasurement(recordForm));

  const blockedReason = !activeStudentId
    ? '请先在顶部选择学生'
    : waitingScreening
      ? '请先在第 2 步提交初筛，之后才能保存评估记录。'
      : !redZoneGated && !hasAnyMeasurement(recordForm)
        ? '请至少录入一项视光或量表数据（红区 L0 记录可只带初筛）。'
        : undefined;

  return (
    <div>
      <PageHeader
        title="评估中心"
        description="5 步向导：选学生与阶段 → 初筛门禁 → 视光与眼动 → 量表施测 → 汇总与报告"
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void loadStudent();
              void loadReferrals();
              void loadRecords();
            }}
          >
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      <AssessmentStepper
        steps={STEP_DEFS}
        current={step}
        disabled={disabledSteps}
        onSelect={(target) => {
          if (!disabledSteps.includes(target)) {
            setStep(target);
          }
        }}
      />

      {step === 1 && (
        <StudentPhaseSelector
          student={student}
          hasActiveStudent={Boolean(activeStudentId)}
          evalPhase={evalPhase}
          onEvalPhaseChange={changeEvalPhase}
        />
      )}

      {step === 2 && (
        <div className="space-y-4">
          {waitingScreening && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              待初筛：提交初筛问卷前，步骤 3–5 保持禁用。提交后由服务端按种子编码与行为项文本重算
              R1 红区。
            </div>
          )}
          {redZoneGated && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              红区 / 回执待审核：步骤 3–4 保持禁用，请继续完成回执上传与审核；仍可前往第 5
              步保存初筛级 L0 记录。
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">
                第二步：入案第一层初筛
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                红区、里程碑与行为筛查均读取种子常量；提交后由服务端重新计算 R1
                红区，不采信客户端结论。
              </p>
              <div className="mt-4">
                <ScreeningForms
                  value={screening}
                  onChange={setScreening}
                  ageMonths={ageMonths}
                />
              </div>
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => void submitTriage()}
              >
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
                    转介单号：{triageResult.referralCode ?? '无需转介'} ·
                    审核状态：{triageResult.auditStatus}
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">
                    红区项：{triageResult.redZoneItemsJson}
                  </div>
                </div>
              )}
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-800">
                眼科转介与回执核验
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                上传回执 → 回执待审核；审核通过解锁训练与量表施测，驳回则回到红区锁定。
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
                  const redItems = parseJson<string[]>(
                    referral.redZoneItemsJson,
                    [],
                  );
                  return (
                    <div
                      key={referral.id}
                      className="rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-700">
                          {referral.referralCode ?? '绿区初筛'}
                        </span>
                        <span
                          className={`badge ${triageBadgeClass(
                            referral.isRedZone
                              ? 'RED_ZONE_LOCKED'
                              : 'GREEN_ACTIVE',
                          )}`}
                        >
                          {triageLabel(
                            referral.isRedZone
                              ? 'RED_ZONE_LOCKED'
                              : 'GREEN_ACTIVE',
                          )}
                        </span>
                        <span className="text-slate-500">
                          {referral.auditStatus}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        红区项：{redItems.length ? redItems.join('、') : '无'}
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={form.hospitalName}
                          onChange={(event) =>
                            updateReferralForm(
                              referral.id,
                              'hospitalName',
                              event.target.value,
                            )
                          }
                          placeholder="接诊医院名称"
                          className="input"
                        />
                        <input
                          value={form.hospitalDiagnosis}
                          onChange={(event) =>
                            updateReferralForm(
                              referral.id,
                              'hospitalDiagnosis',
                              event.target.value,
                            )
                          }
                          placeholder="医院诊断结论"
                          className="input"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void uploadReferral(referral.id)}
                        >
                          上传回执
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() =>
                            void auditReferral(referral.id, 'APPROVED')
                          }
                        >
                          审核通过
                        </button>
                        <button
                          type="button"
                          className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          onClick={() =>
                            void auditReferral(referral.id, 'REJECTED')
                          }
                        >
                          驳回
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {step === 3 && (
        <OptometryPanel
          form={recordForm}
          ageYears={ageYears}
          onFieldChange={updateNumberField}
          onBooleanChange={(field, value) => updateRecordField(field, value)}
          onNsucoChange={(field, value) =>
            updateRecordField(
              field === 'pursuit' ? 'nsucoPursuit' : 'nsucoSaccade',
              value,
            )
          }
        />
      )}

      {step === 4 && (
        <ScaleAssessmentPanel
          form={recordForm}
          scaleResult={scaleResult}
          beeryItemNumber={beeryItemNumber}
          beeryCompleted={beeryCompleted}
          onFieldChange={updateNumberField}
          onBeeryItemNumberChange={setBeeryItemNumber}
          onScore={(score) => void submitScore(score)}
          onResetScale={() => void resetScale()}
          onConfirmRawScore={confirmRawScore}
          scoreSubmitting={submittingScore}
          ageYears={ageYears}
        />
      )}

      {step === 5 && (
        <RecordSummary
          studentName={student?.name ?? '未选择学生'}
          evalPhase={evalPhase}
          form={recordForm}
          saving={saving}
          canSave={canSave}
          blockedReason={blockedReason}
          savedRecord={savedRecord}
          recordMeta={recordMeta}
          report={report}
          records={records}
          onSave={() => void saveRecord()}
          onGenerateReport={(recordId) => void generateReport(recordId)}
          onResetAssessment={resetAssessment}
          ageYears={ageYears}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
        <button
          type="button"
          className="btn-secondary"
          disabled={step === 1}
          onClick={() => setStep(prevStep)}
        >
          上一步
        </button>
        <span className="text-[11px] text-slate-500">{gateMessage}</span>
        {nextStep !== null && (
          <button
            type="button"
            className="btn-primary"
            disabled={nextDisabled}
            onClick={() => setStep(nextStep)}
          >
            下一步：{STEP_DEFS[nextStep - 1].title}
          </button>
        )}
      </div>
    </div>
  );
}
