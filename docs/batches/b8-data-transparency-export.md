# 2026-10-21 · 评估数据透明度与科研导出
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-21 · 来源 = 用户 2026-10-21 按 b8：数据状态标签、科研 CSV 导出、验收脚本防误写开发库；ccapi claude-opus-5-5 设计、DeepSeek 实施、gpt-sol-6.1 审核。
> 台账 = #3（assessment · 归批）。前情 = b7-mvpt4-integration.md。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（…）
<§1 模板占位：本批条目 / 关键判据 / 授权口径>

### 本批条目
- 数据状态标签：报告与前端按 `SCALE_PROVENANCE_REGISTRY` 显示每个量表的 `dataStatus` 与分数来源（官方/手册录入/内置参考换算/仅结构/未录入）。
- 科研 CSV 导出：评估记录批量脱敏导出，含学生编码、月龄、阶段、量表分、数据状态与来源、定级、时间；默认不含姓名/电话。
- 验收脚本防护：`verify-task2/3/4` 不再默认打 3000 开发库，防止测试数据污染。

### 关键判据
- 不伪造官方题库/常模；只有 `OFFICIAL_LICENSED` / `MANUAL_ENTRY_ONLY` 可写入正式结论。
- 报告、前端、CSV 三处共用同一份标签映射，单一来源，避免三套文案。
- CSV 默认脱敏；不引入外部上报。
- 不改 R1–R4 熔断/护眼/晋级语义。

### 授权口径
- 用户 2026-10-21 指定 b8 范围与三方流程：ccapi claude-opus-5-5 出设计/验收口径，DeepSeek 实施，gpt-sol-6.1 审核。

## §2 批次任务与设计（主 agent）
**状态行**：（主 agent 写入时更新）
<§2 模板占位：本批条目（覆盖） / 设计档落点 / 机制设计 / 受影响文件与测试覆盖 / 验收对照 / 关键决策 / 上抛项>

### 设计（ccapi 初稿 + 主代理按代码事实修订）

#### 1. 单一标签源
在 `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts` 增加并导出：
- `SCALE_DATA_STATUS_LABELS: Record<ScaleDataStatus, { label: string; description: string }>`：`OFFICIAL_LICENSED=官方授权`、`MANUAL_ENTRY_ONLY=手册录入`、`PROJECT_APPROXIMATION=项目近似`、`STRUCTURE_ONLY=仅结构`。
- `SCALE_SCORE_SOURCE_LABELS: Record<ScaleScoreSource, string>`：`MANUAL=手册录入（正式）`、`REFERENCE=内置参考换算（以手册为准）`、`PROJECT_RULE=项目判读规则`、`STRUCTURE_ONLY=仅结构`、`NOT_ENTERED=未录入`、`NEEDS_MANUAL=未录入（需手册标准分）`。
- `ScaleScoreSource` 联合类型；`resolveScaleScoreSource({ dataStatus, standardScore, normApplied, hasRawInput })` 纯函数：
  - `STRUCTURE_ONLY` → `STRUCTURE_ONLY`；`PROJECT_APPROXIMATION` → `PROJECT_RULE`；
  - `standardScore == null` → `hasRawInput ? NEEDS_MANUAL : NOT_ENTERED`；
  - `normApplied === false` → `MANUAL`；`normApplied === true` → `REFERENCE`；
  - `normApplied == null`（Beery 无此字段）→ `hasRawInput ? REFERENCE : MANUAL`。
报告、前端、CSV 都只引用这份映射，禁止各自写一套中文。

#### 2. 报告（apps/api/src/assessments/report.service.ts）
- 现有 `renderHtml` 的「二、视觉感知与视觉运动整合」表（当前 `:138-149`）扩展：
  - Beery VMI-6：标准分 + `数据状态`（Beery 注册表）+ `分数来源`（`beeryVmiRaw != null` → 参考换算；仅 std → 手册；空 → 未录入）。
  - Beery VP/MC：标准分 + 同一 Beery 数据状态/来源行。
  - TVPS-4：标准分 + 状态 + 来源（`meta.tvps4` 存在 → 参考换算；仅 std → 手册；空 → 未录入）。
  - MVPT-4：保留现有 `mvpt4Source`，补 `数据状态`；来源继续用 `meta.mvpt4.normApplied === false ? 手册 : 参考`。
  - DEM：`demNormTier` + 状态 + 来源（`meta.dem` 存在 → 参考；仅 tier → 手册；空 → 未录入）。
  - NSUCO：解析 `nsucoScoreJson` 的 pursuit/saccade/vergence，显示追视/扫视/聚散 + 状态（手册录入）+ 来源（有值 → 手册；空 → 未录入）。
  - 「量表数据状态说明」小表：遍历 `SCALE_PROVENANCE_REGISTRY` 10 条，列 `量表 / 数据状态 / 说明`（说明取注册表 `stimulusDataNature` 或 `normDataNature` 的短句）。这一表覆盖 TVMS-3/RAN/SPSRC 等未进入本次记录的量表。
