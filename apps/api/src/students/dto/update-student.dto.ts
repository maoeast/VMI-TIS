import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const TRIAGE_STATUSES = [
  'PENDING_SCREENING',
  'RED_ZONE_LOCKED',
  'REFERRAL_UPLOADED',
  'GREEN_ACTIVE',
];
const PROMOTION_STATUSES = ['IN_PROGRESS', 'PROMOTION_READY'];

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  schoolScene?: string;

  @IsOptional()
  @IsIn(LEVELS)
  currentLevel?: string;

  @IsOptional()
  @IsIn(TRIAGE_STATUSES)
  triageStatus?: string;

  @IsOptional()
  @IsIn(PROMOTION_STATUSES)
  promotionStatus?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  primaryTherapistId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chiefComplaint?: string;
}
