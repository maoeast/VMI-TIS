# DeepSeek 接力执行指令 - VMI-TIS 系统开发

**接力时间：** 2026-10-19  
**上游架构师：** Claude Opus（已完成契约文件生成）  
**当前执行者：** DeepSeek（高级全栈开发工程师）  
**下游审查者：** ChatGPT（质量保证官，每周五验收）

---

## 一、你的角色与职责

你是 **VMI-TIS 孤独症学生视觉运动整合训练干预系统** 的全栈开发工程师（Builder），负责将顶层架构师（Claude Opus）设计的契约文件转化为可运行的生产级代码。

**核心原则：**
1. **严格遵守契约**：字段名、表名、枚举值必须与 `prisma/schema.prisma` 和 `shared-types/index.ts` 完全匹配，不得自行改名
2. **零省略号**：每个函数必须写出完整实现，严禁 `// TODO` 或 `...其余代码省略`
3. **原型迁移优先**：先迁移 `vmi_tis_prototype.html` 中已有的 JavaScript 逻辑，再补充后端 API
4. **视觉还原铁律**：UI 样式必须与原型的 Tailwind 类名和 `#0F4C5C` 深青色主题保持一致

---

## 二、基准文件（执行前必读）

### 2.1 契约文件（Claude Opus 已生成）
1. **`prisma/schema.prisma`** - 8 张表完整数据库 Schema（10,360 字符）
   - 默认 SQLite 免安装模式（`provider = "sqlite"`）
   - 所有数组/对象统一用 `JSON.stringify()` 序列化为 `String`
   - 严禁使用 `String[]` 标量数组或 `@db.Timestamptz`

2. **`packages/shared-types/src/index.ts`** - 前后端共享类型契约（10,353 字符）
   - 12 个枚举类型（StudentTriageStatus / CapabilityLevel / PromotionStatus 等）
   - 8 个数据库实体接口（与 Prisma Model 1:1 映射）
   - 10 个 API DTO（CreateStudentDto / SubmitTriageDto 等）
   - 3 个 WebSocket 事件负载（双屏同步）

3. **`docs/IMPLEMENTATION_TASKS.md`** - 6 张原子级任务卡（28,652 字符）
   - Task 1: 后端基础设施 + Seed 脚本 + 双模部署脚本
   - Task 2: 学生档案 CRUD + 红区熔断 API
   - Task 3: 四层评估 + L0-L5 自动分级算法
   - Task 4: IEP 计划 + 五段式课堂记分台
   - Task 5: React 工程化 + 三终端迁移
   - Task 6: WebSocket 双屏同步 + Android 打包

### 2.2 需求规格文档
1. **`docs/vmi_tis.md`** - 完整需求规格说明书 V2.1（424 行）
   - 第 4.1 节：数据库 Schema 权威指向（L223-230，唯一事实源为 `prisma/schema.prisma`）
   - 第 5 节：12 条 RESTful API 规格（L232-249）
   - 第 6 节：双模部署脚本（L285-305）
   - 第 7.1.1 节：**【3076 行原型真实 DOM 与 JS 函数行号索引表】**（L320-335）

2. **`docs/vmi_tis_prototype.html`** - 3076 行完整三端交互原型
   - 终端一：教师 Web 工作台（9 个页面，L115-1543）
   - 终端二：学生 Pad 端（4 款 Canvas 游戏，L2590-2788）
   - 终端三：家长小程序（4 个 Tab 页，L1864-2174）
   - **所有迁移任务必须以此为视觉 1:1 基准**

---

## 三、执行约束（硬性规则）

### 3.1 代码质量约束
```
✅ 必须做：
- 每个文件顶部添加注释说明来源（如：// 迁移自 vmi_tis_prototype.html L2590-2652）
- 所有接口/类型引用 `packages/shared-types/src/index.ts`
- 所有数据库操作通过 PrismaService
- 错误处理使用 NestJS 标准异常（ForbiddenException / BadRequestException）
- 日志输出使用 NestJS Logger

❌ 严禁做：
- 自行修改 `prisma/schema.prisma` 表名或字段名
- 自行创建新的枚举类型（必须使用 shared-types 中的枚举）
- 使用 `any` 类型（必须明确类型）
- 在 Prisma Schema 中使用 String[] 标量数组
- 省略函数实现（写 // TODO 或 ...其余代码省略）
```

