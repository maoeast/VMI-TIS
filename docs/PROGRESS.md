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
- ⏳ Task 3–6 未开始。

## Task 2（同日完成）

### 已完成

- ✅ 学生档案 CRUD：`POST/GET/PATCH/DELETE /api/students`，自动生成 `VMI-<year><seq>` 学号。
- ✅ 筛选查询：`GET /api/students?level=&triageStatus=&promotionStatus=&keyword=&page=&pageSize=`。
- ✅ Excel/CSV 批量导入：`POST /api/students/import-excel`，支持 姓名/年龄/出生日期/所在机构/主责治疗师 等表头，失败行进入 `errors`。
- ✅ 红区熔断 R1：`POST /api/assessments/triage` 检测屈光参差、斜视、遮盖、复视、眼球震颤、视力异常；命中即锁定 `RED_ZONE_LOCKED` 并生成转介单。
- ✅ 回执流程：`POST /api/assessments/referral-upload` → `REFERRAL_UPLOADED`；`POST /api/assessments/referral-audit` → `GREEN_ACTIVE` / `RED_ZONE_LOCKED`。
- ✅ 排课前置校验：`POST /api/schedules` 由 `RedZoneGuard` 拦截红区学生并返回 403 `RED_ZONE_LOCKED`；绿区返回 IEP 周课表检查结果。
- ✅ 审计日志：学生 CRUD / Excel 导入走 `@Audit` 拦截器；红区/回执/审核由服务显式记录；`GET /api/audit-logs` 支持分页与过滤。
- ✅ 共享契约扩展：`AuditAction` 增加学生/回执/训练动作；`RecordTrialDto` 增加 `material/digitalSeconds/isDigital`；`AutoLevelInput` 增加 `classroomAdaptationPass`。

### 验证

```bash
node scripts/verify-task2.mjs   # 24/24 通过
# 含：创建学生、筛选、红区 403、回执上传/审核、绿区排课、50 人 CSV 导入 <5s、审计日志动作齐全
```

### 偏差

- Excel 解析使用 `exceljs`（任务卡示例为 `xlsx`），同时支持 `.xlsx` 与 `.csv`。
- `POST /api/schedules` 当前是“红区前置校验 + IEP 周课表检查”，不新建独立排课表；Schema 契约中没有 Schedule 模型。
- `SubmitTriageDto.redZoneItems` 保留但设为可选，服务端不信任客户端结论并重新计算。

### 下一步

- Task 3：四层评估记录、连续 3 题 0 分中止、L0–L5 自动分级、评估报告。

## Task 3（同日完成）

### 已完成

- ✅ R2 连续 3 题 0 分自动中止：`POST /api/assessments/scale-score`，按 `sessionId` 维护得分序列；支持 `reset` 重置。
- ✅ L0–L5 自动分级：`AutoLevelService` 按身体稳定 → 视觉效率 → 视觉感知 → 视觉运动整合 → 课堂应用 → 全部达标 的优先级计算。
- ✅ 评估记录：`POST /api/assessments/records` 写入六类评估指标、NSUCO、六维雷达与 `autoLevel`，并回写学生 `currentLevel`。
- ✅ 记录查询：`GET /api/assessments/:studentId/records` 按 `evalPhase` 分组返回。
- ✅ 评估报告：`POST /api/assessments/:id/generate-report` 生成 HTML 报告并返回 `/api/reports/<id>.html` 静态 URL。

### 验证

```bash
node scripts/verify-task3.mjs   # 16/16 通过
# 含：连续 3 次 0 分中止、L0/L1/L2/L3/L4/L5 六个分支、currentLevel 回写、分组查询、报告可访问、审计日志
```

### 偏差

- 报告格式为 HTML（任务卡验收写“PDF 文件 URL”）；中文 PDF 需要额外 CJK 字体与 PDF 引擎，当前交付可直接打开/打印的 HTML 报告。
- R2 的连续得分状态保存在进程内存，单机版单实例可用；多实例或重启后需要持久化到 Redis/数据库。
- 自动分级对未提供的指标按“未异常/达标”处理；课堂适应项未录入时默认为通过（L5），只有显式传 `false` 才降为 L4。

### 下一步

- Task 4：IEP 计划、课堂五段式记分台、R3 晋级触发、R4 护眼硬锁。
