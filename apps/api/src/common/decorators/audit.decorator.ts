import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@vmi-tis/shared-types';

export const AUDIT_METADATA_KEY = 'vmi:audit';

export interface AuditMetadata {
  action: AuditAction;
  targetType: string;
}

/**
 * 标记需要自动写入 audit_logs 的路由。
 * 仅对 POST / PATCH / PUT / DELETE 生效，避免读请求产生日志。
 */
export const Audit = (metadata: AuditMetadata): MethodDecorator =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
