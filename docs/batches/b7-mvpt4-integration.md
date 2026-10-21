# 2026-10-21 · MVPT-4 后端与前端接入
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-21 · 来源 = 用户 2026-10-21 开工 b7：在 b6 的 V2.3.1 种子上接入 MVPT-4 记录、定级、报告与 45 题记分台。
> 台账 = #2（assessment · 归批）。前情 = b6-assessment-provenance.md。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-21

### 本批条目
- 后端接入 MVPT-4：DTO（原始分 / 45 题逐题 / 手册标准分）、Prisma `mvpt4Std` 列、`AssessmentGradingService` 调用 `calculateMvpt4Norms`、`AssessmentMeta` 与 HTML 报告行。
- 前端接入：第四步 MVPT-4 记分台（45 题逐题、MEM 5 秒提示、薄弱维度与操作卡）、表单/汇总/提交。
- MVPT-3 新流程停用：前端不再录入 `mvpt3Std`；数据库历史列保留，旧记录可读。

### 关键判据
- 施测用实物图册；软件只记分，不内置官方图版。
- 自动换算只在 4–13 岁生效；14 岁以上必须录入手册标准分。
- 定级取 TVPS-4/MVPT-4 较低值；报告标注数据来源。

### 授权口径
- 用户 2026-10-21 回复“开工 b7”，授权本批实现。

> 不适用：§3 —— 本项目未配置 PROJECT-MANIFEST.json / docRoot，design 评审通道拒绝 docs 路径；已用两轮 code 评审覆盖：第一轮 2 🔴 + 6 🟡 + 3 🔵，第二轮全部 Fixed/Accepted，新增 2 条记录口径项，VERDICT pass。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成（第二轮评审修正后）

### 本批覆盖
1. 数据契约：`CreateAssessmentRecordDto` 增 `mvpt4RawScore` / `mvpt4ItemScores45` / `mvpt4Std`；`AutoLevelInput` 同步；`AssessmentMeta` 增 `mvpt4` 块；`AssessmentRecord` 与 Prisma 增 `mvpt4Std`。
2. 定级链路：`AssessmentGradingService` 逐题优先、原始分次之、手册标准分兜底；`standardScore: null` 时要求手册分；`mvpt4StdScore` 进入定级。
3. 报告：HTML 增 MVPT-4 原始分/标准分/百分位/等效年龄与薄弱维度。
4. 前端：`RecordSummary` 表单字段；`AssessmentPage` 提交；`ScaleAssessmentPanel` 新增 `Mvpt4Section`（45 题三态记分、MEM 5 秒倒计时、回填原始分、薄弱维度提示）；移除 MVPT-3 新录入。
5. 验收：`build` / `verify:all` / 临时库 `db:verify`；补 MVPT-4 API 断言。

### 受影响文件
- `prisma/schema.prisma`
- `packages/shared-types/src/index.ts`
- `apps/api/src/assessments/dto/create-assessment-record.dto.ts`
- `apps/api/src/assessments/assessment-grading.service.ts`
- `apps/api/src/assessments/assessment-record.service.ts`
- `apps/api/src/assessments/report.service.ts`
- `apps/web/src/api/client.ts`（如类型不在 AutoLevelInput）
- `apps/web/src/components/assessment/RecordSummary.tsx`
- `apps/web/src/components/assessment/ScaleAssessmentPanel.tsx`
- `apps/web/src/pages/web/AssessmentPage.tsx`
- `scripts/verify-task3.mjs`

### 验收对照
- MVPT-4 raw 30 / age 8 → 标准分与 meta 落库，报告含“MVPT-4”。
- MVPT-4 std 70 + Beery VMI 100 → L2。
- 14 岁以上只给 raw → `standardScore: null`，无 std 时有明确提示。
- 45 题逐题全 1 → 原始分 45；全 0 → 0。
- `npm run build` EXIT 0；`npm run verify:all` 全绿。

> 评审修正（2026-10-21）：标准分优先级改为“手册标准分优先、自动换算兜底”，与 SRS 一致；原“手册标准分兜底”表述作废。

> 评审修正（第二轮）：实际口径为“手工原始分优先、逐题汇总兜底”；逐题数据只用于薄弱维度解析。原“逐题优先、原始分次之”表述作废。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-21 在会话中回复“开工 b7”，批准本批实现 MVPT-4 后端/前端接入、MVPT-3 新流程停用与验收。

## §5 实施记录（实施者：主 agent ∥ coder）

