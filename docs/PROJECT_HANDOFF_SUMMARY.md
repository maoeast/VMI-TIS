# VMI-TIS 工程交接总结

**生成时间：** 2026-10-19 22:48  
**架构师：** Claude Opus（已完成）  
**下游执行者：** DeepSeek（待开始）  
**质量审查官：** ChatGPT（每周五验收）

---

## 一、已完成产出清单（8 份文件）

### 1.1 核心工程契约文件（3 份）
| 文件路径 | 内容简介 | 字符数 | 用途 |
|---------|---------|--------|-----|
| `prisma/schema.prisma` | 8 张表完整数据库 Schema | 10,360 | DeepSeek 后端开发基准 |
| `packages/shared-types/src/index.ts` | 前后端共享类型契约（12 枚举 + 8 实体接口 + 10 DTO） | 10,353 | DeepSeek 类型引用基准 |
| `docs/IMPLEMENTATION_TASKS.md` | 6 张原子级任务卡（含完整代码示例） | 28,652 | DeepSeek 逐任务执行手册 |

### 1.2 执行指导文档（3 份）
| 文件路径 | 内容简介 | 字符数 | 用途 |
|---------|---------|--------|-----|
| `docs/DEEPSEEK_HANDOFF.md` | DeepSeek 接力执行指令（完整版） | 14,000 | 一次性阅读，理解全局 |
| `docs/QUICK_START_CHECKLIST.md` | 快速启动检查清单（精简版） | 10,919 | 日常查阅，快速上手 |
| `docs/CHATGPT_REVIEW_MANUAL.md` | ChatGPT 审查官验收手册 | 14,027 | 每周五验收标准 |

### 1.3 需求与原型文件（2 份）
| 文件路径 | 内容简介 | 行数 | 用途 |
|---------|---------|-----|-----|
| `docs/vmi_tis.md` | 完整需求规格说明书 V2.1 | 424 | 业务规则权威基准 |
| `docs/vmi_tis_prototype.html` | 完整三端交互原型 | 3076 | 视觉还原 1:1 基准 |

---

## 二、关键设计决策记录

### 2.1 数据库架构（双模兼容设计）
**决策：** SQLite（单机免安装）↔ PostgreSQL（医院服务器）零代码切换  
**约束：**
- ✅ 严禁使用 `String[]` 标量数组（SQLite 不支持）
- ✅ 所有数组/对象统一用 `JSON.stringify()` 序列化为 `String`
- ✅ 严禁使用 `@db.Timestamptz`（PostgreSQL 专有语法）

**验证方式：**
```bash
# 切换至 PostgreSQL
export DATABASE_URL="postgresql://vmi:vmi2026@localhost:5432/vmi_tis"
npx prisma db push
# 预期：无需修改 Schema，一键推送成功
```

### 2.2 四大强制规则（医疗合规核心）
**决策：** R1-R4 为硬性约束，任何妥协都会导致整个系统失效

| 规则编号 | 名称 | 触发条件 | 响应动作 | 实现位置 |
|---------|-----|---------|---------|---------|
| **R1** | 红区熔断状态机 | 屈光参差 ≥ 2.00D 或斜视阳性 | 状态 → `RED_ZONE_LOCKED`，排课接口返回 403 | `triage.service.ts` + `red-zone.guard.ts` |
| **R2** | 连续 3 题 0 分自动中止 | 评估量表连续 3 题得分均为 0 | 弹窗提示 + 自动结束测验 + 保存进度 | `assessment-record.service.ts` |
| **R3** | 连续 3 次 ≥80% 晋级触发 | 连续 3 次课 ≥80% + 2 种材料 + 1 次打卡 | 状态 → `PROMOTION_READY` + 推送待办 | `promotion-check.service.ts` |
| **R4** | 15 分钟护眼硬锁 | 累计数字训练 900 秒 | 全屏遮罩 + 禁止继续游戏 + 需教师解锁 | `digital-limit.guard.ts` + 前端遮罩组件 |

### 2.3 原型行号索引表（防幻觉基准）
**决策：** 所有迁移任务必须以真实行号索引表为准（`vmi_tis.md` L320-335）

