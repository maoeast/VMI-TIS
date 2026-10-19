import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogQueryParamsDto } from './audit-log-query.dto';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  query(@Query() query: AuditLogQueryParamsDto) {
    return this.auditLogService.query(query);
  }
}
