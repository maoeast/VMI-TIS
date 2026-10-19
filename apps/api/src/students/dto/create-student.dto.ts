import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateStudentDto as CreateStudentContract } from '@vmi-tis/shared-types';

export class CreateStudentDto implements CreateStudentContract {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  schoolScene!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  primaryTherapistId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chiefComplaint?: string;
}
