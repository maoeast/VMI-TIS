# 2026-10-20 · 红区结构化编码通道（R1 加固）
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-20 · 来源 = 用户 2026-10-20 确认 A 任务；设计稿由 ccapi:claude-opus-5-5 产出，主代理按现场代码核对修正后实施。
> 台账 = 无（本批未启用台账；项目无 PROJECT-MANIFEST.json）。前情 = 无（独立批）。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-20

用户确认 A（红区结构化编码通道，R1 加固）；设计由 `ccapi:claude-opus-5-5` 出稿，主代理核对现场代码后修正 6 处（`studentId` 类型、端点、规则→编码映射、转介单 JSON 格式、审计文件、验收命令）；用户批准修正版（D1 并集、D2 未知编码 400、D3 转介单 `string[]`、D4 前端保留 `behaviorItems`）。实施由 DeepSeek 执行。

> 不适用：§3 —— 设计由 `ccapi:claude-opus-5-5` 出稿、主代理核对修正，用户批准；未单独跑 advisor 设计评审。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成

### 本批条目
- 目标：把红区判定从 `behaviorItems` 中文关键词命中，升级为「种子红区编码为主 + 文本关键词并集兜底」；服务端按种子编码重算，未知编码 fail-closed，保留旧客户端文本路径。
- 来源：用户 2026-10-20 确认 A 任务；设计稿由 `ccapi:claude-opus-5-5` 产出，主代理按现场代码核对并修正 6 处后定稿。

### 对 ccapi 设计稿的 6 处修正
1. `studentId` 是字符串 UUID（`apps/web/src/api/client.ts:231-235`），不是 number。
2. 端点是 `POST /api/assessments/triage`（`apps/api/src/assessments/triage.controller.ts:11-14`），不是 `/triage/submit`。
3. 规则→编码映射按语义：屈光参差/视力异常→`RED_01`；斜视/遮盖/复视→`RED_02`；眼球震颤→`RED_03`。现有 `triage.service.ts:23-54` 是 6 条规则，种子是 3 项，不能 0/1/2 一一对应。
4. 转介单 `redZoneItemsJson` 保持 `string[]`（种子 label），不改 `StudentsPage.tsx:469`、`AssessmentPage.tsx:714/734` 读取侧。
5. 审计文件是 `apps/api/src/common/audit/audit-log.service.ts`；只在 `triage.service.ts:106-116` 的 `changesAfter` 加 `redZoneCodes`，不动审计服务。
6. 根 `package.json` 没有 `verify:task2`；验收用 `npm run build` + `npm run verify:all`。

### 契约
- `apps/api/src/assessments/dto/submit-triage.dto.ts`：新增 `redZoneCodes?: string[]`，校验 `@IsOptional @IsArray @IsString({ each: true }) @ArrayMaxSize(10)`；旧 `redZoneItems` 保留、服务端继续不采信。
- `apps/web/src/api/client.ts`：`TriagePayload` 加 `redZoneCodes?: string[]`。

### 服务端（apps/api/src/assessments/triage.service.ts）
- 顶部从 `@vmi-tis/shared-types` 导入 `RED_ZONE_TRIAGE_ITEMS`（`packages/shared-types/src/index.ts:559` 已导出）。
- `RedZoneRule` 增加 `seedCode` 字段；6 条规则按语义映射：屈光参差→RED_01，斜视→RED_02，遮盖→RED_02，复视→RED_02，眼球震颤→RED_03，视力异常→RED_01。
- `detectRedZone(dto)` 双路径**并集**：
  1. 结构化：遍历 `dto.redZoneCodes`；编码必须存在于种子 `RED_ZONE_TRIAGE_ITEMS`，未知编码抛 `BadRequestException`（400）；`lockHighLoadVisualTraining` 为真则加入命中集。
  2. 文本：现有 6 条规则始终再跑一遍，命中加入同一集合。
