# VMI-TIS 开发进度日志

## 2026-10-19（第 1 天）

### 已完成

- ✅ Task 1.1：工程结构初始化
  - 仓库根建立 npm workspaces：`apps/api`、`packages/shared-types`。
  - `prisma/schema.prisma` 保持唯一事实源，`apps/api` 下不再复制 Schema。
  - `packages/shared-types` 成为可构建的 workspace 包 `@vmi-tis/shared-types`。
- ✅ Task 1.2：Prisma 与数据库
  - 移除 `IepPlan.sopCards` / `SopCard.iepPlans` 错误关系（`selectedCardsJson` 是 JSON 数组，不是外键）。
  - `npm run db:push` 生成 `apps/api/data/vmi_tis.db`。
  - `npm run db:seed` 导入 13 张操作卡 + 6 名示例学生（幂等 upsert）。
  - `npm run db:verify` 校验数量、编码集合、JSON 字段与关键状态。
- ✅ Task 1.3：NestJS API 骨架
  - `apps/api/src/main.ts`：监听 3000，全局前缀 `/api`。
  - `apps/api/src/app.controller.ts`：`GET /api/health`。
  - `apps/api/src/prisma/prisma.service.ts`：PrismaClient 单例。
  - `apps/api/src/config/database.config.ts`：SQLite 相对路径统一解析为绝对路径。
- ✅ Task 1.4：部署脚本
  - `deploy/start_standalone.bat`：端口检查、依赖/构建、建库、Seed、健康检查、打开浏览器、退出时停止 API。
  - `deploy/run_api.bat`：后端进程启动，日志写入 `apps/api/data/api.log`。
  - `deploy/docker-compose.yml` + `apps/api/Dockerfile`：PostgreSQL 15 + API；构建期生成 PostgreSQL 版 Schema。
- ✅ 文档收敛
  - `docs/vmi_tis.md` 删除与根 Schema 冲突的旧版内嵌 Schema，改为权威指向；部署章节改为指向已实现文件。
  - 修正各交接文档中的原型行号（`STUDENT_DB` L1741-1844、`LIB_CARDS` L1847-1861）、原型行数（3076）、shared-types 类型数量（12 枚举 + 8 实体接口 + 10 DTO）。
  - 统一启动命令为根目录 workspaces 命令，移除 `vmi-tis-project/` 子目录与复制契约文件的旧步骤。

### 验证记录

```bash
# Schema 与建库
npm run db:push          # 成功，apps/api/data/vmi_tis.db
npm run db:seed          # sop_cards = 13, students = 6
npm run db:seed          # 再次执行仍为 13 / 6（幂等）
npm run db:verify        # ALL CHECKS PASSED

# 构建与健康检查
npm run build            # shared-types + apps/api 均通过
node apps/api/dist/main.js
curl http://localhost:3000/api/health
# HTTP 200 {"status":"ok","service":"vmi-tis-api","database":"sqlite",...}

# 单机版脚本
set VMI_TIS_NO_BROWSER=1 && set VMI_TIS_NO_PAUSE=1 && deploy\start_standalone.bat
# 建库、Seed、启动 API、健康检查全部通过，退出时停止 API
```

### 决策与偏差

- **工程落点**：仓库根目录建 `apps/api` 与 `packages/shared-types`。
- **单一 Schema**：根 `prisma/schema.prisma` 是唯一事实源；PostgreSQL 副本由 `scripts/prepare-schema.mjs` 在构建期生成，产物 `prisma/.generated/` 不入库。
- **Seed 字段补写**：原型每卡只有 7 个字段；`targetSkill / procedureStepsJson / passCriteria / digitalGameMode / parentTaskJson` 按卡片语义补写，`cardCode` 规范化为 `Mx-x-x`。
- **`birthDate`**：由原型年龄字符串按 2026-10 基准反推，属演示数据。
- **健康端点**：Task 1 产出清单未列 controller，但验收要求 `GET /api/health`，已补 `app.controller.ts`。
- **Docker 命令**：由 `prisma migrate deploy` 改为 `prisma db push`（仓库无 migration 文件）。

### 未完成 / 待后续

- ⏳ Docker 服务器版未本机实测（当前环境未安装 Docker），已做文件级静态检查。
- ⏳ 单机版“无需安装 Node.js”尚未打包便携运行时；当前 `start_standalone.bat` 要求机器已安装 Node.js 20+。后续需补便携 Node 打包。
- ⏳ Task 2–6 未开始。

### 明天计划

- Task 2：学生档案 CRUD + 红区熔断 API。
