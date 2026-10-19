import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { SopCardsService } from './sop-cards.service';

@Controller('sop-cards')
export class SopCardsController {
  constructor(private readonly sopCardsService: SopCardsService) {}

  @Get()
  findAll(
    @Query('level') level?: string,
    @Query('module') module?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.sopCardsService.findAll({ level, module, keyword });
  }

  @Get('code/:cardCode')
  findByCode(@Param('cardCode') cardCode: string) {
    return this.sopCardsService.findByCode(cardCode);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sopCardsService.findOne(id);
  }
}
