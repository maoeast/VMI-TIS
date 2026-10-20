# 2026-10-20 · 跨窗口选学生同步
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-20 · 来源 = 用户 2026-10-20 21:03 先不提交 b3；按路线图进入里程碑 2（跨窗口选学生同步）；沿用 b3 §4 授权：ccapi 设计 + 主代理核对 + DeepSeek 实施，不再逐版批准。。
> 台账 = 无（本批未启用台账；项目无 PROJECT-MANIFEST.json）。前情 = docs/batches/b3-terminal-entry-separation.md。
## §1 讨论（主 agent）
**状态行**：已收口 2026-10-20

用户 2026-10-20 先不提交 b3，继续里程碑 2。范围：教师/学生双窗口（或平板）选学生同步——教师选择后，学生端通过 WebSocket `SWITCH_STUDENT` 跟随；保留学生端自身选择器；服务端校验角色，学生端不能发教师事件；覆盖 `all` 教师浏览器 + `student` 学生窗口/平板；不做评估双屏（里程碑 3）、Tauri、RBAC、Kiosk、appId 拆分。b3 未提交，b4 在其工作区上继续。设计由 ccapi 出稿，主代理核对后交 DeepSeek；commit/push 仍单独放行。

> 不适用：§3 —— 本批设计由 ccapi 出稿、主代理核对，未单独派评审子代理。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成

### 本批条目
- 目标：教师在 `/web` 选学生 → `SWITCH_STUDENT` → 学生端（`/student` 窗口或平板）跟随；保留学生端自身选择器；服务端角色校验；不做评估双屏（里程碑 3）、Tauri、RBAC、Kiosk、appId 拆分。
- 范围：shared-types 事件 payload；gateway 事件；`useWebSocket`；`TeacherLayout`/`StudentSelector`；`StudentPadPage`；store；`verify-task6`；文档。b3 未提交，b4 在其工作区上继续。

### 事件与房间（关键修正）
- 新增 `SWITCH_STUDENT`（复用现有 WS 鉴权/连接，不新增机制）；payload `{ event: 'SWITCH_STUDENT', studentId: string }`；ack `{ ok: true }` / `{ ok: false, error: 'forbidden' | 'invalid_payload' }`。
- 教师 socket：`TeacherLayout` 建一次（`role:'therapist'`, `studentId:''`），加入 `role:therapist`；`useWebSocket` 返回 `emitSwitchStudent`（`useCallback` 包内部 socket），`TeacherLayout` 把它写入 store（`teacherSwitchStudent`，卸载置 null）；`StudentSelector` 读 store 函数，**不**自建连接、不传假 `socketRef`。
- 学生 socket：`StudentPadPage` 的 `role:'student'`, `studentId: activeStudentId`；加入 `role:student` + `student:<id>`。
- 教师 emit → 服务端校验 `role === 'therapist'` + 非空 `studentId` → **广播 `role:student`**（不是 `student:<target>`：学生 socket 当前在旧学生房间，按目标房间会收不到）+ 可选 `role:therapist` 回声；学生收到后 `setActiveStudent`，hook 以新 `studentId` 重连并加入新 `student:<id>`；`student:<id>` 继续只服务 `SWITCH_PAD_TASK`/训练事件。
- 学生端 emit `SWITCH_STUDENT` → `forbidden`；空/未知 `studentId` → `invalid_payload`；学生端自身选择器只本地生效、不发事件；最后一次操作赢。
- 断线：Socket.io 自动重连；不补发；教师下次选择生效；学生端保持当前 `activeStudentId`。

### 前端
- `useWebSocket` 增 `onSwitchStudent` 与 `emitSwitchStudent`；`TeacherLayout` 用 hook 并把 emit 函数写入 store；`StudentSelector` 仅在 `location.pathname.startsWith('/web')` 且 `studentId` 非空时调用，本地 `setActiveStudent` 始终先执行，socket 未连接则静默跳过。
- `StudentPadPage` 的 `useWebSocket` 增 `onSwitchStudent: setActiveStudent`；effect 重载学生/课次/红区/R4/游戏；学生端选择器保留；训练中切人沿用现有手动切换语义（旧课次不结束、不提示）。
- 不做防抖/补发/反向通知（默认）。

