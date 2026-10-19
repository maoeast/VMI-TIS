import { IsInt, Min } from 'class-validator';

export class DigitalDurationDto {
  @IsInt()
  @Min(0)
  seconds!: number;
}
