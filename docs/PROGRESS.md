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

## Task 4（同日完成）

### 已完成

- ✅ IEP 计划：`POST/GET/PATCH /api/iep-plans`、`POST /api/iep-plans/:id/approve`；`selectedCardsJson` / `weeklyScheduleJson` 按契约序列化。
- ✅ 课堂记分台：`POST /api/sessions` 开课、`PATCH /api/sessions/:id/stage` 五段式切换、`POST /api/sessions/:id/trial` 单回合记分、`POST /api/sessions/:id/finish` 结课。
- ✅ R3 晋级：连续 3 次课 ≥80% + 至少 2 种材料 + 至少 1 次家庭打卡 → 自动标记 `PROMOTION_READY`；`POST /api/promotions/:studentId/approve` 审批后升级并回到 `IN_PROGRESS`。
- ✅ R4 护眼硬锁：`DigitalLimitGuard` 与 Trial 服务双处校验，累计 900 秒后数字 Trial / digital-start 返回 403 + `remainingQuotaSec: 0`；`POST /api/sessions/:id/digital` 提供前端倒计时同步。
- ✅ 工作台：`GET /api/workbench/summary`（今日课表、活跃学生、待晋级、待审核转介、层级分布）。
- ✅ 家庭作业：创建、家长打卡、教师点评、家长留言、过期视频清理（标记 `videoDeletedAt`，删除本地文件，保留文本）。
- ✅ 数据分析：`GET /api/analytics/overview` 与 `GET /api/analytics/student/:id`（雷达、正确率趋势、数字时长趋势、定级历史）。
- ✅ 操作卡库：`GET /api/sop-cards?level=&module=&keyword=`、`GET /api/sop-cards/code/:cardCode`。
- ✅ 事件：`session.stage.changed` / `session.trial.recorded` / `session.finished` 通过 Nest EventEmitter 发出，供 Task 6 WebSocket 网关订阅。

### 验证

```bash
node scripts/verify-task4.mjs   # 32/32 通过
# 含：IEP、3 次课 90% 触发晋级、跨 2 材料 + 1 打卡、审批升级、900 秒双处拦截、Stage 切换、工作台/分析/作业接口、9 类审计动作
```

### 偏差

- `POST /api/sessions` 的 `therapistId` 字段当前未写入数据库：根 Schema 的 `TrainingSession` 没有该列；治疗师归属由学生 `primaryTherapistId` 承担。
- 视频清理接口按 `scheduledDeleteAt` 标记 `videoDeletedAt`，只物理删除 `apps/api/data/uploads` 下的本地文件；远程 URL 仅标记。
- 家庭作业“留言”复用 `parentNote` / `teacherReply` 两个字段，没有独立消息表。

### 下一步

- Task 5：React 三端工程化与页面迁移。

## Task 5（同日完成）

### 已完成

- ✅ `apps/web`：React 18 + Vite 5 + TypeScript + Tailwind 3 + Zustand + React Router + socket.io-client。
- ✅ 三端路由级终端：`/web` 教师工作台、`/student` 学生 Pad、`/parent` 家长端，顶部一键切换。
- ✅ 教师端 9 页：工作台首页、学生档案、评估中心、IEP 计划、课堂记分台、数据画像、家校作业、操作卡库、系统设置。
- ✅ 学生 Pad 4 款 Canvas 游戏：泡泡追追看、奇妙聚散球、森林找星星、眼动 5 点校准；含星星奖励与全屏护眼遮罩。
- ✅ 家长端 4 Tab：今日任务、视频打卡、成长曲线、家校留言。
- ✅ 通用组件：Header / Sidebar / Toast / TrialBox；hooks：`useKeyboardShortcuts` / `useWebSocket`。
- ✅ 深青色 `#0F4C5C` 主题与 `rounded-xl` 卡片；Chart.js 4 雷达图与正确率趋势图。
- ✅ Vite 代理 `/api` 与 `/socket.io`；生产构建由 API 直接托管 `apps/web/dist`。

### 验证

```bash
npm run build                     # shared-types + api + web 全部通过
npm run dev:web                   # http://localhost:5173
node scripts/verify-task5.mjs     # 构建产物与三端路由静态检查（见下）
```

- 浏览器实测：三端切换、教师 9 页、学生 4 游戏、家长 4 Tab 均正常渲染。
- 课堂记分台按 `1` 键成功记录 1 回合（正确率 100%，1/1 通过）。
- 学生 Pad 数字额度累计到 0 后全屏护眼遮罩出现；点击「教师授权解锁」后额度恢复 900 秒。
- 生产模式 `http://localhost:3000/web/home` 由 API 托管前端，学生选择与数据加载正常。

### 偏差

- 家长端为响应式 H5，未使用 Taro 小程序。
- 图表使用 Chart.js 4；数字训练时长使用原生条形图。
- 学生 Pad 的数字计时每 15 秒同步一次；真实眼动仪/摄像头未接入。
- 单机版仍依赖系统 Node.js，便携运行时未打包。

## Task 6（同日完成）

### 已完成

- ✅ `SessionGateway`：`SWITCH_PAD_TASK`、`PAD_TRIAL_COMPLETED`、`SESSION_STAGE_CHANGED`；房间 `role:*` / `student:*`；`transports: ['websocket', 'polling']`。
- ✅ 教师端「投屏到学生 Pad」面板；学生 Pad 接收切换；教师端接收回合回传。
- ✅ R4 教师授权解锁：`POST /api/sessions/:id/digital-reset`。
- ✅ Capacitor 6：`capacitor.config.ts`（`com.vmitis.pad`）、`apps/web/android/` 工程、`cap:add:android` / `cap:sync` / `cap:open` 脚本。
- ✅ API 托管前端 `dist`；单机版 `http://localhost:3000` 直接可用；Docker 构建同时编译 web。

