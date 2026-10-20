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