- 返回 `{ codes, labels }`；`isRedZone = codes.length > 0`；转介单 `redZoneItemsJson = JSON.stringify(labels)`；审计 `changesAfter = { triageStatus, redZoneCodes }`。
- 未闭环红区不能被空初筛解锁（现有 `:79-83`）保持。

### 前端
- `AssessmentPage.submitTriage`（`:306-350`）增加 `redZoneCodes: screening.red`；保留现有 `behaviorItems`（含红区文本）作为第二道防线；不改转介单显示逻辑。

### 验收口径
- 新增/扩展 `scripts/verify-task2.mjs`：
  - P1 仅 `RED_01` 编码 → 红区 + 转介单含 `RED_01` 的种子 label；P2 `RED_01+RED_03` → 两条；P3 编码+文本 → 并集去重；P4 旧文本路径 → 仍红区；P5 绿区 → `GREEN_ACTIVE`。
  - N1 `RED_99` → 400；N2 重复编码 → 去重；N3 空初筛解锁未闭环红区 → 409；N4 `PATCH triageStatus` → 不改；N5 红区排课 → 403；N6 红区开课 → 403；N7 编码命中但文本 score=0 → 仍红区。
- 命令：`npm run build`；`npm run verify:all`（Task 2/3/4/6 全绿）。
- 文档：`AGENTS.md` R1 段、`docs/vmi_tis.md` 初筛章节、`docs/PROGRESS.md` 追加本轮事实。

### 关键决策
- D1 并集（防护绕过）；D2 未知编码 400 fail-closed；D3 转介单保持 `string[]`；D4 前端保留 `behaviorItems` 红区文本。

### 不在范围
- 里程碑/行为项结构化；RBAC、Kiosk、R2 持久化、PDF 报告等已 Deferred 项。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-20 15:47 回复「按此修正版开工」；批准 D1 并集（编码 + 文本，防绕过）、D2 未知编码 400 fail-closed、D3 转介单保持 `string[]`、D4 前端保留 `behaviorItems` 红区文本。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成



### 改动（按 §2 条目）

1. `apps/api/src/assessments/dto/submit-triage.dto.ts`：新增 `redZoneCodes?: string[]`，校验 `@IsOptional @IsArray @IsString({ each: true }) @ArrayMaxSize(10)`；旧 `redZoneItems` 保留，服务端继续不采信。
2. `apps/api/src/assessments/triage.service.ts`：
   - 从 `@vmi-tis/shared-types` 引入 `RED_ZONE_TRIAGE_ITEMS`，新增 `RED_ZONE_SEED_BY_CODE` 查表；
   - `RedZoneRule` 以 `seedCode` 取代旧 `label`（避免规则 label 与种子 label 两套并存，显示文案统一取种子）；6 条规则映射：屈光参差→`RED_01`、斜视/遮盖/复视→`RED_02`、眼球震颤→`RED_03`、视力异常→`RED_01`；
   - `detectRedZone(dto)` 返回 `{ codes, labels }`：编码路径先跑（未知编码 `BadRequestException` 400），文本路径始终再跑，同一 `Set` 去重（D1 并集）；
   - 转介单 `redZoneItemsJson = JSON.stringify(labels)`（种子 label 数组，D3）；审计 `changesAfter = { triageStatus, redZoneCodes }`，不写行为项原文；未闭环红区空初筛 409 逻辑未动。
3. `apps/web/src/api/client.ts`：`TriagePayload` 增加 `redZoneCodes?: string[]`。
4. `apps/web/src/pages/web/AssessmentPage.tsx`：`submitTriage` 增加 `redZoneCodes: screening.red`，保留 `behaviorItems`（含红区文本）作第二道防线（D4）；转介单显示与解析未改。
5. `scripts/verify-task2.mjs`：新增 21 项断言（8 项建档检查 + P1–P6 + N1–N7），覆盖 §2 验收口径全部条目。
6. 文档：`AGENTS.md` R1 红线、`docs/vmi_tis.md` 第一层初筛章节与接口表 `POST /api/assessments/triage` 行、`docs/PROGRESS.md` 追加本轮事实。

### 验证命令与结果

