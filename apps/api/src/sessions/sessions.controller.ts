import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DigitalLimitGuard } from '../common/guards/digital-limit.guard';
import { DigitalDurationDto } from './dto/digital-duration.dto';
import { DigitalResetDto } from './dto/digital-reset.dto';
import { FinishSessionDto } from './dto/finish-session.dto';
import { RecordTrialDto } from './dto/record-trial.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  start(@Body() dto: StartSessionDto) {
    return this.sessionsService.start(dto);
  }

  @Get()
  findAll(@Query('studentId') studentId?: string) {
    return this.sessionsService.findAll(studentId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id/stage')
  updateStage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.sessionsService.updateStage(id, dto);
  }

  @Post(':id/trial')
  recordTrial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordTrialDto,
  ) {
    return this.sessionsService.recordTrial(id, dto);
  }

  @Post(':id/digital')
  addDigitalDuration(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DigitalDurationDto,
  ) {
    return this.sessionsService.addDigitalDuration(id, dto);
  }

  @Post(':id/digital-start')
  @UseGuards(DigitalLimitGuard)
  digitalStart(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sessionsService.digitalStart(id);
  }

  @Post(':id/digital-reset')
  resetDigitalLimit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DigitalResetDto,
  ) {
    return this.sessionsService.resetDigitalLimit(id, dto.authorizationCode);
  }

  @Post(':id/finish')
  finish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FinishSessionDto,
  ) {
    return this.sessionsService.finish(id, dto);
  }
}
