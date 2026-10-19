import { IsInt, Max, Min } from 'class-validator';

export class UpdateStageDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stage!: number;
}