- 增加 `.status-badge` 样式；所有标签过 `escape()`；颜色只在报告本地映射（`OFFICIAL=#d1fae5/#065f46`、`MANUAL=#dbeafe/#1e40af`、`PROJECT=#fef3c7/#92400e`、`STRUCTURE=#f3f4f6/#1f2937`）。
- 注意：`meta.beery` 的键是 `main`/`vp`/`mc`（`packages/shared-types/src/index.ts:535-539`），不是 `beeryVmi`；`meta.tvps4`、`meta.mvpt4`、`meta.dem` 与现有 `asRecord` 一致。

#### 3. 前端
- 新建 `apps/web/src/utils/scaleStatus.ts`：从种子导入标签映射，提供 `getScaleStatusBadge(scaleCode)`（返回 label + Tailwind 类：官方绿、手册蓝、近似琥珀、仅结构灰）与 `getFormScoreSource(scaleCode, form)`（按表单是否填 raw/std 推导来源，规则同 §2.1）。
- `ScaleAssessmentPanel.tsx`：在 Beery 主测验（`:85`）、TVPS-4（`:254`）、DEM（`:354`）、MVPT-4（`:458`）、Beery VP/MC 补充段标题旁加 `<ScaleStatusBadge>`；徽标带 `aria-label="数据状态：…"`。
- `RecordSummary.tsx`：第 5 步汇总的 Beery / TVPS-4 / MVPT-4 分组标题旁加徽标；标准分输入框下加一行小字「数据状态：手册录入 · 分数来源：…」；保存后卡片在 Beery/TVPS-4/MVPT-4 分数后显示来源（`meta.beery.main` / `meta.tvps4` / `meta.mvpt4`）。
- 不把徽标塞进历史记录表格，避免过密；历史记录保持现状。

#### 4. 科研 CSV
- 新端点 `GET /api/analytics/export-csv`（`analytics.controller.ts`，`@Res()` 设置响应头），`AnalyticsService.exportAssessmentCsv()` 生成字符串。
- 查询 `assessmentRecord.findMany` + `student` 选择 `studentCode/gender/birthDate/schoolScene/triageStatus/currentLevel`，按 `createdAt` 升序。
- 列（固定顺序，后续只追加）：学生编码、性别、月龄、班级场景、评估阶段、评估日期、分流状态、当前层级、自动定级、Beery VMI 原始分、Beery VMI 标准分、Beery VMI 数据状态、Beery VMI 分数来源、Beery VP 标准分、Beery MC 标准分、TVPS-4 标准分、TVPS-4 数据状态、TVPS-4 分数来源、MVPT-4 标准分、MVPT-4 数据状态、MVPT-4 分数来源、DEM 分型、DEM 数据状态、DEM 分数来源、NSUCO 追视、NSUCO 扫视、NPC cm、调节灵活度 cpm、六维雷达 JSON。
- **不导出**：姓名、电话、出生日期、学生 UUID、记录 UUID。月龄按评估日期计算（`floor((createdAt - birthDate)/2629800000)`，30.4375 天/月）。
- UTF-8 BOM `\uFEFF`、CRLF、RFC 4180 转义（含逗号/引号/换行时双引号包裹，内部 `"` 变 `""`），空值空串；空数据返回仅表头。
- 文件名 `vmi_tis_assessment_export_YYYYMMDD_HHmmss.csv`；`Content-Type: text/csv; charset=utf-8`；`Content-Disposition: attachment; filename="..."`。
- 前端 `AnalyticsPage.tsx` 的 `PageHeader actions` 增加下载链接：`<a href={resolveApiUrl('/api/analytics/export-csv')} download className="btn-secondary">导出科研数据（CSV）</a>`。
- 权限：机构内部工具，暂不加角色守卫；不新增云服务/外部上报。

