import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import {
  ImportExcelResponseDto,
} from '@vmi-tis/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ImportExcelDto } from './dto/import-excel.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const VALID_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const birthDate = this.parseDate(dto.birthDate);
    if (!birthDate) {
      throw new BadRequestException('birthDate 不是合法的日期');
    }

    const studentCode = await this.nextStudentCode();

    return this.prisma.student.create({
      data: {
        studentCode,
        name: dto.name.trim(),
        gender: dto.gender?.trim() || null,
        birthDate,
        schoolScene: dto.schoolScene.trim(),
        primaryTherapistId: dto.primaryTherapistId.trim(),
        parentPhone: dto.parentPhone?.trim() || null,
        chiefComplaint: dto.chiefComplaint?.trim() || null,
        currentLevel: 'L0',
        triageStatus: 'PENDING_SCREENING',
        promotionStatus: 'IN_PROGRESS',
      },
    });
  }

  async findAll(query: StudentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.StudentWhereInput = {
      ...(query.level ? { currentLevel: query.level } : {}),
      ...(query.triageStatus ? { triageStatus: query.triageStatus } : {}),
      ...(query.promotionStatus
        ? { promotionStatus: query.promotionStatus }
        : {}),
    };

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { name: { contains: keyword } },
        { studentCode: { contains: keyword } },
        { schoolScene: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        triageReferrals: { orderBy: { createdAt: 'desc' } },
        assessmentRecords: { orderBy: { createdAt: 'desc' } },
        iepPlans: { orderBy: { createdAt: 'desc' } },
        trainingSessions: {
          orderBy: { sessionDate: 'desc' },
          take: 30,
        },
        homeworkCheckins: {
          orderBy: { assignedDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.ensureExists(id);

    const data: Prisma.StudentUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender.trim() || null } : {}),
      ...(dto.birthDate !== undefined
        ? { birthDate: this.requireDate(dto.birthDate) }
        : {}),
      ...(dto.schoolScene !== undefined
        ? { schoolScene: dto.schoolScene.trim() }
        : {}),
      ...(dto.currentLevel !== undefined
        ? { currentLevel: dto.currentLevel }
        : {}),
      ...(dto.triageStatus !== undefined
        ? { triageStatus: dto.triageStatus }
        : {}),
      ...(dto.promotionStatus !== undefined
        ? { promotionStatus: dto.promotionStatus }
        : {}),
      ...(dto.primaryTherapistId !== undefined
        ? { primaryTherapistId: dto.primaryTherapistId.trim() }
        : {}),
      ...(dto.parentPhone !== undefined
        ? { parentPhone: dto.parentPhone.trim() || null }
        : {}),
      ...(dto.chiefComplaint !== undefined
        ? { chiefComplaint: dto.chiefComplaint.trim() || null }
        : {}),
    };

    return this.prisma.student.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.student.delete({ where: { id } });
    return { deleted: true, id };
  }

  async importExcel(
    file: Express.Multer.File,
    query: ImportExcelDto,
  ): Promise<ImportExcelResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传 .xlsx 或 .csv 文件');
    }

    const workbook = new ExcelJS.Workbook();
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') {
        await workbook.csv.read(Readable.from(file.buffer));
      } else {
        // ExcelJS 4.x 的 Buffer 类型定义与 Node 24 的 Buffer 泛型不兼容，
        // 运行时传入标准 Buffer 即可，这里只做类型层适配。
        await workbook.xlsx.load(file.buffer as any);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`文件解析失败：${message}`);
    }

    const worksheet = query.sheetName
      ? workbook.getWorksheet(query.sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('未找到可读取的工作表');
    }

    const headerMap = new Map<string, number>();
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const key = this.cellText(cell.value);
      if (key) {
        headerMap.set(key, colNumber);
      }
    });

    const getValue = (row: ExcelJS.Row, names: string[]): ExcelJS.CellValue => {
      for (const name of names) {
        const column = headerMap.get(name);
        if (column) {
          return row.getCell(column).value;
        }
      }
      return null;
    };

    const getText = (row: ExcelJS.Row, names: string[]): string =>
      this.cellText(getValue(row, names));

    const getDate = (row: ExcelJS.Row, names: string[]): Date | null =>
      this.cellDate(getValue(row, names));

    const codeState = await this.getCodeState();
    let imported = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const name = getText(row, ['姓名', '学生姓名']);

      if (!name) {
        continue;
      }

      const birthDate =
        getDate(row, ['出生日期', '生日']) ??
        this.parseAgeToBirthDate(getText(row, ['年龄', '生理年龄']));

      if (!birthDate) {
        errors.push({ row: rowNumber, reason: '缺少出生日期或年龄' });
        continue;
      }

      const levelText = getText(row, ['初始层级', '当前层级']).toUpperCase();
      const currentLevel = VALID_LEVELS.includes(levelText) ? levelText : 'L0';
      const sequence = codeState.nextSeq + imported + errors.length;
      const studentCode = `${codeState.prefix}${String(sequence).padStart(3, '0')}`;

      try {
        await this.prisma.student.create({
          data: {
            studentCode,
            name,
            gender: getText(row, ['性别']) || null,
            birthDate,
            schoolScene:
              getText(row, ['所在机构', '班级场景', '学校场景']) || '未填写',
            currentLevel,
            triageStatus: 'PENDING_SCREENING',
            promotionStatus: 'IN_PROGRESS',
            primaryTherapistId:
              getText(row, ['主责治疗师', '治疗师']) || 'therapist_unassigned',
            parentPhone: getText(row, ['家长电话', '联系电话']) || null,
            chiefComplaint:
              getText(row, ['主诉', '视光与评估基线', '家长主诉']) || null,
          },
        });
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ row: rowNumber, reason: message });
      }
    }

    return {
      success: errors.length === 0,
      imported,
      failed: errors.length,
      errors,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.student.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('学生不存在');
    }
  }

  private async getCodeState(): Promise<{ prefix: string; nextSeq: number }> {
    const year = new Date().getFullYear();
    const prefix = `VMI-${year}`;

    const lastStudent = await this.prisma.student.findFirst({
      where: { studentCode: { startsWith: prefix } },
      orderBy: { studentCode: 'desc' },
      select: { studentCode: true },
    });

    const lastSequence = lastStudent
      ? Number.parseInt(lastStudent.studentCode.slice(prefix.length), 10)
      : 0;

    return {
      prefix,
      nextSeq: (Number.isFinite(lastSequence) ? lastSequence : 0) + 1,
    };
  }

  private async nextStudentCode(): Promise<string> {
    const state = await this.getCodeState();
    return `${state.prefix}${String(state.nextSeq).padStart(3, '0')}`;
  }

  private parseDate(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private requireDate(value: string): Date {
    const date = this.parseDate(value);
    if (!date) {
      throw new BadRequestException('birthDate 不是合法的日期');
    }
    return date;
  }

  private cellText(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') {
        return value.text.trim();
      }
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText
          .map((part) => part.text ?? '')
          .join('')
          .trim();
      }
      if ('result' in value) {
        return String(value.result ?? '').trim();
      }
    }

    return String(value).trim();
  }

  private cellDate(value: ExcelJS.CellValue): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = this.cellText(value);
    if (!text) {
      return null;
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseAgeToBirthDate(text: string): Date | null {
    const match = text.match(/(\d+)\s*岁(?:\s*(\d+)\s*个?月)?/);
    if (!match) {
      return null;
    }

    const now = new Date();
    const birthYear = now.getFullYear() - Number(match[1]);
    const birthMonth = now.getMonth() - Number(match[2] ?? 0);
    const date = new Date(Date.UTC(birthYear, birthMonth, 1));

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
