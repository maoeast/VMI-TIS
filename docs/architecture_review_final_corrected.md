# VMI-TIS 系统架构审查报告（终版·已纠正）

**生成日期：** 2026-10-19  
**审查范围：** 基于完整原型 HTML（2676行）+ 完整需求文档 vmi_tis.md（635行）+ 4条工程建议

---

## 一、审查方法论说明

### 1.1 先前报告的认知偏差

**重大发现：** 之前的分析报告存在严重的"仅读原型、未读需求"盲区，导致将"需求文档已明确规定的完整设计"误判为"缺失功能"。

**纠偏证据链：**
1. **Prisma Schema 并非缺失**  
   - 误判：❌ "数据库 Schema 需要从零设计"  
   - 事实：✅ `vmi_tis.md` 第 228-412 行已包含完整的 8 表 Prisma Schema（Student / AssessmentTriageReferral / AssessmentRecord / SopCard / IepPlan / TrainingSession / HomeworkCheckin / AuditLog）

2. **四大强制规则并非缺失**  
   - 误判：❌ "红区熔断、晋级逻辑等核心算法未实现"  
   - 事实：✅ `vmi_tis.md` 第 191-219 行详细规定了四大强制规则（R1 红区熔断状态机、R2 连续3题0分中止、R3 连续3次≥80%晋级、R4 15分钟护眼硬锁）

3. **Android 跨端方案并非增量需求**  
   - 误判：❌ "Android APK 打包是可选扩展"  
   - 事实：✅ 需求文档第 120-130 行明确强制要求 `React + Capacitor` 跨端架构，直接打包成原生 APK

### 1.2 修正后的审查基准

**三重证据源：**
- **视觉基准（UI Truth）**：`vmi_tis_prototype.html` 2676 行完整三端交互原型
- **业务基准（Business Truth）**：`vmi_tis.md` 635 行完整需求规格说明书 V2.1
- **工程基准（Engineering Truth）**：四条落地建议（盲操快捷键、Excel 导入、审计日志、视频清理）

**本次报告结论：** 将明确区分"已完成设计文档 vs 待编码实现"，不再混淆"文档齐全"与"代码缺失"。

---

## 二、需求文档完成度评估（vmi_tis.md 635行全量分析）

### 2.1 已完整规定的核心设计（✅ 无需补充文档）

#### 架构设计（完备）
- ✅ Monorepo 工程目录树（138-171行）
- ✅ 技术栈强制清单：`React 18 + Vite + Capacitor + NestJS + Prisma`（122-131行）
- ✅ 数据库双模架构：SQLite 免安装 ↔ PostgreSQL 集群无缝切换（132-136行）
- ✅ Android 跨端规范：Capacitor 全屏沉浸模式 + 局域网配网（173-186行）
- ✅ WebSocket 降级保底策略：`transports: ['websocket', 'polling']`（436-437行）

#### 数据库设计（完备）
- ✅ 8 张表完整 Prisma Schema（228-412行）
  - `Student` 学生档案（红绿区状态机、晋级状态）
  - `AssessmentTriageReferral` 初筛与眼科转介
  - `AssessmentRecord` 四层评估记录（Beery VMI-6 / TVPS-4 / MVPT-3 / DEM / NSUCO）
  - `SopCard` 13 张标准化操作卡
  - `IepPlan` 智能 IEP 计划
  - `TrainingSession` 五段式课堂回合记分
  - `HomeworkCheckin` 家庭作业打卡（含7天自动清理字段）
  - `AuditLog` WHO/WHEN/WHAT 医疗审计
- ✅ SQLite/PostgreSQL 兼容约束：所有 JSON 字段统一用 `String` 序列化（224-226行警告）

#### 核心业务规则（完备）
- ✅ **规则 R1（红区熔断）**：191-198行  
  - 4 种状态：`PENDING_SCREENING` → `RED_ZONE_LOCKED` → `REFERRAL_UPLOADED` → `GREEN_ACTIVE`
  - 强制拦截：`triageStatus !== 'GREEN_ACTIVE'` 时排课接口返回 `403 Forbidden`
  