#### 5. 验收脚本防护
- 新建 `scripts/verify-guard.mjs`：`assertSafeTarget(raw)` 解析 URL；若 host 为 localhost/127.0.0.1 且端口 3000 且 `ALLOW_DEV_API !== '1'`，打印拒绝说明并 `process.exit(1)`；解析失败也退出。
- `verify-task2.mjs:6`、`verify-task3.mjs:10`、`verify-task4.mjs:5` 改为 `const BASE = assertSafeTarget(process.env.API_BASE ?? 'http://localhost:3100/api');`；`verify-task6.mjs:6` 改为 `const ORIGIN = assertSafeTarget(process.env.API_ORIGIN ?? 'http://localhost:3100');`。
- `run-verification.mjs` 已设置 3100 + `vmi_tis_test.db`，不需要改；默认不带环境变量时脚本打 3100，不再打 3000。
- 放行：`ALLOW_DEV_API=1 API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs`。

#### 6. 文档
- `docs/vmi_tis.md:60` 的「报告侧尚未携带该标签」改为「报告与科研 CSV 已携带该标签」；`§6.2.7` 补一句 CSV 导出路径与脱敏口径。
- 不改 `prisma/schema.prisma`、Socket 契约、R1–R4、Android、deploy。

### 验收对照
- `npm run build` EXIT 0；`npm run verify:all` Task 2/3/4/6 全绿。
- Task 3 报告断言新增：报告含「数据状态」；手册 MVPT 记录含「手册录入」；自动换算记录含「内置参考换算」。
- Task 4 CSV 断言：200 + `text/csv` + BOM `EF BB BF` + 表头含「学生编码」/「Beery VMI-6 数据状态」/「MVPT-4 分数来源」，且表头不含「姓名」「出生日期」；数据行含学生编码。
- 防护断言：`API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs` 退出码 1 且不发起请求；`ALLOW_DEV_API=1` 时放行；不带环境变量时目标为 3100。
- 人工：报告四种状态徽标可读；CSV 用 Excel 打开中文不乱码；不出现姓名/电话/出生日期。

### 关键决策
- 裁决项 1（报告两行 vs 一行）：选分两行（清晰，科研场景需要）。
- 裁决项 2（CSV 权限）：暂不加角色守卫（机构内部工具，无 RBAC）。
- 裁决项 3（徽标密度）：第 4 步全显示，历史列表不显示。

### §2 补记（2026-10-21，gpt-sol 审核后）
- CSV 在原 29 列之后追加 `NSUCO 数据状态` / `NSUCO 分数来源` / `视光判读数据状态` / `视光判读分数来源`，共 **33 列**；既有列序不变，符合“只追加”约定。
- 第 3 步 `OptometryPanel` 的「视光与眼动」标题补 `OPTOMETRY_NORMS` 徽标，NSUCO 小节补 `NSUCO` 徽标；前端状态徽标覆盖第 3–5 步。
- Task 4 CSV 列序断言同步为 33 列；其余设计不变。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

### 用户确认（2026-10-21 14:52）
- 用户确认 b8 交付，同意提交并推送 `origin/main`。
- 提交信息：`feat(assessment): 增加量表数据状态标识与科研 CSV 导出`。
- 推送远端：`origin`（`git@github.com:maoeast/VMI-TIS.git`）；**不推 `windows`**。

## §5 实施记录（实施者：主 agent ∥ coder）

### 实施记录（coder · 2026-10-21）

