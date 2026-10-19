import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RecordTrialDto {
  @IsIn(['pass', 'fail'])
  result!: 'pass' | 'fail';

  @IsInt()
  @Min(1)
  @Max(5)
  promptLevel!: number;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  digitalSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isDigital?: boolean;
}
