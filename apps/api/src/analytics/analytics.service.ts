import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CapabilityLevel,
  SCALE_DATA_STATUS_LABELS,
  SCALE_PROVENANCE_REGISTRY,
  SCALE_SCORE_SOURCE_LABELS,
  resolveScaleScoreSource,
} from '@vmi-tis/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/** 科研 CSV 的固定列序；后续只允许在末尾追加，不改既有列（月龄按评估日期换算，不含姓名/电话/出生日期/UUID）。 */
const ASSESSMENT_CSV_HEADER = [
  '学生编码',
  '性别',
  '月龄',
  '班级场景',
  '评估阶段',
  '评估日期',
  '分流状态',
  '当前层级',
  '自动定级',
  'Beery VMI-6 原始分',
  'Beery VMI-6 标准分',
  'Beery VMI-6 数据状态',
  'Beery VMI-6 分数来源',
  'Beery VP 标准分',
  'Beery MC 标准分',
  'TVPS-4 标准分',
  'TVPS-4 数据状态',
  'TVPS-4 分数来源',
  'MVPT-4 标准分',
  'MVPT-4 数据状态',
  'MVPT-4 分数来源',
  'DEM 分型',
  'DEM 数据状态',
  'DEM 分数来源',
  'NSUCO 追视',
  'NSUCO 扫视',
  'NSUCO 数据状态',
  'NSUCO 分数来源',
  'NPC cm',
  '调节灵活度 cpm',
  '视光判读数据状态',
  '视光判读分数来源',
  '六维雷达 JSON',
] as const;

