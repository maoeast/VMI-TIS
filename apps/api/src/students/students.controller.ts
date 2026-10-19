import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuditAction } from '@vmi-tis/shared-types';
import { Audit } from '../common/decorators/audit.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { ImportExcelDto } from './dto/import-excel.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Audit({ action: AuditAction.CREATE_STUDENT, targetType: 'student' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: StudentQueryDto) {
    return this.studentsService.findAll(query);
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  @Audit({ action: AuditAction.IMPORT_EXCEL, targetType: 'student' })
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ImportExcelDto,
  ) {
    return this.studentsService.importExcel(file, query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @Audit({ action: AuditAction.UPDATE_STUDENT, targetType: 'student' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Audit({ action: AuditAction.DELETE_STUDENT, targetType: 'student' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.studentsService.remove(id);
  }
}
