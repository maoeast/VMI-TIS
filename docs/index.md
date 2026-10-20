# VMI-TIS 项目文档索引

> **VMI-TIS** —— 面向孤独症学生的**视觉运动整合训练干预系统**：四层评估 → 红区分流 → IEP/ITP 计划 → 五段式课堂训练 → 家校协同 → 数据画像与科研导出。三端合一（教师工作台 / 学生 Pad / 家长端），支持 SQLite 单机版与 PostgreSQL 医院服务器版双模交付。
>
> 本文件是**文档总入口**。三条主线：**产品/设计**在 `vmi_tis.md`；**实施任务**在 `IMPLEMENTATION_TASKS.md`；**当前现场**在 `../.continue-here.md`。

## 从哪里开始

| 你是谁 / 想干什么 | 读这个 |
|---|---|
| **新会话 / 第一次接手** | [`../AGENTS.md`](../AGENTS.md)（红线与冻结项）→ [`../.continue-here.md`](../.continue-here.md)（完整现场）→ [`会话启动.md`](会话启动.md)（恢复流程） |
| **想快速理解项目 / 给新同事介绍** | [`../README.md`](../README.md)（项目入口）→ [`项目速览-费曼版.md`](项目速览-费曼版.md)（10 分钟费曼版；非规范阅读导览） |
| **要改某个功能** | 先在 [`vmi_tis.md`](vmi_tis.md) 找到拥有该主题的章节，再看 [`IMPLEMENTATION_TASKS.md`](IMPLEMENTATION_TASKS.md) 对应 Task，最后查 [`PROGRESS.md`](PROGRESS.md) 的已知偏差 |
| **要开发/修改评估模块** | 先读 [`../AGENTS.md`](../AGENTS.md) 的「评估模块唯一数据/公式源」规则；后端入口 `apps/api/src/assessments/assessment-grading.service.ts`，前端组件在 `apps/web/src/components/assessment/`；前端 Vite 从 `@vmi-tis/shared-types/assessment-seed` 子路径读取种子，根入口继续供 API/Node 使用 |
| **想知道当前进度 / 验证结果** | [`PROGRESS.md`](PROGRESS.md)（历史）＋ [`../.continue-here.md`](../.continue-here.md)（当前） |
| **查外部评审意见** | [`chatgpt评审.md`](chatgpt评审.md)（29 项；`f1b1c66` 已处理） |
| **WSL2 环境 / 端口 / Android 构建** | [`../WSL2_HANDOFF.md`](../WSL2_HANDOFF.md) |
| **文档地图 / 维护规范** | 本文件 |

## 文档分类（每类的权威源）

| 类别 | 位置 | 说明 |
|---|---|---|
| 产品需求 / 详细设计 | `vmi_tis.md` | **权威源**：SRS、八大功能模块、技术栈、Android 适配、R1–R4、数据库/API/部署 |
| 原型与参考 | `vmi_tis_prototype.html`、`book/`、`孤独症学生视觉运动整合训练干预系统设计方案.docx` | 视觉/方法学参考；不作为当前实现契约 |
| 实施任务卡 | `IMPLEMENTATION_TASKS.md` | Task 1–6 的目标、产出文件、关键逻辑与验收标准 |
| 评估题库 / 常模 / 公式 | `../packages/shared-types/src/vmi_tis_assessment_scales_seed.ts` | 评估模块**唯一数据与公式源**：5 个纯函数 + 常量数组；禁止重写公式或编造题目 |
| 历史进度 | `PROGRESS.md` | 按任务/日期记录已完成、验证、偏差与下一步；**只追加，不回写成当前状态** |
| 当前现场 | `../.continue-here.md` | 跨会话状态快照；会话结束按 `会话结束.md` 全量覆写 |
| 会话流程 | `会话启动.md` / `会话结束.md` | AI 助手会话的恢复/收尾流程；HANDOFF 区块是现场摘要；收尾默认输出费曼式报告 + 四行摘要 |
| 项目速览 / 阅读导览 | [`../README.md`](../README.md)、[`项目速览-费曼版.md`](项目速览-费曼版.md) | **非权威**：面向新人/汇报的 10 分钟概览；规范口径仍以 `vmi_tis.md` / `AGENTS.md` / `PROGRESS.md` / `../.continue-here.md` 为准 |
| 评审与分析 | `chatgpt评审.md`、`implementation_analysis.md` | 外部评审输入与实现分析；评审结论以代码与 `PROGRESS.md` 验证记录为准 |
| 历史架构评审 | `architecture_review_corrected.md`、`architecture_review_final_corrected.md` | 历史输入，非当前权威 |
| WSL2 / 历史交接 | `../WSL2_HANDOFF.md`、`PROJECT_HANDOFF_SUMMARY.md`、`DEEPSEEK_HANDOFF.md`、`QUICK_START_CHECKLIST.md`、`CHATGPT_REVIEW_MANUAL.md` | WSL2 任务书与多模型流水线历史资料；参考，不用来覆盖当前状态 |
| 工程配置 | `../package.json`、`../prisma/schema.prisma`、`../deploy/`、`../apps/web/capacitor.config.ts`、`../apps/web/android/`、`../scripts/` | 运行、构建、部署入口 |