### 验证

```bash
node scripts/verify-task6.mjs   # 7/7 通过：教师/学生 Socket、投屏、回合回传、Stage 广播
npx cap add android             # 成功生成 apps/web/android/
npx cap sync android            # 成功复制 web 产物
curl http://localhost:3000/     # 返回前端 index.html
curl http://localhost:3000/web/home  # SPA 深链回退正常
```

### 偏差 / 未验证

- ⏳ APK 未实际编译：当前环境无 Android SDK / JDK；`android/` 工程已生成，需在 Android Studio 或 CI 执行 `./gradlew assembleDebug`。
- ⏳ Docker 未本机实测（当前环境未安装 Docker）。
- ⏳ 便携 Node 运行时未打包。
- ⏳ 眼动仪硬件桥接（60 Hz）与 Capacitor 原生插件（status-bar / text-to-speech / camera）未接入；当前为浏览器 Canvas + 触控/鼠标。
- APK 连接医院服务器需在构建前设置 `VITE_API_BASE` / `VITE_SOCKET_URL`，示例见 `apps/web/.env.example`。

## 2026-10-20 ChatGPT 评审修复

外部评审见 `docs/chatgpt评审.md`，共 29 项（12 P0 / 15 P1 / 2 P2），代码/配置已逐项处理（设备验收见下）：

- **R1 红区**：学生通用 `PATCH` 不再接受 `triageStatus` / `currentLevel` / `promotionStatus`；未闭环红区不能被空初筛解锁；回执上传与审核校验红区单、回执、当前状态并事务化；训练入口（开课、记分、数字时长、digital-start）与排课守卫统一要求 `GREEN_ACTIVE`；同关键词多次出现时按全部项目匹配。
- **R2/R3/R4**：R2 连续 0 分状态键加入 `studentId + evalPhase`；晋级审批记录截止时间，只统计审批后完成的新课次，审批前重新核验；数字训练对本次增量做 900 秒硬顶，Trial 与数字时长使用旧值条件更新（冲突返回 409）；教师重置必须提供服务端授权码（`DIGITAL_RESET_CODE`，缺省 0808）；学生端 20 秒远眺只关闭遮罩，不重置本课额度。
- **一致性与接口**：评估记录与学生 `currentLevel` 同事务；L4 缺 TVPS/Beery 时按“缺失=达标”进入 L4；L4 无专属卡回退 L3；Excel 导入限制 5MB / 500 行、固定业务错误、原始错误只写服务端日志；审计快照只保留标识/状态/字段名；家长视频改为真实上传（`POST /api/homework-checkins/:id/video`，100MB 视频限制，`/api/uploads` 静态托管），清理失败不写 `videoDeletedAt`，远程视频不谎报已清理；每日 02:00 Cron 自动清理；WebSocket 握手 token + 角色/学生归属校验；学生选择器在新建/导入/删除后刷新；盲操快捷键忽略按钮/链接焦点；Android 增加网络白名单与沉浸式全屏。
- **构建/部署**：PostgreSQL Schema 只替换 datasource 的实际 `provider` 行并断言；Dockerfile 在 `npm ci` 前复制 `apps/web/package.json`，Alpine 安装 OpenSSL；`.dockerignore` 排除 `.env`；`start_standalone.bat` 同时检查 Web `dist/index.html`。
- **验收**：新增 `scripts/run-verification.mjs`（每个任务全新隔离 SQLite + 3100 测试 API，跑完清理），并补充反例：PATCH 绕过、空初筛解锁、未上传回执审批、红区/待初筛开课、899+2、重复晋级、错误授权码、匿名 WebSocket、跨学生伪造 Pad 回传、L4 缺 TVPS、审计脱敏、视频上传。
  - Task 2：31/31；Task 3：17/17；Task 4：40/40；Task 6：10/10。
  - Docker：`deploy-api:latest` 构建通过；镜像内无 `apps/api/.env`；PostgreSQL 15 容器实测 `/api/health` 返回 `database:"postgresql"`，seed 6 名学生。

### 剩余偏差 / 未验证

- ⏳ Android 真机/模拟器安装与运行未验证（APK 已在 WSL2 编译，见「2026-10-20 WSL2 Android APK 构建」）；构建时 API 指向 `http://192.168.0.188:3000`，`network_security_config.xml` 已加入该 IP。
- ⏳ Kiosk 退出码锁（`startKiosk` / `stopKiosk` 插件）未实现，当前仅沉浸式全屏。
- ⏳ 原有偏差仍在：无 RBAC、HTML 报告非 PDF、R2 进程内状态单实例、眼动仪 60Hz 桥接未接入、便携 Node 未打包。

## 2026-10-20 WSL2 Android APK 构建

- ✅ Android SDK 复用 WSL2 已安装的 `~/android-sdk`（cmdline-tools 12.0、platforms;android-34、build-tools;34.0.0、platform-tools，license 已接受），未重复下载 SDK。
- ✅ `apps/web/android/local.properties` 指向 `sdk.dir=/home/maoea/android-sdk`；该文件已被 `apps/web/android/.gitignore` 忽略，未入库。
- ✅ Web 构建注入 `VITE_API_BASE=http://192.168.0.188:3000`、`VITE_SOCKET_URL=http://192.168.0.188:3000`、`VITE_SOCKET_TOKEN=vmi-tis-dev-token`，随后 `npx cap sync android`。
- ✅ `./gradlew assembleDebug --no-daemon` 成功（Gradle 8.2.1 / AGP 8.2.1 / JDK 17）；产物 `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`（3.8 MB，包名 `com.vmitis.pad`，`assets/public/index.html` 与 `res/xml/network_security_config.xml` 已打包）。
- ⏳ 真机/模拟器安装与运行未验证：`adb devices` 无设备，WSL 未安装 emulator；Windows 局域网 API `192.168.0.188:3000` 从 WSL 访问超时（Windows 本机 `Invoke-WebRequest` 正常），Pad 侧可达性需在设备上确认。