#### 落地坐标
1. **单一标签源** — `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts:176-252`：新增 `ScaleScoreSource`、`SCALE_DATA_STATUS_LABELS`（官方授权/手册录入/项目近似/仅结构）、`SCALE_SCORE_SOURCE_LABELS`（手册录入（正式）/内置参考换算（以手册为准）/项目判读规则/仅结构/未录入/未录入（需手册标准分））、`ScaleScoreSourceInput` 与 `resolveScaleScoreSource`（判定顺序：数据状态 → 有无分数 → normApplied 三态）。
2. **报告** — `apps/api/src/assessments/report.service.ts`：第二节表格扩为 Beery 主/VP/MC、TVPS-4、MVPT-4、DEM、NSUCO 各自「分数 + 数据状态 + 分数来源」三行；新增第七节「量表数据状态说明」（遍历注册表 10 条，列 量表/数据状态/说明），训练处方顺延为第八节。`.status-badge` 四色只在报告本地映射，文案全部取自种子标签表。meta 解析按实际键：`meta.beery.main/vp/mc`、`meta.tvps4`、`meta.mvpt4.normApplied`、`meta.dem`；NSUCO 取记录 `nsucoScoreJson`。
3. **科研 CSV** — `apps/api/src/analytics/analytics.service.ts`（`exportAssessmentCsv` + `csvCell`/`csvRow`/`csvFileName`）、`apps/api/src/analytics/analytics.controller.ts`（`GET /api/analytics/export-csv`，`@Res()` 写 `Content-Type: text/csv; charset=utf-8` 与 `Content-Disposition: attachment`）。29 列固定列序；月龄 `floor((createdAt - birthDate)/2629800000)`；UTF-8 BOM + CRLF + RFC 4180；空库仅表头；文件名 `vmi_tis_assessment_export_YYYYMMDD_HHmmss.csv`。
4. **前端** — 新建 `apps/web/src/utils/scaleStatus.ts`（`getScaleStatusBadge` / `getScaleDataStatusLabel` / `getScoreSourceLabel` / `getFormScoreSource` / `getRecordScoreSource`）与 `apps/web/src/components/assessment/ScaleStatusBadge.tsx`（`aria-label="数据状态：…"`，绿/蓝/琥珀/灰四色）。`ScaleAssessmentPanel.tsx`：Beery 主测验、TVPS-4、DEM、MVPT-4、Beery VP/MC 五处标题旁加徽标；Beery 主标准分、TVPS-4 综合标准分、MVPT-4 标准分输入框下加「数据状态：… · 分数来源：…」。`RecordSummary.tsx`：第 5 步 Beery / TVPS-4 / MVPT-4 分组标题加徽标，标准分行下加同款小字；保存后卡片显示 Beery（`meta.beery.main`）、TVPS-4（`meta.tvps4`）、MVPT-4（`meta.mvpt4`）来源，原硬编码「内置参考换算/手册录入」改为统一标签。`AnalyticsPage.tsx`：PageHeader actions 增加「导出科研数据（CSV）」下载链接。
5. **验收脚本防护** — 新建 `scripts/verify-guard.mjs`（`assertSafeTarget`：解析失败退出 1；本机 3000 且 `ALLOW_DEV_API !== '1'` 打印拒绝说明并退出 1，不发起请求）。`verify-task2.mjs:6`、`verify-task3.mjs:11`、`verify-task4.mjs:7` 默认 `http://localhost:3100/api`；`verify-task6.mjs:8` 默认 `http://localhost:3100`。
6. **文档** — `docs/vmi_tis.md:60` 改为「报告与科研 CSV 已携带该标签」并写明标签与来源判定统一取种子；`§6.2.7` 第 3 条补 CSV 路径、BOM/CRLF/RFC 4180、固定列序与脱敏口径。

#### 新增断言
- verify-task3：报告含「数据状态」与「量表数据状态说明」；自动换算记录报告含「MVPT-4 分数来源 → 内置参考换算」；手册分记录报告含「手册录入」。
- verify-task4：CSV 200 + `text/csv`；BOM `EF BB BF`；表头含「学生编码」「Beery VMI-6 数据状态」「MVPT-4 分数来源」，且不含「姓名」「出生日期」；29 列列序逐字比对；数据行含 `VMI-2026002` 且全文不含学生 UUID。为使 CSV 有数据行，脚本末尾用 `POST /assessments/records` 建一条评估记录（放在全部既有断言之后，不影响晋级/护眼/审计检查）。

#### 与 §2 的差异（坐标/口径澄清，语义未变）
- Beery 列名用「Beery VMI-6 …」而非 §2 列表简写「Beery VMI …」：验收口径要求表头含「Beery VMI-6 数据状态」，且与报告、前端、注册表名一致；列序与列义未变。
- 「标准分输入框下小字」落在第 4 步 `ScaleAssessmentPanel` 的三个标准分输入框（输入框实际所在处）；`RecordSummary` 同步在标准分行下显示同一行小字，两处同源。
- 表单预览口径：只填原始分、未填标准分时显示「未录入（需手册标准分）」（`resolveScaleScoreSource` 的字面结果），保存后卡片/报告/CSV 按落库值显示「内置参考换算」。这样 14 岁以上 MVPT-4 不会误标为已换算。

