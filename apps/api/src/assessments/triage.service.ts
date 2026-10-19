import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  ReferralAuditStatus,
} from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditReferralDto } from './dto/audit-referral.dto';
import { BehaviorItemDto, SubmitTriageDto } from './dto/submit-triage.dto';
import { UploadReferralDto } from './dto/upload-referral.dto';

interface RedZoneRule {
  label: string;
  keywords: string[];
  matches: (score: number) => boolean;
}

const RED_ZONE_RULES: RedZoneRule[] = [
  {
    label: '屈光参差 ≥ 2.00D',
    keywords: ['屈光参差'],
    matches: (score) => score >= 2.0,
  },
  {
    label: '斜视阳性',
    keywords: ['斜视', '外隐斜', '内隐斜', '上下斜视'],
    matches: (score) => score > 0,
  },
  {
    label: '遮盖试验异常',
    keywords: ['遮盖'],
    matches: (score) => score > 0,
  },
  {
    label: '复视/重影',
    keywords: ['复视', '重影'],
    matches: (score) => score > 0,
  },
  {
    label: '眼球震颤',
    keywords: ['眼球震颤', '震颤'],
    matches: (score) => score > 0,
  },
  {
    label: '视力异常/屈光不正',
    keywords: ['裸眼视力', '视力', '屈光不正'],
    matches: (score) => score > 0,
  },
];

@Injectable()
export class TriageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async submitTriage(dto: SubmitTriageDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const redZoneItems = this.detectRedZone(dto.behaviorItems);
    const isRedZone = redZoneItems.length > 0;
    const referralCode = isRedZone
      ? await this.generateReferralCode()
      : null;

    const referral = await this.prisma.assessmentTriageReferral.create({
      data: {
        studentId: dto.studentId,
        behaviorItemsJson: JSON.stringify(dto.behaviorItems),
        redZoneItemsJson: JSON.stringify(redZoneItems),
        isRedZone,
        referralCode,
        auditStatus: isRedZone ? 'PENDING' : 'APPROVED',
      },
    });

    await this.prisma.student.update({
      where: { id: dto.studentId },
      data: {
        triageStatus: isRedZone ? 'RED_ZONE_LOCKED' : 'GREEN_ACTIVE',
      },
    });

    await this.auditLogService.log({
      action: isRedZone
        ? AuditAction.RED_ZONE_LOCK
        : AuditAction.UPDATE_ASSESSMENT,
      targetType: 'student',
      targetId: dto.studentId,
      changesAfter: {
        triageStatus: isRedZone ? 'RED_ZONE_LOCKED' : 'GREEN_ACTIVE',
        redZoneItems,
      },
    });

    return referral;
  }

  async uploadReferral(dto: UploadReferralDto) {
    const referral = await this.findReferralOrThrow(dto.referralId);

    const updated = await this.prisma.assessmentTriageReferral.update({
      where: { id: dto.referralId },
      data: {
        hospitalName: dto.hospitalName,
        hospitalDiagnosis: dto.hospitalDiagnosis ?? null,
        receiptFileUrl: dto.receiptFileUrl ?? null,
        auditStatus: 'PENDING',
      },
    });

    await this.prisma.student.update({
      where: { id: referral.studentId },
      data: { triageStatus: 'REFERRAL_UPLOADED' },
    });

    await this.auditLogService.log({
      action: AuditAction.UPLOAD_REFERRAL,
      targetType: 'student',
      targetId: referral.studentId,
      changesAfter: {
        triageStatus: 'REFERRAL_UPLOADED',
        referralId: dto.referralId,
        hospitalName: dto.hospitalName,
      },
    });

    return updated;
  }

  async auditReferral(dto: AuditReferralDto) {
    const referral = await this.findReferralOrThrow(dto.referralId);

    if (dto.auditStatus === ReferralAuditStatus.PENDING) {
      // 审核动作只能是 APPROVED / REJECTED；PENDING 留给上传回执阶段。
      throw new NotFoundException('auditStatus 必须为 APPROVED 或 REJECTED');
    }

    const updated = await this.prisma.assessmentTriageReferral.update({
      where: { id: dto.referralId },
      data: {
        auditStatus: dto.auditStatus,
        auditedBy: dto.auditedBy,
        auditedAt: new Date(),
        ...(dto.hospitalDiagnosis !== undefined
          ? { hospitalDiagnosis: dto.hospitalDiagnosis }
          : {}),
      },
    });

    const approved = dto.auditStatus === ReferralAuditStatus.APPROVED;

    await this.prisma.student.update({
      where: { id: referral.studentId },
      data: {
        triageStatus: approved ? 'GREEN_ACTIVE' : 'RED_ZONE_LOCKED',
      },
    });

    await this.auditLogService.log({
      action: approved
        ? AuditAction.UNLOCK_RED_ZONE
        : AuditAction.RED_ZONE_LOCK,
      targetType: 'student',
      targetId: referral.studentId,
      changesAfter: {
        triageStatus: approved ? 'GREEN_ACTIVE' : 'RED_ZONE_LOCKED',
        referralId: dto.referralId,
        auditStatus: dto.auditStatus,
      },
    });

    return updated;
  }

  async findReferrals(studentId: string) {
    return this.prisma.assessmentTriageReferral.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private detectRedZone(items: BehaviorItemDto[]): string[] {
    const detected: string[] = [];

    for (const rule of RED_ZONE_RULES) {
      const matched = items.find((item) =>
        rule.keywords.some((keyword) => item.item.includes(keyword)),
      );

      if (matched && rule.matches(matched.score)) {
        detected.push(rule.label);
      }
    }

    return [...new Set(detected)];
  }

  private async generateReferralCode(): Promise<string> {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const count = await this.prisma.assessmentTriageReferral.count({
      where: { createdAt: { gte: startOfDay } },
    });

    return `REF-${date}-${String(count + 1).padStart(2, '0')}`;
  }

  private async findReferralOrThrow(referralId: string) {
    const referral = await this.prisma.assessmentTriageReferral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException('转介单不存在');
    }

    return referral;
  }
}
