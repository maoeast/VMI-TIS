import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApproveIepPlanDto } from './dto/approve-iep-plan.dto';
import { CreateIepPlanDto } from './dto/create-iep-plan.dto';
import { UpdateIepPlanDto } from './dto/update-iep-plan.dto';
import { IepService } from './iep.service';

@Controller()
export class IepController {
  constructor(private readonly iepService: IepService) {}

  @Post('iep-plans')
  create(@Body() dto: CreateIepPlanDto) {
    return this.iepService.create(dto);
  }

  @Get('iep-plans')
  findAll(@Query('studentId') studentId?: string) {
    return this.iepService.findAll(studentId);
  }

  @Get('iep-plans/:id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.iepService.findOne(id);
  }

  @Patch('iep-plans/:id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIepPlanDto,
  ) {
    return this.iepService.update(id, dto);
  }

  @Post('iep-plans/:id/approve')
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveIepPlanDto,
  ) {
    return this.iepService.approve(id, dto);
  }

  @Get('promotions/:studentId/check')
  checkPromotion(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.iepService.checkPromotion(studentId);
  }

  @Post('promotions/:studentId/approve')
  approvePromotion(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: ApproveIepPlanDto,
  ) {
    return this.iepService.approvePromotion(studentId, dto.approvedBy);
  }
}
