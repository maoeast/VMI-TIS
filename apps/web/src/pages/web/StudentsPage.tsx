import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { Student } from '@vmi-tis/shared-types';
import {
  studentApi,
  type StudentDetail,
} from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import {
  ageFromBirthDate,
  downloadCsvTemplate,
  formatDate,
  levelLabel,
  promotionBadgeClass,
  promotionLabel,
  triageBadgeClass,
  triageLabel,
} from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  gender: '男',
  birthDate: '2019-01-01',
  schoolScene: '',
  primaryTherapistId: '',
  parentPhone: '',
  chiefComplaint: '',
};

export function StudentsPage() {
  const showToast = useAppStore((state) => state.showToast);
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const setActiveStudent = useAppStore((state) => state.setActiveStudent);

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState('');
  const [triageStatus, setTriageStatus] = useState('');
  const [keyword, setKeyword] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editLevel, setEditLevel] = useState('L0');
  const [editTriage, setEditTriage] = useState('PENDING_SCREENING');
  const [editPromotion, setEditPromotion] = useState('IN_PROGRESS');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentApi.list({
        level,
        triageStatus,
        keyword,
        pageSize: 200,
      });
      setStudents(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, triageStatus]);

  const openDetail = async (student: Student) => {
    setActiveStudent(student.id);
    setDetailLoading(true);
    try {
      const response = await studentApi.get(student.id);
      setDetail(response);
      setEditLevel(response.currentLevel);
      setEditTriage(response.triageStatus);
      setEditPromotion(response.promotionStatus);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const createStudent = async () => {
    if (!form.name.trim() || !form.schoolScene.trim() || !form.primaryTherapistId.trim()) {
      showToast('请填写姓名、场景与主责治疗师', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await studentApi.create({
        name: form.name.trim(),
        gender: form.gender || undefined,
        birthDate: form.birthDate,
        schoolScene: form.schoolScene.trim(),
        primaryTherapistId: form.primaryTherapistId.trim(),
        parentPhone: form.parentPhone.trim() || undefined,
        chiefComplaint: form.chiefComplaint.trim() || undefined,
      });
      showToast(`已创建 ${created.name}（${created.studentCode}）`, 'success');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateStudent = async () => {
    if (!detail) return;
    try {
      await studentApi.update(detail.id, {
        currentLevel: editLevel,
        triageStatus: editTriage,
        promotionStatus: editPromotion,
      } as never);
      showToast('学生状态已更新', 'success');
      await load();
      setDetail(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const removeStudent = async (student: Student) => {
    if (!window.confirm(`确认删除 ${student.name}（${student.studentCode}）？该操作会级联删除关联记录。`)) {
      return;
    }
    try {
      await studentApi.remove(student.id);
      showToast('学生已删除', 'success');
      if (activeStudentId === student.id) {
        setActiveStudent(null);
      }
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const importFile = async (file: File | null) => {
    if (!file) return;
    try {
      const result = await studentApi.importExcel(file);
      showToast(
        `导入完成：成功 ${result.imported}，失败 ${result.failed}`,
        result.failed > 0 ? 'error' : 'success',
      );
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="学生档案中心"
        description={`共 ${total} 名学生 · 支持条件筛选、Excel/CSV 批量导入与状态维护`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => void load()}>
              <RefreshCw className="mr-1 inline h-4 w-4" />
              刷新
            </button>
            <button type="button" className="btn-secondary" onClick={downloadCsvTemplate}>
              <Download className="mr-1 inline h-4 w-4" />
              下载模板
            </button>
            <label className="btn-secondary cursor-pointer">
              <FileSpreadsheet className="mr-1 inline h-4 w-4" />
              批量导入
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(event) => void importFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 inline h-4 w-4" />
              新生建档
            </button>
          </>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold text-slate-600">
          能力层级
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="input mt-1 w-40"
          >
            <option value="">全部</option>
            {['L0', 'L1', 'L2', 'L3', 'L4', 'L5'].map((item) => (
              <option key={item} value={item}>
                {levelLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          分流状态
          <select
            value={triageStatus}
            onChange={(event) => setTriageStatus(event.target.value)}
            className="input mt-1 w-40"
          >
            <option value="">全部</option>
            {Object.entries({
              PENDING_SCREENING: '待初筛',
              RED_ZONE_LOCKED: '红区锁定',
              REFERRAL_UPLOADED: '回执待审核',
              GREEN_ACTIVE: '绿区在训',
            }).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-52 flex-1 text-xs font-semibold text-slate-600">
          关键词
          <div className="mt-1 flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
              placeholder="姓名 / 学号 / 班级场景"
              className="input"
            />
            <button type="button" className="btn-primary" onClick={() => void load()}>
              <Search className="h-4 w-4" />
            </button>
          </div>
        </label>
      </div>

      {error && (
        <div className="card mb-4 border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">学号</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">年龄</th>
                <th className="px-4 py-3">班级 / 场景</th>
                <th className="px-4 py-3">层级</th>
                <th className="px-4 py-3">分流</th>
                <th className="px-4 py-3">晋级</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    没有符合条件的学生
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {student.studentCode}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-semibold text-teal-800 hover:underline"
                        onClick={() => void openDetail(student)}
                      >
                        {student.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {ageFromBirthDate(student.birthDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {student.schoolScene}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-teal-50 text-teal-800">
                        {levelLabel(student.currentLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${triageBadgeClass(student.triageStatus)}`}>
                        {triageLabel(student.triageStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${promotionBadgeClass(student.promotionStatus)}`}>
                        {promotionLabel(student.promotionStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-2 text-xs font-semibold text-teal-700 hover:underline"
                        onClick={() => void openDetail(student)}
                      >
                        查看
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => void removeStudent(student)}
                      >
                        <Trash2 className="inline h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="card w-full max-w-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">新生入案建档</h2>
              <button type="button" className="text-slate-400" onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['name', '学生姓名 *', 'text'],
                ['birthDate', '出生日期 *', 'date'],
                ['schoolScene', '班级 / 场景 *', 'text'],
                ['primaryTherapistId', '主责治疗师 *', 'text'],
                ['parentPhone', '家长电话', 'text'],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs font-semibold text-slate-600">
                  {label}
                  <input
                    type={type}
                    value={(form as Record<string, string>)[key]}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="input mt-1"
                  />
                </label>
              ))}
              <label className="text-xs font-semibold text-slate-600">
                性别
                <select
                  value={form.gender}
                  onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                  className="input mt-1"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="">未填写</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                家长主诉与课堂困难表现
                <textarea
                  value={form.chiefComplaint}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, chiefComplaint: event.target.value }))
                  }
                  className="input mt-1 min-h-20"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void createStudent()}>
                {saving ? '保存中…' : '保存档案'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 text-sm text-white">
          加载学生档案…
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="card my-6 w-full max-w-4xl p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {detail.name}
                  <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                    {detail.studentCode}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {detail.schoolScene} · {ageFromBirthDate(detail.birthDate)} · 主责治疗师{' '}
                  {detail.primaryTherapistId}
                </p>
              </div>
              <button type="button" className="text-slate-400" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">
                能力层级
                <select value={editLevel} onChange={(event) => setEditLevel(event.target.value)} className="input mt-1">
                  {['L0', 'L1', 'L2', 'L3', 'L4', 'L5'].map((item) => (
                    <option key={item} value={item}>{levelLabel(item)}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                分流状态
                <select value={editTriage} onChange={(event) => setEditTriage(event.target.value)} className="input mt-1">
                  {Object.entries({
                    PENDING_SCREENING: '待初筛',
                    RED_ZONE_LOCKED: '红区锁定',
                    REFERRAL_UPLOADED: '回执待审核',
                    GREEN_ACTIVE: '绿区在训',
                  }).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                晋级状态
                <select value={editPromotion} onChange={(event) => setEditPromotion(event.target.value)} className="input mt-1">
                  <option value="IN_PROGRESS">训练中</option>
                  <option value="PROMOTION_READY">待晋级</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => void updateStudent()}>
                保存状态
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-700">初筛与转介</h3>
                {detail.triageReferrals.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无转介记录</p>
                ) : (
                  detail.triageReferrals.map((referral) => (
                    <div key={referral.id} className="mb-2 rounded-lg bg-slate-50 p-2 text-xs">
                      <div className="font-semibold text-slate-700">
                        {referral.referralCode ?? '绿区初筛'} · {referral.auditStatus}
                      </div>
                      <div className="mt-1 text-slate-500">
                        红区项：{referral.redZoneItemsJson}
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-700">评估记录</h3>
                {detail.assessmentRecords.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无评估记录</p>
                ) : (
                  detail.assessmentRecords.slice(0, 6).map((record) => (
                    <div key={record.id} className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                      <span>{formatDate(record.createdAt)} · {record.evalPhase}</span>
                      <span className="font-bold text-teal-700">{record.autoLevel ?? '—'}</span>
                    </div>
                  ))
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-700">IEP 计划</h3>
                {detail.iepPlans.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无 IEP</p>
                ) : (
                  detail.iepPlans.map((plan) => (
                    <div key={plan.id} className="mb-2 rounded-lg bg-slate-50 p-2 text-xs">
                      <div className="font-semibold">{plan.targetLevel} · {plan.status}</div>
                      <div className="text-slate-500">每周 {plan.weeklyFrequency} 次 · {plan.sessionMinutes} 分钟</div>
                    </div>
                  ))
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-700">最近课次</h3>
                {detail.trainingSessions.length === 0 ? (
                  <p className="text-xs text-slate-400">暂无课次</p>
                ) : (
                  detail.trainingSessions.slice(0, 6).map((session) => (
                    <div key={session.id} className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                      <span>第 {session.sessionNumber} 次 · {formatDate(session.sessionDate)}</span>
                      <span className={session.isFinished ? 'font-bold text-emerald-700' : 'text-amber-700'}>
                        {session.isFinished ? `${Math.round(session.accuracyRate * 100)}%` : '进行中'}
                      </span>
                    </div>
                  ))
                )}
              </section>
            </div>

            {detail.chiefComplaint && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <strong>家长主诉：</strong>
                {detail.chiefComplaint}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