### 验收
- `npm run build` / `npm run verify:all`；`verify-task6` 新增：教师 emit → 学生收到；学生 emit → `forbidden`；空 `studentId` → `invalid_payload`；匿名 → 断开；跨学生 `PAD_TRIAL_COMPLETED` 仍拒绝。
- 浏览器两窗口：`all` 教师 `/web` 选周子墨 → 学生 `/student` 跟随；学生自己改选 → 教师再选 → 最后赢；未知 id → 学生 toast；红区学生 → 锁定页。
- 平板：student APK + 教师浏览器 LAN；教师选人 → 平板跟随；训练中切人；断线重连后再选。
- 文档：AGENTS/vmi_tis/README/PROGRESS/b4。

### 风险与默认
- 教师 socket 放 `TeacherLayout`（A）；不加防抖；不补发；不反向通知学生端锁定。旧课次不结束时沿用现手动切换语义，教师端可结课。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-20 21:03 先不提交 b3；同意继续里程碑 2；沿用 b3 §4 的授权（ccapi 设计 + 主代理核对 + DeepSeek 实施，不再逐版批准）。commit/push 仍单独放行。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成



### 实施记录（coder 2026-10-20）

**改动**
- `packages/shared-types/src/index.ts`：新增 `SwitchStudentPayload { event:'SWITCH_STUDENT'; studentId:string }`，紧邻 `SwitchPadTaskPayload`。
- `apps/api/src/gateway/session.gateway.ts`：新增 `handleSwitchStudent`（`@SubscribeMessage('SWITCH_STUDENT')`）——`role !== 'therapist'` → `{ok:false,error:'forbidden'}`；非字符串或空白 `studentId` → `invalid_payload`；否则 `server.to('role:student').emit('SWITCH_STUDENT', payload)` 并返回 `{ok:true}`。类注释补一行事件说明；未改其他事件与握手逻辑。
- `apps/web/src/hooks/useWebSocket.ts`：新增 `onSwitchStudent` 回调与 `socket.on('SWITCH_STUDENT')`；`emitSwitchStudent` 用 `useCallback(..., [])` 包内部 `socketRef`（句柄稳定，可写入 store）。
- `apps/web/src/store/useAppStore.ts`：新增 `teacherSwitchStudent: ((studentId: string) => void) | null` 与 `setTeacherSwitchStudent`（初值 null）。
- `apps/web/src/components/TeacherLayout.tsx`：`useWebSocket({ role:'therapist', studentId:'' })` 只在布局建一次；effect 把发送函数写入 store 槽、卸载置 null（依赖稳定引用，不会重建连接）。
- `apps/web/src/components/StudentSelector.tsx`：读 store 发送槽；`onChange` 先 `setActiveStudent(nextId)`，仅 `nextId && pathname.startsWith('/web')` 时调用发送槽（槽为 null 静默跳过）。
- `apps/web/src/pages/student/StudentPadPage.tsx`：`onSwitchStudent: (payload) => setActiveStudent(payload.studentId)`；清空旧状态与重载沿用原 `activeStudentId` effect（锁定/课次/游戏/计时/结果 + 红区 + 数字额度）。
- `scripts/verify-task6.mjs`：新增 `emitWithAck` 辅助与 6 项断言。

**设计口径的落地说明（请评审确认）**
- §2 写「空/未知 `studentId` → `invalid_payload`」，验收 2 要求「未知 id → 学生端 toast」——两者不能同时成立：服务端按存在性拒绝时学生端收不到事件，就不会有 toast。实现取验收口径：网关只校验非空，未知 UUID 照常广播，由学生端 `studentApi.get` 404（「学生不存在」）弹 toast；网关不做学生存在性查询（保持无 Prisma 依赖）。空串/空白仍返回 `invalid_payload`。
- `StudentSelector` 的「自动选首名学生」不发事件：那是列表加载后的默认值，不是教师选择动作；否则教师页每次打开都会把学生端拽回默认学生。

