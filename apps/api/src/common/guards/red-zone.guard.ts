import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

const LOCKED_STATUSES = new Set(['RED_ZONE_LOCKED', 'REFERRAL_UPLOADED']);

/**
 * 规则 R1：红区熔断。
 * 排课 / 高负荷数字训练前置检查；RED_ZONE_LOCKED 与 REFERRAL_UPLOADED 均拒绝。
 */
@Injectable()
export class RedZoneGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as { studentId?: string } | undefined;
    const params = request.params as { studentId?: string } | undefined;
    const query = request.query as { studentId?: string } | undefined;
    const studentId = body?.studentId ?? params?.studentId ?? query?.studentId;

    if (!studentId) {
      return true;
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { triageStatus: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    if (LOCKED_STATUSES.has(student.triageStatus)) {
      throw new ForbiddenException(
        '触发先转介后训练红区保护，请先完成眼科专科处置与回执审核',
      );
    }

    return true;
  }
}