## 2026-10-20 会话任务交接体系

- ✅ 新增 `AGENTS.md`：项目定位、技术栈冻结、R1–R4 与安全/环境红线、Context Tiers、代码布局、编码规则、工作方式、质量门禁。
- ✅ 新增 `.continue-here.md`：六段现场快照（Current State / Next Action / Blockers / Dead Ends / Key Decisions / Relevant Files）。
- ✅ 新增 `docs/会话启动.md` / `docs/会话结束.md`：HANDOFF 区块、启动固定摘要、收尾覆写与 Git 处理表。
- ✅ 新增 `docs/index.md`：文档地图与权威源；`README.md` 增加「文档入口」。
- 规则：`.continue-here.md` 是当前现场唯一快照；`docs/PROGRESS.md` 只追加历史；两者矛盾以 `.continue-here.md` 为准。
- 提交：`3d943fc docs: add session handoff system`、`fe1b08d fix(android): build debug APK with LAN API config`；未 push。

## 2026-10-20 评估量表种子接入

- ✅ `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts` 保留为评估模块唯一数据/公式源，并通过 `packages/shared-types/src/index.ts` 的 `export *` 对外提供。
- 约定：后端 `AssessmentsService` 调用 5 个纯函数——`evaluateCeilingRule`（连续 3 题 0 分中止）、`calculateBeeryVmiNorms`、`calculateTvps4ProfileNorms`、`evaluateDemTestResult`（常模标准分换算）、`determineRecommendedLevelL0ToL5`（L0–L5 定级；落库由服务端负责）。
- 约定：前端评估中心/学生端读取常量数组渲染初筛表单、Beery VMI `svgRenderPaths`、TVPS-4 `sampleDigitalItems[].exposureTimeSec=5` 记忆题卡、`DEM_STIMULUS_MATRICES` 数字矩阵。
- 禁止自行重写算分公式或编造题目数据；现有 `AssessmentsService` / 评估页面未改动，接入属于下一轮评估模块开发。
- 验证：`npm run build`（shared-types + api + web）通过；Node 运行时确认 5 个纯函数可调用，`BEERY_VMI_6_ITEMS` 30 项且 `svgRenderPaths` 可读，TVPS-4 MEM `exposureTimeSec=5`，`DEM_STIMULUS_MATRICES` 三类矩阵可读；未跑 `verify:all`（无业务逻辑变更）。
- 提交：`feat(shared-types): add assessment scales seed`（本提交）；`:Zone.Identifier` 已删除；未 push。

## 2026-10-20 评估模块接入（种子 5 纯函数）

- ✅ 后端新增 `AssessmentGradingService`：按出生日期计算月龄/年龄，原始分优先调用 `calculateBeeryVmiNorms` / `calculateTvps4ProfileNorms` / `evaluateDemTestResult`，再调用 `determineRecommendedLevelL0ToL5`；删除 `AutoLevelService`。
- ✅ `AssessmentRecord` 新增 `assessmentMetaJson`，保存原始输入、Beery/TVPS/DEM 换算、六维分数、定级分析与推荐操作卡；老记录该字段为空时报告与页面按空处理。
- ✅ R2：`submitScaleScore` 改用 `evaluateCeilingRule`，响应新增 `consecutiveZeroCount` / `ceilingItemIndex` / `totalRawScore`，保留 `lastThree` / `message`。
- ✅ DTO 新增 `beeryVpRaw/McRaw`、`tvps4RawScores`、`demRaw`、`quadrupedHoldSec`、`classroomCopyAccuracyPct`；映射 `stabilityPass→spsrcSensoryStable`，`quadrupedHoldSec` 缺省 `stabilityPass?10:0`，`classroomCopyAccuracyPct` 缺省 `pass?90:70`，NSUCO 取 min 并夹 1–5。
- ✅ 红区：种子返回的 `triageStatus` 只写 `assessmentMetaJson`，不回写 `student.triageStatus`；`currentLevel` 按定级结果回写。
- ✅ 前端新增 `components/assessment/`（Beery/TVPS/DEM/Screening/NSUCO/CardPanel）；`AssessmentPage` 用种子常量替换硬编码红区项，增加原始分/标准分输入与题卡 Tab；`StudentPadPage` 增加 `mode:'training'|'assessment'`，评估模式不调 `addDigital`、不写 Trial、不触发护眼遮罩。
- ✅ 报告 `report.service.ts` 增加评估结论、DEM、TVPS-4 段落。
- ✅ 共享包新增 `@vmi-tis/shared-types/assessment-seed` 子路径导出；`apps/web/vite.config.ts` 将 workspace 的 `packages/shared-types/dist` 纳入 commonjs 转换，解决 `__exportStar` 在 Vite 构建中无法识别具名常量的问题。
- 行为变化：种子 L4 阈值 Beery `<90`，Beery 85 由旧算法 L5 变 L4；`verify-task3` 的 L5 用例改为 Beery95/TVPS95，并新增 Beery85→L4、`quadrupedHoldSec=3→L0`、Beery/TVPS/DEM 原始分换算、红区 advisory 断言。
- 验证：`npm run db:generate`、`npm run db:push`、`npm run build` 通过；Node `v20.20.2` 下 `npm run verify:all` Task 2/3/4/6 全绿。Task 3 新增断言实测：Beery 原始分 12→标准分 63、TVPS-4 七项→综合 136、DEM→`TYPE_III_AUTOMATICITY_PROBLEM`、红区评估记录 L0 且学生 `triageStatus` 保持 `RED_ZONE_LOCKED`。
- 未验证：无 Chromium/Chrome，浏览器渲染冒烟未执行；APK 已重编译（4.0 MB，`com.vmitis.pad`），`aapt` / `unzip` / `apksigner` 核验通过并包含评估 UI，无设备未做安装/运行验证；本轮未 commit/push（等用户放行）。

