# 2026-10-20 · 评估双屏
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-20 · 来源 = 用户 2026-10-20 21:37 开始里程碑 3（评估双屏）；沿用 b3 §4 授权：ccapi 设计 + 主代理核对 + DeepSeek 实施，不再逐版批准。。
> 台账 = 无（本批未启用台账；项目无 PROJECT-MANIFEST.json）。前情 = docs/batches/b4-student-selection-sync.md。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（编码已落地；浏览器+平板联调通过；LAN 待 Windows API 更新；待提交）

用户 2026-10-20 21:37 开始里程碑 3。范围：评估双屏——教师在 `/web/assessment` 翻题/出示评估卡（Beery SVG、TVPS 样例题卡 5s、DEM 矩阵）→ 学生端 `/student` 评估出示跟随；服务端角色校验；复用 b4 的 WS 基础设施；不改评估算分/R1/R2/R4 语义；不做 Tauri、RBAC、Kiosk、appId、b3/b4 提交。沿用 b3 §4 授权（ccapi 设计 + 主代理核对 + DeepSeek 实施，不再逐版批准）；commit/push 仍单独放行。b3/b4 未提交，b5 在其工作区上继续。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成

### 本批条目
- 目标：评估双屏——教师在 `/web/assessment` 出示/翻题/收回评估卡（Beery/TVPS 5s/DEM）→ 学生 `/student` 评估出示跟随；教师才能发；复用 b4 WS；不改算分/R1/R2/R4；不做 Tauri/RBAC/Kiosk/appId、b3/b4 提交。
- 范围：shared-types；gateway；useWebSocket；store；TeacherLayout；AssessmentPage/ScaleAssessmentPanel/评估卡组件；StudentPadPage；verify-task6；文档。

### 事件与房间
- `ASSESSMENT_CARD_CHANGE`；payload `{event, studentId, action:'show'|'hide', cardType:'beery'|'tvps4'|'dem'|null, beeryItemNumber?, tvpsSubtestCode?, tvpsItemIndex?, tvpsPhase?, tvpsRemaining?, demTest?}`；ack `{ok}` / `{ok:false, error:'forbidden'|'invalid_payload'}`。
- 教师 socket 复用 b4 `TeacherLayout` 一条；新增 store 槽 `teacherEmitAssessmentCard`；服务端校验 therapist + 非空 studentId → 广播 `role:student`；学生端按 `studentId === activeStudentId` 过滤；未知 id 不查存在性。教师不订阅，无回声。

### 教师发送端
- `ScaleAssessmentPanel` 增加当前卡状态：Beery item（已有受控）、TVPS subtest/item/phase/remaining、DEM test——`Tvps4Card`/`DemMatrix` 增加**可选受控 props + onChange**（不传时保持原内部状态，学生本地出示不回归）；`BeeryVmiCard` 已有受控 item。
- 「远程出示」按钮按当前 tab 发：Beery itemNumber；TVPS subtest/item/phase/remaining；DEM test；「收回」发 `action:'hide'`。已出示后切题/子测验/矩阵自动再发。
- `assessmentShowing` 用页面本地 state（不塞 store）；socket 槽 null 时按钮禁用并提示；不改教师判分/保存/R2。

### 学生接收端
- `StudentPadPage` 已有 `mode`/「评估出示」本地入口；新增 `assessmentCard` state；`onAssessmentCardChange`：show → 设卡 + `mode='assessment'`；hide → 清卡 + `mode='training'`；studentId 不匹配忽略。
- 远程卡只读渲染：`BeeryVmiCard`（受控 itemNumber、不传 onScore、新增 readOnly 隐藏切题）、`Tvps4Card`（受控 subtest/item/phase/remaining、readOnly、revealAnswer=false）、`DemMatrix`（受控 test、readOnly）。只传索引，学生端读种子，不伪造题库。
- TVPS 5s：教师端计时到 0 → phase='options' 再发；学生端按 `tvpsRemaining` 展示，收到 options 切选项；学生端不自行改 phase。
- 训练中显示评估卡：`mode='assessment'` 已有 gate 令训练计时暂停；收起恢复；不调用 digital-start/addDigital。学生端本地「评估出示」仍在；与远程 last-write-wins。
- 收到 `SWITCH_STUDENT` 或 `SWITCH_PAD_TASK` 时清 `assessmentCard` 并回 training（新学生/训练任务优先）。

