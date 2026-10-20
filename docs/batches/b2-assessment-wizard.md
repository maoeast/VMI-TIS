# 2026-10-20 · 评估中心向导化与数据链修复
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-20 · 来源 = 用户 2026-10-20 确认 A（5 步向导 + 数据链修复）；设计稿由 ccapi:claude-opus-5-5 产出，主代理核对修正（R2 键不改、红区门禁 UI-only、HTML 报告、recordForm 单一数据源）；用户按建议批准 6 项决策。
> 台账 = 无（本批未启用台账；项目无 PROJECT-MANIFEST.json）。前情 = docs/batches/b1-red-zone-structured-codes.md。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-20

用户 2026-10-20 确认 A（评估中心向导化 + 数据链修复）。设计稿由 `ccapi:claude-opus-5-5` 出稿；主代理核对现场后修正 4 处：R2 键不扩展（只有 Beery 主测验走 R2）、红区门禁只做 UI（保留 `createRecord` 的红区 L0）、报告是 HTML 非 PDF、用 `recordForm` 作唯一数据源（不加 `scaleTotals`）。用户按建议批准 6 项决策：D1 不扩展 R2 键、D2 TVPS 仅样例 + 手工、D3 UI 门禁、D4 旧四 Tab 替换为向导、D5 HTML 报告、D6 至少一项视光/量表数据（红区 L0 可只带初筛）。

> 不适用：§3 —— 设计由 `ccapi:claude-opus-5-5` 出稿、主代理核对修正，用户批准；未单独跑 advisor 设计评审。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成

### 本批条目
- 目标：评估中心从四个功能 Tab 改为 5 步向导；修通 R2 判分 → 记录原始分 → 报告的数据链；加评估阶段选择与红区门禁。
- 来源：用户 2026-10-20 确认 A；设计稿 `ccapi:claude-opus-5-5`，主代理核对修正；用户批准 6 项决策。

### 五步流程与门禁
1. **选学生 + 评估阶段**：`evalPhase` = BASELINE / STAGE_8W / TRANSITION；有 `activeStudentId` 才能下一步。
2. **初筛与红区转介**：复用 `ScreeningForms` + b1 的 `redZoneCodes: screening.red`；`PENDING_SCREENING` 必须提交初筛；`RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` 禁用步骤 3–4 并显示“请先完成回执审核”；`GREEN_ACTIVE` 放行。
3. **视光与眼动**：NPC、调节灵活度、NSUCO；可跳过。
4. **量表施测**：Beery 主测验（30 题题卡 + 1/0 + R2 中止 + “确认原始分”写入 `recordForm.beeryVmiRaw`）；VP/MC/TVPS/DEM/MVPT 用现有字段手工录入；TVPS 明示“种子仅样例题卡，不逐题判分”；不伪造题库。
5. **汇总与报告**：汇总 `recordForm` → 保存（`recordForm` + `evalPhase`）→ 自动定级 → 生成 HTML 报告（`reportFileUrl`）；下方显示历史评估（按阶段分组）。

### 数据链
- `recordForm` 是唯一记录表；R2 的“确认原始分”把 `scaleResult.totalRawScore` 写入 `recordForm.beeryVmiRaw`，仍可手工修改；不加 `scaleTotals` 第二份状态。
- 阶段选择：`submitScore` / `resetScale` / `saveRecord` 全部透传 `evalPhase`；`submitScaleScore` 与 `createRecord` 已支持，无需改后端。
- R2 会话键**不改**：仍为 `studentId:evalPhase:sessionId`；只有 Beery 主测验走 R2；`AGENTS.md` R2 红线不动。
- 红区门禁**只做 UI**；`createRecord` 保留红区 L0（`verify-task3.mjs:431-440`）；服务端 R1 训练/排课守卫不变。
- 报告是 HTML：`generateReport` 返回 `reportFileUrl`（`/api/reports/<id>.html`）；不写 PDF。

### 组件与状态
- 容器 `AssessmentPage`：`step`（1–5）、`evalPhase`、`student`、`triageResult`、`recordForm`、`scaleResult`、`savedRecord`、`reportUrl`、`records`、`referrals`、`screening`。
- 新组件（`apps/web/src/components/assessment/`）：`StudentPhaseSelector`、`OptometryPanel`、`ScaleAssessmentPanel`、`RecordSummary`；`AssessmentStepper` 可内联；`TriageStep` 可复用现有 JSX。
- `BeeryVmiCard` 增加可选受控 props：`itemNumber` / `onItemNumberChange` / `onScore`；不传时保持现有行为，学生端 `AssessmentCardPanel` 不受影响。
- `Tvps4Card` / `DemMatrix` / `ScreeningForms` / `NsucoPanel` 不改或只加说明文案。
- 旧四 Tab 移除；题卡进第 4 步；报告历史进第 5 步。
- 保存后显示定级与报告链接；报告失败不阻塞保存。

