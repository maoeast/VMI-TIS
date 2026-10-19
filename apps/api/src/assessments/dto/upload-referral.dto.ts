import { IsOptional, IsString } from 'class-validator';

export class UploadReferralDto {
  @IsString()
  referralId!: string;

  @IsString()
  hospitalName!: string;

  @IsOptional()
  @IsString()
  hospitalDiagnosis?: string;

  @IsOptional()
  @IsString()
  receiptFileUrl?: string;
}
