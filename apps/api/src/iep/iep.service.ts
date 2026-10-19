import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveIepPlanDto } from './dto/approve-iep-plan.dto';
import { CreateIepPlanDto } from './dto/create-iep-plan.dto';
import { UpdateIepPlanDto } from './dto/update-iep-plan.dto';
import { PromotionCheckService } from './promotion-check.service';

@Injectable()
export class IepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly promotionCheckService: PromotionCheckService,
  ) {}

  async create(dto: CreateIepPlanDto) {
    await this.ensureStudentExists(dto.studentId);

    const plan = await this.prisma.iepPlan.create({
      data: {
        studentId: dto.studentId,
        planPhase: 1,
        targetLevel: dto.targetLevel,
        weeklyFrequency: dto.weeklyFrequency,
        sessionMinutes: dto.sessionMinutes,
        digitalLimitMin: dto.digitalLimitMin,
        selectedCardsJson: JSON.stringify(dto.selectedCards),
        weeklyScheduleJson: JSON.stringify(dto.weeklySchedule),
        homeworkFrequency: dto.homeworkFrequency,
        status: 'ACTIVE',
      },
    });

    await this.auditLogService.log({
      action: AuditAction.CREATE_IEP,
      targetType: 'iep',
      targetId: plan.id,
      changesAfter: {
        studentId: dto.studentId,
        targetLevel: dto.targetLevel,
        selectedCards: dto.selectedCards,
      },
    });

    return plan;
  }

  async findAll(studentId?: string) {
    return this.prisma.iepPlan.findMany({
      where: studentId ? { studentId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, studentCode: true, name: true, currentLevel: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.iepPlan.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!plan) {
      throw new NotFoundException('IEP 计划不存在');
    }

    return plan;
  }

  async update(id: string, dto: UpdateIepPlanDto) {
    await this.ensurePlanExists(id);

    const plan = await this.prisma.iepPlan.update({
      where: { id },
      data: {
        ...(dto.weeklyFrequency !== undefined
          ? { weeklyFrequency: dto.weeklyFrequency }
          : {}),
        ...(dto.sessionMinutes !== undefined
          ? { sessionMinutes: dto.sessionMinutes }
          : {}),
        ...(dto.digitalLimitMin !== undefined
          ? { digitalLimitMin: dto.digitalLimitMin }
          : {}),
        ...(dto.homeworkFrequency !== undefined
          ? { homeworkFrequency: dto.homeworkFrequency }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.approvedBy !== undefined
          ? { approvedBy: dto.approvedBy, approvedAt: new Date() }
          : {}),
      },
    });

    await this.auditLogService.log({
      action: AuditAction.UPDATE_IEP,
      targetType: 'iep',
      targetId: id,
      changesAfter: dto,
    });

    return plan;
  }

  async approve(id: string, dto: ApproveIepPlanDto) {
    await this.ensurePlanExists(id);

    const plan = await this.prisma.iepPlan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      action: AuditAction.UPDATE_IEP,
      targetType: 'iep',
      targetId: id,
      changesAfter: {
        status: 'ACTIVE',
        approvedBy: dto.approvedBy,
      },
    });

    return plan;
  }

  async checkPromotion(studentId: string) {
    return this.promotionCheckService.checkPromotionCriteria(studentId);
  }

  async approvePromotion(studentId: string, approvedBy: string) {
    return this.promotionCheckService.approvePromotion(
      studentId,
      approvedBy,
    );
  }

  private async ensureStudentExists(studentId: string): Promise<void> {
    const count = await this.prisma.student.count({
      where: { id: studentId },
    });
    if (count === 0) {
      throw new NotFoundException('学生不存在');
    }
  }

  private async ensurePlanExists(id: string): Promise<void> {
    const count = await this.prisma.iepPlan.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('IEP 计划不存在');
    }
  }
}
