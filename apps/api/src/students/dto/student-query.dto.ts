import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const TRIAGE_STATUSES = [
  'PENDING_SCREENING',
  'RED_ZONE_LOCKED',
  'REFERRAL_UPLOADED',
  'GREEN_ACTIVE',
];
const PROMOTION_STATUSES = ['IN_PROGRESS', 'PROMOTION_READY'];

export class StudentQueryDto {
  @IsOptional()
  @IsIn(LEVELS)
  level?: string;

  @IsOptional()
  @IsIn(TRIAGE_STATUSES)
  triageStatus?: string;

  @IsOptional()
  @IsIn(PROMOTION_STATUSES)
  promotionStatus?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
