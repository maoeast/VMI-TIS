# VMI-TIS 孤独症学生视觉运动整合训练干预系统

NestJS 10 + Prisma 5 + SQLite/PostgreSQL 双模后端，配套 React 三端（后续任务）与 Windows 单机版启动脚本。

## 目录结构

```
prisma/schema.prisma              # 数据库唯一事实源（8 张表，SQLite 默认）
packages/shared-types/            # 前后端共享 TypeScript 类型契约（npm workspace）
apps/api/                         # NestJS 后端
  src/main.ts                     # 启动入口，/api 前缀，端口 3000
  src/app.controller.ts           # GET /api/health
  src/config/database.config.ts   # DATABASE_URL 解析与模式判断
  src/prisma/prisma.service.ts    # PrismaClient 单例
  src/prisma/seed.ts              # 13 张操作卡 + 6 名示例学生（幂等）
  src/prisma/verify-seed.ts       # Seed 验收脚本
deploy/
  start_standalone.bat            # Windows 单机版一键启动
  run_api.bat                     # 后端进程启动（由上一个脚本调用）
  docker-compose.yml              # PostgreSQL 服务器版
scripts/
  prepare-schema.mjs              # 从根 Schema 生成指定 provider 的副本
  generate-client.mjs             # 生成 Schema 与 Prisma Client
```

Schema 只保留根目录一份，`apps/api` 不再复制。Prisma 命令通过
`--schema ../../prisma/schema.prisma` 指向根文件；切换数据库时只改根 Schema 的
`provider` 与 `DATABASE_URL`。

## 环境要求

- Node.js 20 或更高版本（本机验证使用 Node 24）
- npm 10 或更高版本

## 快速开始（SQLite 单机版）

```bash
npm install
npm run db:push      # 建库：apps/api/data/vmi_tis.db
npm run db:seed      # 导入 13 张操作卡 + 6 名学生
npm run db:verify    # 校验数量、编码、JSON 字段与关键状态
npm run build
npm run start        # 生产启动
# 开发模式：npm run start:dev
```

健康检查：

```bash
curl http://localhost:3000/api/health
# {"status":"ok","service":"vmi-tis-api","database":"sqlite",...}
```

Windows 单机版：双击 `deploy/start_standalone.bat`。脚本会检查端口、安装依赖、
建库、导入演示数据、启动 API，并在健康检查通过后打开浏览器。

## 数据库路径说明

环境变量文件位于 `apps/api/.env`（模板见 `apps/api/.env.example`）。
SQLite 的相对路径以 `prisma/schema.prisma` 所在目录为基准解析。默认
`DATABASE_URL="file:../apps/api/data/vmi_tis.db"` 最终落在
`apps/api/data/vmi_tis.db`。

## 切换 PostgreSQL

```bash
node scripts/prepare-schema.mjs --target postgresql
export DATABASE_URL="postgresql://vmi:vmi2026@localhost:5432/vmi_tis"
npx prisma db push --schema prisma/.generated/schema.postgresql.prisma
```

或直接使用 `deploy/docker-compose.yml`（PostgreSQL 15 + API，构建期自动生成
PostgreSQL 版 Schema 与 Client）。

## Seed 数据说明

- 卡片基础字段迁移自 `docs/vmi_tis_prototype.html` L1847-1861（13 张）。
- 学生基础字段迁移自 `docs/vmi_tis_prototype.html` L1741-1844（6 名）。
- `targetSkill / procedureStepsJson / passCriteria / digitalGameMode / parentTaskJson`
  原型未提供，按卡片语义与 R1-R4 规则补写；`cardCode` 规范化为 `Mx-x-x`。
- `birthDate` 由原型年龄字符串按 2026-10 基准反推，属演示数据。
