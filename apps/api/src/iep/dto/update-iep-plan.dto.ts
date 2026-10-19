import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IepPlanStatus } from '@vmi-tis/shared-types';

export class UpdateIepPlanDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weeklyFrequency?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  sessionMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
  digitalLimitMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  homeworkFrequency?: number;

  @IsOptional()
  @IsEnum(IepPlanStatus)
  status?: IepPlanStatus;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
