import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RedZoneGuard } from '../common/guards/red-zone.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @UseGuards(RedZoneGuard)
  precheck(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.precheck(dto);
  }

  @Get(':studentId')
  getSchedule(@Param('studentId') studentId: string) {
    return this.schedulesService.getSchedule(studentId);
  }
}
