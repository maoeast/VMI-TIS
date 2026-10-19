import { Module } from '@nestjs/common';
import { IepController } from './iep.controller';
import { IepService } from './iep.service';
import { PromotionCheckService } from './promotion-check.service';

@Module({
  controllers: [IepController],
  providers: [IepService, PromotionCheckService],
  exports: [IepService, PromotionCheckService],
})
export class IepModule {}