## 2026-10-20 评估模块评审修复

- ✅ `assessmentMetaJson.raw` 保存 Beery/VP/MC 原始分、TVPS-4 七项原始分、DEM 五项原始输入与 NSUCO；`verify-task3` 新增 `meta.raw` 断言。
- ✅ R2 中止保留进度：新增 `terminatedSessions`，中止后保留累计 scores 与 `totalRawScore`，继续提交返回“本轮已中止”；仅 `reset` 清空。页面显示累计原始分并禁用计分按钮，`zeroCount` 改用服务端 `consecutiveZeroCount`。
- ✅ MVPT-3 只作为定级输入的兼容替代，不再写入 `tvps4Std` 列；新增“仅 MVPT-3=75 时 tvps4Std 为空、定级 L2”断言。
- ✅ `radarScores` 人工输入优先落库，未提供时用定级雷达；新增 L5 雷达落库断言。
- ✅ 学生 Pad 的 TVPS-4 题卡传 `revealAnswer={false}`，只高亮选中项、不显示对错；教师端仍显示答案。
- ✅ 报告 DEM/TVPS 段落缺失时输出“未录入”，保持章节编号连续。
- ✅ DTO 补 `beeryVmiRaw` 0–30 与 Beery/TVPS/MVPT 标准分 0–200 校验。
- 验证：`npm run build` 通过；Node `v20.20.2` 下 `npm run verify:all` Task 2/3/4/6 全绿（新增 R2 中止保留、meta.raw、MVPT、雷达断言均通过）；APK 用最终代码重编译（4.0 MB，包含评估 UI，`aapt` / `unzip` / `apksigner` 核验）；无 Chromium/设备未做渲染/安装验证；未 commit/push。

## 2026-10-20 文档：费曼式项目入口与会话收尾

- ✅ 新增 `docs/项目速览-费曼版.md`：非权威阅读导览，覆盖功能、闭环、三端、R1–R4、L0–L5、当前边界与远期目标。
- ✅ `README.md` 改为项目入口：定位、核心闭环、技术栈、目录、快速开始、评估唯一公式源、文档地图；修正“React 三端（后续任务）”和 Node 24 旧口径。
- ✅ `docs/index.md` 登记项目速览，并增加“快速理解项目”的阅读路径。
- ✅ `docs/会话结束.md` 步骤五改为“费曼式收尾报告 + 四行摘要”，要求先用大白话讲清本轮完成/未完成/未验证与下一步原子动作。
- 验证：README/新文档/索引链接存在性检查通过；`git diff --check` 通过；本轮只改文档，未重跑业务门禁。
- 提交：`c484e28`（评估模块代码）、`dba859c`（文档与费曼收尾）；未 push。

## 2026-10-20 红区结构化编码通道（R1 加固）

- ✅ `SubmitTriageDto` 新增 `redZoneCodes?: string[]`（`@IsOptional @IsArray @IsString({ each: true }) @ArrayMaxSize(10)`）；旧 `redZoneItems` 保留，服务端继续不采信。
- ✅ `TriageService.detectRedZone` 改双路径并集：种子编码 `RED_ZONE_TRIAGE_ITEMS`（未知编码 `BadRequestException` 400，fail-closed）+ 原 6 条文本关键词规则始终都跑，同一集合去重；`RedZoneRule` 的 `label` 换成 `seedCode`，按语义映射屈光参差/视力异常→`RED_01`、斜视/遮盖/复视→`RED_02`、眼球震颤→`RED_03`。
- ✅ 转介单 `redZoneItemsJson` 仍是 `string[]`（种子 label），`StudentsPage.tsx` / `AssessmentPage.tsx` 三个读取点未改；审计 `changesAfter` 改为 `{ triageStatus, redZoneCodes }`，不写行为项原文。
- ✅ 前端 `TriagePayload` 增加 `redZoneCodes`；`AssessmentPage.submitTriage` 提交 `redZoneCodes: screening.red`，红色行为项文本保留作第二道防线。
- ✅ `scripts/verify-task2.mjs` 新增 21 项断言：8 项建档 + P1–P6（单编码、双编码、编码+文本并集去重、旧文本路径、绿区、审计只存编码）+ N1–N7（未知编码 400、重复编码去重、空初筛 409、PATCH 不改状态、排课 403、开课 403、编码命中而文本 0 分仍红区）。Task 2 共 52 项检查全通过。
- 验证：`npm run build`（shared-types + api + web，含 web `tsc --noEmit`）通过；Node `v20.20.2` 下 `npm run verify:all` 用 3100 隔离库跑完，Task 2/3/4/6 全绿。
- 未验证：浏览器渲染冒烟未执行（无 Chromium/设备）；APK 未重编译。
- 未 commit/push；等用户放行。

## 2026-10-20 APK 真机安装/运行（荣耀平板 X9）