### 落地内容
- 数据契约：`CreateAssessmentRecordDto` 增 `mvpt4RawScore` / `mvpt4ItemScores45`（45 项、0/1）/ `mvpt4Std`；`AutoLevelInput`、`AssessmentMeta`、`AssessmentRecord` 同步；Prisma `AssessmentRecord` 增 `mvpt4Std` 列。
- 定级：`AssessmentGradingService` 逐题优先、原始分次之、手册标准分兜底；`mvpt4StdScore` 进入 `determineRecommendedLevelL0ToL5`；`meta.mvpt4` 保存原始分、标准分、百分位、等效年龄、`normApplied/normNote` 与薄弱维度。
- 落库与报告：`assessment-record.service.ts` 写 `mvpt4Std`；`report.service.ts` 增 MVPT-4 标准分、原始分/百分位、等效年龄/说明，MVPT-3 行标“历史”。
- 前端：`RecordSummary` 表单增 `mvpt4RawScore` / `mvpt4ItemScores45` / `mvpt4Std`；`AssessmentPage` 提交 45 项数组；`ScaleAssessmentPanel` 新增 `Mvpt4Section`（5 维 × 9 题三态记分、MEM 5 秒倒计时、回填原始分、清空逐题）；SupplementSection 移除 MVPT-3 新录入。
- 验收：`verify-task3.mjs` 增 3 项断言（逐题全 1 → 原始分 45/标准分落库/meta；手册 70 → L2；报告含 MVPT-4 行）。

### 未做
- MVPT-3 历史列 `mvpt3Std` 仍保留在 schema 与后端 DTO；新前端不再写入。
- 报告尚未携带四类数据状态标签。
- 浏览器 UI 未实测（本环境无 Chromium）；平板真机未做。

### 第一轮评审后的修复（2026-10-21）
- 🔴 手册标准分优先：`mvpt4Std = dto.mvpt4Std ?? mvpt4AutoStd`；`meta.raw.mvpt4ManualStd` 留存手册值；手册分存在时 `normApplied=false`、百分位为空、`normNote` 标“手册标准分优先，自动换算已跳过”。
- 🔴 薄弱维度：报告新增“MVPT-4 薄弱维度”与“标准分来源”行；第 4 步面板显示薄弱维度（正确率 <65%、匹配操作卡）；保存后卡片显示 MVPT-4 标准分/来源/薄弱维度。
- 🟡 逐题部分完成：面板与汇总显示“只有 45 题全部判定才入库”；`hasAnyMeasurement` 接受完整 45 位 0/1，避免全评却被拦。
- 🟡 契约/注释：`SubmitScaleScoreDto` 收窄并标注历史字段；schema 表 3 注释改 MVPT-4，新增列注释。
- 🟡 验收：新增 5 项断言（手册优先、44 项 400、14+ null、全 0 五薄弱域、报告薄弱维度）；Task 3 共 8 项 MVPT-4 断言全绿。
- 🟡 批次记录：§2 口径更正为“手册优先”；补 §4 批准；§3 按不适用声明（无 docRoot，改用 code 评审两轮）。

- 第二轮评审口径澄清：原始分链为“手册标准分优先 → 手工原始分 → 逐题汇总 → 内置换算”；逐题数据只用于薄弱维度。§5 前文“逐题优先、原始分次之、手册标准分兜底”作废。

## §6 验证与收口（父代理）

### 验证
- `npm run build` EXIT 0（shared-types + api + web，含 `tsc --noEmit`），Node v20.20.2；日志 `/tmp/vmi-build-b7-d.log`。
- `npm run verify:all` EXIT 0，Task 2/3/4/6 全绿；Task 3 新增 3 项 MVPT-4 断言全部通过；日志 `/tmp/vmi-verify-b7.log`。
- 全新临时库 `file:/tmp/vmi_b7_verify_20261021.db`：`db:push + db:seed + db:verify` 全通过（13 卡 / 6 学生）；`assessment_records` 含 `mvpt4_std` 列。
- 开发库已执行 `db:push` 增加 `mvpt4_std` 列（不删数据）；`db:verify` 因 65 名历史学生仍失败，未清理。
- 新增断言：MVPT-4 45 题全 1 → 原始分 45、标准分 >100、meta 写入；手册 70 → L2；报告含“MVPT-4 标准分/原始分”。

### 未验证
- 浏览器 UI 冒烟（45 题下拉、MEM 5 秒、提交/汇总）与平板真机。
- 14 岁以上只给 raw 的端到端 UI 行为（种子函数已单测）。

### 评审修复后复跑
- `npm run build` EXIT 0；`npm run verify:all` EXIT 0，Task 2/3/4/6 全绿，8 项 MVPT-4 断言全过；日志 `/tmp/vmi-verify-b7-r3.log`。
- 临时库 `db:verify` 已通过（schema 含 `mvpt4_std`）；开发库已 `db:push` 增加该列。
