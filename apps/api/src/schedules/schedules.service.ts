import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

export interface PrecheckResult {
  allowed: boolean;
  studentId: string;
  weeklySchedule: Record<string, string[]> | null;
  slotFound: boolean | null;
  message: string;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 排课前置校验。
   * 真正的红区 403 由 RedZoneGuard 拦截；这里负责校验 IEP 周课表是否存在，
   * 并在给出 date/time 时检查该时段是否已排入计划。
   */
  async precheck(dto: CreateScheduleDto): Promise<PrecheckResult> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const iepPlan = await this.prisma.iepPlan.findFirst({
      where: { studentId: dto.studentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!iepPlan) {
      return {
        allowed: true,
        studentId: dto.studentId,
        weeklySchedule: null,
        slotFound: null,
        message: '未创建 ACTIVE IEP，已通过红区校验',
      };
    }

    const weeklySchedule = this.parseWeeklySchedule(
      iepPlan.weeklyScheduleJson,
    );

    const slotFound =
      dto.date && dto.time
        ? (weeklySchedule[dto.date] ?? []).includes(dto.time)
        : null;

    return {
      allowed: true,
      studentId: dto.studentId,
      weeklySchedule,
      slotFound,
      message:
        slotFound === null
          ? '已通过红区校验与 IEP 存在性检查'
          : slotFound
            ? '该时段已在 IEP 周课表中'
            : '该时段不在 IEP 周课表中，可继续创建排课',
    };
  }

  async getSchedule(studentId: string) {
    const iepPlan = await this.prisma.iepPlan.findFirst({
      where: { studentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!iepPlan) {
      throw new NotFoundException('该学生没有 ACTIVE IEP 计划');
    }

    return {
      studentId,
      iepPlanId: iepPlan.id,
      weeklySchedule: this.parseWeeklySchedule(iepPlan.weeklyScheduleJson),
    };
  }

  private parseWeeklySchedule(value: string): Record<string, string[]> {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string[]>;
      }
    } catch {
      // 周课表损坏时返回空表，排课前置校验仍可继续。
    }
    return {};
  }
}