- ✅ **规则 R2（自动中止）**：200-208行  
  - 连续 3 题 0 分 → 弹窗中止测验
  - L0-L5 综合定级算法（身体稳定优先 → 视觉效率 → 视觉感知 → 视觉运动整合）
  
- ✅ **规则 R3（晋级与降级）**：210-214行  
  - 晋级触发：连续 3 次课 `accuracy_rate >= 80%` + 2 种材料 + 1 次家庭打卡
  - 降级保护：当堂课 `< 50%` → 建议降低提示等级或干扰密度
  
- ✅ **规则 R4（护眼防沉迷）**：216-219行  
  - 五段式时间分配：3min + 4min + 13min + 9min + 4min = 33-35min
  - 15 分钟数字锁：学生端游戏累计 900 秒 → 强制全屏护眼遮罩 + 教师解锁

#### API 契约（完备）
- ✅ 12 条 RESTful API 完整规格（419-432行）
- ✅ WebSocket 双屏协议（434-462行）
  - 教师端投屏控制：`SWITCH_PAD_TASK`
  - 学生端完成回传：`PAD_TRIAL_COMPLETED`
  - 眼动仪 60Hz 数据流：`/ws/eyetracker-stream`

#### 交付脚本（完备）
- ✅ SQLite 单机版一键启动脚本（468-492行）
- ✅ Docker Compose 医院服务器版（494-534行）

#### 多模型协同流程（完备）
- ✅ Claude Opus 架构拆解 → DeepSeek 编码 → ChatGPT 审查（537-615行）
- ✅ 5 阶段单模型执行指令模板（618-635行）

### 2.2 仅在原型中完成的部分（⚠️ 需从 HTML 迁移到 React）

#### 已有完整交互逻辑的功能（需代码迁移，非设计缺失）
- ⚠️ 三终端切换 (`switchTerminal()`)
- ⚠️ 学生档案动态筛选 (`renderStudentListTable()`)
- ⚠️ 五段式课堂切换 (`nextStageSession()`)
- ⚠️ Trial 记分盒子生成 (`generateTrialBoxes()`)
- ⚠️ Canvas 游戏（泡泡追追看、聚散球、找星星、眼动校准）
- ⚠️ 15 分钟护眼锁屏 (`toggleEyeRestOverlay()`)
- ⚠️ 操作卡语音播报 (Web Speech API)

**关键结论：** 这些功能在原型 HTML 中已有 JavaScript 实现，任务是"迁移到 React + TypeScript"，而非"从零设计"。

### 2.3 真正缺失的部分（🔴 需编码实现）

#### 后端服务（完全未实现）
- 🔴 NestJS 工程脚手架
- 🔴 Prisma Client 实例化与 Seed 脚本（13 张操作卡 + 6 名示例学生数据）
- 🔴 12 条 API 端点实现
- 🔴 Socket.io 服务端双屏同步
- 🔴 四大强制规则的后端校验逻辑
- 🔴 定时任务（Cron）：7 天视频清理

#### 前端工程化（原型为单体 HTML）
- 🔴 React 组件化拆分（8 个教师端页面 + 4 个学生端游戏 + 4 个家长端页面）
- 🔴 Zustand 状态管理 + IndexedDB 离线队列
- 🔴 Capacitor Android 桥接（全屏沉浸 + TTS + 相机 + 文件系统）
- 🔴 Vite 构建配置 + Tailwind CSS 工程化

#### 数据持久化（原型为内存变量）
- 🔴 Prisma Migrate 初始化（`npx prisma db push`）
- 🔴 SQLite 数据库文件生成（`./data/vmi_tis.db`）
- 🔴 Excel 批量导入功能（SheetJS 解析 + 批量插入）

