import { Injectable } from '@nestjs/common';
import { CapabilityLevel, WorkbenchSummaryDto } from '@vmi-tis/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<WorkbenchSummaryDto> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [
      todaySessions,
      activeStudentsCount,
      pendingPromotions,
      pendingReferrals,
      levelGroups,
    ] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where: { sessionDate: { gte: startOfDay, lt: endOfDay } },
        orderBy: { sessionDate: 'asc' },
        include: {
          student: { select: { name: true } },
          sopCard: { select: { cardTitle: true } },
        },
      }),
      this.prisma.student.count({ where: { triageStatus: 'GREEN_ACTIVE' } }),
      this.prisma.student.count({
        where: { promotionStatus: 'PROMOTION_READY' },
      }),
      this.prisma.assessmentTriageReferral.count({
        where: { auditStatus: 'PENDING' },
      }),
      this.prisma.student.groupBy({
        by: ['currentLevel'],
        _count: { _all: true },
      }),
    ]);

    const levelDistribution: Record<CapabilityLevel, number> = {
      [CapabilityLevel.L0]: 0,
      [CapabilityLevel.L1]: 0,
      [CapabilityLevel.L2]: 0,
      [CapabilityLevel.L3]: 0,
      [CapabilityLevel.L4]: 0,
      [CapabilityLevel.L5]: 0,
    };

    for (const group of levelGroups) {
      levelDistribution[group.currentLevel as CapabilityLevel] =
        group._count._all;
    }

    return {
      todaySchedules: todaySessions.map((session) => ({
        time: session.sessionDate.toISOString().slice(11, 16),
        studentName: session.student.name,
        sopCardTitle: session.sopCard.cardTitle,
      })),
      activeStudentsCount,
      pendingPromotions,
      pendingReferrals,
      levelDistribution,
    };
  }
}
