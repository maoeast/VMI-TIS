import { Injectable } from '@nestjs/common';
import { AutoLevelInput, CapabilityLevel } from '@vmi-tis/shared-types';

/**
 * L0–L5 综合定级算法（规则 R2 的定级部分）。
 *
 * 优先级：
 * 1. 身体稳定未达标 → L0
 * 2. 视觉效率异常 → L1
 * 3. 视觉感知薄弱且运动协调达标 → L2
 * 4. Beery VMI 标准分 < 80 → L3
 * 5. 基础达标但课堂应用不足 → L4
 * 6. 全部达标 → L5
 */
@Injectable()
export class AutoLevelService {
  calculateLevel(input: AutoLevelInput): CapabilityLevel {
    if (!input.stabilityPass) {
      return CapabilityLevel.L0;
    }

    const visualEfficiencyIssue =
      (input.npcCm !== undefined && input.npcCm > 10) ||
      (input.accomFacilityCpm !== undefined && input.accomFacilityCpm < 6) ||
      (input.nsucoScore !== undefined &&
        (input.nsucoScore.pursuit <= 2 || input.nsucoScore.saccade <= 2));

    if (visualEfficiencyIssue) {
      return CapabilityLevel.L1;
    }

    const perceptionWeak =
      (input.tvps4Std !== undefined && input.tvps4Std < 80) ||
      (input.mvpt3Std !== undefined && input.mvpt3Std < 80);
    const motorCoordOk =
      input.beeryVmiStd !== undefined && input.beeryVmiStd >= 80;

    if (perceptionWeak && motorCoordOk) {
      return CapabilityLevel.L2;
    }

    if (input.beeryVmiStd !== undefined && input.beeryVmiStd < 80) {
      return CapabilityLevel.L3;
    }

    // 缺失指标按既定策略视为“未异常/达标”，
    // 因此课堂适应明确不达标时，缺 TVPS 或 Beery 仍应降到 L4。
    const motorOk =
      input.beeryVmiStd === undefined || input.beeryVmiStd >= 80;
    const tvpsOk = input.tvps4Std === undefined || input.tvps4Std >= 80;

    if (motorOk && tvpsOk && input.classroomAdaptationPass === false) {
      return CapabilityLevel.L4;
    }

    return CapabilityLevel.L5;
  }
}
