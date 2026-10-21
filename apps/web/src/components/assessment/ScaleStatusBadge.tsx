import type { ProvenanceRegistryKey } from '@vmi-tis/shared-types';
import { getScaleStatusBadge } from '../../utils/scaleStatus';

/**
 * 量表数据状态徽标：文案取自种子标签表，配色由 `scaleStatus` 统一映射。
 * 四种状态：官方授权（绿）/ 手册录入（蓝）/ 项目近似（琥珀）/ 仅结构（灰）。
 */
export function ScaleStatusBadge({
  scaleCode,
}: {
  scaleCode: ProvenanceRegistryKey;
}) {
  const badge = getScaleStatusBadge(scaleCode);
  return (
    <span
      className={`badge ${badge.className}`}
      aria-label={badge.ariaLabel}
      title={badge.description}
    >
      数据状态：{badge.label}
    </span>
  );
}
