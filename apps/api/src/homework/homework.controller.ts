import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { diskStorage } from 'multer';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { ParentMessageDto } from './dto/parent-message.dto';
import { ReplyCheckinDto } from './dto/reply-checkin.dto';
import { SubmitCheckinDto } from './dto/submit-checkin.dto';
import { HomeworkService } from './homework.service';

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : resolve(__dirname, '../../data/uploads');

const VIDEO_UPLOAD_OPTIONS = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(UPLOADS_DIR, { recursive: true });
      callback(null, UPLOADS_DIR);
    },
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();
      const safeExtension = /^\.[a-z0-9]+$/.test(extension)
        ? extension
        : '.mp4';
      callback(null, `${randomUUID()}${safeExtension}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file.mimetype.startsWith('video/')) {
      callback(new BadRequestException('仅支持视频文件'), false);
      return;
    }
    callback(null, true);
  },
};

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

  @Post(':id/video')
  @UseInterceptors(FileInterceptor('file', VIDEO_UPLOAD_OPTIONS))
  uploadVideo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请上传视频文件');
    }
    return this.homeworkService.attachVideo(id, file.filename);
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
