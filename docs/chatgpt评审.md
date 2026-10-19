## 0. 结论

**Not ready。** 当前代码存在可复现的红区训练绕过、重复晋级、900 秒额度越界和跨学生量表计数串扰。PostgreSQL Schema 生成结果也仍是 SQLite。Task 2 至 Task 6 的通过结果没有覆盖这些反例。

评审使用本地干净的 `main@afce85b`，未修改受版本控制的文件。`db:verify` 只读通过。Task 2、3、4 分别在全新隔离 SQLite 库通过 24/24、16/16、32/32；Task 5 静态检查通过；Task 6 在 Task 4 的测试库上通过 7/7。临时库和服务已清理。`npm run build` 在 Prisma Client DLL 重命名时遇到 `EPERM`，原有 3000 端口服务仍在运行；随后单独执行的 API 编译和 Web 构建通过。

## 1. 发现表

| ID | 级别 | 区域 | 文件:行 | 问题 | 影响 | 最小修复 |
|---|---|---|---|---|---|---|
| F01 | P0 | R1 | [students.service.ts:120](F:/Projects/VMI-TIS/apps/api/src/students/students.service.ts:120) | `PATCH /students/:id` 可直接写 `triageStatus`。隔离库中把红区改为 `GREEN_ACTIVE` 返回 200。 | 客户端可绕过转介审批。 | 从通用更新 DTO 和服务中移除状态字段，只允许状态机方法写入。 |
| F02 | P0 | R1 | [triage.service.ts:195](F:/Projects/VMI-TIS/apps/api/src/assessments/triage.service.ts:195) | 每条规则用 `.find()` 取首个同关键词项目。先报 0、再报屈光参差 2.0 时，实测 `isRedZone=false`。 | 红区漏判。 | 对所有匹配项用 `.some(item => rule.matches(item.score))`。 |
| F03 | P0 | R1 | [triage.service.ts:85](F:/Projects/VMI-TIS/apps/api/src/assessments/triage.service.ts:85) | 新提交一份空的初筛即可把已有红区学生改成绿区，隔离库实测成功。 | 历史红区未审核即解锁。 | 重筛不得自动清除未闭环红区；状态变更核对未完成转介。 |
| F04 | P0 | R1 | [triage.service.ts:139](F:/Projects/VMI-TIS/apps/api/src/assessments/triage.service.ts:139) | `auditReferral` 不检查是否为红区、是否上传回执、当前是否待审核。未上传回执直接 `APPROVED` 实测返回 201 并解锁。 | 转介状态机失效。 | 审批前校验红区单、回执和 `REFERRAL_UPLOADED` 状态，条件更新并事务化。 |
| F05 | P0 | R1 | [sessions.controller.ts:25](F:/Projects/VMI-TIS/apps/api/src/sessions/sessions.controller.ts:25) | 创建课次未使用 `RedZoneGuard`，服务也未校验。红区学生直接 `POST /sessions` 实测返回 201；`PENDING_SCREENING` 也未被守卫列为锁定。 | 绕过排课前置校验启动训练。 | 在 `SessionsService.start` 以 `GREEN_ACTIVE` 为准校验，并覆盖所有训练入口。 |
| F06 | P0 | R2 | [assessment-record.service.ts:41](F:/Projects/VMI-TIS/apps/api/src/assessments/assessment-record.service.ts:41) | 客户端提供的 `sessionId` 单独作为 Map 键。两名学生共用 ID 时，第二名首题 0 分实测被判为第三题并中止。前端切换学生时也复用页面级 ID。 | 错误中止施测。 | 键包含 `studentId`、`evalPhase`、`sessionId`；重置和题号同样按该组合处理。 |
| F07 | P0 | R3 | [promotion-check.service.ts:98](F:/Projects/VMI-TIS/apps/api/src/iep/promotion-check.service.ts:98) | 审批后同三次课仍可再次标记 `PROMOTION_READY`。隔离库实测 L2 再升 L3，无新增课次。 | 同一证据可反复晋级。 | 记录上次晋级的课次截止点，仅用之后的新课次判定；审批时重新核验。 |
| F08 | P0 | R4 | [sessions.service.ts:146](F:/Projects/VMI-TIS/apps/api/src/sessions/sessions.service.ts:146) | 只检查写入前是否已达 900，未检查本次增量。实测 899 秒加 2 秒 Trial 返回 201，累计 901。 | 900 秒硬上限可越过。 | 写入前检查 `current + delta <= 900`，与累计更新原子化。 |
| F09 | P0 | R4 | [StudentPadPage.tsx:332](F:/Projects/VMI-TIS/apps/web/src/pages/student/StudentPadPage.tsx:332) | 学生端休息 20 秒后调用同一 `digital-reset`，把本课额度重新置为 900；接口只接受可自填的 `authorizedBy`。 | 单次课累计上限可反复清零。 | 学生端休息只解除遮罩，不重置累计额；重置须由服务端核验教师授权。 |
| F10 | P0 | 数据 | [sessions.service.ts:155](F:/Projects/VMI-TIS/apps/api/src/sessions/sessions.service.ts:155) | Trial 采用读 `trialsJson`、追加、整串写回。并发请求会互相覆盖，正确率也随之错误。 | 回合记录丢失。 | 使用带旧值条件的更新与冲突重试，或把 Trial 拆为独立记录。 |
| F11 | P0 | 实时通道 | [session.gateway.ts:30](F:/Projects/VMI-TIS/apps/api/src/gateway/session.gateway.ts:30) | 房间身份取自握手 query，两个事件不校验发送方与 payload。任意连接可加入他人房间、冒充教师切游戏或伪造 Pad 回传。 | 跨学生信息暴露、训练指令被冒充。 | 握手验证会话身份，服务端绑定角色和学生；逐事件校验角色、目标和负载。 |
| F12 | P0 | Docker | [.dockerignore:1](F:/Projects/VMI-TIS/.dockerignore:1)、[Dockerfile:12](F:/Projects/VMI-TIS/apps/api/Dockerfile:12) | `.dockerignore` 未排除 `.env`，而 `COPY . .` 会复制构建上下文；本地确有 `apps/api/.env`，其内容未读取。 | 镜像可能携带配置秘密。 | 排除根目录及子目录 `.env`，构建后检查镜像文件清单。 |
| F13 | P1 | PostgreSQL | [prepare-schema.mjs:33](F:/Projects/VMI-TIS/scripts/prepare-schema.mjs:33) | 正则先匹配 Schema 注释。实际生成文件第 15 行仍为 `provider = "sqlite"`，已复现。 | PostgreSQL 模式构建与连接不成立。 | 只替换 datasource 内锚定的实际 `provider` 行，并断言生成结果。 |
| F14 | P1 | Docker | [Dockerfile:7](F:/Projects/VMI-TIS/apps/api/Dockerfile:7) | `npm ci` 前只复制 API 与 shared-types 的 workspace manifest，漏了 `apps/web/package.json`，后续却执行含 Web 的根构建。Docker 构建未实跑。 | workspace 安装和 Web 构建不可靠。 | 在 `npm ci` 前复制 Web manifest；运行完整镜像构建验证。 |
| F15 | P1 | 训练选卡 | [sessions.service.ts:324](F:/Projects/VMI-TIS/apps/api/src/sessions/sessions.service.ts:324) | 回退列表没有 L4，`indexOf('L4')=-1`，实际给 L4 学生选了 L0 卡，隔离库已复现。 | 训练材料层级错误。 | 显式处理 L4 向 L3 回退，或使用含 L4 的有序层级表。 |
| F16 | P1 | 自动定级 | [auto-level.service.ts:46](F:/Projects/VMI-TIS/apps/api/src/assessments/auto-level.service.ts:46) | `classroomAdaptationPass=false`、Beery=85、TVPS 未填时输出 L5，隔离库已复现。缺失指标按达标处理的既定策略未用于 L4 分支。 | 明确的课堂适应不足被忽略。 | L4 条件对缺失 TVPS 按既定默认策略判断。 |
| F17 | P1 | 一致性 | [assessment-record.service.ts:112](F:/Projects/VMI-TIS/apps/api/src/assessments/assessment-record.service.ts:112) | 评估记录创建与学生 `currentLevel` 回写是两次独立写入。 | 后一步失败会留下记录层级与学生层级不一致。 | 将两次写入放入同一 Prisma 事务。 |
| F18 | P1 | Excel | [students.controller.ts:39](F:/Projects/VMI-TIS/apps/api/src/students/students.controller.ts:39) | 内存上传无文件大小限制；[students.service.ts:209](F:/Projects/VMI-TIS/apps/api/src/students/students.service.ts:209) 按 `rowCount` 无上限逐行写入，并把原始解析/数据库错误返给客户端。 | 大文件耗尽内存，失败行可能泄露内部错误。 | 限制大小、行数和扩展名/MIME；错误行映射为固定业务原因。 |
| F19 | P1 | 家长打卡 | [TasksTab.tsx:17](F:/Projects/VMI-TIS/apps/web/src/pages/parent/TasksTab.tsx:17) | “上传视频并打卡”按钮提交固定演示 URL，没有文件选择或上传。 | 用户以为已上传视频，数据库却只记录占位路径。 | 实际选择并上传文件，成功取得 URL 后再提交打卡。 |
| F20 | P1 | 视频清理 | [homework.service.ts:183](F:/Projects/VMI-TIS/apps/api/src/homework/homework.service.ts:183) | `unlinkSync` 失败后仍写 `videoDeletedAt`。 | 文件保留，但记录声称已清理，后续不再重试。 | 仅在确认删除或确认远程资源清理后标记；失败保留待重试状态。 |
| F21 | P1 | 视频清理 | [homework.controller.ts:34](F:/Projects/VMI-TIS/apps/api/src/homework/homework.controller.ts:34) | 清理只有手动 POST 入口；代码中未见定时调用。 | “7 天自动清理”不会自动发生。 | 为现有服务接入定时触发，并只处理到期记录。 |
| F22 | P1 | 学生 Pad | [StudentPadPage.tsx:88](F:/Projects/VMI-TIS/apps/web/src/pages/student/StudentPadPage.tsx:88) | 选过红区学生后 `locked` 被置为 `true`，切到绿区学生时未重置。 | 合法学生仍看到红区锁屏。 | 每次加载学生详情时从当前状态重新计算 `locked`，同时清空旧课次状态。 |
| F23 | P1 | 盲操 | [useKeyboardShortcuts.ts:29](F:/Projects/VMI-TIS/apps/web/src/hooks/useKeyboardShortcuts.ts:29) | 只排除输入框等，未排除已聚焦按钮。焦点在“结课”等按钮上按 Space 会记一次成功而非激活按钮。 | 误记分，也影响键盘操作。 | 聚焦交互控件时不触发全局快捷键。 |
| F24 | P1 | Android | [AndroidManifest.xml:4](F:/Projects/VMI-TIS/apps/web/android/app/src/main/AndroidManifest.xml:4)、[.env.example:6](F:/Projects/VMI-TIS/apps/web/.env.example:6) | 示例使用 HTTP 局域网 API，但 targetSdk 34 配置没有明文流量例外。Android 9 起明文流量默认受限；真机效果未验证。[Android 说明](https://developer.android.com/about/versions/pie/android-9.0-changes-28) | 按示例构建的 APK 可能无法连接 API。 | 优先使用 HTTPS；若必须使用 HTTP，仅为指定内网地址配置例外并真机验证。 |
| F25 | P1 | Android | [MainActivity.java:5](F:/Projects/VMI-TIS/apps/web/android/app/src/main/java/com/vmitis/pad/MainActivity.java:5) | 入口仅继承 `BridgeActivity`，未见沉浸式或 Kiosk 控制代码。 | Task 6 的状态栏、导航栏隐藏验收尚无实现证据。 | 在原生入口实现所需系统 UI 控制并在真机验收。 |
| F26 | P1 | 验收脚本 | [verify-task2.mjs:6](F:/Projects/VMI-TIS/scripts/verify-task2.mjs:6)、[verify-task4.mjs:6](F:/Projects/VMI-TIS/scripts/verify-task4.mjs:6) | 默认指向 `localhost:3000`，无测试库身份检查，也不清理写入。Task 2/4 还依赖固定初始数量。 | 复跑误报；误连现有服务会污染数据。 | 脚本要求显式测试地址与测试实例标识，由 runner 为每次运行创建新库。 |
| F27 | P1 | 审计 | [audit-log.interceptor.ts:57](F:/Projects/VMI-TIS/apps/api/src/common/interceptors/audit-log.interceptor.ts:57) | 学生 CRUD 的完整响应写入 `changesAfterJson`，包含档案字段；审计查询直接返回该 JSON。 | 额外复制敏感资料，扩大已知无 RBAC 的暴露面。 | 只记录字段名、状态变化及必要标识，移除姓名、电话和主诉等响应快照。 |
| F28 | P2 | 学生选择 | [StudentSelector.tsx:41](F:/Projects/VMI-TIS/apps/web/src/components/StudentSelector.tsx:41) | 列表只在首次挂载时加载。新建学生后选择器不刷新。 | 新学生需刷新页面才可选。 | 创建成功后触发列表刷新或统一使学生查询缓存失效。 |
| F29 | P2 | 单机启动 | [start_standalone.bat:38](F:/Projects/VMI-TIS/deploy/start_standalone.bat:38) | 只以 API `dist/main.js` 判断是否需要构建，未检查 Web `dist/index.html`。 | API 产物存在、Web 产物缺失时健康检查通过但首页不可用。 | 同时检查 Web 入口文件，缺任一产物就构建。 |

## 2. 交付前必须修的 Top 5

1. **封闭 R1 所有状态入口，F01 至 F05。** 状态只由初筛和回执审核流程修改，训练开始必须在服务端要求 `GREEN_ACTIVE`。验证：在全新测试库运行 `node scripts/verify-task2.mjs`，随后对红区学生执行 `POST /api/sessions`，应返回 403；空初筛、无回执审批及通用 `PATCH triageStatus` 均不得解锁。

2. **防止同一证据重复晋级，F07。** 保存晋级截止课次，只统计之后完成的新课次，审批时再次核验。验证：在全新测试库运行 `node scripts/verify-task4.mjs`；首次审批后立即执行 `GET /api/promotions/<studentId>/check`，应为 `canPromote=false`，再次审批应失败。

3. **落实 R4 的累计硬上限，F08、F09。** 对增量做原子额度检查，学生端休息不能清零本课累计值。验证：新课次累计 899 秒后提交 `digitalSeconds:2`，应返回 403 且数据库仍为 899；到 900 后休息 20 秒再次启动数字训练仍应被拒绝，除非完成服务端核验的教师重置。

4. **约束实时房间和事件，F11。** 服务端验证连接身份，并检查 `SWITCH_PAD_TASK` 与 `PAD_TRIAL_COMPLETED` 的发送角色、学生归属。验证：运行 `node scripts/verify-task6.mjs` 保持正常双屏路径；再用匿名连接尝试加入他人 `studentId` 房间和发送两种事件，均应被拒绝。

5. **修复服务器版构建链，F12 至 F14。** 精确替换 datasource 的 provider，补齐 Web workspace manifest，排除 `.env`。验证：`node scripts/prepare-schema.mjs --target postgresql` 后检查生成文件实际 `provider = "postgresql"`；再执行 `docker compose -f deploy/docker-compose.yml build` 并检查镜像不含 `.env`。本轮未运行 Docker。

## 3. 未评审 / 假设

- 附件 ZIP 未单独打开。本地 checkout 的 HEAD 为 `afce85b`，工作区最终仍干净；优先文件在 checkout 中均可见。Android `local.properties` **未见该文件**于受版本控制清单。
- 未运行 Docker、PostgreSQL 服务、Android Gradle/APK、真机和浏览器性能验收。Gradle 8.2.1、AGP 8.2.1、compileSdk 34 的版本组合与官方 AGP 8.2 要求相符，运行它需要 JDK 17；本轮未检查本机 JDK 或实际 Android 构建。[Android 官方兼容表](https://developer.android.com/build/releases/agp-8-2-0-release-notes)
- Task 3 脚本**确实覆盖了 `reset=true`**，不应把“完全缺少 R2 reset 测试”列为发现。Task 4 只验证 0.9 正确率和达到 900 秒后的下一次拦截，未覆盖刚好 0.8、材料不足、重复审批及 899 加 2 秒。Task 6 只验证正常事件路径；Task 5 主要检查文件存在与源码字符串。
- 已知的 HTML 报告、H5 家长端、未编译 APK、未运行 Docker、无 RBAC、进程内 R2 状态等偏差未作为新发现重复列项。它们仍限制完整 SRS 验收。尤其无 RBAC 与开放 CORS 会放大 F11、F27 的影响。