/** 月龄换算：一个月按 30.4375 天（2629800000 ms）。 */
const MS_PER_MONTH = 2629800000;

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

  /**
   * 科研 CSV 导出：全部评估记录按时间升序，默认脱敏（不导姓名/电话/出生日期/UUID）。
   * 数据状态文案与分数来源走种子单一来源；UTF-8 BOM + CRLF + RFC 4180 转义，Excel 直接打开不乱码。
   */
  async exportAssessmentCsv(): Promise<{ filename: string; csv: string }> {
    const records = await this.prisma.assessmentRecord.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        evalPhase: true,
        autoLevel: true,
        beeryVmiRaw: true,
        beeryVmiStd: true,
        beeryVpStd: true,
        beeryMcStd: true,
        tvps4Std: true,
        mvpt4Std: true,
        demNormTier: true,
        nsucoScoreJson: true,
        npcCm: true,
        accomFacilityCpm: true,
        radarScoresJson: true,
        assessmentMetaJson: true,
        createdAt: true,
        student: {
          select: {
            studentCode: true,
            gender: true,
            birthDate: true,
            schoolScene: true,
            triageStatus: true,
            currentLevel: true,
          },
        },
      },
    });

    const beeryStatus =
      SCALE_DATA_STATUS_LABELS[SCALE_PROVENANCE_REGISTRY.BEERY_VMI_6.dataStatus]
        .label;
    const tvps4Status =
      SCALE_DATA_STATUS_LABELS[SCALE_PROVENANCE_REGISTRY.TVPS_4.dataStatus]
        .label;
    const mvpt4Status =
      SCALE_DATA_STATUS_LABELS[SCALE_PROVENANCE_REGISTRY.MVPT_4.dataStatus]
        .label;
    const demStatus =
      SCALE_DATA_STATUS_LABELS[SCALE_PROVENANCE_REGISTRY.DEM.dataStatus].label;

    const rows: string[] = [this.csvRow([...ASSESSMENT_CSV_HEADER])];

    for (const record of records) {
      const meta = this.parseJson(record.assessmentMetaJson);
      const beery = this.asRecord(meta.beery);
      const tvps4 = this.asRecord(meta.tvps4);
      const mvpt4 = this.asRecord(meta.mvpt4);
      const dem = this.asRecord(meta.dem);
      const nsuco = this.parseJson(record.nsucoScoreJson);
      const hasMeta = (value: Record<string, unknown>): boolean =>
        Object.keys(value).length > 0;

      const beerySource = resolveScaleScoreSource({
        dataStatus: SCALE_PROVENANCE_REGISTRY.BEERY_VMI_6.dataStatus,
        standardScore: record.beeryVmiStd,
        normApplied: null,
        hasRawInput: record.beeryVmiRaw != null,
      });
      const tvps4Source = resolveScaleScoreSource({
        dataStatus: SCALE_PROVENANCE_REGISTRY.TVPS_4.dataStatus,
        standardScore: record.tvps4Std,
        normApplied: null,
        hasRawInput: hasMeta(tvps4),
      });
      const mvpt4Source = resolveScaleScoreSource({
        dataStatus: SCALE_PROVENANCE_REGISTRY.MVPT_4.dataStatus,
        standardScore: record.mvpt4Std,
        normApplied:
          typeof mvpt4.normApplied === 'boolean' ? mvpt4.normApplied : null,
        hasRawInput: mvpt4.rawScore != null,
      });
      const demSource = resolveScaleScoreSource({
        dataStatus: SCALE_PROVENANCE_REGISTRY.DEM.dataStatus,
        standardScore: record.demNormTier,
        normApplied: null,
        hasRawInput: hasMeta(dem),
      });
      const nsucoStatus = SCALE_PROVENANCE_REGISTRY.NSUCO.dataStatus;
      const nsucoPursuit =
        typeof nsuco.pursuit === 'number' ? nsuco.pursuit : null;
      const nsucoSaccade =
        typeof nsuco.saccade === 'number' ? nsuco.saccade : null;
      const nsucoSource = resolveScaleScoreSource({
        dataStatus: nsucoStatus,
        standardScore: nsucoPursuit ?? nsucoSaccade ?? null,
        normApplied: null,
        hasRawInput: false,
      });
      const optometryStatus =
        SCALE_PROVENANCE_REGISTRY.OPTOMETRY_NORMS.dataStatus;
      const optometrySource = resolveScaleScoreSource({
        dataStatus: optometryStatus,
        standardScore: record.npcCm ?? record.accomFacilityCpm ?? null,
        normApplied: null,
        hasRawInput: false,
      });

      const ageMonths = Math.floor(
        (record.createdAt.getTime() - record.student.birthDate.getTime()) /
          MS_PER_MONTH,
      );

      rows.push(
        this.csvRow([
          record.student.studentCode,
          record.student.gender,
          ageMonths,
          record.student.schoolScene,
          record.evalPhase,
          record.createdAt.toISOString().slice(0, 10),
          record.student.triageStatus,
          record.student.currentLevel,
          record.autoLevel,
          record.beeryVmiRaw,
          record.beeryVmiStd,
          beeryStatus,
          SCALE_SCORE_SOURCE_LABELS[beerySource],
          record.beeryVpStd,
          record.beeryMcStd,
          record.tvps4Std,
          tvps4Status,
          SCALE_SCORE_SOURCE_LABELS[tvps4Source],
          record.mvpt4Std,
          mvpt4Status,
          SCALE_SCORE_SOURCE_LABELS[mvpt4Source],
          record.demNormTier,
          demStatus,
          SCALE_SCORE_SOURCE_LABELS[demSource],
          nsuco.pursuit,
          nsuco.saccade,
          nsucoStatus,
          SCALE_SCORE_SOURCE_LABELS[nsucoSource],
          record.npcCm,
          record.accomFacilityCpm,
          optometryStatus,
          SCALE_SCORE_SOURCE_LABELS[optometrySource],
          record.radarScoresJson,
        ]),
      );
    }

    // 空数据只返回表头；BOM 让 Excel 按 UTF-8 打开，中文不乱码。
    const csv = `\uFEFF${rows.join('\r\n')}\r\n`;
    return { filename: this.csvFileName(), csv };
  }

  /** RFC 4180：含引号/逗号/换行时用双引号包裹，内部引号变双写；空值写空串。 */
  private csvCell(value: unknown): string {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private csvRow(cells: unknown[]): string {
    return cells.map((cell) => this.csvCell(cell)).join(',');
  }

  private csvFileName(now = new Date()): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `vmi_tis_assessment_export_${now.getFullYear()}${pad(
      now.getMonth() + 1,
    )}${pad(now.getDate())}_${pad(now.getHours())}${pad(
      now.getMinutes(),
    )}${pad(now.getSeconds())}.csv`;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
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
