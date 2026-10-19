import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * 学生档案通用更新只允许基础资料字段。
 * 层级、分流状态、晋级状态分别由评估定级、红区/回执审核、晋级审批流程写入，
 * 不允许通过通用 PATCH 绕过状态机。
 */
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
