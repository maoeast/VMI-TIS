import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 规则 R1：红区熔断 / 训练前置检查。
 * 只有 GREEN_ACTIVE 放行；PENDING_SCREENING、RED_ZONE_LOCKED、
 * REFERRAL_UPLOADED 均拒绝排课与高负荷数字训练。
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

    if (student.triageStatus !== 'GREEN_ACTIVE') {
      const pending = student.triageStatus === 'PENDING_SCREENING';
      throw new ForbiddenException({
        statusCode: 403,
        message: pending
          ? '学生尚未完成入案初筛，暂不能排课/训练'
          : '触发先转介后训练红区保护，请先完成眼科专科处置与回执审核',
        code: pending ? 'TRIAGE_PENDING' : 'RED_ZONE_LOCKED',
      });
    }

    return true;
  }
}
