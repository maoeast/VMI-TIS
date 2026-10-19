import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuditModule } from './common/audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulesModule } from './schedules/schedules.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    StudentsModule,
    AssessmentsModule,
    SchedulesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
