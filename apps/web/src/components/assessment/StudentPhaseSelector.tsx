import type { StudentDetail } from '../../api/client';
import { EvalPhase } from '@vmi-tis/shared-types';
import {
  EVAL_PHASE_LABELS,
  ageFromBirthDate,
  levelLabel,
  triageBadgeClass,
  triageLabel,
} from '../../utils/format';

export type EvalPhaseKey = EvalPhase;

export const EVAL_PHASE_OPTIONS: Array<{
  value: EvalPhaseKey;
  label: string;
  hint: string;
}> = [
  {
    value: EvalPhase.BASELINE,
    label: EVAL_PHASE_LABELS[EvalPhase.BASELINE],
    hint: '入案首次，建立能力基线',
  },
  {
    value: EvalPhase.STAGE_8W,
    label: EVAL_PHASE_LABELS[EvalPhase.STAGE_8W],
    hint: '阶段训练后的对照复评',
  },
  {
    value: EvalPhase.TRANSITION,
    label: EVAL_PHASE_LABELS[EvalPhase.TRANSITION],
    hint: '毕业或转介前的收口评估',
  },
];

interface StudentPhaseSelectorProps {
  student: StudentDetail | null;
  hasActiveStudent: boolean;
  evalPhase: EvalPhaseKey;
  onEvalPhaseChange: (phase: EvalPhaseKey) => void;
}

function TriageGateNotice({ status }: { status: string }) {
  if (status === 'PENDING_SCREENING') {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="font-bold">待初筛</div>
        <p className="mt-1">
          请先在第 2 步提交初筛问卷；提交前步骤 3–5 保持禁用。
        </p>
      </div>
    );
  }
  if (status === 'RED_ZONE_LOCKED') {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
        <div className="font-bold">红区锁定</div>
        <p className="mt-1">
          步骤 3–4 已禁用：请先完成眼科回执上传与审核。仍可在第 5
          步保存初筛级评估（服务端定级 L0）。
        </p>
        <p className="mt-1 font-semibold">
          保存初筛级 L0 记录会把学生当前层级回写为 L0。
        </p>
      </div>
    );
  }
  if (status === 'REFERRAL_UPLOADED') {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="font-bold">回执待审核</div>
        <p className="mt-1">
          步骤 3–4 已禁用：请等待视光师审核回执。审核通过后可完成完整评估。
        </p>
        <p className="mt-1 font-semibold">
          保存初筛级 L0 记录会把学生当前层级回写为 L0。
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
      <div className="font-bold">绿区放行</div>
      <p className="mt-1">可完成视光、量表施测、保存定级与报告全流程。</p>
    </div>
  );
}

export function StudentPhaseSelector({
  student,
  hasActiveStudent,
  evalPhase,
  onEvalPhaseChange,
}: StudentPhaseSelectorProps) {
  if (!hasActiveStudent) {
    return (
      <section className="card p-6">
        <h2 className="text-sm font-bold text-slate-800">第一步：选择学生</h2>
        <p className="mt-2 text-xs text-slate-500">
          请先在页面顶部选择学生，再选择评估阶段。
        </p>
      </section>
    );
  }

  if (!student) {
    return (
      <section className="card p-6">
        <h2 className="text-sm font-bold text-slate-800">学生信息加载中</h2>
        <p className="mt-2 text-xs text-slate-500">
          若长时间未加载，请点击右上角「刷新」重试。
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold text-slate-800">第一步：学生与评估阶段</h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
        <span className="text-base font-bold text-slate-900">{student.name}</span>
        <span className={`badge ${triageBadgeClass(student.triageStatus)}`}>
          {triageLabel(student.triageStatus)}
        </span>
        <span>学号 {student.studentCode}</span>
        <span>{ageFromBirthDate(student.birthDate)}</span>
        <span>当前层级 {levelLabel(student.currentLevel)}</span>
        <span>{student.schoolScene}</span>
      </div>

      <div className="mt-4">
        <TriageGateNotice status={student.triageStatus} />
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-bold text-slate-700">评估阶段</h3>
        <p className="mt-1 text-[11px] text-slate-400">
          阶段随记录一起保存，并作为 R2 会话键的一部分按阶段隔离计数；切换阶段会清空当前评估草稿。
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EVAL_PHASE_OPTIONS.map((option) => {
            const selected = option.value === evalPhase;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onEvalPhaseChange(option.value)}
                className={
                  selected
                    ? 'rounded-xl border-2 border-[#0F4C5C] bg-teal-50 px-3 py-3 text-left'
                    : 'rounded-xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50'
                }
              >
                <div
                  className={
                    selected
                      ? 'text-sm font-bold text-[#0F4C5C]'
                      : 'text-sm font-bold text-slate-700'
                  }
                >
                  {option.label}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {option.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
