import { Module } from '@nestjs/common';
import { DigitalLimitGuard } from '../common/guards/digital-limit.guard';
import { IepModule } from '../iep/iep.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [IepModule],
  controllers: [SessionsController],
  providers: [SessionsService, DigitalLimitGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