### 验收
- `npm run build`（shared-types + api + web，web `tsc --noEmit`）通过。
- `npm run verify:all` 全绿（Task 2/3/4/6）；`verify-task3` 新增：BASELINE/STAGE_8W 记录分组、R2 阶段隔离（同一学生两个 phase 的 total 独立）、Beery 主测验 R2 中止/重置、保存后 raw 字段正确、HTML 报告 URL 可访问。
- 浏览器冒烟（Chromium）：选学生 → 阶段 → 初筛绿区 → 视光 → Beery 判分/确认 → 保存 → 报告；红区学生步骤 3–4 禁用；TVPS 显示“仅样例题卡 + 手工录入”。
- 不伪造 TVPS 完整题库；不改 R2 DTO/键；不改 schema；不改后端。

### 不在范围
- 三端入口/RBAC、Kiosk、R2 持久化、recentScores TTL、monthsBetween 去重、PDF 报告、APK 重打。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-20 16:47 回复「按建议来推进开工吧」；批准修正版设计与 6 项决策（D1 不扩展 R2 键、D2 TVPS 仅样例 + 手工、D3 UI 门禁、D4 旧四 Tab 替换为向导、D5 HTML 报告、D6 至少一项视光/量表数据，红区 L0 可只带初筛）。b1 红区批次已在 `71546b8` 提交。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成



- **改动（按 §2 步骤）**
  - `apps/web/src/pages/web/AssessmentPage.tsx`：移除旧四 Tab，改为 5 步向导（step 1–5）；`evalPhase` 进入状态并透传 `submitScaleScore` / `createRecord`；门禁按 `student.triageStatus` 计算禁用步骤（`PENDING_SCREENING` → 3–5，`RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` → 3–4，`GREEN_ACTIVE` 全开）；初筛提交、回执上传/审核后 `loadStudent()` 刷新状态；「确认原始分」把 `scaleResult.totalRawScore` 写入 `recordForm.beeryVmiRaw`；保存后自动定级并自动生成 HTML 报告（报告失败不阻塞保存）；第 5 步按 `BASELINE / STAGE_8W / TRANSITION` 分组展示历史并逐条生成报告。
  - `apps/web/src/components/assessment/BeeryVmiCard.tsx`：新增可选受控 props `itemNumber` / `onItemNumberChange` / `onScore` / `scoreDisabled`；不传时保持原出示行为，学生 Pad 的 `AssessmentCardPanel` 未改。
  - 新增 `AssessmentStepper.tsx`（步骤条与禁用态）、`StudentPhaseSelector.tsx`（学生信息、阶段选择、门禁提示）、`OptometryPanel.tsx`（NPC / 调节灵活度 / NSUCO / 稳定性与课堂应用，可跳过）、`ScaleAssessmentPanel.tsx`（Beery 判分与确认原始分、TVPS 样例题卡 + 7 项手工原始分、DEM 矩阵 + 手工、VP/MC/MVPT 手工）、`RecordSummary.tsx`（记录草稿字段形状 `AssessmentRecordForm` / `EMPTY_RECORD_FORM` / `hasAnyMeasurement`、汇总、保存/定级/报告、历史）。
  - `scripts/verify-task3.mjs`：新增 8 项断言——R2 阶段隔离（同一学生同一 sessionId 的 BASELINE 2 分与 STAGE_8W 0 分互不影响）、STAGE_8W 连续 3 题 0 分中止、STAGE_8W reset 不影响 BASELINE、Beery 逐题判分累计原始分 12、STAGE_8W 记录落盘 `evalPhase` + 确认后的 `beeryVmiRaw`/标准分、TVPS-4 七项与 DEM 原始输入及换算、BASELINE 13 + STAGE_8W 1 的分组、`evalPhase` 过滤、STAGE_8W HTML 报告可访问；原有 13 条 BASELINE 分组断言保留在原位置，不回归。
  - `docs/vmi_tis.md` §6.2.3 增补「教师端实施口径（5 步向导）」；`docs/PROGRESS.md` 追加本轮记录。
