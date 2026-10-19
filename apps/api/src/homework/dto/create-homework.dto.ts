import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  studentId!: string;

  @IsString()
  taskName!: string;

  @IsOptional()
  @IsDateString()
  assignedDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  durationMin?: number;
}
