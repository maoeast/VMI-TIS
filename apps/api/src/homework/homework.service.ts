import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { AuditAction } from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { ParentMessageDto } from './dto/parent-message.dto';
import { ReplyCheckinDto } from './dto/reply-checkin.dto';
import { SubmitCheckinDto } from './dto/submit-checkin.dto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class HomeworkService {
  private readonly uploadsDir = resolve(__dirname, '../../data/uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(studentId?: string, status?: string) {
    return this.prisma.homeworkCheckin.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { assignedDate: 'desc' },
      take: 100,
      include: {
        student: { select: { id: true, name: true, studentCode: true } },
      },
    });
  }

  async findOne(id: string) {
    const checkin = await this.prisma.homeworkCheckin.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, studentCode: true } },
      },
    });

    if (!checkin) {
      throw new NotFoundException('家庭作业记录不存在');
    }

    return checkin;
  }

  async create(dto: CreateHomeworkDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const assignedDate = dto.assignedDate
      ? new Date(dto.assignedDate)
      : new Date();
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000);

    const checkin = await this.prisma.homeworkCheckin.create({
      data: {
        studentId: dto.studentId,
        taskName: dto.taskName,
        assignedDate,
        dueDate,
        status: 'PENDING',
      },
    });

    await this.auditLogService.log({
      action: AuditAction.CREATE_HOMEWORK,
      targetType: 'homework',
      targetId: checkin.id,
      changesAfter: {
        studentId: dto.studentId,
        taskName: dto.taskName,
        dueDate,
      },
    });

    return checkin;
  }

  async submitCheckin(id: string, dto: SubmitCheckinDto) {
    const checkin = await this.findOne(id);
    const now = new Date();

    const updated = await this.prisma.homeworkCheckin.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        submittedAt: now,
        scheduledDeleteAt: new Date(now.getTime() + SEVEN_DAYS_MS),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.videoDurationSec !== undefined
          ? { videoDurationSec: dto.videoDurationSec }
          : {}),
        ...(dto.parentNote !== undefined
          ? { parentNote: dto.parentNote }
          : {}),
      },
    });

    await this.auditLogService.log({
      action: AuditAction.SUBMIT_CHECKIN,
      targetType: 'homework',
      targetId: id,
      changesAfter: {
        status: 'COMPLETED',
        studentId: checkin.studentId,
      },
    });

    return updated;
  }

  async reply(id: string, dto: ReplyCheckinDto) {
    await this.findOne(id);

    const updated = await this.prisma.homeworkCheckin.update({
      where: { id },
      data: { teacherReply: dto.teacherReply, repliedAt: new Date() },
    });

    await this.auditLogService.log({
      action: AuditAction.REPLY_CHECKIN,
      targetType: 'homework',
      targetId: id,
      changesAfter: { teacherReply: dto.teacherReply },
    });

    return updated;
  }

  async sendParentMessage(id: string, dto: ParentMessageDto) {
    await this.findOne(id);

    const updated = await this.prisma.homeworkCheckin.update({
      where: { id },
      data: { parentNote: dto.message },
    });

    await this.auditLogService.log({
      action: AuditAction.REPLY_CHECKIN,
      targetType: 'homework',
      targetId: id,
      changesAfter: { parentNote: dto.message },
    });

    return updated;
  }

  /**
   * 7 天过期视频清理：只删除 apps/api/data/uploads 下的本地文件，
   * 保留打卡文本与教师点评；远程 URL 仅标记 videoDeletedAt。
   */
  async cleanExpiredVideos() {
    const now = new Date();
    const expired = await this.prisma.homeworkCheckin.findMany({
      where: {
        scheduledDeleteAt: { not: null, lte: now },
        videoDeletedAt: null,
        videoUrl: { not: null },
      },
    });

    let cleaned = 0;
    let deletedFiles = 0;

    for (const checkin of expired) {
      if (checkin.videoUrl) {
        const localPath = this.resolveLocalUpload(checkin.videoUrl);
        if (localPath && existsSync(localPath)) {
          try {
            unlinkSync(localPath);
            deletedFiles += 1;
          } catch {
            // 文件被占用或权限不足时保留文件，但记录已过期标记。
          }
        }
      }

      await this.prisma.homeworkCheckin.update({
        where: { id: checkin.id },
        data: { videoDeletedAt: now },
      });
      cleaned += 1;
    }

    await this.auditLogService.log({
      action: AuditAction.CRON_CLEAN_VIDEOS,
      targetType: 'homework',
      targetId: 'batch',
      changesAfter: { scanned: expired.length, cleaned, deletedFiles },
    });

    return { scanned: expired.length, cleaned, deletedFiles };
  }

  private resolveLocalUpload(videoUrl: string): string | null {
    const fileName = videoUrl.split('/').pop();
    if (!fileName || fileName.includes('..')) {
      return null;
    }
    return resolve(this.uploadsDir, fileName);
  }
}
