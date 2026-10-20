# AGENTS.md · VMI-TIS 项目代理指令

## Project Overview

面向孤独症学生与特教/康复机构的**视觉运动整合训练干预系统（VMI-TIS）**：四层评估 → 红区分流 → IEP/ITP 计划 → 五段式课堂训练 → 家校协同 → 数据画像与科研导出。三端合一：教师工作台 `/web`、学生 Pad `/student`、家长端 `/parent`；同一份 React 代码构建 Web 与 Capacitor Android APK。

产品定位：机构内部工具；数据留在机构内网或单机，**不引入云账号与外部数据上报**。当前外联仅限机构内 API 与局域网 Socket.io。演示数据为 13 张操作卡 + 6 名学生。

当前阶段：Task 1–6 已完成并通过验收；`f1b1c66` 已处理 29 项 ChatGPT 评审（R1–R4、审计、WebSocket、视频、Docker、Android 配置）。**实时现场与下一步只认 `.continue-here.md`**；历史进度见 `docs/PROGRESS.md`。

30 秒自检：产品是什么？技术栈是否被冻结？新代码放哪个目录？R1–R4 分别是什么？

## Tech Stack（已冻结，勿擅自改）

- **后端**：Node.js 20 LTS + NestJS 10 + Prisma 5 + Socket.io；REST 统一前缀 `/api`；API 直接托管 `apps/web/dist`、报告与上传文件。
- **数据库**：SQLite 3（单机默认）↔ PostgreSQL 15（医院/服务器，Docker）；唯一 Schema `prisma/schema.prisma`；只改 `provider` 与 `DATABASE_URL`；PostgreSQL 副本由 `scripts/prepare-schema.mjs` 构建期生成，不入库。
- **前端**：React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + Zustand + React Router + Chart.js 4 + socket.io-client；三端是同一 `apps/web` 的路由级终端。
- **Android**：Capacitor 6；`apps/web/android`（Gradle 8.2.1 / AGP 8.2.1 / compileSdk 34 / minSdk 22），appId `com.vmitis.pad`，appName `星眸智康 Pad`；Vite 静态产物经 `npx cap sync android` 打入 APK。
- **测试**：`scripts/run-verification.mjs` 统一跑 Task 2/3/4/6；每个任务使用全新隔离 SQLite + 3100 测试 API。
- **交付**：Windows 单机版 `deploy/start_standalone.bat`（SQLite）；Docker Compose `deploy/docker-compose.yml`（PostgreSQL 15 + API）。

未经用户明确要求，不要引入：

- Next.js SSR / 依赖 Node 服务端渲染的前端（APK 必须静态构建）。
- Taro 小程序、Electron、Cordova（Android 已锁 Capacitor；家长端当前为响应式 H5）。
- `apps/api` 下的第二份 Prisma Schema；`String[]` / `@db.Timestamptz` 等 SQLite 不兼容语法。
- 云后端、账号体系、外部埋点/上报。
- Gradle / AGP / Capacitor / Prisma 的 major 升级；`npm audit fix --force`。

## 红线（违反任一条先停下报告，不要自行绕过）

1. **R1 红区熔断**：`RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` 不得排课或启动训练；只有 `GREEN_ACTIVE` 可进入训练入口（开课、记分、数字时长、digital-start）与排课；红区项由服务端重新计算，不信任客户端结论；回执上传/审核校验红区单、回执、当前状态并事务化；学生通用 `PATCH` 不接受 `triageStatus/currentLevel/promotionStatus`；未闭环红区不能被空初筛解锁。
2. **R2 连续 0 分中止**：连续 3 题 `score=0` 立即中止量表并保存进度；状态键必须含 `studentId + evalPhase + sessionId`。当前状态存进程内存，单实例有效（已知偏差）。
3. **R3 晋级**：连续 3 次课 ≥80% + ≥2 种材料 + ≥1 次家庭打卡 → `PROMOTION_READY`；只统计最近一次 `APPROVE_PROMOTION` 审计**之后完成**的课次；审批前重新核验；审批写入 `PROMOTION_READY` 审计。
4. **R4 护眼硬锁**：数字训练累计 900 秒硬顶；Trial 与数字时长用旧值条件更新，冲突返回 409；教师重置必须提供服务端授权码（`DIGITAL_RESET_CODE`，开发缺省 `0808`）；学生端 20 秒远眺只关闭遮罩，不重置本课额度。
5. **安全与审计**：审计快照只保留标识/状态/字段名，不带敏感原文；WebSocket 握手校验 token 与角色/学生归属，禁止匿名或跨学生伪造；Excel 导入 5 MB / 500 行；视频上传 100 MB，清理失败不写 `videoDeletedAt`，远程视频不谎报已清理。
6. **环境边界**：不修改 `/mnt/f/Projects/VMI-TIS`（Windows 工作树）；不从 WSL 杀 Windows 进程；WSL 测试 API 用 3100（3000 归 Windows API）；不在 WSL 直接起 3000；`docker compose up` 前先确认 3000/5432 未被 Windows 占用；不回退 `f1b1c66` 的 R1–R4/审计/WebSocket/视频/Docker 修复。
7. **数据与密钥**：`.env`、`local.properties`、`apps/api/data/`、`dist/`、`prisma/.generated/`、`node_modules/` 一律不提交；`SOCKET_TOKEN` / `DIGITAL_RESET_CODE` 开发默认值仅限本地演示，生产必须改强随机值；儿童数据不出机构网络。

