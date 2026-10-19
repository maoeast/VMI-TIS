import { Injectable, NotFoundException } from '@nestjs/common';
import { CapabilityLevel } from '@vmi-tis/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [students, sessions, totalSessions] = await Promise.all([
      this.prisma.student.findMany({
        select: { currentLevel: true, triageStatus: true },
      }),
      this.prisma.trainingSession.findMany({
        where: { isFinished: true },
        orderBy: { sessionDate: 'desc' },
        take: 200,
        include: {
          student: { select: { name: true } },
          sopCard: { select: { cardTitle: true } },
        },
      }),
      this.prisma.trainingSession.count(),
    ]);

    const levelDistribution: Record<CapabilityLevel, number> = {
      [CapabilityLevel.L0]: 0,
      [CapabilityLevel.L1]: 0,
      [CapabilityLevel.L2]: 0,
      [CapabilityLevel.L3]: 0,
      [CapabilityLevel.L4]: 0,
      [CapabilityLevel.L5]: 0,
    };

    const triageDistribution: Record<string, number> = {
      PENDING_SCREENING: 0,
      RED_ZONE_LOCKED: 0,
      REFERRAL_UPLOADED: 0,
      GREEN_ACTIVE: 0,
    };

    for (const student of students) {
      levelDistribution[student.currentLevel as CapabilityLevel] =
        (levelDistribution[student.currentLevel as CapabilityLevel] ?? 0) + 1;
      triageDistribution[student.triageStatus] =
        (triageDistribution[student.triageStatus] ?? 0) + 1;
    }

    const averageAccuracy =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + session.accuracyRate, 0) /
          sessions.length
        : 0;

    return {
      totalStudents: students.length,
      totalSessions,
      finishedSessions: sessions.length,
      averageAccuracy,
      levelDistribution,
      triageDistribution,
      recentSessions: sessions.slice(0, 10).map((session) => ({
        id: session.id,
        date: session.sessionDate.toISOString(),
        studentName: session.student.name,
        sopCardTitle: session.sopCard.cardTitle,
        accuracyRate: session.accuracyRate,
        digitalDurationSec: session.digitalDurationSec,
      })),
    };
  }

  async studentAnalytics(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const [sessions, assessments, completedHomework, totalSessions] =
      await Promise.all([
        this.prisma.trainingSession.findMany({
          where: { studentId, isFinished: true },
          orderBy: { sessionDate: 'desc' },
          take: 8,
          include: {
            sopCard: { select: { cardTitle: true, cardCode: true } },
          },
        }),
        this.prisma.assessmentRecord.findMany({
          where: { studentId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.homeworkCheckin.count({
          where: { studentId, status: 'COMPLETED' },
        }),
        this.prisma.trainingSession.count({ where: { studentId } }),
      ]);

    const latestAssessment = assessments[0];
    const radarScores = latestAssessment
      ? this.parseJson(latestAssessment.radarScoresJson)
      : {};

    const chronological = [...sessions].reverse();
    const averageAccuracy =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + session.accuracyRate, 0) /
          sessions.length
        : 0;

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        currentLevel: student.currentLevel,
        triageStatus: student.triageStatus,
        promotionStatus: student.promotionStatus,
      },
      totalSessions,
      finishedSessions: sessions.length,
      averageAccuracy,
      completedHomework,
      radarScores,
      accuracyTrend: chronological.map((session) => ({
        date: session.sessionDate.toISOString().slice(0, 10),
        accuracyRate: session.accuracyRate,
        sopCardTitle: session.sopCard.cardTitle,
      })),
      digitalTrend: chronological.map((session) => ({
        date: session.sessionDate.toISOString().slice(0, 10),
        digitalDurationSec: session.digitalDurationSec,
      })),
      levelHistory: assessments.map((record) => ({
        id: record.id,
        date: record.createdAt.toISOString().slice(0, 10),
        evalPhase: record.evalPhase,
        autoLevel: record.autoLevel,
      })),
    };
  }

  private parseJson(value: string | null): Record<string, unknown> {
    if (!value) {
      return {};
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
