import { IsOptional, IsString } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  studentId!: string;

  /** 星期键或日期键，如 Mon / 2026-10-20 */
  @IsOptional()
  @IsString()
  date?: string;

  /** 时间点，如 09:00 */
  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  sopCardId?: string;
}
