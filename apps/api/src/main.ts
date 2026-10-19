/**
 * VMI-TIS API 启动入口
 * 监听 3000 端口，全局路由前缀 /api。
 * 契约：prisma/schema.prisma / packages/shared-types/src/index.ts
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { config as loadEnv } from 'dotenv';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// 同时支持两种运行位置：
// - ts-node / nest start：__dirname = apps/api/src
// - node dist/main.js：__dirname = apps/api/dist
loadEnv({ path: resolve(__dirname, '../.env') });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });

  // 评估报告静态文件：apps/api/data/reports → /api/reports/<id>.html
  const reportDir = resolve(__dirname, '../data/reports');
  mkdirSync(reportDir, { recursive: true });
  app.useStaticAssets(reportDir, { prefix: '/api/reports/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[VMI-TIS] API ready: http://localhost:${port}/api/health`);
}

void bootstrap();