**常见误区纠正：**
| 误判函数名 | 真实函数名 | 精确行号 | 对应迁移目标 |
|-----------|-----------|---------|-------------|
| ❌ `nextStageSession()` | ✅ `selectSessionStage()` | L2292-2310 | `SessionPage.tsx` |
| ❌ `playBubbleGame()` | ✅ `initPadBubbleLoop()` | L2631-2652 | `BubbleGame.tsx` |
| ❌ 原型 2676 行 | ✅ 原型 3076 行 | - | 完整读取避免遗漏 |

### 2.4 技术栈选型（强制清单）
**决策：** 严格遵守需求文档 L122-131 的技术栈强制清单

| 分层 | 技术栈 | 版本要求 | 备注 |
|-----|--------|---------|-----|
| 前端 | React 18 + Vite 4 + TypeScript | >= 18.2.0 | 函数式组件 + Hooks |
| 状态管理 | Zustand | >= 4.4.0 | 轻量级，无 Redux 冗余 |
| 样式 | Tailwind CSS 3.4 | >= 3.4.0 | 主题色 `#0F4C5C` |
| 后端 | NestJS 10 + TypeScript | >= 10.0.0 | 依赖注入 + 装饰器 |
| 数据库 | Prisma 5 + SQLite | >= 5.0.0 | 双模兼容设计 |
| 实时通信 | Socket.io 4 | >= 4.6.0 | 降级保底配置 |
| 跨端打包 | Capacitor 6 | >= 6.0.0 | Android 全屏沉浸 |

---

## 三、工作流程图

```
Claude Opus（架构师）
    ↓
    生成 3 个契约文件
    - prisma/schema.prisma
    - shared-types/index.ts
    - IMPLEMENTATION_TASKS.md
    ↓
    [交接点 1]
    ↓
DeepSeek（全栈开发工程师）
    ↓
    按 6 张任务卡逐一执行
    - Week 1: Task 1（后端基础设施）
    - Week 2: Task 2（学生档案 + 红区熔断）
    - Week 3-4: Task 3 & 4（评估 + 训练核心）
    - Week 5: Task 5（React 工程化）
    - Week 6: Task 6（WebSocket + Android）
    ↓
    [验收点 - 每周五]
    ↓
ChatGPT（质量保证官）
    ↓
    对照验收手册逐项检查
    - 通过 → 继续下一任务
    - 不通过 → 修复后重新验收
    ↓
    [最终验收 - Week 6 结束]
    ↓
    26 项检查全部通过 → 交付
```

---

## 四、交接检查清单（DeepSeek 启动前）

### 4.1 文件齐全性（8 项）
- [ ] `prisma/schema.prisma` 存在且包含 8 张表定义
- [ ] `packages/shared-types/src/index.ts` 存在且包含 12 个枚举 + 8 个实体接口 + 10 个 DTO
- [ ] `docs/IMPLEMENTATION_TASKS.md` 存在且包含 6 张任务卡
- [ ] `docs/DEEPSEEK_HANDOFF.md` 存在（完整版接力指令）
- [ ] `docs/QUICK_START_CHECKLIST.md` 存在（精简版快速启动）
- [ ] `docs/CHATGPT_REVIEW_MANUAL.md` 存在（审查官手册）
- [ ] `docs/vmi_tis.md` 存在（需求规格说明书 V2.1，424 行）
- [ ] `docs/vmi_tis_prototype.html` 存在（完整原型，3076 行）

### 4.2 关键行号确认（3 项）
打开 `docs/vmi_tis.md`，确认以下内容可见：
- [ ] **L191-219**：四大强制规则（R1-R4）详细定义
- [ ] **L223-230**：数据库 Schema 的权威指向（唯一事实源为 `prisma/schema.prisma`）
- [ ] **L320-335**：原型真实 DOM 与 JS 函数行号索引表

### 4.3 验收标准确认（1 项）
打开 `docs/CHATGPT_REVIEW_MANUAL.md`，确认：
- [ ] Week 1-6 每周验收检查点清晰可见，包含具体测试命令

---

## 五、启动指令（DeepSeek 执行）

