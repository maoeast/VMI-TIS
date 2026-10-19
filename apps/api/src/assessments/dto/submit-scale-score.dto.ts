import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EvalPhase } from '@vmi-tis/shared-types';

export class SubmitScaleScoreDto {
  @IsString()
  studentId!: string;

  @IsEnum(EvalPhase)
  evalPhase!: EvalPhase;

  /** 同一轮施测的会话标识；不传时按 studentId:evalPhase 归并 */
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  itemIndex?: number;

  /** 单题得分：0 或 1 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  score?: number;

  /** 开始新一轮施测时清空连续得分计数 */
  @IsOptional()
  @IsBoolean()
  reset?: boolean;

  @IsOptional()
  @IsInt()
  beeryVmiRaw?: number;

  @IsOptional()
  @IsInt()
  tvps4Std?: number;

  @IsOptional()
  @IsInt()
  mvpt3Std?: number;

  @IsOptional()
  @IsNumber()
  npcCm?: number;
}
