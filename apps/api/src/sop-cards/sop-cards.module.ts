import { Module } from '@nestjs/common';
import { SopCardsController } from './sop-cards.controller';
import { SopCardsService } from './sop-cards.service';

@Module({
  controllers: [SopCardsController],
  providers: [SopCardsService],
  exports: [SopCardsService],
})
export class SopCardsModule {}
