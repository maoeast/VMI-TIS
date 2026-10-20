import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  RED_ZONE_TRIAGE_ITEMS,
  ReferralAuditStatus,
} from '@vmi-tis/shared-types';
import { AuditLogService } from '../common/audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditReferralDto } from './dto/audit-referral.dto';
import { SubmitTriageDto } from './dto/submit-triage.dto';
import { UploadReferralDto } from './dto/upload-referral.dto';

interface RedZoneRule {
  /** 命中的种子红区编码；转介单显示文案一律取种子 label。 */
  seedCode: string;
  keywords: string[];
  matches: (score: number) => boolean;
}

const RED_ZONE_SEED_BY_CODE = new Map(
  RED_ZONE_TRIAGE_ITEMS.map((item) => [item.code, item]),
);

const RED_ZONE_RULES: RedZoneRule[] = [
  {
    seedCode: 'RED_01',
    keywords: ['屈光参差'],
    matches: (score) => score >= 2.0,
  },
  {
    seedCode: 'RED_02',
    keywords: ['斜视', '外隐斜', '内隐斜', '上下斜视'],
    matches: (score) => score > 0,
  },
  {
    seedCode: 'RED_02',
    keywords: ['遮盖'],
    matches: (score) => score > 0,
  },
  {
    seedCode: 'RED_02',
    keywords: ['复视', '重影'],
    matches: (score) => score > 0,
  },
  {
    seedCode: 'RED_03',
    keywords: ['眼球震颤', '震颤'],
    matches: (score) => score > 0,
  },
  {
    seedCode: 'RED_01',
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
      select: { id: true, triageStatus: true },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const redZone = this.detectRedZone(dto);
    const isRedZone = redZone.codes.length > 0;
    const hasOpenRedZone =
      student.triageStatus === 'RED_ZONE_LOCKED' ||
      student.triageStatus === 'REFERRAL_UPLOADED';

    // 未闭环红区不得被一份新的空初筛直接解锁。
    if (!isRedZone && hasOpenRedZone) {
      throw new ConflictException(
        '存在未闭环红区转介，请先完成眼科回执审核，不能通过新的初筛直接解锁',
      );
    }

    const referral = isRedZone
      ? await this.upsertPendingRedZoneReferral(dto, redZone.labels)
      : await this.prisma.assessmentTriageReferral.create({
          data: {
            studentId: dto.studentId,
            behaviorItemsJson: JSON.stringify(dto.behaviorItems),
            redZoneItemsJson: JSON.stringify([]),
            isRedZone: false,
            referralCode: null,
            auditStatus: ReferralAuditStatus.APPROVED,
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
        redZoneCodes: redZone.codes,
      },
    });

    return referral;
  }

  async uploadReferral(dto: UploadReferralDto) {
    const referral = await this.findReferralOrThrow(dto.referralId);

    if (!referral.isRedZone) {
      throw new BadRequestException('只有红区转介需要上传眼科回执');
    }
    if (referral.auditStatus === ReferralAuditStatus.APPROVED) {
      throw new ConflictException('该转介已审核通过，不能重复上传回执');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: referral.studentId },
      select: { triageStatus: true },
    });
    if (!student) {
      throw new NotFoundException('学生不存在');
    }
    if (student.triageStatus === 'GREEN_ACTIVE') {
      throw new ConflictException('学生已解锁，无需上传回执');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.assessmentTriageReferral.update({
        where: { id: dto.referralId },
        data: {
          hospitalName: dto.hospitalName,
          hospitalDiagnosis: dto.hospitalDiagnosis ?? null,
          receiptFileUrl: dto.receiptFileUrl ?? null,
          auditStatus: ReferralAuditStatus.PENDING,
        },
      }),
      this.prisma.student.update({
        where: { id: referral.studentId },
        data: { triageStatus: 'REFERRAL_UPLOADED' },
      }),
    ]);

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
      throw new BadRequestException('auditStatus 必须为 APPROVED 或 REJECTED');
    }
    if (!referral.isRedZone) {
      throw new BadRequestException('只有红区转介需要审核');
    }
    if (!referral.receiptFileUrl) {
      throw new BadRequestException('请先上传眼科回执后再审核');
    }
    if (referral.auditStatus !== ReferralAuditStatus.PENDING) {
      throw new ConflictException('该转介已审核，不能重复审核');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: referral.studentId },
      select: { triageStatus: true },
    });
    if (!student) {
      throw new NotFoundException('学生不存在');
    }
    if (student.triageStatus !== 'REFERRAL_UPLOADED') {
      throw new ConflictException('学生当前不在回执待审核状态');
    }

    const approved = dto.auditStatus === ReferralAuditStatus.APPROVED;

    const [updated] = await this.prisma.$transaction([
      this.prisma.assessmentTriageReferral.update({
        where: { id: dto.referralId },
        data: {
          auditStatus: dto.auditStatus,
          auditedBy: dto.auditedBy,
          auditedAt: new Date(),
          ...(dto.hospitalDiagnosis !== undefined
            ? { hospitalDiagnosis: dto.hospitalDiagnosis }
            : {}),
        },
      }),
      this.prisma.student.update({
        where: { id: referral.studentId },
        data: {
          triageStatus: approved ? 'GREEN_ACTIVE' : 'RED_ZONE_LOCKED',
        },
      }),
    ]);

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

  /**
   * R1 红区重算：结构化编码路径与文本关键词路径始终都跑，取并集去重。
   * 编码路径 fail-closed（未知编码 400）；文本路径兜底旧客户端与漏勾编码的填报。
   */
  private detectRedZone(dto: SubmitTriageDto): {
    codes: string[];
    labels: string[];
  } {
    const codes = new Set<string>();

    for (const code of dto.redZoneCodes ?? []) {
      const seedItem = RED_ZONE_SEED_BY_CODE.get(code);
      if (!seedItem) {
        throw new BadRequestException(`未知红区编码：${code}`);
      }
      if (seedItem.lockHighLoadVisualTraining) {
        codes.add(seedItem.code);
      }
    }

    for (const rule of RED_ZONE_RULES) {
      // 同一关键词可能出现多次（例如先报 0、再报屈光参差 2.0），
      // 必须检查所有匹配项，不能只看第一个。
      const matched = dto.behaviorItems.some(
        (item) =>
          rule.keywords.some((keyword) => item.item.includes(keyword)) &&
          rule.matches(item.score),
      );

      if (matched) {
        codes.add(rule.seedCode);
      }
    }

    return {
      codes: [...codes],
      labels: RED_ZONE_TRIAGE_ITEMS.filter((item) => codes.has(item.code)).map(
        (item) => item.label,
      ),
    };
  }

  private async upsertPendingRedZoneReferral(
    dto: SubmitTriageDto,
    redZoneLabels: string[],
  ) {
    const pending = await this.prisma.assessmentTriageReferral.findFirst({
      where: {
        studentId: dto.studentId,
        isRedZone: true,
        auditStatus: ReferralAuditStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      behaviorItemsJson: JSON.stringify(dto.behaviorItems),
      redZoneItemsJson: JSON.stringify(redZoneLabels),
    };

    if (pending) {
      return this.prisma.assessmentTriageReferral.update({
        where: { id: pending.id },
        data: {
          ...data,
          referralCode:
            pending.referralCode ?? (await this.generateReferralCode()),
        },
      });
    }

    return this.prisma.assessmentTriageReferral.create({
      data: {
        studentId: dto.studentId,
        ...data,
        isRedZone: true,
        referralCode: await this.generateReferralCode(),
        auditStatus: ReferralAuditStatus.PENDING,
      },
    });
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