## 当前状态（2026-10-20）

> 完整现场以 [`../.continue-here.md`](../.continue-here.md) 为准；这里只放里程碑级摘要。

- ✅ Task 1–6 已完成；`f1b1c66` 已处理 29 项 ChatGPT 评审（R1–R4、审计、WebSocket、视频、Docker、Android 配置）。
- ✅ `npm run verify:all` 在 Node `v20.20.2` 下通过 Task 2 / 3 / 4 / 6（每个任务全新隔离 SQLite + 3100 测试 API）。
- ✅ WSL2 已编译 debug APK：`apps/web/android/app/build/outputs/apk/debug/app-debug.apk`（4.0 MB，`com.vmitis.pad`；本轮已含评估 UI），API 指向 `http://192.168.0.188:3000`。
- ⏳ 无设备/模拟器，APK 未做安装/运行验证；WSL 访问 Windows 局域网 API 超时。
- ✅ 会话交接体系与 APK 构建配置已提交：`3d943fc` / `fe1b08d`；未 push。
- ✅ 评估模块已接入种子 5 纯函数：`AssessmentGradingService` + `assessmentMetaJson` + 前端题卡/初筛/原始分 + 学生 Pad 评估出示模式；`npm run build` 与 `npm run verify:all` 全绿；改动未提交。
- ⏳ 浏览器渲染冒烟未执行（本环境无 Chromium/Chrome）；APK 已重编译为 4.0 MB 并包含评估 UI，无设备未做安装/运行验证。
- 已知偏差：Kiosk 插件、RBAC、HTML 报告、R2 进程内状态、眼动仪 60Hz、便携 Node、`npm audit` 43 项、Docker 端口冲突。

## 文档维护规范

1. **一个主题一份权威文档**：产品/设计写 `vmi_tis.md` 的拥有章节；任务卡写 `IMPLEMENTATION_TASKS.md`；历史进度写 `PROGRESS.md`；当前现场写 `../.continue-here.md`；红线/技术栈/门禁写 `../AGENTS.md`。其他文档**引用**（写 `文档名 §节`）而不复制内容。
2. 需求变更 → `vmi_tis.md`；任务范围变更 → `IMPLEMENTATION_TASKS.md`；本轮完成/验证/偏差 → `PROGRESS.md`；会话现场 → `../.continue-here.md`；新增文档 → 在本文件登记。
3. 数据库 Schema 以根目录 `prisma/schema.prisma` 为唯一事实源，文档只指向它，不再内嵌第二份。
4. 失效的活口径**删除**，历史留在 git 与 `PROGRESS.md`；不要让读者重新打开已经作废的条目。
5. 命名：流程/指南类用中文名，技术类用英文短横线名。
6. 提交信息沿用现有 Conventional Commits（`feat(scope): 摘要` / `fix: 摘要` / `test: 摘要` / `docs: 摘要`）；`commit` / `push` 均需用户放行，禁止 `git add .`。
