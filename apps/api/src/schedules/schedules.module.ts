import { Module } from '@nestjs/common';
import { RedZoneGuard } from '../common/guards/red-zone.guard';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, RedZoneGuard],
})
export class SchedulesModule {}
