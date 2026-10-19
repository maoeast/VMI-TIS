import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analyticsService.overview();
  }

  @Get('student/:id')
  student(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.analyticsService.studentAnalytics(id);
  }
}