## Context Tiers（指针，不是图书馆）

- **Tier 1 每次会话读**：`AGENTS.md`（本文件）+ `.continue-here.md`（当前现场快照）。
- **Tier 2 按需读**：`docs/vmi_tis.md`（产品需求 / 详细设计 / R1–R4 / 部署权威源）、`docs/IMPLEMENTATION_TASKS.md`（Task 1–6 任务卡）、`docs/chatgpt评审.md`（29 项外部评审）。
- **Tier 3 动手前读**：`docs/PROGRESS.md`（历史进度、偏差、验证记录）、`WSL2_HANDOFF.md`（WSL2 环境与端口边界）、`docs/index.md`（文档地图与权威源）。
- **Tier 4 忽略**：`node_modules/`、`apps/web/dist/`、`apps/api/data/`、`apps/web/android/app/build/`、`apps/web/android/.gradle/`、`prisma/.generated/`、`*.log`、`*.db`。

## Code Layout

- `apps/api/src/`：NestJS 模块——`students/`、`assessments/`、`iep/`、`sessions/`、`schedules/`、`sop-cards/`、`workbench/`、`homework/`、`analytics/`、`gateway/`（Socket.io）、`common/`（审计/守卫/过滤器/拦截器）、`prisma/`；入口 `main.ts`、`app.module.ts`。
- `apps/web/src/`：`pages/web/`（教师端 9 页）、`pages/student/`（学生 Pad 4 款 Canvas 游戏）、`pages/parent/`（家长端 4 Tab）、`components/`、`hooks/`、`api/`、`store/`、`styles/`、`utils/`；入口 `main.tsx`、`App.tsx`。
- `packages/shared-types/src/index.ts`：前后端共享枚举、实体接口与 DTO 契约（字段名以它和根 Schema 为准）。
- `prisma/schema.prisma`：8 张表的唯一事实源；PostgreSQL 副本构建期生成。
- `apps/web/android/`：Capacitor 原生工程；`apps/web/capacitor.config.ts` 是 Capacitor 配置。
- `scripts/`：`run-verification.mjs`、`verify-taskN.mjs`、`prepare-schema.mjs`、`generate-client.mjs`。
- `deploy/`：Windows 单机版 bat 与 Docker Compose；`docs/`：产品/设计/任务卡/进度/会话流程。
- 跨会话状态只写 `.continue-here.md`；历史只写 `docs/PROGRESS.md`。

## Coding Rules（可操作，5 秒可判）