#### 验证命令与结果
- `npm run build` → EXIT 0（shared-types tsc + nest build + web `tsc --noEmit && vite build`）。
- `npm run verify:all` → EXIT 0；Task 2/3/4/6 均 ALL CHECKS PASSED，含上述新断言（日志 `/tmp/b8-verify.log`）。
- 防护：`API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs` → EXIT 1，仅打印拒绝说明、未发起请求；`http://127.0.0.1:3000/api` 同样拦截；`ALLOW_DEV_API=1` 时 `assertSafeTarget` 原样返回（隔离调用验证，未真的打开发库）；非法地址解析失败 EXIT 1。
- CSV 实样（用构建产物 `dist/analytics.service.js` + 假 Prisma 跑一条样例）：前 3 字节 `ef bb bf`；表头 29 列；数据行 `VMI-2026002,女,94,"特教学校,资源教室",BASELINE,2026-01-15,…`，含逗号/引号单元格按 RFC 4180 转义；空库输出仅表头 + CRLF。
- 报告实样（verify 运行生成的 HTML）：一至八节齐全，第二节每量表三行，第七节 10 行状态说明表；徽标类名 `status-manual` / `status-project` / `status-structure` 正常渲染。

#### 未验证项
- Excel 人工打开中文不乱码：本机无 Excel/GUI，仅验证了 BOM + UTF-8 + 转义，**未做人工打开验证**。
- 前端界面走查：browser 工具被其他实例占用，未做截图/点击走查；前端仅过 `tsc --noEmit` + `vite build`，徽标与提示线为纯展示，其判定逻辑已由同源纯函数在报告/CSV 侧验证。
- 未改：`prisma/schema.prisma`、R1–R4、Socket 契约、`apps/web/android`、`deploy/`。

### gpt-sol-6.1 审核修复（2026-10-21）

审核 6 项 findings，无 🔴；F1/F2 为 🟡，F3–F6 为 🔵。逐条处置：
- F1 草稿提示与保存后不一致：`getFormScoreSource` 增加 `ageYears`；Beery/TVPS/DEM 原始分无标准分 → `PENDING_REFERENCE`（保存后换算为参考分）；MVPT-4 4–13 岁同样，14+ 保留 `NEEDS_MANUAL`。`ageYears` 已从 `AssessmentPage` 传入 `ScaleAssessmentPanel` 与 `RecordSummary`。
- F2 MVPT-4 14+ 卡片文案嵌套：保存后卡片改为「标准分：—」与「分数来源：未录入（需手册标准分）」两行，不再套括号。
- F3 纯手册分卡片不显示：Beery/TVPS-4 渲染条件改为 `recordMeta… || savedRecord.beeryVmiStd/tvps4Std`，有标准分即显示并复用来源计算。
- F4 报告脚注硬编码：改用种子 `SCALE_DATA_STATUS_LABELS` / `SCALE_SCORE_SOURCE_LABELS` 插值。
- F5 guard 主机别名：host 去 IPv6 方括号，补 `0.0.0.0` / `::1`。
- F6 覆盖：Task 3 新增来源纯函数六态断言（手册/参考/未录入/需手册/仅结构/项目近似 + `PENDING_REFERENCE` 标签）；前端 headless 走查第 4 步 8 处数据状态徽标，Beery/MVPT 原始分填写后提示「保存后换算为参考分」。

验证：`npm run build` EXIT 0；`npm run verify:all` EXIT 0（Task 2/3/4/6）；`API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs` EXIT 1 且仅打印拒绝说明；Task 3 六态断言通过。未验证：14+ MVPT 卡片的浏览器实测（分支已按年龄实现）、Excel 人工打开。

### 补记：CSV 33 列 + 第 3 步徽标（2026-10-21）
- `apps/api/src/analytics/analytics.service.ts`：CSV 追加 NSUCO 与视光判读的数据状态/来源 4 列，共 33 列；`verify-task4.mjs` 的列序断言同步为 33 列。
- `apps/web/src/components/assessment/OptometryPanel.tsx`：第 3 步标题补 `OPTOMETRY_NORMS` 徽标，NSUCO 小节补 `NSUCO` 徽标。
- 复跑 `npm run build` / `npm run verify:all`（结果见下条验证记录）；这是 gpt-sol 审核后的完整性补齐，不改变既有列序与 R1–R4。

补列后复跑：`npm run build` EXIT 0；`npm run verify:all` EXIT 0（Task 2/3/4/6 全绿，CSV 33 列断言通过）；`API_BASE=http://localhost:3000/api node scripts/verify-task2.mjs` EXIT 1；第 3 步 headless 实证「数据状态：项目近似」与 NSUCO「数据状态：手册录入」，第 4 步 Beery/MVPT 原始分填写后显示「保存后换算为参考分」。

## §6 验证与收口（父代理）
