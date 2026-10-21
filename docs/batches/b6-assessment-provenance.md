# 2026-10-21 · 评估量表数据溯源与 MVPT-4 修正
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-21 · 来源 = 用户 2026-10-21 确认：采用 V2.3 结构骨架，先修数据溯源与五个硬缺陷，再做 MVPT-4 接入。
> 台账 = #1（assessment · 归批）。前情 = b5-assessment-dual-screen.md。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-21
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 本批条目
- 采用 V2.3 种子作为工程骨架，从 Windows 树复制进 WSL 工作树。
- 修五个硬缺陷：定级取较低值、MVPT-4 成人只收手册分、出处注册表与数据对齐、RAN/RAS 矩阵修正、删除未实现的常模热覆盖声明。
- 给每个量表加数据状态标签（OFFICIAL_LICENSED / MANUAL_ENTRY_ONLY / PROJECT_APPROXIMATION / STRUCTURE_ONLY）。
- 还原 `docs/vmi_tis.md` 的 Gemini 重写，只做 MVPT-4 定点修改。

### 关键判据
- 结构完整不等于官方内容。V2.3 的 45/126/30/39 数组是题号索引或派生结构，不是官方图版。
- `AGENTS.md` 禁止编造题目数据；正式标准分只能来自授权常模或手册录入。
- 验收以 `npm run build`、`npm run verify:all`、`npm run db:verify` 和批次内断言为准。

### 授权口径
- 用户 2026-10-21 回复“确认”，授权按 1–4 步执行。MVPT-4 后端/前端接入放到 b7，不在本批混做。

> 不适用：§3 —— 本项目未配置 PROJECT-MANIFEST.json / docRoot，design 评审通道拒绝 `docs/` 路径；已用两轮 code 评审覆盖：第一轮 9 项（1 🔴 + 6 🟡 + 2 🔵），第二轮 8 Fixed / 1 Accepted / 1 Unfixed（🔵），VERDICT pass。

## §2 批次任务与设计（主 agent）
**状态行**：✅ 设计完成
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 本批覆盖
1. 种子数据状态：新增 `ScaleDataStatus` 与每个量表的 `dataStatus`，并把出处注册表中与数据不符的表述改成实际状态。
2. 定级：`determineRecommendedLevelL0ToL5` 对 TVPS-4 / MVPT-4 取较低值；L2 触发直接与运动协调分比较，避免 Beery VP 高分掩盖低 MVPT。
3. MVPT-4 常模：`calculateMvpt4Norms` 只在 4–13 岁自动换算；低于 4 岁或高于 13 岁返回 `standardScore: null`、`normApplied: false`，要求录入手册标准分。
4. 兼容清理：TVPS-4 常模矩阵上限改为 18 岁；RAN/RAS 的 RAS 池补 `6`，修掉纵向相邻重复。
5. 文档：还原 `docs/vmi_tis.md`，只改 MVPT-3→MVPT-4 与数据状态说明，保留 HTML 报告与“不伪造题库”的原始口径。
6. 验收：批次内脚本断言数组长度、RAN 邻接、定级取低、MVPT 成人空值；再跑项目三门禁。

### 设计档落点
- 数据源与公式：`packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`。
- 产品口径：`docs/vmi_tis.md` §6.2.3 第三层量表段。
- 本批记录：本文件。

### 关键决策
- 不把 V2.3 的合成题卡标成官方施测材料；统一标为“结构化索引/项目近似”。
- `CustomNormOverride` 未实现，删除声明，不写空接口。
- MVPT-3 的历史列与字段留给 b7 统一处理；本批只改种子，不动数据库。

### 受影响文件
- `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts`
- `docs/vmi_tis.md`
- `docs/batches/b6-assessment-provenance.md`

### 验收对照
- `npm run build` EXIT 0。
- `npm run verify:all` 全绿。
- `npm run db:verify` 通过。
- 批次断言：45/126/30/30/39/130 结构计数；RAN 4 套 5×10 无相邻重复；TVPS100+MVPT70 → L2；MVPT 30 岁 → `standardScore: null`。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-21 在会话中回复“确认”，批准按 V2.3 结构骨架执行 b6：数据状态标签、五个硬缺陷修正、文档还原与三门禁验证。本轮交付不含 b7 的后端/前端 MVPT-4 接入，已在 §5「未做」列明；commit/push 未执行，等待用户放行。

## §5 实施记录（实施者：主 agent ∥ coder）