- 无线调试配对并连接：`192.168.0.67:44641`（`NDL-W09`，Android 16 / SDK 36；物理分辨率 1200×1920）。
- 平板到 `192.168.0.188:3000` 的 ping 与 TCP 均不通；Windows API 当前未运行，因此不能用现有 LAN 构建做真机数据验证。
- 测试构建：`VITE_API_BASE=http://localhost:3000 VITE_SOCKET_URL=http://localhost:3000 VITE_SOCKET_TOKEN=vmi-tis-dev-token npm run build -w @vmi-tis/web` → `npx cap sync android` → `./gradlew assembleDebug`；`adb reverse tcp:3000 tcp:3100` 把平板 `localhost:3000` 隧道到 WSL API 3100。
- 包体核验：包名 `com.vmitis.pad`、versionName `1.0`、minSdk 22 / targetSdk 34；`apksigner verify` 通过；bundle 含 `redZoneCodes`（最新前端）。
- `adb install -r` 成功；启动进入教师工作台，数据为在训 5 / 待晋级 2 / 全员 6；切学生 Pad 显示周子墨、数字额度 900s、评估出示按钮与四款游戏。截图 `/tmp/vmi-pad-screen.png`、`/tmp/vmi-pad-student.png`（本机临时，未入库）。
- 未验证：LAN 部署构建（需 Windows API 运行 + 3000 入站放行）。当前安装的是 localhost 测试构建，依赖 `adb reverse`。

## 2026-10-20 评估中心 5 步向导与数据链修复

- ✅ `AssessmentPage` 从四个功能 Tab 改为 5 步向导：① 选学生与评估阶段 → ② 初筛与红区门禁 → ③ 视光与眼动（可跳过）→ ④ 量表施测 → ⑤ 汇总、保存与报告；旧 `scale / triage / cards / records` 四个 Tab 移除。
- ✅ 阶段 `evalPhase` 进入页面状态并透传 `submitScaleScore` / `createRecord`；切换阶段清空草稿并重建 `sessionId`，R2 会话键仍为 `studentId:evalPhase:sessionId`（后端未改）。
- ✅ 门禁只做 UI：`PENDING_SCREENING` 禁用步骤 ③–⑤；`RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` 禁用步骤 ③–④、保留步骤 ⑤ 保存初筛级 L0；`GREEN_ACTIVE` 放行；初筛提交、回执上传/审核后刷新学生状态。`createRecord` 未加红区 403。
- ✅ 新增 `components/assessment/`：`AssessmentStepper`、`StudentPhaseSelector`、`OptometryPanel`、`ScaleAssessmentPanel`、`RecordSummary`（同时持有记录草稿字段形状 `AssessmentRecordForm` / `EMPTY_RECORD_FORM` / `hasAnyMeasurement`）。
- ✅ `BeeryVmiCard` 增加可选受控 props `itemNumber` / `onItemNumberChange` / `onScore` / `scoreDisabled`：教师向导内逐题判 1/0；不传时保持原出示行为，学生 Pad 的 `AssessmentCardPanel` 不受影响。
- ✅ 「确认原始分」把 `scaleResult.totalRawScore` 写入 `recordForm.beeryVmiRaw`，保存后由 `AssessmentGradingService` 调用种子函数换算；TVPS-4 明示“仅样例题卡 + 手工 7 项原始分”，不伪造题库；DEM 刺激矩阵与手工原始用时保留。
- ✅ 保存后自动定级并自动生成 HTML 报告（`reportFileUrl`），报告失败不阻塞保存；第 5 步下方按 `BASELINE / STAGE_8W / TRANSITION` 分组显示历史评估并支持逐条重新生成报告。
- ✅ `scripts/verify-task3.mjs` 新增 8 项断言：R2 阶段隔离、STAGE_8W 连续 3 题 0 分中止、STAGE_8W reset 不影响 BASELINE、Beery 逐题累计原始分 12、STAGE_8W 记录落盘 `evalPhase` + 确认后的 `beeryVmiRaw`/标准分、TVPS/DEM 原始输入与换算、BASELINE 13 + STAGE_8W 1 的分组、`evalPhase` 过滤、STAGE_8W HTML 报告可访问；原有用例保持通过。
- 验证：`npm run build`（shared-types + api + web，含 web `tsc --noEmit`）通过；Node `v20.20.2` 下 `npm run verify:all` 使用 3100 隔离 SQLite 实跑，Task 2/3/4/6 全绿（Task 3 共 46 项检查通过）。
- 未验证：浏览器 UI 冒烟（选学生→阶段→初筛→视光→Beery→保存→报告、红区禁用步骤 3–4、TVPS 文案）由主代理补做；本轮未 commit/push。

## 2026-10-20 三端入口分离（构建期终端开关）