#### 硬件集成（原型为占位接口）
- 🔴 Windows 眼动仪 WebSocket 桥接服务 (`ws://127.0.0.1:9800`)
- 🔴 Android 前置摄像头视线估计（可选 MediaPipe）
- 🔴 双模眼动适配器 (`EyeTrackerAdapter`)

---

## 三、原型 HTML 完成度评估（2676行全量分析）

### 3.1 已完成的视觉与交互元素（✅ 1:1 设计基准）

#### 三大终端完整界面（100% 布局 + 交互）

**终端一：机构/教师 Web 工作台（9 个页面）**
1. ✅ 工作台首页 (`web-page-home`)
   - 今日课表时间轴
   - 4 大指标卡片（在训学生数、今日课表、待办评估、家校互动）
   - L0-L5 分布柱状图（Chart.js）
   - 3 类智能预警（红区转介、晋级审批、阶段复评）

2. ✅ 学生档案中心 (`web-page-students`)
   - 筛选工具栏（姓名、能力层级、在训状态）
   - 动态表格渲染 (`renderStudentListTable()`)
   - Excel 批量导入占位按钮

3. ✅ 在线评估中心 (`web-page-assessment`)
   - 三子页签（电子量表施测、红区转介单、评估报告库）
   - 量表 0/1 判分按钮 + 连续 3 题 0 分中止提示
   - 模态框：评估报告生成预览

4. ✅ IEP 计划管理 (`web-page-iep`)
   - 操作卡勾选器（13 张卡片列表）
   - 周课表可视化日历（网格布局）
   - 晋级审批流程模拟 (`approvePromotionToL3()`)

5. ✅ 课堂训练记分台 (`web-page-session`)
   - 五段式环节切换按钮（`nextStageSession()`）
   - 10 个 Trial 记分盒子动态生成 (`generateTrialBoxes()`)
   - 实时倒计时显示（Stage 3 核心任务 13 分钟）

6. ✅ 数据分析看板 (`web-page-analytics`)
   - Chart.js 趋势图占位
   - 眼动热力图 Canvas 绘制占位

7. ✅ 家校作业打卡 (`web-page-homeschool`)
   - 待批作业列表
   - 家长留言展示
   - 批量派发任务占位

8. ✅ 操作卡资源库 (`web-page-library`)
   - 13 张标准化操作卡展示
   - 语音播报按钮（Web Speech API `speakSopCard()`）
   - 一键加入 IEP 占位

9. ✅ 系统设置 (`web-page-settings`)
   - 多角色权限配置占位
   - 护眼参数设置占位
   - 数据脱敏开关占位

**终端二：学生端互动训练（5 个模块）**
1. ✅ 泡泡追追看 (`playBubbleGame()`)
   - Canvas 60fps 动画循环
   - 眼动轨迹实时绘制（绿色光圈）
   - 点击碰撞检测

2. ✅ 奇妙聚散球 (`playVergenceGame()`)
   - Brock 线三球距离调节
   - 双眼视线 Canvas 模拟

3. ✅ 森林找星星 (`playFindStarsGame()`)
   - 4×6 网格图形-背景识别
   - 正确/错误即时反馈

4. ✅ 眼动 5 点校准 (`showCalibrationGame()`)
   - 屏幕九宫格校准点交互

5. ✅ 15 分钟护眼锁屏 (`toggleEyeRestOverlay()`)
   - 倒计时 + 全屏遮罩演示

**终端三：家长端微信小程序（4 个 Tab 页）**
1. ✅ 今日任务 (`mp-tab-tasks`)
   - 每日打卡表单
   - 练习时长记录
   - 提交成功反馈

2. ✅ 视频打卡 (`mp-tab-videos`)
   - 上传入口占位
   - 治疗师点评展示

3. ✅ 成长曲线 (`mp-tab-progress`)
   - 模拟 Chart.js 进步趋势图

4. ✅ 家校留言 (`mp-tab-chat`)
   - 实时消息列表
   - 发送交互 (`sendMpChatMessage()`)

### 3.2 已实现的核心 JavaScript 交互逻辑（✅ 可直接迁移）