### 落地内容
- 种子从 Windows 树 `F:/Projects/VMI-TIS/.../vmi_tis_assessment_scales_seed.ts` 复制进 WSL 工作树，版本改为 V2.3.1。
- 新增 `ScaleDataStatus` 与 `SCALE_PROVENANCE_REGISTRY[].dataStatus`（种子 `:52`、`:69`）：10 个量表分别标 `OFFICIAL_LICENSED` / `MANUAL_ENTRY_ONLY` / `PROJECT_APPROXIMATION` / `STRUCTURE_ONLY`。
- 定级：`determineRecommendedLevelL0ToL5` 对 TVPS-4 / MVPT-4 取较低值，L2 触发直接与运动协调分比较（`:2321` 起）。
- MVPT-4 常模：`calculateMvpt4Norms` 只在 4–13 岁自动换算；14 岁以上返回 `standardScore: null`、`normApplied: false`、`normNote` 要求手册分（`:2154` 起）。
- 出处对齐：MVPT-4 标 4–13 岁、Beery VP/MC 标“由 VMI 派生”、SPSRC 标“题干未收录”、RAN/RAS 标“项目生成”、TVPS-4 标“题号索引非官方题卡”。
- RAN/RAS：`RAS_2_SET` 刺激池补 `6`，修掉第 3 行第 8 列纵向重复；4 套 5×10 矩阵无相邻重复、无池外值。
- TVPS-4 常模矩阵上限从 21 岁改为 18 岁（`:1350`）。
- 文档：还原 `docs/vmi_tis.md` 的 Gemini 重写；支持量表改 MVPT-4、补“MVPT-4 只做记分台”与“量表数据来源分级”（`:52`、`:59`、`:60`）。
- 删除未实现的 `CustomNormOverride` 声明；常模热覆盖留在后续批次。

### 未做
- 后端 DTO、Prisma 列 `mvpt4Std`、报告行、前端 MVPT-4 记分台：留 b7。
- MVPT-3 历史列与旧记录：保留不动，b7 统一处理。
- 合成 SVG 题卡不用于正式施测；本轮只在代码与文档中标注为训练/演示材料。

### 第一轮评审后的修复（2026-10-21）
- 🔴 RAN_RAS 的 `normDataNature` 删除不存在的 "Mean/SD" 表述，改为“50 项认读超时截断秒数（单阈值表）”。
- registry 键收紧为 `ProvenanceRegistryKey`（`ScaleCode` + 两个非标准量表键）；`SPSRC` 键改为 `SPSRC_SIPT`，编译期可发现漏项。
- 定级 L2 文案改为按数据来源渲染（TVPS-4 / MVPT-4 / Beery VP 参考分 / 未施测），不再把 Beery VP 分写成 MVPT/TVPS 分；`tvpsWeakestSubtest` 进入文案，不再是死参数。
- `calculateBeeryVmiNorms` 低于 24 月龄时改用首行锚点，不再回退到成人行。
- 后端 `assessment-grading.service.ts` 去掉 `tvpsOverallStdScore ?? 100`，未施测时传 `undefined`；`AssessmentMeta.inputs.tvpsOverallStdScore` 改为可选。
- `docs/vmi_tis.md`：`:59` 标明 MVPT-4 记分台尚未接入；`:60` 改为“种子侧已标注、报告侧尚未携带”；`:423` 的 MVPT-3 改为 MVPT-4 并注明历史列。

## §6 验证与收口（父代理）

### 验证
- `npm run build`（shared-types + api + web，含 `tsc --noEmit`）EXIT 0，Node v20.20.2；日志 `/tmp/vmi-build-b6.log`。
- `npm run verify:all` EXIT 0，Task 2/3/4/6 全绿（隔离 SQLite + 3100 测试 API）；日志 `/tmp/vmi-verify-b6.log`。
- 全新临时库 `file:/tmp/vmi_b6_verify_20261021.db`：`db:push` + `db:seed` + `db:verify` 全通过（13 卡 / 6 学生）；日志 `/tmp/vmi-b6-dbverify.log`。
- 批次断言：MVPT-4 30 岁/14 岁返回 `standardScore: null`；13 岁/4 岁返回数值；TVPS 100 + MVPT 70 返回 L2；RAN 4 套 5×10 无相邻重复、无池外值；45/126/30/30/39/130 结构计数符合预期。
- 开发库 `apps/api/data/vmi_tis.db` 当前有 65 名学生（历史测试数据），`db:verify` 因此失败；未清理、未覆盖，改用临时库复跑通过。

### 未验证
- b7 的后端/前端 MVPT-4 接入、数据库 `mvpt4Std` 列、报告行。
- 浏览器 UI 冒烟与平板真机；本轮未做。
- NSUCO、TVPS-4、Beery 常模数值与官方手册逐项一致性仍未核对。

### 收口状态
- 本批代码与文档已落盘，待独立评审与用户验收后关闭；未 commit/push。

### 第二轮验证（评审修复后）
- `npm run build` EXIT 0；日志 `/tmp/vmi-build-b6-r2.log`。
- 运行时断言：`RAN_RAS.normDataNature` 已无 Mean/SD；registry 键含 `SPSRC_SIPT`；TVPS 100 + MVPT 70 → L2；仅 Beery VP 70 → L2 且文案写“Beery VP 参考分”；无感知分 → L5；MVPT 14 岁 → `standardScore: null`；Beery 18 月龄 raw 5 → 首行锚点（标准分 107，不再落成人行）。
- RAN/RAS 四套 5×10 相邻重复 0、池外值 0。

### 收口
- 独立评审第一轮 9 项（1 🔴 + 6 🟡 + 2 🔵）；第二轮复核：8 项 Fixed、1 项 Accepted（TVMS-3 措辞，判定不构成缺陷）、1 项 Unfixed（🔵 批次记录状态行/占位符），VERDICT: pass。
- b6 收口；代码与文档未 commit/push。b7（MVPT-4 DTO / Prisma `mvpt4Std` / 记分台 / 报告行）另开批次。