- ✅ 新增构建期终端模式 `VITE_TERMINAL`：`all`（缺省）/ `student` / `teacher` / `parent`，空值与非法值统一按 `all`。判断只落在 `apps/web/src/store/useAppStore.ts` 的 `normalizeTerminal` / `TERMINAL_MODE` 一处，Header 与路由守卫共用，不再各处各判一套。
- ✅ `apps/web/src/App.tsx` 新增 `TerminalGuard`（`useLocation` + 白名单）：`all` 放行全部；`student` 仅 `/student`（含 `/student/` 前缀）；`teacher` 仅 `/web` 与 `/web/*`；`parent` 仅 `/parent` 与 `/parent/*`；越权直链用 `<Navigate replace>` 回本终端首页。现有 `/`、`/web/:page`、`/student`、`/parent`、`*` 路由与 `all` 模式行为不变。
- ✅ `apps/web/src/components/Header.tsx` 只在 `all` 渲染三端切换按钮组，`StudentSelector` 不动；`useAppStore` 的 `activeTerminal` 初值按模式推导（`student` / `parent` 取本端，`teacher` / `all` / 非法取 `web`）。
- ✅ 未加 `package.json` 构建脚本：`VITE_TERMINAL=... npm run build` 前缀在 Windows cmd 不成立，README 分别给 bash 与 PowerShell 写法，并写清 `adb install -r` 保留数据。
- 验收（`vite preview` 服务各模式 dist + 3100 演示库副本的浏览器实测）：`all` `/`→`/web/home`、点「学生 Pad」→`/student`、`/parent` 正常、三端切换与学生选择器都在；`student` `/`→`/student`，`/web/students`、`/parent`、`/foo` 均落 `/student`，Header 零切换按钮、学生选择器在（截图本机临时，未入库）；`teacher` `/`→`/web/home`、`/student`→`/web/home`、无切换；`parent` `/`→`/parent`、`/web`→`/parent`、无切换；`VITE_TERMINAL=foo` 与空值均按 `all`（`/`→`/web/home`、三端切换在）。
- 验证：`npm run build`（shared-types + api + web，含 web `tsc --noEmit`）EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿；`VITE_TERMINAL=student`（LAN `192.168.0.188:3000`）构建 + `npx cap sync android` + `./gradlew assembleDebug` 成功，APK 4.0 MB，包名 `com.vmitis.pad`、应用名 `星眸智康 Pad`、`apksigner verify` 通过、assets 内为 student 版 bundle。
- 未验证：Node 验收基线 `v20.20.2`（本机 WSL 当前只有 Node 24.22.0，本轮构建与验收均在该版本完成）；APK 平板真机安装/运行由主代理复核（`adb install -r`，不卸载）；`teacher` / `parent` 只做了构建与浏览器验证，不交付。
- 未 commit/push。

## 2026-10-20 跨窗口选学生同步（`SWITCH_STUDENT`）

- ✅ 契约：`packages/shared-types/src/index.ts` 新增 `SwitchStudentPayload`（`event:'SWITCH_STUDENT'`、`studentId:string`）。
- ✅ 服务端：`SessionGateway` 新增 `SWITCH_STUDENT` 处理器——只接受 `role==='therapist'`（学生端发送返回 `forbidden`），空或非字符串 `studentId` 返回 `invalid_payload`，成功返回 `{ ok: true }` 并把事件广播到 `role:student`。不按目标 `student:<id>` 发：学生 socket 连接时按当时的学生入房，切到新学生后才换房，按目标房间会收不到；`student:<id>` 继续只服务 `SWITCH_PAD_TASK` 与训练事件。
- ✅ 前端：`useWebSocket` 增 `onSwitchStudent` 与 `emitSwitchStudent`（`useCallback` 包内部 `socketRef`，句柄稳定）；`TeacherLayout` 建一条教师 socket（`role:'therapist'`）并把发送函数写入 store 的 `teacherSwitchStudent` 槽（卸载置 null）；`StudentSelector` 先本地 `setActiveStudent`，仅在 `pathname` 以 `/web` 开头且 id 非空时调用发送槽（槽为 null 静默跳过；自动选首名学生不广播）；`StudentPadPage` 的 `onSwitchStudent` 写回 `setActiveStudent`，沿用原有 effect 清空锁定/课次/游戏/计时并重载新学生的红区与 R4 额度。
- ✅ `scripts/verify-task6.mjs` 新增 6 项断言：教师 ack `ok`、学生收到、旧学生房间仍收到对其他学生的切换（证明 `role:student` 广播）、学生端发送 `forbidden`、学生端发送未被广播、空 `studentId` 为 `invalid_payload`；原有匿名断开与跨学生 `PAD_TRIAL_COMPLETED` 拒绝保留。
- 验证（两窗口浏览器，3100 隔离库 + API 托管 `all` dist，headless Chrome 双标签 + CDP，9/9 通过）：教师选陈果果、周子墨学生端跟随；学生自己改选林小宇只影响本窗口（教师仍周子墨）；教师再选刘诺一最后一次赢；未知 UUID → 学生端 toast「学生不存在」；张梓轩 → 红区锁定页；训练中切人计时从 3 秒清零、新学生重载。student 包 `/student` 截图确认选择器保留、无三端切换。
- 验证：Node `v20.20.2` 下 `npm run build` EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿；`VITE_TERMINAL=student` + LAN env 构建、`npx cap sync android`、`./gradlew assembleDebug` 成功（APK 4.0 MB，`com.vmitis.pad`，minSdk 22 / targetSdk 34，`apksigner verify` 通过，bundle 含 `SWITCH_STUDENT` 与 `192.168.0.188`）。
- 未验证：平板真机安装/运行与学生包跟随（交主代理）；断线重连后再选的平板实测。
- 未 commit/push。

## 2026-10-20 评估双屏（`ASSESSMENT_CARD_CHANGE`）