### 验收
- `npm run build` / `npm run verify:all`；`verify-task6` 新增：教师 Beery/TVPS/DEM show 学生收到、hide、学生 emit forbidden、空 studentId invalid、未知 id 广播但学生过滤。
- 两窗口：教师 `/web/assessment` 步骤 4 出示 Beery → 学生 `/student` 显示；切题跟随；TVPS 5s 自动切选项；DEM；收回；训练中出示暂停/恢复；学生本地评估出示与远程。
- 平板：student APK（WSL 3100 + `adb reverse` 或 Windows API 更新）+ 教师；教师出示 → 平板跟随；TVPS 5s。
- 文档：AGENTS/vmi_tis/README/PROGRESS/b5。

### 风险与默认
- TVPS 计时教师端；本地评估出示 last-write-wins；训练中全屏评估卡；不补发。组件受控 props 可选，保持 b2 行为。
- 平板/Windows API：LAN 需 Windows API 更新（用户重启）；测试用 WSL 3100 + 反向代理。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-20 21:37 开始里程碑 3；沿用 b3 §4 的授权（ccapi 设计 + 主代理核对 + DeepSeek 实施，不再逐版批准）。commit/push 仍单独放行。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成



### 实施记录（coder 2026-10-20）

**改动**
- 契约：`packages/shared-types/src/index.ts` 新增 `AssessmentCardType` 与 `AssessmentCardChangePayload`（`event` / `studentId` / `action:'show'|'hide'` / `cardType`，可选 `beeryItemNumber`、`tvpsSubtestCode`、`tvpsItemIndex`、`tvpsPhase`、`tvpsRemaining`、`demTest`）。
- 服务端：`SessionGateway` 新增 `ASSESSMENT_CARD_CHANGE`——非 `therapist` 返回 `forbidden`；空 `studentId`、非法 `action`、`show` 带非法 `cardType` 返回 `invalid_payload`；成功广播 `role:student`，未知 `studentId` 不查存在性。教师不订阅、无回声。
- 发送通道：`useWebSocket` 增 `onAssessmentCardChange` 与 `useCallback` 稳定的 `emitAssessmentCardChange`；`TeacherLayout` 写入 store 槽 `teacherEmitAssessmentCard`（卸载置 null），与 `teacherSwitchStudent` 共用同一条教师 socket。
- 教师端：`ScaleAssessmentPanel` 增「双屏评估出示」栏（当前出示内容 + 收回）与每张卡一个「远程出示 / 已出示·重发」；面板持有 TVPS 子测验/样例题/阶段/剩余秒与 DEM 测试项；`useEffect` 在出示状态下随这些状态变化重发；socket 槽或学生为空时按钮禁用并提示。
- 组件受控化（props 全部可选，不传保持原内部状态）：`Tvps4Card` 增 `subtestCode`/`itemIndex`/`phase`/`remaining` 受控 + 四个 `on*Change` + `readOnly`；`DemMatrix` 增 `test`/`onTestChange`/`readOnly`；`BeeryVmiCard` 增 `readOnly`（隐藏题号选择器与教师提示；`onScore` 语义不变）。
- 学生端：`StudentPadPage` 增 `assessmentCard` state 与 `onAssessmentCardChange`——`studentId` 不匹配忽略；`show` 设卡 + `mode='assessment'`；`hide` 清卡 + 回训练；`SWITCH_STUDENT` / `SWITCH_PAD_TASK` / 切学生时清卡。`RemoteAssessmentCard` 只读渲染三种卡（只传索引、读种子），本机「评估出示」保留，「改用本机出示」清远程卡（last-write-wins）。训练计时与数字额度沿用 `mode !== 'training'` 门禁暂停，不调用 digital-start/addDigital。
- 验收脚本：`scripts/verify-task6.mjs` 新增 9 项断言（Beery/TVPS/DEM show、hide、学生端 forbidden 且未广播、空 studentId invalid、未知 studentId 照发）。
- 文档：AGENTS 实时通道与安全红线、`docs/vmi_tis.md` 事件契约、README「评估双屏」、`docs/PROGRESS.md` 追加本节。

