import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmotionStatus } from '@vmi-tis/shared-types';

export class FinishSessionDto {
  @IsOptional()
  @IsString()
  therapistNotes?: string;

  @IsOptional()
  @IsEnum(EmotionStatus)
  emotionStatus?: EmotionStatus;
}
