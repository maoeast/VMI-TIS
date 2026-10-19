import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  AuditAction,
  AuditLog,
  AuditLogQueryDto,
  UserRole,
} from '@vmi-tis/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { getAuditActor } from './audit-context';

export interface AuditActor {
  userId: string;
  userName: string;
  userRole: UserRole;
  ipAddress?: string;
}

export interface AuditEntry {
  actor?: Partial<AuditActor>;
  action: AuditAction;
  targetType: string;
  targetId: string;
  changesBefore?: unknown;
  changesAfter?: unknown;
}

const DEFAULT_ACTOR: AuditActor = {
  userId: 'system',
  userName: '系统',
  userRole: UserRole.ADMIN,
};

/**
 * 从请求头读取操作者信息。
 * 单机版没有登录系统，前端可通过 x-user-* 头传入当前治疗师身份。
 */
export function actorFromRequest(request: Request): AuditActor {
  const header = (name: string): string | undefined => {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const role = header('x-user-role') as UserRole | undefined;

  return {
    userId: decodeHeader(header('x-user-id')) ?? DEFAULT_ACTOR.userId,
    userName: decodeHeader(header('x-user-name')) ?? DEFAULT_ACTOR.userName,
    userRole: role ?? DEFAULT_ACTOR.userRole,
    ipAddress: request.ip,
  };
}

function decodeHeader(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    const actor: AuditActor = {
      ...DEFAULT_ACTOR,
      ...(getAuditActor() ?? {}),
      ...entry.actor,
    };

    await this.prisma.auditLog.create({
      data: {
        userId: actor.userId,
        userName: actor.userName,
        userRole: actor.userRole,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        changesBeforeJson:
          entry.changesBefore === undefined
            ? null
            : JSON.stringify(entry.changesBefore),
        changesAfterJson:
          entry.changesAfter === undefined
            ? null
            : JSON.stringify(entry.changesAfter),
        ipAddress: actor.ipAddress ?? null,
      },
    });
  }

  async query(params: {
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AuditLogQueryDto> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const where = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.targetType ? { targetType: params.targetType } : {}),
      ...(params.targetId ? { targetId: params.targetId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const logs = rows.map(
      (row) =>
        ({
          ...row,
          userRole: row.userRole as UserRole,
          action: row.action as AuditAction,
        }) as AuditLog,
    );

    return { logs, total, page, pageSize };
  }
}
