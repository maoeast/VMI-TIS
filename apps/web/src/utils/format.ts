export const LEVEL_LABELS: Record<string, string> = {
  L0: 'L0 身体准备',
  L1: 'L1 视觉效率',
  L2: 'L2 视觉感知',
  L3: 'L3 视觉运动整合',
  L4: 'L4 适应应用',
  L5: 'L5 生活迁移',
};

export const TRIAGE_LABELS: Record<string, string> = {
  PENDING_SCREENING: '待初筛',
  RED_ZONE_LOCKED: '红区锁定',
  REFERRAL_UPLOADED: '回执待审核',
  GREEN_ACTIVE: '绿区在训',
};

export const PROMOTION_LABELS: Record<string, string> = {
  IN_PROGRESS: '训练中',
  PROMOTION_READY: '待晋级',
};

export const EVAL_PHASE_LABELS: Record<string, string> = {
  BASELINE: '基线评估',
  STAGE_8W: '8 周复评',
  TRANSITION: '转衔评估',
};

export function levelLabel(level: string): string {
  return LEVEL_LABELS[level] ?? level;
}

export function triageLabel(status: string): string {
  return TRIAGE_LABELS[status] ?? status;
}

export function promotionLabel(status: string): string {
  return PROMOTION_LABELS[status] ?? status;
}

export function evalPhaseLabel(phase: string): string {
  return EVAL_PHASE_LABELS[phase] ?? phase;
}

export function triageBadgeClass(status: string): string {
  if (status === 'GREEN_ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'RED_ZONE_LOCKED') return 'bg-rose-100 text-rose-800';
  if (status === 'REFERRAL_UPLOADED') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

export function promotionBadgeClass(status: string): string {
  return status === 'PROMOTION_READY'
    ? 'bg-sky-100 text-sky-800'
    : 'bg-slate-100 text-slate-700';
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toISOString().slice(0, 10)} ${date
    .toISOString()
    .slice(11, 16)}`;
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export function ageFromBirthDate(birthDate: string | Date): string {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths > 0 ? `${years}岁${restMonths}个月` : `${years}岁`;
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function downloadCsvTemplate(): void {
  const csv =
    '\uFEFF姓名,年龄,班级场景,初始层级,视光与评估基线\n' +
    '李星辰,7岁1个月,特殊教育学校一年级,L1,NPC 13cm 集合不足·双面镜5cpm\n' +
    '孙语桐,8岁4个月,普通小学资源教室,L2,TVPS-4图形背景68分·抄写跳行\n' +
    '王子轩,6岁0个月,妇幼保健院儿童康复科,L0,四点支撑不足6秒·前庭眼反射弱\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'VMI-TIS_学生档案批量导入模板.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
