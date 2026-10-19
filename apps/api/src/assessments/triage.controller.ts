import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuditReferralDto } from './dto/audit-referral.dto';
import { SubmitTriageDto } from './dto/submit-triage.dto';
import { UploadReferralDto } from './dto/upload-referral.dto';
import { TriageService } from './triage.service';

@Controller('assessments')
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post('triage')
  submitTriage(@Body() dto: SubmitTriageDto) {
    return this.triageService.submitTriage(dto);
  }

  @Post('referral-upload')
  uploadReferral(@Body() dto: UploadReferralDto) {
    return this.triageService.uploadReferral(dto);
  }

  @Post('referral-audit')
  auditReferral(@Body() dto: AuditReferralDto) {
    return this.triageService.auditReferral(dto);
  }

  @Get('referrals/:studentId')
  findReferrals(@Param('studentId') studentId: string) {
    return this.triageService.findReferrals(studentId);
  }
}
