# VMI-TIS 孤独症学生视觉运动整合训练干预系统

面向孤独症学生与特教/康复机构的**视觉运动整合训练干预系统**：四层评估 → 红区分流 → IEP/ITP 计划 → 五段式课堂训练 → 家校协同 → 数据画像与科研导出。三端合一：教师工作台 `/web`、学生 Pad `/student`、家长端 `/parent`；同一份 React 代码构建 Web 与 Capacitor Android APK。

产品定位是**机构内部工具**：数据留在机构内网或单机，不引入云账号与外部数据上报。它做筛查、训练支持和转介提醒，**不是医院诊断设备**；发现红区只负责锁定训练并生成转介单，最终诊断由眼科/医生完成。

> 第一次接触项目，先读 [`docs/项目速览-费曼版.md`](docs/项目速览-费曼版.md)；代理规则与红线读 [`AGENTS.md`](AGENTS.md)；当前现场读 [`.continue-here.md`](.continue-here.md)。

## 核心闭环

1. **入案初筛**：红区眼病指征、0–6 岁发育里程碑、日常视觉行为筛查。
2. **四层评估**：视光与眼动、视觉感知、视觉运动整合、课堂应用；工具包括 Beery VMI-6、TVPS-4、MVPT-3、DEM、NPC、NSUCO。
3. **红区分流**：命中红区即锁定高强度视觉训练并生成转介单；回执审核通过后才回到绿区。
4. **L0–L5 定级**：按“先稳身体、再练眼动、再练看图、再练手眼、再进课堂、最后进生活”的顺序定起点。
5. **IEP/ITP 一人一案**：选操作卡、定每周频次、定数字训练上限。
6. **五段式课堂**：教师按固定五段上课、记回合、记提示层级；系统守护眼和晋级条件。
7. **家校协同与数据画像**：家长打卡/视频，教师回复；数据进入分析、报告与科研导出。

## 三端与四条护栏

| 终端 | 路由 | 主要工作 |
|---|---|---|
| 教师工作台 | `/web` | 学生档案、评估、IEP、排课、课堂记分、操作卡、分析、审计 |
| 学生 Pad | `/student` | 四款 Canvas 训练游戏；另有“评估题卡出示”模式 |
| 家长端 | `/parent` | 家庭作业打卡、视频上传、教师回复、家长留言 |

四条红线（完整语义见 `AGENTS.md`）：

- **R1 红区熔断**：红区/待审核回执学生不能排课或启动训练；红区项由服务端重新计算。
- **R2 连续 0 分中止**：连续 3 题 0 分立即中止量表并保留进度；状态键含 `studentId + evalPhase + sessionId`。
- **R3 晋级**：连续 3 次课 ≥80% + ≥2 种材料 + ≥1 次家庭打卡 → `PROMOTION_READY`，审批前重新核验。
- **R4 护眼硬锁**：数字训练累计 900 秒硬顶；20 秒远眺只关遮罩，不重置本课额度；教师重置需服务端授权码。

## 技术栈（已冻结）

- **后端**：Node.js 24 LTS + NestJS 10 + Prisma 5 + Socket.io；REST 统一前缀 `/api`；API 直接托管 `apps/web/dist`、报告与上传文件。
- **数据库**：SQLite 3（单机默认）↔ PostgreSQL 15（医院/服务器，Docker）；唯一 Schema `prisma/schema.prisma`；只改 `provider` 与 `DATABASE_URL`。
- **前端**：React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + Zustand + React Router + Chart.js 4 + socket.io-client；三端是同一 `apps/web` 的路由级终端。
- **Android**：Capacitor 6；`apps/web/android`（Gradle 8.2.1 / AGP 8.2.1 / compileSdk 34 / minSdk 22），appId `com.vmitis.pad`，appName `星眸智康 Pad`；Vite 静态产物经 `npx cap sync android` 打入 APK。
- **测试**：`scripts/run-verification.mjs` 统一跑 Task 2/3/4/6；每个任务使用全新隔离 SQLite + 3100 测试 API。

## 目录结构

