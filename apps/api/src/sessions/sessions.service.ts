import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditAction,
  PromptLevel,
  TrialRecord,
} from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { DIGITAL_LIMIT_SEC } from '../common/guards/digital-limit.guard';
import { PromotionCheckService } from '../iep/promotion-check.service';
import { PrismaService } from '../prisma/prisma.service';
import { DigitalDurationDto } from './dto/digital-duration.dto';
import { FinishSessionDto } from './dto/finish-session.dto';
import { RecordTrialDto } from './dto/record-trial.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly promotionCheckService: PromotionCheckService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async start(dto: StartSessionDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const sopCard = dto.sopCardId
      ? await this.prisma.sopCard.findUnique({ where: { id: dto.sopCardId } })
      : await this.findCardForLevel(student.currentLevel);

    if (!sopCard) {
      throw new NotFoundException('未找到可用的操作卡');
    }

    const sessionNumber =
      (await this.prisma.trainingSession.count({
        where: { studentId: dto.studentId },
      })) + 1;

    const session = await this.prisma.trainingSession.create({
      data: {
        studentId: dto.studentId,
        sopCardId: sopCard.id,
        sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : new Date(),
        sessionNumber,
        currentStage: 1,
        trialsJson: '[]',
        accuracyRate: 0,
        digitalDurationSec: 0,
        therapistNotes: null,
        isFinished: false,
      },
      include: {
        student: {
          select: { id: true, studentCode: true, name: true, currentLevel: true },
        },
        sopCard: true,
      },
    });

    await this.auditLogService.log({
      action: AuditAction.CREATE_SESSION,
      targetType: 'session',
      targetId: session.id,
      changesAfter: {
        studentId: dto.studentId,
        sopCardId: sopCard.id,
        sessionNumber,
      },
    });

    return session;
  }

  async findAll(studentId?: string) {
    return this.prisma.trainingSession.findMany({
      where: studentId ? { studentId } : {},
      orderBy: { sessionDate: 'desc' },
      take: 100,
      include: {
        student: { select: { id: true, name: true, studentCode: true } },
        sopCard: { select: { id: true, cardCode: true, cardTitle: true } },
      },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
      include: { student: true, sopCard: true },
    });

    if (!session) {
      throw new NotFoundException('训练课次不存在');
    }

    return session;
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const session = await this.findOne(id);

    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: { currentStage: dto.stage },
    });

    this.eventEmitter.emit('session.stage.changed', {
      sessionId: id,
      studentId: session.studentId,
      stage: dto.stage,
    });

    await this.auditLogService.log({
      action: AuditAction.UPDATE_STAGE,
      targetType: 'session',
      targetId: id,
      changesBefore: { currentStage: session.currentStage },
      changesAfter: { currentStage: dto.stage },
    });

    return updated;
  }

  async recordTrial(id: string, dto: RecordTrialDto) {
    const session = await this.findOne(id);

    if (session.isFinished) {
      throw new BadRequestException('本次课已结课，不能继续记分');
    }

    if (dto.isDigital && session.digitalDurationSec >= DIGITAL_LIMIT_SEC) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          '本次课数字训练时长已达 15 分钟上限，请切换至实体操作卡训练',
        remainingQuotaSec: 0,
      });
    }

    const trials = this.parseTrials(session.trialsJson);
    const trial: TrialRecord = {
      result: dto.result,
      promptLevel: dto.promptLevel as PromptLevel,
      ...(dto.material ? { material: dto.material } : {}),
      ...(dto.digitalSeconds !== undefined
        ? { digitalSeconds: dto.digitalSeconds }
        : {}),
      timestamp: Date.now(),
    };
    trials.push(trial);

    const passCount = trials.filter((item) => item.result === 'pass').length;
    const accuracyRate = trials.length > 0 ? passCount / trials.length : 0;
    const digitalDurationSec =
      session.digitalDurationSec + (dto.digitalSeconds ?? 0);

    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: {
        trialsJson: JSON.stringify(trials),
        accuracyRate,
        digitalDurationSec,
      },
    });

    this.eventEmitter.emit('session.trial.recorded', {
      sessionId: id,
      studentId: session.studentId,
      trial,
      trialCount: trials.length,
      accuracyRate,
      digitalDurationSec,
    });

    await this.auditLogService.log({
      action: AuditAction.RECORD_TRIAL,
      targetType: 'session',
      targetId: id,
      changesAfter: {
        trial,
        trialCount: trials.length,
        accuracyRate,
      },
    });

    return {
      session: updated,
      trialCount: trials.length,
      accuracyRate,
      digitalDurationSec,
      remainingQuotaSec: Math.max(0, DIGITAL_LIMIT_SEC - digitalDurationSec),
    };
  }

  async addDigitalDuration(id: string, dto: DigitalDurationDto) {
    const session = await this.findOne(id);
    const digitalDurationSec = session.digitalDurationSec + dto.seconds;

    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: { digitalDurationSec },
    });

    return {
      session: updated,
      digitalDurationSec,
      remainingQuotaSec: Math.max(0, DIGITAL_LIMIT_SEC - digitalDurationSec),
      locked: digitalDurationSec >= DIGITAL_LIMIT_SEC,
    };
  }

  async digitalStart(id: string) {
    const session = await this.findOne(id);
    return {
      sessionId: id,
      allowed: session.digitalDurationSec < DIGITAL_LIMIT_SEC,
      digitalDurationSec: session.digitalDurationSec,
      remainingQuotaSec: Math.max(
        0,
        DIGITAL_LIMIT_SEC - session.digitalDurationSec,
      ),
    };
  }

  async finish(id: string, dto: FinishSessionDto) {
    const session = await this.findOne(id);

    if (session.isFinished) {
      const promotion =
        await this.promotionCheckService.checkPromotionCriteria(
          session.studentId,
        );
      return { session, promotion };
    }

    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: {
        isFinished: true,
        finishedAt: new Date(),
        ...(dto.therapistNotes !== undefined
          ? { therapistNotes: dto.therapistNotes }
          : {}),
        ...(dto.emotionStatus !== undefined
          ? { emotionStatus: dto.emotionStatus }
          : {}),
      },
    });

    const promotion =
      await this.promotionCheckService.checkPromotionCriteria(
        session.studentId,
      );

    this.eventEmitter.emit('session.finished', {
      sessionId: id,
      studentId: session.studentId,
      accuracyRate: updated.accuracyRate,
      promotion,
    });

    await this.auditLogService.log({
      action: AuditAction.FINISH_SESSION,
      targetType: 'session',
      targetId: id,
      changesAfter: {
        accuracyRate: updated.accuracyRate,
        promotionStatus: promotion.canPromote ? 'PROMOTION_READY' : undefined,
      },
    });

    return { session: updated, promotion };
  }

  private async findCardForLevel(level: string) {
    const exact = await this.prisma.sopCard.findFirst({
      where: { cardLevel: level },
      orderBy: { cardCode: 'asc' },
    });

    if (exact) {
      return exact;
    }

    return this.prisma.sopCard.findFirst({ orderBy: { cardCode: 'asc' } });
  }

  private parseTrials(value: string): TrialRecord[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as TrialRecord[]) : [];
    } catch {
      return [];
    }
  }
}