- **未改**：后端 `apps/api`、`prisma/schema.prisma`、`packages/shared-types`、`AGENTS.md`、学生 Pad 页面、`AssessmentCardPanel` / `Tvps4Card` / `DemMatrix` 既有行为；未伪造 TVPS 题库；未 commit/push。
- **验证**：`npm run build`（shared-types + api + web，含 web `tsc --noEmit`）EXIT 0；Node `v20.20.2` 下 `npm run verify:all` EXIT 0，Task 2/3/4/6 全绿，Task 3 共 46 项检查通过（含新增 8 项）。
- **偏差**：无功能性偏差。两处实现口径补明：① `PENDING_SCREENING` 同时禁用第 5 步（不止 3–4），避免未初筛先落记录；红区学生第 5 步保留（D6）。② `RecordSummary.tsx` 同时持有草稿字段形状，避免多个面板复制字段清单，未新增 §2 组件清单之外的额外文件。
- **未验证**：浏览器 UI 冒烟（5 步走通、红区禁用步骤 3–4、TVPS 文案）由主代理按 §2 验收执行；本实施者未跑 Chromium。

- **口径补明（第 3 步内容）**：第 3 步除 NPC / 调节灵活度 / NSUCO 外，保留「稳定性与课堂应用」四项既有输入（`stabilityPass` / `classroomAdaptationPass` / `quadrupedHoldSec` / `classroomCopyAccuracyPct`）——它们是 L0/L4 定级的既有依据，移出向导会导致旧能力丢失；未新增字段。

## §6 验证与收口（父代理）

### 独立复核与门禁（主代理，2026-10-20）
- 复核 diff：`AssessmentPage.tsx` 964 行改写 + `BeeryVmiCard` 受控 + 5 个新组件（Stepper / StudentPhaseSelector / OptometryPanel / ScaleAssessmentPanel / RecordSummary）+ `verify-task3` +208 行 + 文档；5 步向导、阶段透传、红区 UI 门禁、Beery → `recordForm.beeryVmiRaw`、HTML 报告均落地。
- `npm run build` EXIT 0（shared-types + api + web，web `tsc --noEmit`）。
- `npm run verify:all` EXIT 0（Task 2/3/4/6 全绿；Task 3 46 项，含新增 8 项：R2 阶段隔离、STAGE_8W 中止、reset 作用域、Beery 累计原始分 12、STAGE_8W 记录原始分、TVPS/DEM 原始输入、阶段分组、HTML 报告可访问）。
- 浏览器冒烟（3100 + 主库副本，Chromium）：周子墨 BASELINE 走完 5 步；Beery 判分 1 → 确认原始分 → 保存 → 自动定级 L3 → HTML 报告 `/api/reports/<id>.html` 返回 200；历史评估显示 1 条 BASELINE。张梓轩（`RED_ZONE_LOCKED`）：步骤 3/4 禁用、步骤 5 可保存 L0；门禁提示正确。
- 未验证：LAN 部署 APK（当前平板仍是 localhost + `adb reverse` 测试构建）；未 commit/push。

### Advisor 复核与处置（主代理，2026-10-20）
- advisor（reviewId `4be50923`）结论 pass；14 条（6 🟡 / 8 🔵），无 🔴。
- 已修：#1 Beery 判分防抖 + 题号去重（`AssessmentPage.tsx:226`、`ScaleAssessmentPanel.tsx:64`）；#3 汇总文案改为“未录入项不写入明细，但服务端按达标缺省参与定级”（`RecordSummary.tsx:215`）；#4 保存成功禁用保存 + “新建一次评估”（`AssessmentPage.tsx:312/422`、`RecordSummary.tsx:316/353`）；#6 切学生竞态校验（`AssessmentPage.tsx:105`）；#7 阶段契约复用 shared-types `EvalPhase`（`StudentPhaseSelector.tsx:11/13`）；#9 §1 声明 §3 不适用；#10 报告口径统一为 HTML（`docs/vmi_tis.md:55`、`RecordSummary.tsx:309`）；#12 重置清空 `beeryVmiRaw`（`AssessmentPage.tsx:266`）。
- 未修：#2 第 3 步默认值（沿用既有定级兼容缺省，改三态需产品决策）；#5 红区 L0 回写 `currentLevel`（服务端既有语义，已在门禁区提示，是否改需产品决策）；#8 `verify-task3` 计数硬编码（既有风格，非阻断）；#11 回执演示占位（既有演示惯例，交付级）；#13 `as` 强断（类型加固，非阻断）；#14 数值范围（输入校验，非阻断）。
- 修复后重跑：`npm run build` EXIT 0；`npm run verify:all` EXIT 0（Task 2/3/4/6 全绿）；浏览器冒烟（3100 + 主库副本）：Beery 判 1 → 重复判分被拦（“该题已判分”）→ 确认原始分 → 保存“已保存” → “新建一次评估”回第 1 步；无残留已保存状态。