```
prisma/schema.prisma              # 数据库唯一事实源（8 张表，SQLite 默认）
packages/shared-types/            # 前后端共享 TypeScript 类型契约（npm workspace）
  src/index.ts                    # 共享枚举、实体接口与 DTO 契约
  src/vmi_tis_assessment_scales_seed.ts  # 评估唯一数据/公式源
apps/api/                         # NestJS 后端
  src/main.ts                     # 启动入口，/api 前缀，端口 3000
  src/app.controller.ts           # GET /api/health
  src/assessments/                # 四层评估、R1/R2、定级、报告
    assessment-grading.service.ts # 输入映射 + 调用种子 6 个纯函数
  src/prisma/seed.ts              # 13 张操作卡 + 6 名示例学生（幂等）
  src/prisma/verify-seed.ts       # Seed 验收脚本
apps/web/                         # React 三端（同一构建）
  src/pages/web/                  # 教师工作台（9 页）
  src/pages/student/              # 学生 Pad（4 款 Canvas 游戏）
  src/pages/parent/               # 家长端（4 Tab）
  src/components/assessment/      # 评估题卡/初筛/NSUCO 组件
  android/                        # Capacitor Android 原生工程
deploy/
  start_standalone.bat            # Windows 单机版一键启动
  run_api.bat                     # 后端进程启动（由上一个脚本调用）
  docker-compose.yml              # PostgreSQL 服务器版
scripts/
  run-verification.mjs            # Task 2/3/4/6 统一验收
  verify-task{2,3,4,5,6}.mjs        # 各任务验收脚本
  prepare-schema.mjs              # 从根 Schema 生成指定 provider 的副本
  generate-client.mjs             # 生成 Schema 与 Prisma Client
docs/                             # 产品/设计/任务卡/进度/会话流程/文档地图
```

Schema 只保留根目录一份，`apps/api` 不再复制。Prisma 命令通过
`--schema ../../prisma/schema.prisma` 指向根文件；切换数据库时只改根 Schema 的
`provider` 与 `DATABASE_URL`。

## 环境要求

- Node.js `v24.22.0`（验收基线；nvm 默认即该版本）
- npm 11.19.1

## 快速开始（SQLite 单机版）

```bash
npm install
npm run db:push      # 建库：apps/api/data/vmi_tis.db
npm run db:seed      # 导入 13 张操作卡 + 6 名学生
npm run db:verify    # 校验数量、编码、JSON 字段与关键状态
npm run build        # shared-types + api + web
npm run start        # 生产启动
# 开发模式：npm run start:dev
```

健康检查：

```bash
curl http://localhost:3000/api/health
# {"status":"ok","service":"vmi-tis-api","database":"sqlite",...}
```

完整验收（Node `v24.22.0`，每个任务全新隔离 SQLite + 3100 测试 API）：

```bash
npm run verify:all
```

Windows 单机版：双击 `deploy/start_standalone.bat`。脚本会检查端口、安装依赖、
建库、导入演示数据、启动 API，并在健康检查通过后打开浏览器。

## 构建期终端模式（`VITE_TERMINAL`）

同一份 `apps/web` 代码用构建期变量 `VITE_TERMINAL` 决定打包成哪一端；缺省 `all` 就是三端切换齐全的演示包。

| 值 | 首页 | 放行路由 | 三端切换 | 学生选择器 |
|---|---|---|---|---|
| `all`（缺省） | `/web/home` | 全部 | 显示 | 显示 |
| `student` | `/student` | 仅 `/student` | 隐藏 | 显示 |
| `teacher` | `/web/home` | 仅 `/web/*` | 隐藏 | 显示 |
| `parent` | `/parent` | 仅 `/parent` | 隐藏 | 显示 |

空值与非法值按 `all` 处理。非 `all` 模式下，根路径、未知路径与越权直链统一重定向回该终端首页；`teacher` / `parent` 暂只按需构建，不单独交付。

Bash（Linux / WSL / Git Bash）：

```bash
VITE_TERMINAL=student \
VITE_API_BASE=http://192.168.0.188:3000 \
VITE_SOCKET_URL=http://192.168.0.188:3000 \
VITE_SOCKET_TOKEN=vmi-tis-dev-token \
npm run build -w @vmi-tis/web
```

PowerShell（Windows）：

```powershell
$env:VITE_TERMINAL = 'student'
$env:VITE_API_BASE = 'http://192.168.0.188:3000'
$env:VITE_SOCKET_URL = 'http://192.168.0.188:3000'
$env:VITE_SOCKET_TOKEN = 'vmi-tis-dev-token'
npm run build -w @vmi-tis/web
```

学生包 APK：

