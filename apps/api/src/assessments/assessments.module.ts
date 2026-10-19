import { Module } from '@nestjs/common';
import { AssessmentRecordController } from './assessment-record.controller';
import { AssessmentRecordService } from './assessment-record.service';
import { AutoLevelService } from './auto-level.service';
import { ReportService } from './report.service';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';

@Module({
  controllers: [TriageController, AssessmentRecordController],
  providers: [
    TriageService,
    AssessmentRecordService,
    AutoLevelService,
    ReportService,
  ],
  exports: [TriageService, AssessmentRecordService, AutoLevelService],
})
export class AssessmentsModule {}