```javascript
// 已有完整实现的函数（需从原型迁移到 React）
✅ switchTerminal(type)             // 三终端切换
✅ changeActiveStudent(studentId)   // 全局学生上下文
✅ renderStudentListTable()         // 动态表格渲染
✅ showToast(message, type)         // 全局提示
✅ nextStageSession()               // 五段式环节切换
✅ generateTrialBoxes()             // Trial 记分盒子
✅ playBubbleGame()                 // Canvas 泡泡游戏
✅ toggleEyeRestOverlay()           // 15 分钟护眼锁
✅ speakSopCard(cardCode)           // TTS 语音播报
✅ approvePromotionToL3()           // 晋级审批占位
✅ sendMpChatMessage()              // 家长端留言
```

### 3.3 原型中的 Mock 数据（✅ 可直接迁移到 Seed 脚本）

```javascript
// STUDENT_DB（6 名示例学生档案）
const mockStudents = [
  {
    id: "stu001",
    name: "林小宇",
    age: 8,
    level: "L2",
    status: "active",
    redFlags: [],
    // ... 完整档案字段
  },
  // ... 共 6 名学生
];

// LIB_CARDS（13 张操作卡）
const mockCards = [
  {
    code: 'M1-1-1',
    level: 'L0',
    title: '四点支撑 + 滑板推球',
    // ... 完整操作卡字段
  },
  // ... 共 13 张操作卡
];
```

---

## 四、待实施功能清单（按优先级重新分类）

### 🟢 P0 - Blocker（无此功能无法交付，3周）

#### 4.1 后端基础设施（1 周）
- [ ] 初始化 NestJS + TypeScript 工程
- [ ] 配置 Prisma Client（默认 SQLite，兼容 PostgreSQL）
- [ ] 执行 `npx prisma db push` 生成 `./data/vmi_tis.db`
- [ ] 编写 Seed 脚本：13 张操作卡 + 6 名示例学生
- [ ] 实现 12 条 API 端点（RESTful CRUD）
- [ ] 集成 Socket.io（双屏同步 + 眼动仪数据流）

#### 4.2 四大强制规则后端实现（1 周）
- [ ] **规则 R1（红区熔断）**  
  - `POST /api/assessments/triage`：自动检测 `redZoneItems.length > 0` → 置为 `RED_ZONE_LOCKED`
  - `POST /api/schedules`：拦截红区学生排课请求 → `403 Forbidden`
  - `POST /api/assessments/referral-audit`：视光师审核通过 → 解锁为 `GREEN_ACTIVE`

- [ ] **规则 R2（自动中止）**  
  - `POST /api/assessments/scale-score`：连续 3 题 0 分 → 中止测验
  - 实现 L0-L5 综合定级算法（身体稳定优先 → NPC > 10cm → TVPS-4 < 80 → Beery VMI-6 < 80）

- [ ] **规则 R3（晋级与降级）**  
  - `POST /api/sessions/:id/finish`：查询最近 3 次课 → 判断 `>= 80%` → 标记 `PROMOTION_READY`
  - `GET /api/workbench/summary`：生成晋级审批待办推送

- [ ] **规则 R4（护眼防沉迷）**  
  - 前端：学生端游戏倒计时 900 秒 → 暂停 Canvas → 弹出护眼遮罩
  - 后端：`POST /api/sessions/:id/trial` 记录 `digitalDurationSec` 累计值

#### 4.3 前端 React 工程化（1 周）
- [ ] 初始化 Vite + React 18 + TypeScript
- [ ] 配置 Tailwind CSS + Lucide Icons
- [ ] 搭建 Zustand 状态管理（全局学生上下文 + 离线队列）
- [ ] 迁移三终端页面框架（路由 + 布局）
- [ ] 迁移 Canvas 游戏逻辑（泡泡、聚散球、找星星、眼动校准）

### 🟡 P1 - Major（临床易用性提升，2周）

