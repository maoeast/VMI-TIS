import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { ParentMessageDto } from './dto/parent-message.dto';
import { ReplyCheckinDto } from './dto/reply-checkin.dto';
import { SubmitCheckinDto } from './dto/submit-checkin.dto';
import { HomeworkService } from './homework.service';

@Controller('homework-checkins')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get()
  findAll(
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
  ) {
    return this.homeworkService.findAll(studentId, status);
  }

  @Post()
  create(@Body() dto: CreateHomeworkDto) {
    return this.homeworkService.create(dto);
  }

  @Post('clean-expired-videos')
  cleanExpiredVideos() {
    return this.homeworkService.cleanExpiredVideos();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.homeworkService.findOne(id);
  }

  @Post(':id/checkin')
  submitCheckin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitCheckinDto,
  ) {
    return this.homeworkService.submitCheckin(id, dto);
  }

  @Post(':id/reply')
  reply(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReplyCheckinDto,
  ) {
    return this.homeworkService.reply(id, dto);
  }

  @Post(':id/parent-message')
  sendParentMessage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ParentMessageDto,
  ) {
    return this.homeworkService.sendParentMessage(id, dto);
  }
}
