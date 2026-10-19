import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export const DIGITAL_LIMIT_SEC = 900;

/**
 * 规则 R4：单次课数字训练累计 900 秒（15 分钟）硬锁。
 */
@Injectable()
export class DigitalLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.params?.id;

    if (!sessionId) {
      return true;
    }

    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: { digitalDurationSec: true },
    });

    if (!session) {
      throw new NotFoundException('训练课次不存在');
    }

    if (session.digitalDurationSec >= DIGITAL_LIMIT_SEC) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          '本次课数字训练时长已达 15 分钟上限，请切换至实体操作卡训练',
        remainingQuotaSec: 0,
      });
    }

    return true;
  }
}
