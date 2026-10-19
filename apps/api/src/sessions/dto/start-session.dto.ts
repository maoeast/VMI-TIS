import { IsDateString, IsOptional, IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  sopCardId?: string;

  @IsOptional()
  @IsString()
  therapistId?: string;

  @IsOptional()
  @IsDateString()
  sessionDate?: string;
}