#### 4.4 课堂记分台增强（3 天）
- [ ] **盲操键盘快捷键（M1 ★★★★★）**  
  - 监听 `keydown` 事件：`Space/1` 记成功、`0` 记失误、`↑↓` 调提示等级、`N` 下一环节
  - 忽略输入框聚焦状态（`if (e.target.tagName !== 'INPUT') { ... }`）
  - 右上角悬浮快捷键图例

#### 4.5 Excel 批量导入（2 天）
- [ ] 前端：文件上传组件 + SheetJS 解析
- [ ] 后端：`POST /api/students/import-excel` 批量创建学生档案
- [ ] AuditLog 记录：`action: 'IMPORT_EXCEL'`

#### 4.6 医疗审计日志（M3 ★★★☆☆，2 天）
- [ ] 所有修改接口自动写入 `AuditLog` 表
- [ ] 记录 `userId` / `userName` / `userRole` / `ipAddress` / `changesBeforeJson` / `changesAfterJson`
- [ ] 前端：`GET /api/audit-logs` 查询页面（按操作人、动作类型、时间范围筛选）

#### 4.7 视频自动清理（M4 ★★★☆☆，2 天）
- [ ] 后端 Cron（`@nestjs/schedule`）：每日凌晨 2:00 扫描 `scheduledDeleteAt < now`
- [ ] 物理删除视频文件（`fs.unlink`）+ 更新状态为 `VIDEO_EXPIRED_CLEANED`
- [ ] AuditLog 记录：`action: 'CRON_CLEAN_VIDEOS'`

#### 4.8 WebSocket 降级保底（1 天）
- [ ] 服务端与客户端 Socket.io 配置：`transports: ['websocket', 'polling']`
- [ ] 验证：模拟防火墙拦截 WebSocket → 自动降级 HTTP Long-Polling

### 🔵 P2 - Nice to Have（锦上添花，4周）

#### 4.9 Capacitor Android 打包（1 周）
- [ ] 安装 `@capacitor/core` + `@capacitor/android`
- [ ] 配置 `capacitor.config.ts`（学生端全屏沉浸 + 局域网配网弹窗）
- [ ] 集成 `@capacitor/status-bar` / `@capacitor-community/text-to-speech` / `@capacitor/camera`
- [ ] 执行 `npx cap sync android` 生成原生工程
- [ ] Android Studio 编译 `.apk`

#### 4.10 Docker Compose 部署脚本（3 天）
- [ ] 编写 `deploy/docker-compose.yml`（PostgreSQL 15 + API 服务）
- [ ] 健康检查：等待数据库就绪 → 自动执行 `prisma migrate deploy` + `seed.ts`
- [ ] 一键启动脚本：`install_hospital_server.bat`

#### 4.11 SQLite 单机版一键启动脚本（2 天）
- [ ] 编写 `deploy/start_standalone.bat`
- [ ] 自动检测 `./data/vmi_tis.db` 不存在 → 执行 `prisma db push` + `seed.ts`
- [ ] 自动打开浏览器 `http://localhost:3000`

#### 4.12 DTVP-3 / Beery VMI-6 完整题库（2 周）
- [ ] 购买量表版权 + 数字化 30 题题库
- [ ] 常模查表数据嵌入（按年龄月龄查表）
- [ ] 原始分 → 标准分 → 百分位自动换算

#### 4.13 眼动仪硬件集成（1 周）
- [ ] Windows 桥接服务：C++/Python 读取 Tobii Pro Fusion SDK → WebSocket 推送
- [ ] 双模适配器：检测运行环境 → 路由到 USB 眼动仪或 Android 触控模式
- [ ] 前置摄像头视线估计（可选 MediaPipe）

---

## 五、实施路线图（修正版·9 周）

### Phase 1: 后端基础设施（2 周）
- Week 1: NestJS 工程 + Prisma 配置 + 12 条 API
- Week 2: Socket.io 双屏同步 + 四大强制规则后端实现 + Seed 脚本

