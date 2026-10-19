import { IsEnum, IsOptional } from 'class-validator';
import { EvalPhase } from '@vmi-tis/shared-types';

export class AssessmentRecordQueryDto {
  @IsOptional()
  @IsEnum(EvalPhase)
  evalPhase?: EvalPhase;
}
