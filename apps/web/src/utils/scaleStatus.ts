import {
  SCALE_DATA_STATUS_LABELS,
  SCALE_PROVENANCE_REGISTRY,
  SCALE_SCORE_SOURCE_LABELS,
  resolveScaleScoreSource,
  type ProvenanceRegistryKey,
  type ScaleCode,
  type ScaleDataStatus,
  type ScaleScoreSource,
} from '@vmi-tis/shared-types/assessment-seed';

/**
 * 量表数据状态的展示工具：文案全部来自种子 `SCALE_DATA_STATUS_LABELS` / `SCALE_SCORE_SOURCE_LABELS`，
 * 前端只在这里映射颜色与组装徽标，不另写一套中文。
 */

/** 数据状态 → Tailwind 徽标配色：官方绿 / 手册蓝 / 近似琥珀 / 仅结构灰。 */
const DATA_STATUS_BADGE_CLASS: Record<ScaleDataStatus, string> = {
  OFFICIAL_LICENSED: 'bg-emerald-100 text-emerald-800',
  MANUAL_ENTRY_ONLY: 'bg-blue-100 text-blue-800',
  PROJECT_APPROXIMATION: 'bg-amber-100 text-amber-800',
  STRUCTURE_ONLY: 'bg-slate-100 text-slate-700',
};

export interface ScaleStatusBadgeInfo {
  label: string;
  description: string;
  className: string;
  ariaLabel: string;
}

/** 某个量表的徽标信息（含数据状态说明，供 title 悬浮提示）。 */
export function getScaleStatusBadge(
  scaleCode: ProvenanceRegistryKey,
): ScaleStatusBadgeInfo {
  const meta = SCALE_PROVENANCE_REGISTRY[scaleCode];
  const { label, description } = SCALE_DATA_STATUS_LABELS[meta.dataStatus];
  return {
    label,
    description,
    className: DATA_STATUS_BADGE_CLASS[meta.dataStatus],
    ariaLabel: `数据状态：${label}`,
  };
}

/** 某个量表的数据状态文案（列表、小字提示用）。 */
export function getScaleDataStatusLabel(
  scaleCode: ProvenanceRegistryKey,
): string {
  return SCALE_DATA_STATUS_LABELS[
    SCALE_PROVENANCE_REGISTRY[scaleCode].dataStatus
  ].label;
}

/** 分数来源文案（手册 / 参考换算 / 未录入…）。 */
export function getScoreSourceLabel(source: ScaleScoreSource): string {
  return SCALE_SCORE_SOURCE_LABELS[source];
}

/** 草稿表单里一个量表的填报状态：是否已录原始分 + 标准分输入框内容。 */
export interface ScaleFormScoreState {
  hasRawInput: boolean;
  standardScore: string;
}

/**
 * 按表单填报情况推导分数来源，规则与报告 / CSV 一致（种子 `resolveScaleScoreSource`）：
 * 填了标准分 → 手册；只填原始分 → 保存后换算为参考分（MVPT-4 14+ 仍需手册标准分）；都没填 → 未录入。
 * MVPT-4 手册标准分优先，填了手册分就不再走自动换算；Beery / TVPS-4 由原始分先换算。
 */
export function getFormScoreSource(
  scaleCode: ScaleCode,
  state: ScaleFormScoreState,
  ageYears?: number | null,
): ScaleScoreSource {
  const hasStd = state.standardScore.trim() !== '';
  if (!hasStd && state.hasRawInput) {
    // 草稿阶段：原始分已录、标准分未录，保存后由服务端换算。
    if (scaleCode === 'MVPT_4') {
      const age = ageYears == null ? null : Math.floor(ageYears);
      return age != null && age >= 4 && age <= 13
        ? 'PENDING_REFERENCE'
        : 'NEEDS_MANUAL';
    }
    if (
      scaleCode === 'BEERY_VMI_6' ||
      scaleCode === 'TVPS_4' ||
      scaleCode === 'DEM'
    ) {
      return 'PENDING_REFERENCE';
    }
  }
  return resolveScaleScoreSource({
    dataStatus: SCALE_PROVENANCE_REGISTRY[scaleCode].dataStatus,
    standardScore: hasStd ? state.standardScore : null,
    normApplied: scaleCode === 'MVPT_4' && hasStd ? false : null,
    hasRawInput: state.hasRawInput,
  });
}

/** 已落库记录的分数来源判定（保存后卡片用），与报告 / CSV 同一套规则。 */
export function getRecordScoreSource(
  scaleCode: 'BEERY_VMI_6' | 'TVPS_4' | 'MVPT_4',
  record: {
    standardScore: number | null;
    hasRawInput: boolean;
    normApplied?: boolean | null;
  },
): ScaleScoreSource {
  return resolveScaleScoreSource({
    dataStatus: SCALE_PROVENANCE_REGISTRY[scaleCode].dataStatus,
    standardScore: record.standardScore,
    normApplied: record.normApplied ?? null,
    hasRawInput: record.hasRawInput,
  });
}