### Phase 2: 前端 React 工程化（2 周）
- Week 3: Vite 工程 + 三终端路由框架 + Zustand 状态管理
- Week 4: 迁移原型 JavaScript 逻辑（8 个教师页面 + 4 个学生游戏 + 4 个家长页面）

### Phase 3: 临床易用性增强（2 周）
- Week 5: 盲操快捷键 + Excel 批量导入 + AuditLog 查询页面
- Week 6: 视频自动清理 Cron + WebSocket 降级保底验证

### Phase 4: 硬件与部署（2 周）
- Week 7: Capacitor Android 打包 + 全屏沉浸配置
- Week 8: Docker Compose + SQLite 一键启动脚本

### Phase 5: 完善与测试（1 周）
- Week 9: 端到端测试 + 用户培训文档 + 交付包准备

**总计：9 周（约 2 个月）**

---

## 六、质量保证与验收标准

### 6.1 功能验收清单（基于需求文档 V2.1）
- [ ] 红区熔断：`triageStatus = 'RED_ZONE_LOCKED'` 时排课接口返回 `403 Forbidden`
- [ ] 自动中止：连续 3 题 0 分 → 弹窗中止测验
- [ ] 晋级触发：连续 3 次课 `>= 80%` + 2 种材料 + 1 次打卡 → `PROMOTION_READY`
- [ ] 护眼硬锁：学生端游戏累计 900 秒 → 全屏遮罩 + 教师解锁
- [ ] 盲操快捷键：`Space/1/0/↑↓/N` 在课堂记分台生效（不受输入框焦点影响）
- [ ] Excel 批量导入：50 名学生 < 5 秒完成
- [ ] AuditLog：所有修改操作留痕（WHO/WHEN/WHAT/IP）
- [ ] 视频清理：7 天前视频物理删除 + 状态标记 `VIDEO_EXPIRED_CLEANED`
- [ ] WebSocket 降级：医院内网防火墙拦截 → 自动降级 HTTP Polling
- [ ] Android APK：在真机平板上安装运行 + 全屏沉浸无误触

### 6.2 性能指标
- 页面首屏加载 < 2 秒
- Canvas 游戏帧率 > 55fps
- WebSocket 投屏延迟 < 500ms
- 支持 200+ 学生档案无卡顿
- SQLite 单机版启动 < 10 秒

### 6.3 合规验证
- 数据库双模兼容：SQLite / PostgreSQL 零代码切换
- Prisma Schema 无 SQLite 不支持语法（`String[]` / `@db.Timestamptz`）
- 家长打卡视频 7 天自动清理（隐私合规）
- 操作审计日志完整记录（医疗合规）

---

## 七、成本估算（修正版）

### 7.1 开发成本
- 前端工程师（2 人 × 2 月）：¥56,000
- 后端工程师（1 人 × 2 月）：¥28,000
- 测试工程师（1 人 × 2 周）：¥5,000
- **小计：¥89,000**（比原估算节省 43%，因原型与文档完备度高）

### 7.2 硬件成本（单站点）
- Tobii Pro Fusion 眼动仪：¥45,000
- iPad Pro 12.9 英寸：¥8,000
- Android 触控平板（备选）：¥12,000
- **小计：¥65,000**

### 7.3 年度运营成本
- 云服务器（阿里云）：¥6,000/年
- SSL 证书与域名：¥1,000/年
- 技术支持人力：¥24,000/年
- **小计：¥31,000/年**

### 7.4 收入预测（首年）
- 假设签约 10 家机构 × ¥12,800/站点 = ¥128,000
- 扣除开发成本摊销（¥89,000 ÷ 3 年）= ¥29,667
- 扣除运营成本 = ¥31,000
- **预估首年利润：¥67,333**

---

## 八、关键风险与应对

### 8.1 技术风险
**风险：** Prisma 生成的 SQL 在 SQLite 与 PostgreSQL 间存在细微差异  
**应对：** 在 CI/CD 中同时运行两种数据库的集成测试