- ✅ 契约：`packages/shared-types/src/index.ts` 新增 `AssessmentCardType` 与 `AssessmentCardChangePayload`（`event:'ASSESSMENT_CARD_CHANGE'`、`studentId`、`action:'show'|'hide'`、`cardType:'beery'|'tvps4'|'dem'|null`，可选 `beeryItemNumber` / `tvpsSubtestCode` / `tvpsItemIndex` / `tvpsPhase` / `tvpsRemaining` / `demTest`）。
- ✅ 服务端：`SessionGateway` 新增 `ASSESSMENT_CARD_CHANGE` 处理器——只接受 `role==='therapist'`（学生端返回 `forbidden`），空 `studentId`、非法 `action`、`show` 带非法 `cardType` 返回 `invalid_payload`，成功广播 `role:student`；未知 `studentId` 不查存在性，由学生端按 `studentId` 过滤。
- ✅ 发送通道：`useWebSocket` 增 `onAssessmentCardChange` 与句柄稳定的 `emitAssessmentCardChange`；`TeacherLayout` 把后者写入 store 的 `teacherEmitAssessmentCard` 槽（卸载置 null），与 `teacherSwitchStudent` 共用同一条教师 socket。
- ✅ 教师端：`ScaleAssessmentPanel` 新增「双屏评估出示」栏与每张卡一个「远程出示」/「已出示 · 重发」；面板持有 TVPS 子测验/样例题/阶段/剩余秒与 DEM 测试项，出示后切题、翻子测验、换矩阵、每秒倒计时自动重发；「收回评估卡」发 `hide`；离开第 4 步（组件卸载）自动收回；出示状态是面板本地 state（不进 store），切学生自动作废。
- ✅ 组件受控化（props 全部可选，不传时保持原内部状态）：`Tvps4Card` 增 `subtestCode` / `itemIndex` / `phase` / `remaining` 受控与对应 `on*Change`、`readOnly`（隐藏子测验选择与翻题）；`DemMatrix` 增 `test` / `onTestChange` / `readOnly`；`BeeryVmiCard` 增 `readOnly`（隐藏题号选择器与教师提示）。学生端本地「评估出示」行为不变。
- ✅ 学生端：`StudentPadPage` 增 `assessmentCard` state 与 `onAssessmentCardChange`——`studentId` 不匹配忽略，`show` 设卡并进入 `mode='assessment'`，`hide` 清卡回训练；`SWITCH_STUDENT` / `SWITCH_PAD_TASK` / 切学生时清卡回训练。远程卡只读渲染（Beery 受控题号不传 onScore；TVPS 四项受控、`revealAnswer=false`、不自行改阶段；DEM 受控测试项），只传索引、读种子渲染。本机「评估出示」仍在，与远程卡 last-write-wins（「改用本机出示」清远程卡）。训练计时与数字额度沿用 `mode !== 'training'` 门禁自动暂停，不写 digital-start/addDigital。
- ✅ `scripts/verify-task6.mjs` 新增 9 项断言：教师 Beery / TVPS-4（含子测验/阶段/剩余秒）/ DEM show 学生收到、收回 hide、学生端发 `forbidden` 且未广播、空 `studentId` 为 `invalid_payload`、未知 `studentId` 照发到 `role:student`（学生端过滤）。
- 验证：`npm run build`（shared-types + api + web，含 web `tsc --noEmit`）EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿（Task 6 含新增 9 项）；两窗口浏览器（3100 演示库 + `all` / `student` 两个真实构建 + headless Chrome 双标签 CDP，30/30 通过）：教师第 4 步出示 Beery 学生端只读显示、切第 9 题跟随、TVPS 切 MEM 5 秒倒计时后自动切选项、DEM 换 Test C、训练计时出示暂停收回恢复、学生本机面板与远程卡 last-write-wins、离开第 4 步自动收回、切学生清卡、发给其他学生的卡不影响本机。
- 验证：`VITE_TERMINAL=student` + LAN env（`192.168.0.188:3000`）构建、`npx cap sync android`、`./gradlew assembleDebug` 成功（APK 4,173,454 B，`com.vmitis.pad`，minSdk 22 / targetSdk 34，`apksigner verify` 通过，bundle 含 `ASSESSMENT_CARD_CHANGE` 与 `192.168.0.188`）。
- 未验证：平板真机安装/运行与跟随（交主代理）；本机 Linux 下 Node 为 v24.22.0（项目基线 v20.20.2）。
- 未 commit/push。

### 提交、收口与会话结束（2026-10-21）
- b3/b4/b5 分批提交：`0c5b0ea`（b3 入口分离代码 + b3 记录）、`36a50fa`（b4 记录）、`ee53b65`（b5 记录 + 文档 + 交接）、`29a366a`（b3/b4/b5 收口）；未 push。
- 主代理复核：Node 20 `build`/`verify:all` 全绿（b5 9 项断言）；平板 b3 学生包、b4 刘诺一跟随、b5 Beery 只读出示均已实测。
- 工作区另有 V2.1 种子（MVPT-4，来源 Gemini）未提交、未清理；含该改动时 `build`/`verify:all` 仍全绿；待用户决定采用与否。

## 2026-10-21 评估种子 V2.3.1 数据溯源修正（b6）

- ✅ 采用 V2.3 种子（Windows 树复制进 WSL），修订为 V2.3.1：新增 `SCALE_PROVENANCE_REGISTRY`（10 个量表，含 `dataStatus` 与文献出处）、NSUCO 分龄表、MVPT-4 45 / TVPS-4 126 / Beery VP 30 / MC 30 / TVMS-3 39 条题号索引、RAN/RAS 4 套 5×10 矩阵、SPSRC 37+93 结构。
- ✅ 修五个硬缺陷：定级对 TVPS-4/MVPT-4 取较低值；MVPT-4 14 岁以上不自动换算（`standardScore: null`）；出处注册表与数据对齐；RAS 矩阵补池内 `6` 且无相邻重复；删除未实现的 `CustomNormOverride` 声明。
- ✅ 文档：还原 `docs/vmi_tis.md` 的 Gemini 重写，保留 HTML 报告与“不伪造题库”口径；支持量表改 MVPT-4，新增数据来源分级说明（`docs/vmi_tis.md:52,59,60`）。
- 验证：Node v20.20.2，`npm run build` EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿；全新临时 SQLite `file:/tmp/vmi_b6_verify_20261021.db` 的 `db:push + db:seed + db:verify` 全通过（13 卡 / 6 学生）。开发库 `apps/api/data/vmi_tis.db` 有 65 名学生（历史测试数据），未清理。
- 未验证：b7 的 DTO / Prisma `mvpt4Std` 列 / 前端 MVPT-4 记分台 / 报告行；浏览器 UI 与平板真机未做。
- 未 commit/push；b6 记录 `docs/batches/b6-assessment-provenance.md` 待独立评审与用户验收。
- 独立评审两轮（第一轮 9 项，第二轮 8 Fixed / 1 Accepted / 1 Unfixed 🔵，VERDICT pass）；评审修复后 `npm run verify:all` 复跑 Task 2/3/4/6 全绿；b6 已收口（2026-10-21）。

