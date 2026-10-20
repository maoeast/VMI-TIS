import { Injectable } from '@nestjs/common';
import {
  AssessmentMeta,
  BeeryNormResult,
  CapabilityLevel,
  Tvps4RawScores,
} from '@vmi-tis/shared-types';
import {
  calculateBeeryVmiNorms,
  calculateTvps4ProfileNorms,
  determineRecommendedLevelL0ToL5,
  evaluateDemTestResult,
  type ComprehensiveGradingInput,
} from '@vmi-tis/shared-types';
import { CreateAssessmentRecordDto } from './dto/create-assessment-record.dto';

export interface AssessmentGradingResult {
  autoLevel: CapabilityLevel;
  beeryVmiStd?: number;
  beeryVpStd?: number;
  beeryMcStd?: number;
  tvps4Std?: number;
  demNormTier?: string;
  radarScoresJson: string;
  assessmentMetaJson: string;
}

/**
 * 评估模块唯一公式入口。
 *
 * 原始分/标准分换算、R2 连续 0 分中止与 L0–L5 定级全部调用
 * `vmi_tis_assessment_scales_seed.ts` 的纯函数，禁止在本服务重写公式。
 */
@Injectable()
export class AssessmentGradingService {
  grade(
    student: { birthDate: Date; triageStatus: string },
    dto: CreateAssessmentRecordDto,
  ): AssessmentGradingResult {
    const ageMonths = this.monthsBetween(student.birthDate);
    const ageYears = ageMonths / 12;

    const beeryMain =
      dto.beeryVmiRaw !== undefined
        ? calculateBeeryVmiNorms(dto.beeryVmiRaw, ageMonths, 'vmiMain')
        : undefined;
    const beeryVp =
      dto.beeryVpRaw !== undefined
        ? calculateBeeryVmiNorms(dto.beeryVpRaw, ageMonths, 'vpSupp')
        : undefined;
    const beeryMc =
      dto.beeryMcRaw !== undefined
        ? calculateBeeryVmiNorms(dto.beeryMcRaw, ageMonths, 'mcSupp')
        : undefined;

    const beeryVmiStd = beeryMain?.standardScore ?? dto.beeryVmiStd;
    const beeryVpStd = beeryVp?.standardScore ?? dto.beeryVpStd;
    const beeryMcStd = beeryMc?.standardScore ?? dto.beeryMcStd;

    const tvps4 = dto.tvps4RawScores
      ? calculateTvps4ProfileNorms(
          dto.tvps4RawScores as Tvps4RawScores,
          ageYears,
        )
      : undefined;
    const tvps4Std = tvps4?.overallStandardScore ?? dto.tvps4Std;
    // MVPT-3 只作为定级输入的兼容替代，不写入 TVPS-4 标准分列。
    const tvpsGradingStd = tvps4Std ?? dto.mvpt3Std;

    const dem = dto.demRaw
      ? evaluateDemTestResult({ ageYears, ...dto.demRaw })
      : undefined;
    const demNormTier = dem?.behaviorType ?? dto.demNormTier;

    const nsucoMinScore = dto.nsucoScore
      ? Math.min(
          dto.nsucoScore.pursuit,
          dto.nsucoScore.saccade,
          dto.nsucoScore.vergence ?? 5,
        )
      : 3;
    const clampedNsuco = Math.max(1, Math.min(5, nsucoMinScore)) as
      | 1
      | 2
      | 3
      | 4
      | 5;

    // 原始分优先；缺省兼容旧 payload，但前端已提供真实录入入口。
    const quadrupedHoldSec =
      dto.quadrupedHoldSec ?? (dto.stabilityPass === false ? 0 : 10);
    const spsrcSensoryStable = dto.stabilityPass ?? true;
    const classroomCopyAccuracyPct =
      dto.classroomCopyAccuracyPct ??
      (dto.classroomAdaptationPass === false ? 70 : 90);
    const isRedZonePositive =
      student.triageStatus === 'RED_ZONE_LOCKED' ||
      student.triageStatus === 'REFERRAL_UPLOADED';
    const isReferralAuditedPass = student.triageStatus === 'GREEN_ACTIVE';

    const gradingInput: ComprehensiveGradingInput = {
      isRedZonePositive,
      isReferralAuditedPass,
      quadrupedHoldSec,
      spsrcSensoryStable,
      npcBreakCm: dto.npcCm ?? 6,
      accomFacilityCpm: dto.accomFacilityCpm ?? 10,
      nsucoMinScore: clampedNsuco,
      tvpsOverallStdScore: tvpsGradingStd ?? 100,
      tvpsWeakestSubtest: tvps4?.weakestSubtests[0]?.code as
        | 'DIS'
        | 'MEM'
        | 'SPA'
        | 'CON'
        | 'SEQ'
        | 'FGR'
        | 'CLO'
        | undefined,
      beeryVmiStdScore: beeryVmiStd ?? 100,
      beeryVpStdScore: beeryVpStd,
      beeryMcStdScore: beeryMcStd,
      classroomCopyAccuracyPct,
    };

    const grading = determineRecommendedLevelL0ToL5(gradingInput);
    const [stabilize, efficiency, perception, integration, adaptation, transfer] =
      grading.radarSixDimensions;

    // 人工录入的六维分数优先；未录入时用定级函数产出的雷达。
    const radarPayload = dto.radarScores
      ? {
          stabilize: dto.radarScores.stabilize,
          efficiency: dto.radarScores.efficiency,
          perception: dto.radarScores.perception,
          integration: dto.radarScores.integration,
          adaptation: dto.radarScores.adaptation,
          transfer: dto.radarScores.transfer,
        }
      : {
          stabilize,
          efficiency,
          perception,
          integration,
          adaptation,
          transfer,
        };

    const beeryMeta =
      beeryMain || beeryVp || beeryMc
        ? {
            ...(beeryMain ? { main: beeryMain as BeeryNormResult } : {}),
            ...(beeryVp ? { vp: beeryVp as BeeryNormResult } : {}),
            ...(beeryMc ? { mc: beeryMc as BeeryNormResult } : {}),
          }
        : undefined;

    const meta: AssessmentMeta = {
      grading: {
        triageStatus: grading.triageStatus,
        recommendedLevel: grading.recommendedLevel as CapabilityLevel,
        recommendedLevelLabel: grading.recommendedLevelLabel,
        clinicalBottleneckAnalysis: grading.clinicalBottleneckAnalysis,
        radarSixDimensions: grading.radarSixDimensions,
        recommendedSopCardCodes: grading.recommendedSopCardCodes,
      },
      ...(beeryMeta ? { beery: beeryMeta } : {}),
      ...(tvps4
        ? {
            tvps4: {
              scaledScores: tvps4.scaledScores as Record<string, number>,
              overallStandardScore: tvps4.overallStandardScore,
              overallPercentile: tvps4.overallPercentile,
              weakestSubtests: tvps4.weakestSubtests,
            },
          }
        : {}),
      ...(dem ? { dem } : {}),
      inputs: {
        quadrupedHoldSec,
        spsrcSensoryStable,
        ...(classroomCopyAccuracyPct !== undefined
          ? { classroomCopyAccuracyPct }
          : {}),
        nsucoMinScore: clampedNsuco,
        tvpsOverallStdScore: tvpsGradingStd ?? 100,
        beeryVmiStdScore: beeryVmiStd ?? 100,
        ...(beeryVpStd !== undefined ? { beeryVpStdScore: beeryVpStd } : {}),
        ...(beeryMcStd !== undefined ? { beeryMcStdScore: beeryMcStd } : {}),
      },
      raw: {
        ...(dto.beeryVmiRaw !== undefined
          ? { beeryVmiRaw: dto.beeryVmiRaw }
          : {}),
        ...(dto.beeryVpRaw !== undefined
          ? { beeryVpRaw: dto.beeryVpRaw }
          : {}),
        ...(dto.beeryMcRaw !== undefined
          ? { beeryMcRaw: dto.beeryMcRaw }
          : {}),
        ...(dto.tvps4RawScores
          ? { tvps4RawScores: dto.tvps4RawScores as Tvps4RawScores }
          : {}),
        ...(dto.demRaw ? { demRaw: dto.demRaw } : {}),
        ...(dto.nsucoScore ? { nsucoScore: dto.nsucoScore } : {}),
      },
    };

    return {
      autoLevel: grading.recommendedLevel as CapabilityLevel,
      beeryVmiStd,
      beeryVpStd,
      beeryMcStd,
      tvps4Std,
      demNormTier,
      radarScoresJson: JSON.stringify(radarPayload),
      assessmentMetaJson: JSON.stringify(meta),
    };
  }

  private monthsBetween(birthDate: Date, now = new Date()): number {
    let months =
      (now.getFullYear() - birthDate.getFullYear()) * 12 +
      (now.getMonth() - birthDate.getMonth());
    if (now.getDate() < birthDate.getDate()) {
      months -= 1;
    }
    return Math.max(0, months);
  }
}
