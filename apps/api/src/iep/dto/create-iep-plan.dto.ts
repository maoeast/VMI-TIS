import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  CapabilityLevel,
  CreateIepPlanDto as CreateIepPlanContract,
} from '@vmi-tis/shared-types';

export class CreateIepPlanDto implements CreateIepPlanContract {
  @IsString()
  studentId!: string;

  @IsEnum(CapabilityLevel)
  targetLevel!: CapabilityLevel;

  @IsInt()
  @Min(1)
  @Max(7)
  weeklyFrequency!: number;

  @IsInt()
  @Min(10)
  @Max(120)
  sessionMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(15)
  digitalLimitMin!: number;

  @IsArray()
  @IsString({ each: true })
  selectedCards!: string[];

  @IsObject()
  weeklySchedule!: Record<string, string[]>;

  @IsInt()
  @Min(0)
  @Max(7)
  homeworkFrequency!: number;
}
