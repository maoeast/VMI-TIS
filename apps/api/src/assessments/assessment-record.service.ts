import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  EvalPhase,
  evaluateCeilingRule,
  type ScaleScoreResult,
} from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssessmentGradingService } from './assessment-grading.service';
import { AssessmentRecordQueryDto } from './dto/assessment-record-query.dto';
import { CreateAssessmentRecordDto } from './dto/create-assessment-record.dto';
import { SubmitScaleScoreDto } from './dto/submit-scale-score.dto';
import { ReportService } from './report.service';

@Injectable()
export class AssessmentRecordService {
  /** 单机版内存态：sessionId → 已提交的 0/1 得分序列 */
  private readonly recentScores = new Map<string, number[]>();
  /** 已中止的会话：保留累计进度，拒绝继续打分，直到 reset */
  private readonly terminatedSessions = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly gradingService: AssessmentGradingService,
    private readonly reportService: ReportService,
  ) {}

  /**
   * 规则 R2：连续 3 题 0 分自动中止。
   */
  async submitScaleScore(dto: SubmitScaleScoreDto): Promise<ScaleScoreResult> {
    await this.ensureStudentExists(dto.studentId);

    // 客户端 sessionId 只在本学生/本评估阶段内有效；
    // 必须把 studentId 与 evalPhase 一起纳入键，避免跨学生串扰。
    const sessionKey = `${dto.studentId}:${dto.evalPhase}:${
      dto.sessionId ?? 'default'
    }`;

    if (dto.reset) {
      this.recentScores.delete(sessionKey);
      this.terminatedSessions.delete(sessionKey);
      return {
        shouldTerminate: false,
        sessionId: sessionKey,
        submittedItems: 0,
        lastThree: [],
        consecutiveZeroCount: 0,
        ceilingItemIndex: null,
        totalRawScore: 0,
        message: '已重置本轮施测的连续得分计数',
      };
    }

    const scores = this.recentScores.get(sessionKey) ?? [];

    if (this.terminatedSessions.has(sessionKey)) {
      const ceiling = evaluateCeilingRule(scores as Array<0 | 1 | null>);
      return {
        shouldTerminate: true,
        sessionId: sessionKey,
        submittedItems: scores.length,
        lastThree: scores.slice(-3),
        consecutiveZeroCount: ceiling.consecutiveZeroCount,
        ceilingItemIndex: ceiling.ceilingItemIndex,
        totalRawScore: ceiling.totalRawScore,
        message: '本轮评估已中止，请重置后重新施测',
      };
    }

    if (dto.score !== undefined) {
      scores.push(dto.score);
    }

    this.recentScores.set(sessionKey, scores);

    // R2 唯一公式源：种子文件的连续 3 题 0 分中止函数。
    const ceiling = evaluateCeilingRule(scores as Array<0 | 1 | null>);
    const lastThree = scores.slice(-3);
    const shouldTerminate = ceiling.shouldTerminate;

    if (shouldTerminate) {
      // 保留 scores 与本轮累计原始分，直到 reset；不改动已提交的进度。
      this.terminatedSessions.add(sessionKey);
    }

    return {
      shouldTerminate,
      sessionId: sessionKey,
      submittedItems: scores.length,
      lastThree,
      consecutiveZeroCount: ceiling.consecutiveZeroCount,
      ceilingItemIndex: ceiling.ceilingItemIndex,
      totalRawScore: ceiling.totalRawScore,
      ...(shouldTerminate
        ? {
            message:
              '检测到连续 3 题得分为 0，根据测验规则已自动中止本次评估',
          }
        : {}),
    };
  }

  async create(dto: CreateAssessmentRecordDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, birthDate: true, triageStatus: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const grading = this.gradingService.grade(student, dto);
    const autoLevel = grading.autoLevel;

    // 评估记录与学生 currentLevel 必须同成同败，避免只落一半。
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessmentRecord.create({
        data: {
          studentId: dto.studentId,
          evalPhase: dto.evalPhase,
          acuityLeft: dto.acuityLeft ?? null,
          acuityRight: dto.acuityRight ?? null,
          refractionStatus: dto.refractionStatus ?? null,
          accomAmplitudeD: dto.accomAmplitudeD ?? null,
          accomFacilityCpm: dto.accomFacilityCpm ?? null,
          npcCm: dto.npcCm ?? null,
          binocularTier: dto.binocularTier ?? null,
          nsucoScoreJson: dto.nsucoScore
            ? JSON.stringify(dto.nsucoScore)
            : null,
          beeryVmiRaw: dto.beeryVmiRaw ?? null,
          beeryVmiStd: grading.beeryVmiStd ?? null,
          beeryVpStd: grading.beeryVpStd ?? null,
          beeryMcStd: grading.beeryMcStd ?? null,
          tvps4Std: grading.tvps4Std ?? null,
          mvpt3Std: dto.mvpt3Std ?? null,
          mvpt4Std: grading.mvpt4Std ?? null,
          demNormTier: grading.demNormTier ?? null,
          radarScoresJson: grading.radarScoresJson,
          assessmentMetaJson: grading.assessmentMetaJson,
          autoLevel,
        },
      });

      await tx.student.update({
        where: { id: dto.studentId },
        data: { currentLevel: autoLevel },
      });

      return created;
    });

    await this.auditLogService.log({
      action: AuditAction.UPDATE_ASSESSMENT,
      targetType: 'assessment',
      targetId: record.id,
      changesAfter: {
        studentId: dto.studentId,
        evalPhase: dto.evalPhase,
        autoLevel,
      },
    });

    return record;
  }

  async findByStudent(
    studentId: string,
    query: AssessmentRecordQueryDto,
  ) {
    await this.ensureStudentExists(studentId);

    const records = await this.prisma.assessmentRecord.findMany({
      where: {
        studentId,
        ...(query.evalPhase ? { evalPhase: query.evalPhase } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const groups: Record<string, typeof records> = {
      [EvalPhase.BASELINE]: [],
      [EvalPhase.STAGE_8W]: [],
      [EvalPhase.TRANSITION]: [],
    };

    for (const record of records) {
      if (!groups[record.evalPhase]) {
        groups[record.evalPhase] = [];
      }
      groups[record.evalPhase].push(record);
    }

    return {
      studentId,
      total: records.length,
      groups,
      records,
    };
  }

  async generateReport(recordId: string) {
    return this.reportService.generateAssessmentReport(recordId);
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
