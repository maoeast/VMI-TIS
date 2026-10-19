import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReferralAuditStatus } from '@vmi-tis/shared-types';

export class AuditReferralDto {
  @IsString()
  referralId!: string;

  @IsEnum(ReferralAuditStatus)
  auditStatus!: ReferralAuditStatus;

  @IsString()
  auditedBy!: string;

  @IsOptional()
  @IsString()
  hospitalDiagnosis?: string;
}
