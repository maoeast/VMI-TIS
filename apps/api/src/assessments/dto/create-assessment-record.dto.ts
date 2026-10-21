import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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

export class Tvps4RawScoresDto {
  @IsInt()
  @Min(0)
  @Max(18)
  DIS!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  MEM!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  SPA!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  CON!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  SEQ!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  FGR!: number;

  @IsInt()
  @Min(0)
  @Max(18)
  CLO!: number;
}

export class DemRawDto {
  @IsNumber()
  @Min(0)
  testAVerticalSec!: number;

  @IsNumber()
  @Min(0)
  testBVerticalSec!: number;

  @IsNumber()
  @Min(0)
  testCHorizontalRawSec!: number;

  @IsInt()
  @Min(0)
  omissionErrors!: number;

  @IsInt()
  @Min(0)
  additionErrors!: number;
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
  @Min(0)
  @Max(30)
  beeryVmiRaw?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  beeryVmiStd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  beeryVpStd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  beeryMcStd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  beeryVpRaw?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  beeryMcRaw?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => Tvps4RawScoresDto)
  tvps4RawScores?: Tvps4RawScoresDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DemRawDto)
  demRaw?: DemRawDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  tvps4Std?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  mvpt3Std?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(45)
  mvpt4RawScore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(45)
  @ArrayMaxSize(45)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  mvpt4ItemScores45?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  mvpt4Std?: number;

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

  /** 四点爬行/前庭本体稳定维持秒数；缺省按 stabilityPass 兼容映射 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  quadrupedHoldSec?: number;

  /** 课堂抄写正确率（0–100）；低于 85 时定级函数会降到 L4 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  classroomCopyAccuracyPct?: number;
}