**风险：** Android 平板前置摄像头视线估计精度不足  
**应对：** 降级为纯触控模式（游戏玩法不变，仅失去眼动热力图）

### 8.2 业务风险
**风险：** 治疗师对盲操快捷键接受度低  
**应对：** 提供"触控 + 快捷键"双模式，右上角显示快捷键图例

**风险：** 家长隐私顾虑（不愿上传视频）  
**应对：** 打卡视频可选（文字 + 图片打卡同样有效），7 天自动删除承诺前置说明

### 8.3 合规风险
**风险：** 医疗数据需符合《个人信息保护法》  
**应对：** AuditLog 全链路记录 + 数据加密存储 + 等保三级认证

---

## 九、总结与纠偏建议

### 9.1 本次审查的核心纠偏

#### ✅ 修正前的误判
- ❌ "数据库 Schema 缺失" → ✅ 需求文档已包含完整 Prisma Schema（228-412行）
- ❌ "四大强制规则未实现" → ✅ 需求文档已明确规定 R1-R4（191-219行）
- ❌ "Android 跨端是可选扩展" → ✅ 需求文档强制要求 Capacitor 打包（120-130行）
- ❌ "API 契约需要补充设计" → ✅ 需求文档已列出 12 条 API 完整规格（419-432行）

#### ✅ 真实的工作量分布
- **已完成设计文档：** 90%（需求规格 635 行 + 原型 2676 行）
- **待编码实现：** 100%（后端 0% + 前端 React 工程化 0%）
- **待硬件集成：** 100%（眼动仪桥接 + Android 打包）

### 9.2 给后续开发者的建议

#### 对 Claude Opus（架构师）
1. **任务边界明确：** 您的职责是"提取文档 → 生成 3 个契约文件"，而非"编写海量业务代码"
   - 输出 1：`prisma/schema.prisma`（从文档 228-412 行提取）
   - 输出 2：`packages/shared-types/index.ts`（TypeScript 接口、枚举、DTO）
   - 输出 3：`docs/IMPLEMENTATION_TASKS.md`（6 个原子任务卡）

2. **不要重复设计：** 需求文档已包含的内容（如 Prisma Schema、API 清单、四大规则），直接引用行号，不要重新编写

#### 对 DeepSeek（编码工程师）
1. **严格遵守契约：** 字段名、表名、枚举值必须与 `prisma/schema.prisma` 和 `shared-types/index.ts` 一致
2. **零省略号：** 每个函数必须写出完整实现，严禁 `// TODO` 或 `...其余代码省略`
3. **原型迁移优先：** 先迁移原型 HTML 中已有的 JavaScript 逻辑，再补充后端 API

#### 对 ChatGPT（审查官）
1. **对照需求文档：** 审查时必须同时参考 `vmi_tis.md`（635行）和 `vmi_tis_prototype.html`（2676行）
2. **重点排查四大规则：** R1 红区熔断、R2 自动中止、R3 晋级逻辑、R4 护眼硬锁
3. **数据库兼容性：** 检查是否使用了 SQLite 不支持的语法（`String[]` / `@db.Timestamptz`）

### 9.3 下一步行动建议

#### 立即启动（Week 1）
1. Claude Opus 生成 3 个契约文件
2. DeepSeek 初始化 NestJS 工程 + 执行 `prisma db push`
3. DeepSeek 编写 Seed 脚本（13 张操作卡 + 6 名示例学生）

#### 并行推进（Week 2-4）
1. DeepSeek 实现 12 条 API 端点
2. DeepSeek 迁移前端原型到 React 工程
3. ChatGPT 每周五审查当周产出代码

#### 预留缓冲（Week 9）
1. 端到端测试（Playwright）
2. 用户培训文档
3. 交付包准备（SQLite 单机版 + Docker Compose 服务器版）

---

**报告结束**

*本报告已纠正先前的认知偏差，基于完整需求文档（vmi_tis.md 635行）与完整原型（vmi_tis_prototype.html 2676行）进行全量分析。*
