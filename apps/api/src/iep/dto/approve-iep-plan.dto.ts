import { IsString } from 'class-validator';

export class ApproveIepPlanDto {
  @IsString()
  approvedBy!: string;
}