### 3.2 四大强制规则（不可妥协）
这四条规则是医疗合规的核心，任何妥协都会导致整个系统失效：

#### 规则 R1：红区熔断状态机
```typescript
// 原型参考：L1928-1931
// 触发条件：屈光参差 ≥ 2.00D 或斜视阳性
// 状态流转：PENDING_SCREENING → RED_ZONE_LOCKED → REFERRAL_UPLOADED → GREEN_ACTIVE
// 强制拦截：triageStatus !== 'GREEN_ACTIVE' 时排课接口返回 403 Forbidden

// 实现位置：apps/api/src/assessments/triage.service.ts
// 守卫位置：apps/api/src/common/guards/red-zone.guard.ts
```

#### 规则 R2：连续 3 题 0 分自动中止
```typescript
// 原型参考：L2164-2178
// 触发条件：评估量表连续 3 题得分均为 0
// 响应动作：弹窗提示 + 自动结束测验 + 保存当前进度

// 实现位置：apps/api/src/assessments/assessment-record.service.ts
// 前端实现：apps/web/src/pages/web/AssessmentPage.tsx
```

#### 规则 R3：连续 3 次 ≥80% 晋级触发
```typescript
// 原型参考：L2377-2391
// 触发条件：连续 3 次课正确率 ≥ 80% + 2 种材料 + 1 次家庭打卡
// 响应动作：自动标记 promotionStatus = 'PROMOTION_READY' + 推送待办

// 实现位置：apps/api/src/iep/promotion-check.service.ts
// 调用时机：POST /api/sessions/:id/finish（结课时自动检查）
```

#### 规则 R4：15 分钟护眼硬锁
```typescript
// 原型参考：L2776-2788（护眼遮罩逻辑）
// 触发条件：学生端数字训练累计 900 秒（15 分钟）
// 响应动作：全屏遮罩 + 禁止继续游戏 + 需教师解锁

// 实现位置：apps/api/src/common/guards/digital-limit.guard.ts
// 前端实现：apps/web/src/pages/student/EyeRestOverlay.tsx
```

### 3.3 数据库兼容性约束
```typescript
// ✅ 正确写法（SQLite 兼容）
materialsJson: JSON.stringify(['镊子', '珠子'])
trialsJson: JSON.stringify([{result: 'pass', promptLevel: 2}])
redZoneItemsJson: JSON.stringify(['屈光参差', '外隐斜'])

// ❌ 错误写法（SQLite 不支持）
materials: String[]  // 标量数组
trialsJson: Json     // 原生 JSON 类型
createdAt: DateTime @db.Timestamptz // PostgreSQL 专有语法
```

---

## 四、分阶段执行计划（6 周 9 个工作日）

### Week 1: Task 1 - 后端基础设施（2 天）

**目标：** 搭建 NestJS + Prisma + SQLite 工程骨架，生成 13 张操作卡与 6 名示例学生数据。

**执行步骤：**
```bash
# 1. 安装 workspace 依赖（在仓库根目录执行）
npm install

# 2. 生成 Prisma Client（SQLite 默认）
npm run db:generate

# 3. 建库并导入演示数据
npm run db:push
npm run db:seed
npm run db:verify

# 4. 构建并启动
npm run build
npm run start
```

**核心文件产出：**
1. `apps/api/src/main.ts` - NestJS 启动入口
2. `apps/api/src/app.module.ts` - 根模块
3. `apps/api/src/prisma/prisma.service.ts` - PrismaClient 单例
4. `apps/api/src/prisma/seed.ts` - Seed 脚本（完整代码见 IMPLEMENTATION_TASKS.md Task 1.1）
5. `deploy/start_standalone.bat` - Windows 单机版启动脚本
6. `deploy/docker-compose.yml` - PostgreSQL 服务器版