- `npm run build` → EXIT 0（shared-types `tsc` + api `nest build` + web `tsc --noEmit && vite build`）。
- `npm run verify:all`（Node v20.20.2，3100 隔离 SQLite，每任务全新库）→ EXIT 0；Task 2 `ALL CHECKS PASSED`（共 52 项，新增 21 项全过），Task 3 / Task 4 / Task 6 全绿。
- 新增断言实测：P1 单编码 → 种子 label；P2 `RED_01+RED_03` → 2 条；P3 编码+文本 → 并集去重（2 条、`RED_01` 仅 1 条）；P4 不传编码 → 仍红区；P5 → `GREEN_ACTIVE`；P6 审计含 `redZoneCodes`/`RED_01`/`RED_02` 且不含行为项原文；N1 `RED_99` → 400 且状态仍 `PENDING_SCREENING`；N2 重复编码 → 1 条；N3 → 409；N4 PATCH → 仍 `RED_ZONE_LOCKED`；N5/N6 → 403 `RED_ZONE_LOCKED`；N7 编码命中而文本 `score=0` → 仍红区。

### 偏差

- `RedZoneRule.label` 删除、换成 `seedCode`：§2 写的是「增加 seedCode」，但保留旧 label 会留下与种子 label 并存的死字段；D3 要求显示文案取种子 label，故删除旧字段，无行为偏差。
- `docs/vmi_tis.md` 接口表 triage 行一并更新：原文「按关键字与阈值重算」已不完整，与初筛章节同属本次规范面。

### 未验证

- 浏览器渲染冒烟未执行（环境无 Chromium/设备）；APK 未重编译。
- advisor code review 已执行，VERDICT pass（1 项 🟡 为批次记录状态行/§5/§6 滞后，3 项 🔵 为可选健壮性建议），本轮未扩范围修改。
- 未 commit/push（按任务要求）。

## §6 验证与收口（父代理）

### 独立复核与门禁（主代理，2026-10-20）
- 复核 diff：8 个文件，+318/−22；D1 并集、D2 未知编码 400、D3 转介单 `string[]`、D4 前端保留 `behaviorItems` 均落地。
- `npm run build` → EXIT 0（shared-types + api + web，含 web `tsc --noEmit`）。
- `npm run verify:all` → EXIT 0；Task 2 `ALL CHECKS PASSED`（52 项，含 P1–P6 / N1–N7 全 ✓），Task 3 / 4 / 6 全绿。
- 浏览器实发（3100 + 隔离 smoke 库，Chromium）：`/web/assessment` 选绿区学生，勾选首个红区项提交；实际请求体为 `{"studentId":"…","behaviorItems":[{"item":"裸眼视力显著低于同龄标准或怀疑中高度屈光不正/屈光参差","score":2.5}],"redZoneCodes":["RED_01"],"redZoneItems":[]}`；UI 返回“红区锁定”+ `REF-20261020-02`，红区项显示种子 label。前端编码与文本第二道防线均生效。

### 未验证 / 收口待办
- APK 真机安装/运行未验证（无设备）。
- 未 commit / push（需用户放行）。
- 收口时补 §3 不适用说明：设计由 `ccapi:claude-opus-5-5` 出稿、主代理核对修正，用户已批准；未单独跑 advisor 设计评审。
- 可选 🔵（advisor 提出、未扩范围）：在模块加载期断言 `RED_ZONE_RULES` 的 `seedCode` 都存在于种子；当前 6 条规则字面量与种子一致。

- APK 真机补验（2026-10-20）：荣耀平板 X9（`NDL-W09` / Android 16 / SDK 36）无线调试连接 `192.168.0.67:44641`；localhost 测试构建（`adb reverse tcp:3000 tcp:3100` + WSL API 3100）安装成功并启动；教师工作台数据 5 训练 / 2 待晋级 / 6 全员，学生 Pad 周子墨 / 900s / 评估出示可见。LAN 部署构建仍未验证：平板到 `192.168.0.188:3000` 不通，Windows API 当前未运行。