**实现决策**
- TVPS 受控时「换子测验回第 1 题」由父级在同一个 setState 批次里算好阶段与剩余秒，避免卡片同一事件里两次回调互相覆盖；非受控路径保持原行为（b2 学生本地出示不回归）。
- 出示状态用面板本地 state（不进 store），并记住出示时的 `studentId`：切学生自动作废，不会把旧学生的卡发给新学生。
- 离开第 4 步（组件卸载）自动发 `hide`，避免学生端停在一张没人收的卡上。

**验证**
- `npm run build` EXIT 0（shared-types + api + web，含 `tsc --noEmit`）。
- `npm run verify:all` EXIT 0：Task 2/3/4/6 全绿；Task 6 新增 9 项全部 ✓。
- 两窗口浏览器 30/30：3100 演示库 + `all`/`student` 两个真实构建 + headless Chrome 双标签 CDP。覆盖：教师第 4 步出示 Beery → 学生只读显示；切第 9 题跟随；TVPS 切 MEM 5 秒倒计时（数值 1–5 来自教师端）→ 到 0 自动切选项；DEM A→C 跟随；出示期间训练计时暂停、收回后恢复；学生本机面板与远程卡 last-write-wins；离开第 4 步自动收回；教师切学生后学生端跟随并清卡；发给其他学生的卡不影响本机（studentId 过滤）。
- student APK：`VITE_TERMINAL=student` + LAN env（`192.168.0.188:3000`）构建 → `npx cap sync android` → `./gradlew assembleDebug` 成功；APK 4,173,454 B，`com.vmitis.pad` / minSdk 22 / targetSdk 34，`apksigner verify` 通过，bundle 含 `ASSESSMENT_CARD_CHANGE` 与 `192.168.0.188`。未安装（平板交主代理）。
- 未验证：平板真机安装/运行与跟随；本机 Node 为 v24.22.0（基线 v20.20.2）。

**偏差与范围外**
- 设计点名「切题 / 子测验 / 矩阵 / 阶段到 0 再发」；实现额外每秒重发 TVPS 剩余秒，学生端倒计时才有值可展示（`tvpsRemaining` 在设计 payload 里）。
- 设计未点名「离开第 4 步自动收回」，为不让学生端卡死而补；如不需要可去掉卸载 cleanup。
- 环境处置：首轮 `verify:all` 失败是因为 3100 被 21:17 遗留的开发 API（dev 库，pid 355884）占用，runner 的隔离 API 无法监听、断言打到旧库（Task 4 学生数 65、Task 6 无新事件）。已 `kill -TERM 355884` 后重跑全绿；该进程是 WSL 侧开发 API，不是 Windows 进程，需要时用 `npm run start:dev` 重启。
- 未 commit/push。

## §6 验证与收口（父代理）

### 独立复核与门禁（主代理，2026-10-20）
- 复核：shared-types `AssessmentCardChangePayload`；gateway `ASSESSMENT_CARD_CHANGE` 校验 therapist + 非空 studentId + action/cardType，广播 `role:student`；hook on/emit；store `teacherEmitAssessmentCard`；TeacherLayout 注入；ScaleAssessmentPanel 出示/收回/自动重发；Tvps4Card/DemMatrix/BeeryVmiCard 可选受控 props + readOnly；StudentPadPage `assessmentCard`/`RemoteAssessmentCard`/切人清卡；`verify-task6` 9 项断言。
- Node 20 基线 `npm run build`/`verify:all` 全绿；b5 9 项断言全 ✓。首轮失败是 coder 遗留 3100 开发 API（pid 362474）占用隔离 API，杀掉后重跑全绿。
- 平板联调：WSL 3100 + 测试 APK（localhost + `adb reverse`）+ 教师浏览器 all；教师第 4 步「远程出示」Beery → 平板显示「教师端出示的评估题卡」周子墨、Beery 第 1 题、只读、注明不计额度；截图 `/tmp/b5-tablet-assessment.png`。
- 未验证：TVPS 5s 与平板逐题（浏览器 30/30 已覆盖）；Windows API 3000 仍旧 dist，LAN 生效需重启 API 窗口。
- 已知：coder #31 触顶取消（实现与 §5 已落盘，主代理复核）；TVPS 每秒重发剩余秒、离开第 4 步自动收回为 coder 补充，行为合理。
- 未 commit。