```bash
cd apps/web && npx cap sync android
cd android && ./gradlew assembleDebug
# 产物 apps/web/android/app/build/outputs/apk/debug/app-debug.apk（包名 com.vmitis.pad）
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`VITE_SOCKET_TOKEN` 必须与 `apps/api/.env` 的 `SOCKET_TOKEN` 一致（开发默认 `vmi-tis-dev-token`）；用 HTTP 访问局域网 API 时，服务器 IP 需在 `apps/web/android/app/src/main/res/xml/network_security_config.xml` 中放行。`adb install -r` 保留应用数据，仅签名冲突时才需要先卸载。

## 跨窗口选学生同步（`SWITCH_STUDENT`）

教师在 `/web/*` 顶栏切换「当前学生」时，学生端（同机的 `/student` 窗口，或同一局域网的 student 包平板）通过 Socket.io `SWITCH_STUDENT` 跟随到同一名学生。学生端自己的选择器仍可改本窗口当前学生，但只改本地、不反向推动教师端；最后一次选择生效。

- 服务端只接受教师 socket（`role: 'therapist'`）发送；学生端发送返回 `forbidden`，空 `studentId` 返回 `invalid_payload`。
- 事件广播到 `role:student` 房间，而不是目标 `student:<id>`：学生 socket 连接时按当时的学生加入 `student:<id>`，切学生后才换房，按目标房间发会收不到。
- 学生端收到后清空旧课次/锁定/游戏状态并重载新学生；未知学生 id 只在该学生端弹 404 提示，不影响其他窗口。
- 平板跟随的前提是两边 `VITE_SOCKET_TOKEN` 与 `apps/api/.env` 的 `SOCKET_TOKEN` 一致，且平板能访问服务器 IP:3000。

## 评估双屏（`ASSESSMENT_CARD_CHANGE`）

教师在 `/web/assessment` 第 4 步点某张卡的「远程出示」，学生 Pad（同机 `/student` 窗口或 student 包平板）显示同一张评估卡；教师切题、翻 TVPS 子测验、换 DEM 矩阵、TVPS 5 秒倒计时都会自动跟随。点「收回评估卡」学生端回到训练；离开第 4 步也会自动收回。

- 与 `SWITCH_STUDENT` 共用一条教师 socket；服务端同样只认教师（学生端发返回 `forbidden`，空 `studentId` 返回 `invalid_payload`），广播 `role:student`，学生端按 `studentId` 过滤——发给其他学生的卡不会打扰本机。
- 只传索引：Beery 题号、TVPS 子测验/样例题/阶段/剩余秒、DEM 测试项；学生端读种子常量渲染，不传题目内容、不自动计分。
- 学生端只读：隐藏题号、子测验与矩阵切换；学生自己的「评估出示」仍可用，最后一次写入生效（教师再次出示会覆盖本机画面）。
- 评估卡出示期间训练计时与数字额度同步暂停（沿用 `mode='assessment'` 门禁），不记录 Trial；训练中出示即暂停，收回后恢复。
- 前提同样是两边 `VITE_SOCKET_TOKEN` 与 `apps/api/.env` 的 `SOCKET_TOKEN` 一致，且平板能访问服务器 IP:3000。

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
PostgreSQL 版 Schema 与 Client）。在 Windows 上先确认 3000/5432 未被占用。

## 演示数据

- 13 张操作卡：基础字段迁移自 `docs/vmi_tis_prototype.html` L1847-1861。
- 6 名学生：基础字段迁移自 `docs/vmi_tis_prototype.html` L1741-1844。
- `targetSkill / procedureStepsJson / passCriteria / digitalGameMode / parentTaskJson`
  原型未提供，按卡片语义与 R1–R4 规则补写；`cardCode` 规范化为 `Mx-x-x`。
- `birthDate` 由原型年龄字符串按 2026-10 基准反推，属演示数据，不是真实儿童数据。

## 评估模块的唯一数据/公式源

后端 `apps/api/src/assessments/assessment-grading.service.ts` 只做输入映射与落库，
算分和定级全部调用 `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`
的 6 个纯函数：`evaluateCeilingRule`、`calculateBeeryVmiNorms`、
`calculateTvps4ProfileNorms`、`calculateMvpt4Norms`、`evaluateDemTestResult`、
`determineRecommendedLevelL0ToL5`。

前端通过 `@vmi-tis/shared-types/assessment-seed` 子路径读取种子常量；根入口继续供
API/Node 使用。**禁止重写公式或编造题目**。

## 文档地图

- [`AGENTS.md`](AGENTS.md) —— 代理指令、红线、技术栈冻结与质量门禁（新会话必读）
- [`docs/项目速览-费曼版.md`](docs/项目速览-费曼版.md) —— 10 分钟读懂项目（非规范阅读导览）
- [`docs/index.md`](docs/index.md) —— 全量文档地图与权威源
- [`docs/vmi_tis.md`](docs/vmi_tis.md) —— 产品需求与详细设计（权威源）
- [`docs/IMPLEMENTATION_TASKS.md`](docs/IMPLEMENTATION_TASKS.md) —— Task 1–6 任务卡
- [`docs/PROGRESS.md`](docs/PROGRESS.md) —— 历史进度与验证记录
- [`docs/会话启动.md`](docs/会话启动.md) / [`docs/会话结束.md`](docs/会话结束.md) —— 会话恢复与收尾流程
- [`.continue-here.md`](.continue-here.md) —— 当前跨会话状态快照
- `WSL2_HANDOFF.md` —— WSL2 环境、端口与 Android 构建