**验证（实际执行）**
- `npm run build`（Node v20.20.2）EXIT 0（shared-types + api + web 含 `tsc --noEmit`）。
- `npm run verify:all` EXIT 0，Task 2/3/4/6 全绿。Task 6 新增断言逐条通过：教师 ack `ok`、学生端收到并 `studentId` 一致、旧学生房间仍收到对其他学生的切换（证明 `role:student` 广播）、学生端发送 `forbidden`、学生端发送未被广播、空 `studentId` → `invalid_payload`；原有「无 token 拒绝」「跨学生 PAD_TRIAL_COMPLETED 拒绝」仍通过。
- 两窗口浏览器验收（3100 隔离库 + API 托管 `all` dist + headless Chrome 双标签 CDP）：9/9 通过——① 教师选择器 6 名学生；② 默认学生两端一致；③ 教师选陈果果 → 学生跟随；④ 教师选周子墨 → 学生跟随；⑤ 学生自己改选林小宇只影响本窗口（教师仍周子墨）；⑥ 教师再选刘诺一 → 最后赢；⑦ 未知 UUID → 学生端 toast「学生不存在」；⑧ 张梓轩 → 红区锁定页；⑨ 训练中切人：计时从 3 秒清零、新学生重载。
- student 包：`VITE_TERMINAL=student` + LAN env（`192.168.0.188:3000`）构建 → `npx cap sync android` → `./gradlew assembleDebug` 成功；APK 4.0 MB，`com.vmitis.pad`，minSdk 22 / targetSdk 34，`apksigner verify` 通过，bundle 含 `SWITCH_STUDENT` 与 `192.168.0.188`。student 包 `/student` 截图确认选择器保留、三端切换隐藏。
- 文档：`AGENTS.md`（Tech Stack 实时通道 + 红线 5）、`docs/vmi_tis.md` §5.2、`README.md`（跨窗口选学生同步）、`docs/PROGRESS.md`。
- 未做：平板真机安装/运行与断线重连实测（交主代理）；未 commit/push。

## §6 验证与收口（父代理）

### 独立复核与门禁（主代理，2026-10-20）
- 复核：shared-types `SwitchStudentPayload`；gateway `handleSwitchStudent` 校验 `therapist` + 非空，广播 `role:student`；`useWebSocket` 的 `onSwitchStudent`/`emitSwitchStudent`；store `teacherSwitchStudent`；`TeacherLayout` 一条教师连接写入函数槽（卸载置 null）；`StudentSelector` 仅 `/web` 且 id 非空；`StudentPadPage` 回写 `setActiveStudent`；`verify-task6` 断言。
- Node 20 基线 `npm run build`/`verify:all` 全绿；`verify-task6` 5 项 `SWITCH_STUDENT` 断言全 ✓（教师 ack、学生收到、旧学生房间仍收到、学生 forbidden、冒充未广播）。
- 平板联调：WSL 3100（b4 网关）+ 测试 APK（localhost + `adb reverse`）+ 教师浏览器 all；教师从周子墨切刘诺一 → 平板 Header/训练页跟随，额度 900s、课次重载；截图 `/tmp/b4-tablet-after-switch.png`。
- §2 口径修正：未知 `studentId` 网关只校验非空，由学生端 `studentApi.get` 404 toast；「未知→invalid_payload」为 §2 表述误差，与验收一致。
- 已知：`SessionPage` 自带 therapist socket + `TeacherLayout` 新增一条，教师页两条连接（无功能副作用，后续合并）；未做 `role:therapist` 回声。
- 未验证：Windows API 3000 仍是旧 dist，LAN student 包要等 Windows API 更新（用户重启 API 窗口）后生效；b4 学生包 LAN 版已构建。
- 未 commit。
