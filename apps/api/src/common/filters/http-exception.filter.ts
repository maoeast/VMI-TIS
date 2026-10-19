import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 统一异常响应格式。
 * 红区熔断的 403 额外带 code=RED_ZONE_LOCKED，便于前端区分普通权限错误。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: '服务器内部错误' };

    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray((payload as { message?: unknown }).message)
          ? ((payload as { message: unknown[] }).message.join('; ') as string)
          : String((payload as { message?: unknown }).message ?? '请求失败');

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status === HttpStatus.FORBIDDEN && message.includes('红区')) {
      body.code = 'RED_ZONE_LOCKED';
    }

    response.status(status).json(body);
  }
}