**验收标准：**
```bash
# 检查数据库文件生成（在仓库根目录执行）
ls apps/api/data/vmi_tis.db

# 验证 Seed 数据
npm run db:verify

# 可选：可视化检查
npx prisma studio --schema prisma/schema.prisma
```

---

### Week 2: Task 2 - 学生档案 CRUD + 红区熔断（2 天）

**目标：** 实现学生档案的增删改查接口，以及规则 R1（红区熔断状态机）的后端校验逻辑。

**执行步骤：**
1. 创建 `apps/api/src/students/students.module.ts`
2. 实现 `students.controller.ts`（RESTful 端点）
3. 实现 `students.service.ts`（业务逻辑 + Prisma 操作）
4. 创建 `apps/api/src/assessments/triage.service.ts`（红区检测逻辑，完整代码见 IMPLEMENTATION_TASKS.md Task 2.1）
5. 创建 `apps/api/src/common/guards/red-zone.guard.ts`（排课拦截中间件，完整代码见 Task 2.2）
6. 实现 Excel 批量导入功能（使用 `xlsx` 库，完整代码见 Task 2.3）

**关键代码参考：**
```typescript
// apps/api/src/assessments/triage.service.ts
export class TriageService {
  async submitTriage(dto: SubmitTriageDto): Promise<AssessmentTriageReferral> {
    const redZoneItems: string[] = [];
    
    // 检测屈光参差 ≥ 2.00D（参考原型 L1928）
    const refractionDiff = dto.behaviorItems.find(
      item => item.item === '屈光参差（左右眼度数差异）'
    );
    if (refractionDiff && refractionDiff.score >= 2.0) {
      redZoneItems.push('屈光参差 ≥ 2.00D');
    }
    
    // ... 完整逻辑见 IMPLEMENTATION_TASKS.md Task 2.1
  }
}
```

**验收标准：**
```bash
# 启动开发服务器
npm run start:dev

# 测试接口
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"测试学生","birthDate":"2018-01-01","schoolScene":"测试机构","primaryTherapistId":"test_therapist"}'

# 测试红区拦截
curl -X POST http://localhost:3000/api/assessments/triage \
  -H "Content-Type: application/json" \
  -d '{"studentId":"xxx","behaviorItems":[{"item":"屈光参差（左右眼度数差异）","score":2.5}]}'
# 预期：学生状态变为 RED_ZONE_LOCKED

curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"studentId":"xxx"}'
# 预期：返回 403 Forbidden
```

---

### Week 3-4: Task 3 & Task 4 - 评估与训练核心（4 天）

**目标：** 实现四层评估、自动分级算法、IEP 计划、课堂记分台、晋级判定逻辑。

**执行步骤：**
1. 实现 `assessment-record.service.ts`（连续 3 题 0 分自动中止，Task 3.1）
2. 实现 `auto-level.service.ts`（L0-L5 综合定级算法，Task 3.2）
3. 实现 `iep.service.ts`（IEP 计划 CRUD）
4. 实现 `promotion-check.service.ts`（连续 3 次 ≥80% 晋级触发，Task 4.1）
5. 实现 `sessions.service.ts`（五段式课堂记分台）
6. 实现 `digital-limit.guard.ts`（15 分钟护眼硬锁，Task 4.2）

**关键代码参考：**
```typescript
// apps/api/src/assessments/auto-level.service.ts
export class AutoLevelService {
  calculateLevel(input: AutoLevelInput): CapabilityLevel {
    // 优先级 1：身体稳定不达标 → 强制 L0
    if (!input.stabilityPass) {
      return CapabilityLevel.L0;
    }
    
    // 优先级 2：视觉效率问题 → L1
    if ((input.npcCm && input.npcCm > 10) || /* ... */) {
      return CapabilityLevel.L1;
    }
    
    // ... 完整逻辑见 IMPLEMENTATION_TASKS.md Task 3.2
  }
}
```