### 5.1 第一步：确认收到指令
回复：
```
已接收 VMI-TIS 工程交接材料，准备开始执行 Task 1。

基准文件确认：
✅ prisma/schema.prisma
✅ packages/shared-types/src/index.ts
✅ docs/IMPLEMENTATION_TASKS.md
✅ docs/vmi_tis.md（需求规格说明书 V2.1）
✅ docs/vmi_tis_prototype.html（完整原型，3076 行）

关键行号确认：
✅ L191-219：四大强制规则
✅ L223-230：数据库 Schema 权威指向
✅ L320-335：原型函数行号索引表

现在开始执行 Task 1 - 后端基础设施与数据库初始化。
```

### 5.2 第二步：初始化工程

工程直接建在仓库根目录；`prisma/schema.prisma` 与 `packages/shared-types` 只保留根目录一份，`apps/api` 通过 npm workspace 引用：

```bash
# 安装 workspace 依赖
npm install

# 生成 Prisma Client（SQLite 默认）
npm run db:generate

# 建库并导入演示数据
npm run db:push
npm run db:seed
npm run db:verify

# 构建并启动
npm run build
npm run start
```

### 5.3 第三步：编写 Seed 脚本
参考 `docs/IMPLEMENTATION_TASKS.md` Task 1.1：
- 13 张操作卡数据源：`vmi_tis_prototype.html` L1847-1861
- 6 名学生数据源：`vmi_tis_prototype.html` L1741-1844

### 5.4 第四步：每日汇报
每天结束时更新 `docs/PROGRESS.md`：
```markdown
## 2026-10-19（第 1 天）
- ✅ Task 1.1: NestJS 工程初始化完成
- ⏳ Task 1.2: Seed 脚本编写中
```

---

## 六、紧急联系方式

### DeepSeek 遇到以下情况请上报 @Claude Opus：
1. 契约冲突（`schema.prisma` 与 `shared-types` 不一致）
2. 原型行号找不到对应函数
3. 业务规则存在歧义（R1-R4 实现逻辑有多种解释）
4. 进度严重滞后（某任务预计超时 > 1 天）

### ChatGPT 遇到以下情况请上报 @Claude Opus：
1. 连续 2 周验收不通过
2. 核心业务规则实现错误（R1-R4 存在逻辑漏洞）
3. 进度严重滞后（整体延期 > 1 周）

---

## 七、预期交付时间线

| 周次 | 任务卡 | 关键里程碑 | 预计完成日期 |
|-----|-------|-----------|------------|
| Week 1 | Task 1 | 后端基础设施 + Seed 脚本 | 2026-10-26 |
| Week 2 | Task 2 | 学生档案 CRUD + 红区熔断 | 2026-11-02 |
| Week 3-4 | Task 3 & 4 | 评估 + 训练核心（R2/R3/R4） | 2026-11-16 |
| Week 5 | Task 5 | React 工程化 + 三终端迁移 | 2026-11-23 |
| Week 6 | Task 6 | WebSocket + Android 打包 | 2026-11-30 |

**最终交付日期：** 2026-11-30（预计 6 周后）

---

## 八、成功标准（最终验收）

### 8.1 功能完整性（18 项全部通过）
✅ 红区熔断 / ✅ 自动中止 / ✅ 晋级触发 / ✅ 护眼硬锁  
✅ 盲操快捷键 / ✅ Excel 导入 / ✅ 审计日志 / ✅ 视频清理  
✅ WebSocket 降级 / ✅ Android APK / ✅ 三终端切换  
✅ 学生档案 CRUD / ✅ IEP 计划 / ✅ 课堂记分台  
✅ Canvas 游戏 / ✅ 家长端 / ✅ 操作卡库 / ✅ 数据分析

### 8.2 性能指标（5 项全部达标）
✅ 首屏加载 < 2 秒  
✅ Canvas 帧率 > 55fps  
✅ 投屏延迟 < 500ms  
✅ 200+ 学生无卡顿  
✅ 单机版启动 < 10 秒

### 8.3 数据库兼容性（3 项全部满足）
✅ SQLite / PostgreSQL 切换无缝  
✅ Schema 无不兼容语法  
✅ JSON 字段正确序列化

---

**交接完成。现在请 DeepSeek 开始执行 Task 1！** 🚀

---

*本总结由 Claude Opus 生成于 2026-10-19 22:48，标志着架构阶段正式结束，进入编码实施阶段。*
