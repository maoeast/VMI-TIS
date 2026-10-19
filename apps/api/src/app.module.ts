import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuditModule } from './common/audit/audit.module';
import { HomeworkModule } from './homework/homework.module';
import { IepModule } from './iep/iep.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SessionsModule } from './sessions/sessions.module';
import { SopCardsModule } from './sop-cards/sop-cards.module';
import { StudentsModule } from './students/students.module';
import { WorkbenchModule } from './workbench/workbench.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuditModule,
    StudentsModule,
    AssessmentsModule,
    SchedulesModule,
    IepModule,
    SessionsModule,
    SopCardsModule,
    WorkbenchModule,
    HomeworkModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
