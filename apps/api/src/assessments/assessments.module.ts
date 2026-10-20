import { Module } from '@nestjs/common';
import { AssessmentGradingService } from './assessment-grading.service';
import { AssessmentRecordController } from './assessment-record.controller';
import { AssessmentRecordService } from './assessment-record.service';
import { ReportService } from './report.service';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';

@Module({
  controllers: [TriageController, AssessmentRecordController],
  providers: [
    TriageService,
    AssessmentRecordService,
    AssessmentGradingService,
    ReportService,
  ],
  exports: [TriageService, AssessmentRecordService],
})
export class AssessmentsModule {}
