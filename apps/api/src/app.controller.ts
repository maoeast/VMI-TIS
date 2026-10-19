import { Controller, Get } from '@nestjs/common';
import { databaseModeLabel } from './config/database.config';

/**
 * 基础健康检查端点。
 * 全局前缀 /api 生效后，实际路由为 GET /api/health。
 */
@Controller()
export class AppController {
  @Get('health')
  getHealth(): {
    status: string;
    service: string;
    database: string;
    timestamp: string;
    uptimeSec: number;
  } {
    return {
      status: 'ok',
      service: 'vmi-tis-api',
      database: databaseModeLabel(),
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    };
  }
}
