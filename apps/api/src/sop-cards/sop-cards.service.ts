import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SopCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    level?: string;
    module?: string;
    keyword?: string;
  }) {
    const where: Prisma.SopCardWhereInput = {
      ...(query.level ? { cardLevel: query.level } : {}),
      ...(query.module ? { moduleName: { contains: query.module } } : {}),
    };

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { cardCode: { contains: keyword } },
        { cardTitle: { contains: keyword } },
        { targetSkill: { contains: keyword } },
        { moduleName: { contains: keyword } },
      ];
    }

    return this.prisma.sopCard.findMany({
      where,
      orderBy: { cardCode: 'asc' },
    });
  }

  async findOne(id: string) {
    const card = await this.prisma.sopCard.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('操作卡不存在');
    }
    return card;
  }

  async findByCode(cardCode: string) {
    const card = await this.prisma.sopCard.findUnique({ where: { cardCode } });
    if (!card) {
      throw new NotFoundException('操作卡不存在');
    }
    return card;
  }
}
