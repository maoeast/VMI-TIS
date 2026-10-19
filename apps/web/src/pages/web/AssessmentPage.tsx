import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type {
  AssessmentRecord,
  AssessmentTriageReferral,
} from '@vmi-tis/shared-types';
import {
  assessmentApi,
  parseJson,
  resolveApiUrl,
  triageApi,
  type AssessmentRecordsResponse,
  type ScaleScoreResponse,
} from '../../api/client';
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

type TabKey = 'scale' | 'triage' | 'records';

const RED_ITEMS = [
  {
    key: 'refraction',
    item: '屈光参差（左右眼度数差异）',
    score: 2.5,
    label: '屈光参差 ≥ 2.00D',
  },
  {
    key: 'strabismus',
    item: '交替遮盖试验见眼球明显移动（斜视阳性）',
    score: 1,
    label: '斜视 / 遮盖试验异常',
  },
  {
    key: 'diplopia',
    item: '看近物诉重影（复视）',
    score: 1,
    label: '复视 / 重影',
  },
  {
    key: 'vision',
    item: '裸眼视力异常、眯眼歪头视物、伴眼痛头痛或眼球震颤',
    score: 1,
    label: '视力异常 / 眼球震颤',
  },
];

const EMPTY_RECORD_FORM = {
  npcCm: '',
  accomFacilityCpm: '',
  tvps4Std: '',
  mvpt3Std: '',
  beeryVmiStd: '',
  beeryVmiRaw: '',
  stabilityPass: true,
  classroomAdaptationPass: true,
};

export function AssessmentPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);

  const [tab, setTab] = useState<TabKey>('scale');
  const [sessionId] = useState(() => `scale-${Date.now()}`);
  const [itemIndex, setItemIndex] = useState(1);
  const [scaleResult, setScaleResult] = useState<ScaleScoreResponse | null>(null);
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [recordResult, setRecordResult] = useState<AssessmentRecord | null>(null);

  const [selectedRed, setSelectedRed] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    void loadReferrals();
    void loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

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
      setItemIndex((value) => value + 1);
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
    try {
      const record = await assessmentApi.createRecord({
        studentId: activeStudentId,
        evalPhase: 'BASELINE',
        npcCm: recordForm.npcCm ? Number(recordForm.npcCm) : undefined,
        accomFacilityCpm: recordForm.accomFacilityCpm
          ? Number(recordForm.accomFacilityCpm)
          : undefined,
        tvps4Std: recordForm.tvps4Std ? Number(recordForm.tvps4Std) : undefined,
        mvpt3Std: recordForm.mvpt3Std ? Number(recordForm.mvpt3Std) : undefined,
        beeryVmiStd: recordForm.beeryVmiStd
          ? Number(recordForm.beeryVmiStd)
          : undefined,
        beeryVmiRaw: recordForm.beeryVmiRaw
          ? Number(recordForm.beeryVmiRaw)
          : undefined,
        stabilityPass: recordForm.stabilityPass,
        classroomAdaptationPass: recordForm.classroomAdaptationPass,
      });
      setRecordResult(record);
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
    const behaviorItems = RED_ITEMS.filter((item) => selectedRed.has(item.key)).map(
      (item) => ({ item: item.item, score: item.score }),
    );
    try {
      const result = await triageApi.submit({
        studentId: activeStudentId,
        behaviorItems,
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
  const zeroCount = lastThree.filter((score) => score === 0).length;

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
          ['records', '③ 评估报告库'],
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
                className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                onClick={() => void submitScore(1)}
              >
                <ClipboardCheck className="mx-auto mb-1 h-5 w-5" />
                通过（1 分）
              </button>
              <button
                type="button"
                className="rounded-2xl border-2 border-rose-300 bg-white px-4 py-5 text-sm font-bold text-rose-700 hover:bg-rose-50"
                onClick={() => void submitScore(0)}
              >
                <AlertTriangle className="mx-auto mb-1 h-5 w-5" />
                未通过（0 分）
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
              <span className="font-semibold text-slate-600">
                第 {itemIndex} 题 · 本会话已提交 {scaleResult?.submittedItems ?? 0} 题
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
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">评估指标与自动定级</h2>
            <p className="mt-1 text-xs text-slate-500">
              保存后按 L0–L5 算法回写学生当前层级。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['npcCm', 'NPC（cm）'],
                ['accomFacilityCpm', '调节灵活度（cpm）'],
                ['tvps4Std', 'TVPS-4 标准分'],
                ['mvpt3Std', 'MVPT-3 标准分'],
                ['beeryVmiStd', 'Beery VMI 标准分'],
                ['beeryVmiRaw', 'Beery VMI 原始分'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-semibold text-slate-600">
                  {label}
                  <input
                    type="number"
                    value={(recordForm as Record<string, string | boolean>)[key] as string}
                    onChange={(event) =>
                      setRecordForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="input mt-1"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={recordForm.stabilityPass}
                  onChange={(event) =>
                    setRecordForm((prev) => ({ ...prev, stabilityPass: event.target.checked }))
                  }
                />
                身体稳定 / 前庭本体评估达标
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={recordForm.classroomAdaptationPass}
                  onChange={(event) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      classroomAdaptationPass: event.target.checked,
                    }))
                  }
                />
                课堂抄写 / 文具使用补充评估达标
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button type="button" className="btn-primary" onClick={() => void saveRecord()}>
                保存评估记录
              </button>
              {recordResult && (
                <span className="badge bg-teal-100 text-teal-800">
                  自动定级：{levelLabel(recordResult.autoLevel ?? '')}
                </span>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'triage' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold text-slate-800">入案第一层初筛</h2>
            <p className="mt-1 text-xs text-slate-500">
              任一项命中即锁定训练并生成眼科转介单（规则 R1）。
            </p>
            <div className="mt-4 space-y-2">
              {RED_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedRed.has(item.key)}
                    onChange={(event) => {
                      setSelectedRed((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(item.key);
                        else next.delete(item.key);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold text-rose-900">{item.label}</span>
                    <span className="mt-0.5 block text-rose-700/80">{item.item}</span>
                  </span>
                </label>
              ))}
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