**验收标准：**
```bash
# 测试自动中止
curl -X POST http://localhost:3000/api/assessments/scale-score \
  -d '{"sessionId":"xxx","score":0}'
# 连续提交 3 次 score=0，第 3 次应返回 shouldTerminate: true

# 测试晋级触发
# 创建 3 次课记录，正确率分别为 85%, 88%, 90%
curl -X POST http://localhost:3000/api/sessions/:id/finish
# 预期：学生 promotionStatus 变为 PROMOTION_READY
```

---

### Week 5: Task 5 - React 工程化（2 天）

**目标：** 将原型 HTML 的 3076 行 JavaScript 逻辑迁移到 React 18 + TypeScript + Vite 工程。

**执行步骤：**
```bash
# 1. 初始化 Vite + React 工程
npm create vite@latest apps/web -- --template react-ts
cd apps/web
npm install

# 2. 安装依赖
npm install zustand socket.io-client chart.js axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. 配置 Tailwind（保持 #0F4C5C 主题）
# 编辑 tailwind.config.js，添加自定义颜色：
module.exports = {
  theme: {
    extend: {
      colors: {
        'vmi-primary': '#0F4C5C',
        'vmi-secondary': '#0B3946',
      }
    }
  }
}
```

**核心文件产出（参考原型精确行号）：**
1. `apps/web/src/pages/web/HomePage.tsx` - 工作台首页（迁移自原型 L115-330）
2. `apps/web/src/pages/web/StudentsPage.tsx` - 学生档案（迁移自 L332-461）
3. `apps/web/src/pages/web/SessionPage.tsx` - 课堂记分台（迁移自 L763-987）
4. `apps/web/src/pages/student/BubbleGame.tsx` - 泡泡游戏（迁移自 L2590-2652，完整代码见 Task 5.2）
5. `apps/web/src/hooks/useKeyboardShortcuts.ts` - 盲操快捷键（迁移自 L3036-3063，完整代码见 Task 5.1）

**验收标准：**
```bash
# 启动开发服务器
npm run dev

# 浏览器访问 http://localhost:5173
# 检查项：
# 1. 顶部导航栏背景色为 #0F4C5C
# 2. 三终端切换按钮正常工作
# 3. 课堂记分台按下空格键触发"记录成功"
# 4. Canvas 泡泡游戏帧率 > 55fps
```

---

### Week 6: Task 6 - WebSocket + Android 打包（1 天）

**目标：** 实现双屏同步与 Capacitor Android APK 打包配置。

**执行步骤：**
1. 实现 `apps/api/src/websocket/websocket.gateway.ts`（Socket.io 服务端，完整代码见 Task 6.1）
2. 配置 `apps/web/capacitor.config.ts`（Android 全屏沉浸，完整代码见 Task 6.2）
3. 编写 `apps/web/android/app/src/main/java/com/vmi/tis/KioskModePlugin.kt`（Kiosk 插件，完整代码见 Task 6.3）

**验收标准：**
```bash
# WebSocket 测试
# 教师端发送投屏指令
socket.emit('SWITCH_PAD_TASK', {studentId: 'xxx', gameMode: 'bubble'});
# 预期：学生端 Canvas 游戏立即切换（延迟 < 500ms）

# Android 打包
cd apps/web
npm run build
npx cap sync android
npx cap open android
# 在 Android Studio 中编译 APK
```

---

## 五、日常工作流程

### 5.1 每天开始前
```bash
# 1. 拉取最新代码（如果有团队协作）
git pull origin main

# 2. 检查任务进度
cat docs/IMPLEMENTATION_TASKS.md | grep -A 5 "Task X"  # X = 当前任务号

# 3. 重新读取基准文件
# - prisma/schema.prisma
# - packages/shared-types/src/index.ts
# - docs/vmi_tis_prototype.html（对应任务的行号区间）
```

