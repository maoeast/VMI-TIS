import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { EvalPhase } from '@vmi-tis/shared-types';

export class NsucoScoreDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  pursuit!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  saccade!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  vergence?: number;
}

export class RadarScoresDto {
  @IsNumber()
  stabilize!: number;

  @IsNumber()
  efficiency!: number;

  @IsNumber()
  perception!: number;

  @IsNumber()
  integration!: number;

  @IsNumber()
  adaptation!: number;

  @IsNumber()
  transfer!: number;
}

export class CreateAssessmentRecordDto {
  @IsString()
  studentId!: string;

  @IsEnum(EvalPhase)
  evalPhase!: EvalPhase;

  @IsOptional()
  @IsString()
  acuityLeft?: string;

  @IsOptional()
  @IsString()
  acuityRight?: string;

  @IsOptional()
  @IsString()
  refractionStatus?: string;

  @IsOptional()
  @IsNumber()
  accomAmplitudeD?: number;

  @IsOptional()
  @IsNumber()
  accomFacilityCpm?: number;

  @IsOptional()
  @IsNumber()
  npcCm?: number;

  @IsOptional()
  @IsString()
  binocularTier?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NsucoScoreDto)
  nsucoScore?: NsucoScoreDto;

  @IsOptional()
  @IsInt()
  beeryVmiRaw?: number;

  @IsOptional()
  @IsInt()
  beeryVmiStd?: number;

  @IsOptional()
  @IsInt()
  beeryVpStd?: number;

  @IsOptional()
  @IsInt()
  beeryMcStd?: number;

  @IsOptional()
  @IsInt()
  tvps4Std?: number;

  @IsOptional()
  @IsInt()
  mvpt3Std?: number;

  @IsOptional()
  @IsString()
  demNormTier?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RadarScoresDto)
  radarScores?: RadarScoresDto;

  /** 身体稳定/前庭本体评估是否达标；未传时按达标处理 */
  @IsOptional()
  @IsBoolean()
  stabilityPass?: boolean;

  /** 课堂抄写/文具使用补充评估；false → L4 */
  @IsOptional()
  @IsBoolean()
  classroomAdaptationPass?: boolean;
}
