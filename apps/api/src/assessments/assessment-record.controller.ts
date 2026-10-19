import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AssessmentRecordService } from './assessment-record.service';
import { AssessmentRecordQueryDto } from './dto/assessment-record-query.dto';
import { CreateAssessmentRecordDto } from './dto/create-assessment-record.dto';
import { SubmitScaleScoreDto } from './dto/submit-scale-score.dto';

@Controller('assessments')
export class AssessmentRecordController {
  constructor(
    private readonly assessmentRecordService: AssessmentRecordService,
  ) {}

  @Post('scale-score')
  submitScaleScore(@Body() dto: SubmitScaleScoreDto) {
    return this.assessmentRecordService.submitScaleScore(dto);
  }

  @Post('records')
  create(@Body() dto: CreateAssessmentRecordDto) {
    return this.assessmentRecordService.create(dto);
  }

  @Get(':studentId/records')
  findByStudent(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Query() query: AssessmentRecordQueryDto,
  ) {
    return this.assessmentRecordService.findByStudent(studentId, query);
  }

  @Post(':id/generate-report')
  generateReport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.assessmentRecordService.generateReport(id);
  }
}