### 5.2 编码中
```typescript
// 文件顶部必须添加来源注释
/**
 * 学生档案查询服务
 * 迁移自：vmi_tis_prototype.html L332-461
 * 契约依赖：packages/shared-types/src/index.ts (Student / CreateStudentDto)
 */

// 引用类型时必须从 shared-types 导入
import { Student, CapabilityLevel } from '../shared-types';

// 数据库操作必须通过 PrismaService
constructor(private prisma: PrismaService) {}
```

### 5.3 每天结束前
```bash
# 1. 运行本地验证
npm run lint
npm run build
npm test  # （如果有单元测试）

# 2. 提交代码
git add .
git commit -m "feat: Task X - [具体功能] 完成"
git push origin main

# 3. 更新进度记录
echo "✅ Task X.Y 已完成 - $(date)" >> docs/PROGRESS.md
```

---

## 六、常见问题与解决方案

### Q1: Prisma Schema 字段类型不兼容
```bash
# 错误：Type 'string[]' is not assignable to type 'string'
# 原因：使用了 SQLite 不支持的标量数组

# ❌ 错误写法
materials: string[]

# ✅ 正确写法
materialsJson: string
// 存储：JSON.stringify(['镊子', '珠子'])
// 读取：JSON.parse(record.materialsJson)
```

### Q2: 原型 HTML 行号找不到对应函数
```bash
# 原型行号索引表位置：docs/vmi_tis.md L320-335
# 示例：
# - 三终端切换逻辑：switchTerminal() @ L2176-2191
# - 学生切换逻辑：changeActiveStudent() @ L2193-2206
# - 五段式切换：selectSessionStage() @ L2292-2310
```

### Q3: NestJS 模块循环依赖
```bash
# 错误：Nest can't resolve dependencies of the StudentsService
# 原因：StudentsModule 和 AssessmentsModule 互相导入

# 解决方案：使用 forwardRef
@Module({
  imports: [
    forwardRef(() => AssessmentsModule),
  ],
})
export class StudentsModule {}
```

### Q4: 子代理模型选择问题
```typescript
// ⚠️ 注意：如果你需要 spawn 子代理，请使用 glm:glm-5.3-flash
// 原因：deepseek-flash 在 thinking 模式下长任务会崩溃（reasoning_content 400）

// ✅ 正确写法
subagent({
  role: 'coder',
  model: 'glm:glm-5.3-flash',
  task: '实现 xxx 功能'
});

// ❌ 错误写法（会静默崩溃）
subagent({
  role: 'coder',
  model: 'deepseek-flash',  // thinking 模式会崩
  task: '实现 xxx 功能'
});
```

---

## 七、ChatGPT 每周五验收检查点

### Week 1 结束（Task 1）
- [ ] `npx prisma studio` 打开后，`sop_cards` 表有 13 条记录
- [ ] `students` 表有 6 条示例学生记录
- [ ] `start_standalone.bat` 双击后自动打开浏览器访问 `http://localhost:3000`

### Week 2 结束（Task 2）
- [ ] `POST /api/students` 创建学生后返回完整 Student 对象
- [ ] 提交初筛检测到屈光参差 ≥ 2.00D，学生状态自动变为 `RED_ZONE_LOCKED`
- [ ] 红区学生调用排课接口返回 `403 Forbidden`
- [ ] Excel 批量导入 50 名学生耗时 < 5 秒

### Week 4 结束（Task 3 & 4）
- [ ] 连续 3 题 0 分后接口返回 `shouldTerminate: true`
- [ ] 自动分级算法：NPC = 12cm → 输出 `L1`
- [ ] 连续 3 次课 ≥80% + 2 种材料 + 1 次打卡 → 自动标记 `PROMOTION_READY`
- [ ] 数字训练累计 900 秒后返回 `403` 提示切换实体训练

### Week 5 结束（Task 5）
- [ ] `npm run dev` 启动后，浏览器访问 `http://localhost:5173` 显示完整界面
- [ ] 课堂记分台按下空格键触发"记录成功"
- [ ] Canvas 泡泡游戏帧率 > 55fps

