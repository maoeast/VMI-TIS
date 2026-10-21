import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analyticsService.overview();
  }

  /**
   * 科研 CSV 导出：浏览器直接下载（Content-Disposition），默认脱敏。
   * 显式写响应头，避免被 Nest 的 JSON 序列化改写 CSV 正文。
   */
  @Get('export-csv')
  async exportCsv(@Res() res: Response): Promise<void> {
    const { filename, csv } = await this.analyticsService.exportAssessmentCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('student/:id')
  student(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.analyticsService.studentAnalytics(id);
  }
}
