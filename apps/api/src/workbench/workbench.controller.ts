import { Controller, Get } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';

@Controller('workbench')
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  @Get('summary')
  summary() {
    return this.workbenchService.summary();
  }
}
