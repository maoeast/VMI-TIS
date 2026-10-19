import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  AUDIT_METADATA_KEY,
  AuditMetadata,
} from '../decorators/audit.decorator';
import { AuditLogService, actorFromRequest } from '../audit/audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * 对标记了 @Audit(...) 的修改型路由自动记录审计日志。
 * 领域服务（如红区熔断、晋级触发）会自行记录更细的业务日志，
 * 这里只覆盖学生档案 CRUD / Excel 导入等通用写操作。
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<Request>();

    if (!metadata || !MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        const record = response as { id?: string } | undefined;
        const targetId =
          record?.id ??
          (request.params?.id as string | undefined) ??
          ((request.body as { studentId?: string } | undefined)?.studentId ??
            'batch');

        try {
          await this.auditLogService.log({
            actor: actorFromRequest(request),
            action: metadata.action,
            targetType: metadata.targetType,
            targetId,
            changesAfter: summarizeAuditPayload(response, request),
          });
        } catch (error) {
          // 审计失败不应吞掉已经成功的业务写入，但必须留下可排查的痕迹。
          // eslint-disable-next-line no-console
          console.error('[audit] 写入审计日志失败:', error);
        }

        return response;
      }),
    );
  }
}

/**
 * 审计只保留必要标识、状态变化与字段名，避免把姓名、电话、主诉等
 * 完整档案快照复制进 audit_logs。
 */
function summarizeAuditPayload(
  response: unknown,
  request: Request,
): Record<string, unknown> {
  const record =
    response && typeof response === 'object' && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : {};
  const body =
    request.body &&
    typeof request.body === 'object' &&
    !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : {};

  return {
    id: record.id,
    studentCode: record.studentCode,
    currentLevel: record.currentLevel,
    triageStatus: record.triageStatus,
    promotionStatus: record.promotionStatus,
    imported: record.imported,
    failed: record.failed,
    deleted: record.deleted,
    changedFields: Object.keys(body),
  };
}
