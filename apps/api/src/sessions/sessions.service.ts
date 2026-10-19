import {
  BadRequestException,
  ConflictException,
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

    // 训练入口统一要求绿区：红区、回执待审核、待初筛均不得开始训练。
    this.assertTrainingAllowed(student.triageStatus);

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
    this.assertTrainingAllowed(session.student.triageStatus);

    if (session.isFinished) {
      throw new BadRequestException('本次课已结课，不能继续记分');
    }

    const digitalDelta = dto.digitalSeconds ?? 0;
    const nextDigitalDurationSec = session.digitalDurationSec + digitalDelta;

    if (
      dto.isDigital &&
      (session.digitalDurationSec >= DIGITAL_LIMIT_SEC ||
        nextDigitalDurationSec > DIGITAL_LIMIT_SEC)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          '本次课数字训练时长将达到 15 分钟上限，请切换至实体操作卡训练',
        remainingQuotaSec: Math.max(
          0,
          DIGITAL_LIMIT_SEC - session.digitalDurationSec,
        ),
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
    const digitalDurationSec = Math.min(
      DIGITAL_LIMIT_SEC,
      nextDigitalDurationSec,
    );

    // 以旧 trialsJson 作为乐观锁条件：并发追加时只有一个请求能成功，
    // 另一个得到 409，不会互相覆盖或算错正确率。
    const updateResult = await this.prisma.trainingSession.updateMany({
      where: {
        id,
        trialsJson: session.trialsJson,
        isFinished: false,
      },
      data: {
        trialsJson: JSON.stringify(trials),
        accuracyRate,
        digitalDurationSec,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictException('本次课次已被其他请求更新，请刷新后重试');
    }

    const updated = await this.prisma.trainingSession.findUniqueOrThrow({
      where: { id },
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
    this.assertTrainingAllowed(session.student.triageStatus);

    // 累计值硬顶 900 秒，不允许同步接口把额度写成 990。
    const digitalDurationSec = Math.min(
      DIGITAL_LIMIT_SEC,
      session.digitalDurationSec + Math.max(0, dto.seconds),
    );

    const updateResult = await this.prisma.trainingSession.updateMany({
      where: { id, digitalDurationSec: session.digitalDurationSec },
      data: { digitalDurationSec },
    });

    if (updateResult.count === 0) {
      throw new ConflictException('数字训练时长已被其他请求更新，请重试');
    }

    const updated = await this.prisma.trainingSession.findUniqueOrThrow({
      where: { id },
    });

    return {
      session: updated,
      digitalDurationSec,
      remainingQuotaSec: Math.max(0, DIGITAL_LIMIT_SEC - digitalDurationSec),
      locked: digitalDurationSec >= DIGITAL_LIMIT_SEC,
    };
  }

  async resetDigitalLimit(id: string, authorizationCode: string) {
    const expectedCode = process.env.DIGITAL_RESET_CODE ?? '0808';
    if (authorizationCode !== expectedCode) {
      throw new ForbiddenException('教师授权码错误，无法重置数字训练额度');
    }

    const session = await this.findOne(id);

    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: { digitalDurationSec: 0 },
    });

    await this.auditLogService.log({
      action: AuditAction.RESET_DIGITAL_LIMIT,
      targetType: 'session',
      targetId: id,
      changesBefore: { digitalDurationSec: session.digitalDurationSec },
      changesAfter: {
        digitalDurationSec: 0,
        authorizedBy: 'teacher-authorized',
      },
    });

    return {
      session: updated,
      digitalDurationSec: 0,
      remainingQuotaSec: DIGITAL_LIMIT_SEC,
    };
  }

  async digitalStart(id: string) {
    const session = await this.findOne(id);
    this.assertTrainingAllowed(session.student.triageStatus);
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

  private assertTrainingAllowed(triageStatus: string): void {
    if (triageStatus === 'GREEN_ACTIVE') {
      return;
    }

    const pending = triageStatus === 'PENDING_SCREENING';
    throw new ForbiddenException({
      statusCode: 403,
      message: pending
        ? '学生尚未完成入案初筛，暂不能开始训练'
        : '学生处于红区/回执待审核状态，禁止开始训练',
      code: pending ? 'TRIAGE_PENDING' : 'RED_ZONE_LOCKED',
    });
  }

  private async findCardForLevel(level: string) {
    const exact = await this.prisma.sopCard.findFirst({
      where: { cardLevel: level },
      orderBy: { cardCode: 'asc' },
    });

    if (exact) {
      return exact;
    }

    // 契约库没有 L4 专属卡：把 L4 放进逻辑层级表，
    // 先向下取最近层级（L4 → L3），再向上取。
    const order = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
    const index = order.indexOf(level);

    for (let cursor = index; cursor >= 0; cursor -= 1) {
      const card = await this.prisma.sopCard.findFirst({
        where: { cardLevel: order[cursor] },
        orderBy: { cardCode: 'asc' },
      });
      if (card) return card;
    }

    for (let cursor = Math.max(index + 1, 0); cursor < order.length; cursor += 1) {
      const card = await this.prisma.sopCard.findFirst({
        where: { cardLevel: order[cursor] },
        orderBy: { cardCode: 'asc' },
      });
      if (card) return card;
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