## 2026-10-21 MVPT-4 后端与前端接入（b7）

- ✅ 后端：DTO 增 `mvpt4RawScore` / `mvpt4ItemScores45`（45 项 0/1）/ `mvpt4Std`；Prisma `mvpt4Std` 列；`AssessmentGradingService` 调 `calculateMvpt4Norms`，手册标准分优先、自动换算兜底；`meta.mvpt4` 保存原始分、标准分、百分位、等效年龄、`normApplied/normNote` 与薄弱维度；报告增 MVPT-4 标准分/来源/原始分/等效年龄/薄弱维度行。
- ✅ 前端：第 4 步 MVPT-4 45 题记分台（5 维 × 9 题三态、MEM 5 秒提示、薄弱维度提示、回填原始分）；`RecordSummary` 表单/汇总/保存后卡片；`AssessmentPage` 提交 45 项数组；新流程移除 MVPT-3 录入。
- 验证：`npm run build` EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿，Task 3 新增 8 项 MVPT-4 断言（逐题全 1、手册 70→L2、手册优先、44 项→400、14+→null、全 0→5 薄弱域、报告两行）；临时库 `db:verify` 通过；开发库已 `db:push` 增 `mvpt4_std` 列（65 名历史学生未清理）。
- 未验证：浏览器 UI 与平板真机；14 岁以上只给 raw 的端到端 API 行为（种子函数已断言）；报告四类数据状态标签。
- 未 commit/push；b7 记录 `docs/batches/b7-mvpt4-integration.md` 已收口（独立评审两轮，第二轮 pass）。
- 已提交 `00b9eb0`（b6/b7 共 17 个文件）；未 push。开发库 `apps/api/data/vmi_tis.db` 已 force-reset + seed，现为 6 名学生 / 13 张卡；重置前备份 `/tmp/vmi_tis_before_reset_20261021.db`。

## 2026-10-21 量表数据现状文档与主流程冒烟

- ✅ `docs/vmi_tis.md` 新增 §6.2.3.1「量表题库与常模现状」：10 个量表逐项列出数据状态、题库/刺激、常模、缺口与正式结论边界；当前 0 个 `OFFICIAL_LICENSED`（5 `MANUAL_ENTRY_ONLY` / 2 `PROJECT_APPROXIMATION` / 3 `STRUCTURE_ONLY`）。
- ✅ 主流程冒烟（临时库 `file:/tmp/vmi_flow_20261021.db`，API 3100）：6 学生 / 13 卡 → 创建评估（TVPS-4 七项 + MVPT-4 raw 30 + Beery VMI）→ 自动定级 L4 → 生成 HTML 报告（含 MVPT-4 标准分、薄弱维度）→ 创建 IEP（L4，3 次/周）→ 周课表 → 开始课次 → 切阶段 2 → 记录 trial → 完成课次 → 创建家庭作业 → 家长打卡 → 分析接口返回 1 次已完成课次、1 次已完成作业。
- ✅ UI 走查（headless browser）：`/web/home`、`/web/students`、`/web/assessment`（第 1–2 步）、`/web/iep`、`/parent`（显示“图形-背景家庭练习 · 已完成 10 分钟”）、`/student`（Pad 游戏与 900 秒额度）均正常渲染。
- 临时 API 已停止；临时库保留在 `/tmp/vmi_flow_20261021.db`，开发库仍是 6 名学生 / 13 张卡。
- 本轮文档改动未提交，待用户放行。

## 2026-10-21 · Node 24.22.0 基线 + 学生包 APK

- 用户决定把项目 Node 基线从 `v20.20.2` 改为 `v24.22.0`。已同步 `AGENTS.md`、`README.md`、`WSL2_HANDOFF.md`、`docs/会话启动.md`、`docs/会话结束.md`、`docs/项目速览-费曼版.md`、`docs/index.md`、`docs/vmi_tis.md`、`deploy/start_standalone.bat`、`package.json`、`package-lock.json`、`apps/api/Dockerfile`（`node:24-alpine`），新增 `.nvmrc`。
- Node `v24.22.0`：`npm run build` EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿。
- 学生包 APK：`VITE_TERMINAL=student`、`VITE_API_BASE=http://192.168.0.188:3000`、`VITE_SOCKET_URL=http://192.168.0.188:3000`、`VITE_SOCKET_TOKEN=vmi-tis-dev-token`；`npx cap sync android` + `./gradlew --no-daemon --max-workers=2 clean assembleDebug` 成功；3.9 MB，`com.vmitis.pad`，`apksigner verify` 通过；`adb -s 192.168.0.67:34905 install -r` 成功并启动，学生端首页正常。
- APK 归档：`F:\Projects\VMI-TIS-backup\apk\vmi-tis-pad-20261021-1631-debug.apk`，SHA256 `a0739278b5e43390cfa65bcd9b13b928acaa052d8ee8211392e07d7b0b7f7362`。
- 注意：b8 的评估徽标与 CSV 是教师端 `/web`，学生包不含这些页面；Pad 不显示 b8 改动。Docker 镜像未用 Node 24 重建/实测；Windows 侧 Node 仍为 24.18.0，需升级到 24.22.0 后复验。
- 本轮基线文档与 APK 构建改动已提交并推送 `origin/main`（`dac3029`）。