### Week 6 结束（Task 6）
- [ ] 教师端点击"投屏泡泡游戏"，学生端游戏立即切换（延迟 < 500ms）
- [ ] Android APK 在真机平板上安装后，全屏沉浸模式生效

---

## 八、紧急联系与上报机制

### 遇到以下情况请立即上报（@Claude Opus）：

1. **契约冲突**：发现 `prisma/schema.prisma` 与 `shared-types/index.ts` 不一致
2. **原型行号偏差**：在原型 HTML 中找不到任务卡标注的行号区间
3. **业务规则歧义**：四大强制规则（R1-R4）的实现逻辑存在多种解释
4. **技术栈阻塞**：NestJS / React / Prisma 遇到无法解决的技术问题
5. **进度严重滞后**：某个任务预计超时 > 1 天

### 上报格式：
```
【紧急上报】Task X - [问题标题]

问题描述：
[具体问题说明]

已尝试的解决方案：
1. [方案一]
2. [方案二]

需要决策的点：
[需要架构师裁定的技术选型或业务逻辑]
```

---

## 九、成功标准（最终交付检查清单）

### 功能完整性（18 项）
- [ ] 红区熔断：学生状态为 `RED_ZONE_LOCKED` 时排课接口返回 403
- [ ] 自动中止：连续 3 题 0 分弹窗中止并保存进度
- [ ] 晋级触发：连续 3 次 ≥80% + 2 种材料 + 1 次打卡 → `PROMOTION_READY`
- [ ] 护眼硬锁：累计 900 秒强制锁屏
- [ ] 盲操快捷键：`Space/1/0/↑↓/N` 在课堂记分台生效
- [ ] Excel 导入：50 名学生 < 5 秒
- [ ] 审计日志：所有修改自动写入 `audit_logs`
- [ ] 视频清理：7 天前视频物理删除
- [ ] WebSocket 降级：自动降级 HTTP Polling
- [ ] Android APK：真机全屏沉浸无误触
- [ ] 三终端切换：Web/Pad/小程序无缝切换
- [ ] 学生档案 CRUD：增删改查全量实现
- [ ] IEP 计划：创建/更新/审批流程完整
- [ ] 课堂记分台：五段式环节切换正常
- [ ] Canvas 游戏：泡泡/聚散球/找星星可玩
- [ ] 家长端：今日任务/视频打卡/成长曲线/留言全量实现
- [ ] 操作卡库：13 张卡片展示 + TTS 语音播报
- [ ] 数据分析：Chart.js 趋势图正常渲染

### 性能指标（5 项）
- [ ] 页面首屏加载 < 2 秒
- [ ] Canvas 游戏帧率 > 55fps
- [ ] WebSocket 投屏延迟 < 500ms
- [ ] 支持 200+ 学生档案无卡顿
- [ ] SQLite 单机版启动 < 10 秒

### 数据库兼容性（3 项）
- [ ] SQLite / PostgreSQL 切换后 Seed 脚本无需修改
- [ ] Prisma Schema 无 SQLite 不支持语法
- [ ] 所有 JSON 字段用 `JSON.stringify()` 序列化

---

## 十、开始执行

现在请按以下步骤开始：

1. **确认收到此指令**：回复"已接收 DeepSeek 接力指令，准备开始执行 Task 1"
2. **读取基准文件**：完整读取 `prisma/schema.prisma` / `shared-types/index.ts` / `IMPLEMENTATION_TASKS.md`
3. **开始 Task 1**：初始化 NestJS 工程 + 编写 Seed 脚本
4. **每日汇报**：每天结束时更新 `docs/PROGRESS.md`（格式：`✅ Task X.Y 已完成 - 2026-10-19`）

**祝开发顺利！如有问题随时上报。**

---

*本指令由 Claude Opus 生成于 2026-10-19，供 DeepSeek 接力执行使用。*
