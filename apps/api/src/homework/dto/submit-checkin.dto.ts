import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitCheckinDto {
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  videoDurationSec?: number;

  @IsOptional()
  @IsString()
  parentNote?: string;
}