- 字段名必须与 `prisma/schema.prisma` + `packages/shared-types/src/index.ts` 完全一致，不得自行改名。
- 所有 JSON 字段用 `JSON.stringify()` 存 `String`；禁止 SQLite 不支持的标量数组/`@db.Timestamptz`。
- DTO 用 `class-validator` 校验；服务端不信任客户端传入的红区/额度/晋级结论。
- 新增/修改 R1–R4 逻辑必须带正例与反例验收；负例至少覆盖绕过路径（PATCH、空初筛、未上传回执、899+2、重复晋级、错误授权码、匿名 Socket、跨学生伪造）。
- **评估模块唯一数据/公式源**：`packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`。后端 `AssessmentsService` 必须 import 并调用其中 5 个纯函数——`evaluateCeilingRule`（连续 3 题 0 分中止）、`calculateBeeryVmiNorms`、`calculateTvps4ProfileNorms`、`evaluateDemTestResult`（常模标准分换算）、`determineRecommendedLevelL0ToL5`（L0–L5 定级；落库由服务端负责）。前端评估中心与学生端必须读取其中常量数组渲染初筛表单（`RED_ZONE_TRIAGE_ITEMS` / `MILESTONE_0_TO_6_CHECKLIST` / `BEHAVIOR_SCREENING_ITEMS` / `NSUCO_STANDARD_SCALE` / `OPTOMETRY_NORMS`）、Beery VMI `svgRenderPaths`、TVPS-4 `sampleDigitalItems[].exposureTimeSec=5` 记忆题卡、`DEM_STIMULUS_MATRICES` 数字矩阵。**禁止自行重写算分公式或编造题目数据。**
- 前端三端共用一个构建；不要把 Node 服务端能力带进 SPA；API 基址用 `VITE_API_BASE` / `VITE_SOCKET_URL` / `VITE_SOCKET_TOKEN` 在构建期注入。
- Android 用 `androidScheme: 'https'`；调局域网 HTTP API 时保留 `android.allowMixedContent: true`，并把服务器 IP 加入 `network_security_config.xml`；生产改 HTTPS 后移除 mixed-content 开关。
- 注释与文档用中文，代码标识符用英文；沿用现有文件风格，不引入新的格式化/状态管理/UI 框架。
- 提交信息沿用现有 Conventional Commits：`feat(scope): 摘要`、`fix: 摘要`、`test: 摘要`、`docs: 摘要`；禁止 `git add .`，只精确 `git add <file>`；commit/push 需用户放行。

## Working Style

- 先方案后代码；复杂任务先给计划与验收口径，用户确认后动手。
- 需求/设计冲突、红线变更、无法在现有契约内实现 → 停下报告，不静默改语义。
- 修 bug 先复现（脚本/接口/日志），再定位根因，再改；一次只改一处。
- 已知偏差（Kiosk 插件、RBAC、HTML 报告、R2 进程内状态、眼动仪桥接、便携 Node、npm audit 43 项）不是本轮任务时不要顺手扩做；需要做先立项。
- 用户是方向与最终裁决者；agent 负责代码与工程结果。任何不可逆/外发动作（commit、push、删除、发布、花钱）先确认。

## Memory & Session Handoff

- `.continue-here.md`：跨会话接力文件；新会话先读，任务结束按 `docs/会话结束.md` 全量覆写。
- `docs/会话启动.md`：恢复现场流程（HANDOFF 区块是 `.continue-here.md` 的四项摘要；两者矛盾以 `.continue-here.md` 为准）。
- `docs/PROGRESS.md`：历史进度与验证记录；只追加本轮事实，不回写成“当前状态”。
- 关键决策/踩坑可用 `memory` 工具存 `.thincoder/memory/`（自动注入）；不要用记忆替代仓库文档。
- 会话流程文件：`docs/会话启动.md`、`docs/会话结束.md`；文档地图：`docs/index.md`。

## Quality Gates

- 后端/前端：`npm run build`（shared-types + api + web）通过；Web 侧 `tsc --noEmit` 通过。
- 验收：`npm run verify:all` 全绿（Task 2/3/4/6；每个任务全新隔离 SQLite + 3100 测试 API）。Node 用 v20.20.2。
- 数据库：`npm run db:verify`（13 卡 / 6 学生 / 编码与 JSON 字段）。
- Android：`VITE_API_BASE=... VITE_SOCKET_URL=... VITE_SOCKET_TOKEN=... npm run build -w @vmi-tis/web` → `cd apps/web && npx cap sync android` → `cd android && ./gradlew assembleDebug`；用 `aapt dump badging`、`unzip -l`、`apksigner verify` 核验；无设备就明确写“未做安装/运行验证”。
- Docker：构建后实测 `/api/health`；不要在未确认端口时 `docker compose up`。
- `npm audit` 当前 43 项（1 critical）为已知状态；不要执行 `npm audit fix --force`。
- 宣称完成前：跑对应门禁 + 自审改动 + 在交付报告里写命令与结果；未验证项必须显式标注。
