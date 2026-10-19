import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CapabilityLevel,
  PromotionCheckResult,
} from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

const LEVEL_ORDER: CapabilityLevel[] = [
  CapabilityLevel.L0,
  CapabilityLevel.L1,
  CapabilityLevel.L2,
  CapabilityLevel.L3,
  CapabilityLevel.L4,
  CapabilityLevel.L5,
];

@Injectable()
export class PromotionCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 规则 R3：连续 3 次课 ≥80% + 至少 2 种训练材料 + 至少 1 次家庭打卡。
   * 材料优先取 trialsJson 中的 material；旧数据没有 material 时退化为 sopCardId 去重。
   */
  async checkPromotionCriteria(
    studentId: string,
  ): Promise<PromotionCheckResult> {
    await this.ensureStudentExists(studentId);

    // 上一次晋级审批的时间点：只有它之后完成的课次才算新证据，
    // 防止同一批 3 次课被反复用来晋级。
    const lastApproval = await this.prisma.auditLog.findFirst({
      where: {
        action: AuditAction.APPROVE_PROMOTION,
        targetType: 'student',
        targetId: studentId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentSessions = await this.prisma.trainingSession.findMany({
      where: {
        studentId,
        isFinished: true,
        ...(lastApproval
          ? { finishedAt: { gt: lastApproval.createdAt } }
          : {}),
      },
      orderBy: { sessionDate: 'desc' },
      take: 3,
    });

    if (recentSessions.length < 3) {
      return {
        canPromote: false,
        recentSessions: recentSessions.map((session) => ({
          sessionNumber: session.sessionNumber,
          accuracyRate: session.accuracyRate,
        })),
        materialCount: 0,
        homeCheckinCount: 0,
        reason: '课时不足 3 次',
      };
    }

    const allAbove80 = recentSessions.every(
      (session) => session.accuracyRate >= 0.8,
    );

    if (!allAbove80) {
      return {
        canPromote: false,
        recentSessions: recentSessions.map((session) => ({
          sessionNumber: session.sessionNumber,
          accuracyRate: session.accuracyRate,
        })),
        materialCount: 0,
        homeCheckinCount: 0,
        reason: '最近 3 次课未全部达到 80%',
      };
    }

    const materials = new Set<string>();
    for (const session of recentSessions) {
      const trials = this.parseTrials(session.trialsJson);
      let sessionMaterialFound = false;

      for (const trial of trials) {
        if (trial.material) {
          materials.add(trial.material);
          sessionMaterialFound = true;
        }
      }

      if (!sessionMaterialFound) {
        materials.add(session.sopCardId);
      }
    }

    const homeCheckinCount = await this.prisma.homeworkCheckin.count({
      where: { studentId, status: 'COMPLETED' },
    });

    const canPromote = materials.size >= 2 && homeCheckinCount >= 1;

    if (canPromote) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: { promotionStatus: 'PROMOTION_READY' },
      });

      await this.auditLogService.log({
        action: AuditAction.PROMOTION_READY,
        targetType: 'student',
        targetId: studentId,
        changesAfter: {
          promotionStatus: 'PROMOTION_READY',
          reason: `连续 3 次课 ≥80%，跨 ${materials.size} 种材料，家庭打卡 ${homeCheckinCount} 次`,
        },
      });
    }

    return {
      canPromote,
      recentSessions: recentSessions.map((session) => ({
        sessionNumber: session.sessionNumber,
        accuracyRate: session.accuracyRate,
      })),
      materialCount: materials.size,
      homeCheckinCount,
      ...(canPromote
        ? {}
        : {
            reason: `材料数 ${materials.size}/2，打卡 ${homeCheckinCount}/1`,
          }),
    };
  }

  async approvePromotion(studentId: string, approvedBy: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    if (student.promotionStatus !== 'PROMOTION_READY') {
      throw new BadRequestException('学生未处于待晋级状态');
    }

    // 审批时重新核验：待晋级状态可能已经过期，不能只信旧标记。
    const check = await this.checkPromotionCriteria(studentId);
    if (!check.canPromote) {
      throw new BadRequestException(check.reason ?? '晋级条件未满足');
    }

    const currentIndex = LEVEL_ORDER.indexOf(
      student.currentLevel as CapabilityLevel,
    );
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextLevel =
      LEVEL_ORDER[Math.min(safeIndex + 1, LEVEL_ORDER.length - 1)];

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        currentLevel: nextLevel,
        promotionStatus: 'IN_PROGRESS',
      },
    });

    await this.auditLogService.log({
      action: AuditAction.APPROVE_PROMOTION,
      targetType: 'student',
      targetId: studentId,
      changesBefore: { currentLevel: student.currentLevel },
      changesAfter: {
        currentLevel: nextLevel,
        approvedBy,
        promotionStatus: 'IN_PROGRESS',
      },
    });

    return updated;
  }

  private parseTrials(
    value: string,
  ): Array<{ material?: string }> {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? (parsed as Array<{ material?: string }>)
        : [];
    } catch {
      return [];
    }
  }

  private async ensureStudentExists(studentId: string): Promise<void> {
    const count = await this.prisma.student.count({
      where: { id: studentId },
    });
    if (count === 0) {
      throw new NotFoundException('学生不存在');
    }
  }
}
