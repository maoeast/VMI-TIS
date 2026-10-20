# 2026-10-20 · 三端入口分离（构建期终端开关）
> 六段 append-only，一段一作者：§1 讨论（主 agent）· §2 批次任务与设计（主 agent）· §3 设计评审（评审子代理）· §4 用户批准（主 agent）· §5 实施记录（实施者：主 agent ∥ coder）· §6 验证与收口（父代理）。
> 编制：主 agent · 2026-10-20 · 来源 = 用户 2026-10-20 按默认批准 Windows 双屏路线：先做 ① 入口分离 ② 跨窗口选学生 ③ 评估双屏三个 Web 里程碑；Tauri 后置为两个薄壳 exe；RBAC/Kiosk/便携 Node 交付前补。本批只做里程碑 1。。
> 台账 = 无（本批未启用台账；项目无 PROJECT-MANIFEST.json）。前情 = docs/batches/b2-assessment-wizard.md。
## §1 讨论（主 agent）
**状态行**：🔄 进行中（编码已落地；平板验证通过；待提交）

用户 2026-10-20 按默认批准 Windows 双屏路线；本批只做里程碑 1（入口分离）。范围：构建期终端开关（`all` 默认三合一 / `student` 学生专用 / `teacher` 教师专用 / `parent` 家长 H5）；学生包默认 `/student`、隐藏顶部三端切换、保留学生选择器；教师浏览器 `/web` 全功能；当前三合一演示包不变。不做：跨窗口选学生（里程碑 2）、评估双屏联动（里程碑 3）、Tauri、RBAC、Kiosk、便携 Node、appId 最终拆分。设计由 `ccapi:claude-opus-5-5` 出稿，主代理核对后写入 §2，用户批准后由 DeepSeek Flash 实施。

## §2 批次任务与设计（主 agent）
**状态行**：设计完成

### 本批条目
- 目标：构建期终端开关；学生专用构建默认 `/student`、隐藏三端切换、保留学生选择器；`all` 演示包零回归；教师浏览器 `/web` 不变。
- 范围：前端路由/Header/store/文档；不改后端/schema；不改 appId/appName；不做里程碑 2/3、Tauri、RBAC、Kiosk、便携 Node。

### 终端模式（单一环境变量）
- `VITE_TERMINAL`，值 `all`（缺省）/`student`/`teacher`/`parent`；空值或非法值一律按 `all`（统一 `normalizeTerminal`，Header/守卫/store 三处共用同一判断）。
- 矩阵：
  - `all`：首页 `/web/home`；全部路由；三端切换显示；学生选择器显示；当前演示包行为不变。
  - `student`：首页 `/student`；仅 `/student`（`=== '/student'` 或 `/student/` 前缀）；三端切换隐藏；学生选择器保留。
  - `teacher`：首页 `/web/home`；仅 `/web`/`/web/` 前缀；三端切换隐藏；学生选择器保留；本批只写代码不交付。
  - `parent`：首页 `/parent`；仅 `/parent`/`/parent/`；三端切换隐藏；家长页自身选择器保留；本批只写代码不交付。
- 学生选择器：全局 Header 的 `StudentSelector` 不动；parent 页若不用全局 Header，保留其自身选择器，不新增/删除。

### 路由守卫
- `apps/web/src/App.tsx`：在 `<BrowserRouter>` 内包 `<TerminalGuard>`（`useLocation`）；`all` 直接放行；非 `all` 按模式白名单，越权重定向到该模式首页（`Navigate replace`）。
- 根 `/`、`*`、直链 `/web/students`、`/parent`、`/foo` 在 `student` 模式下全部落 `/student`；`teacher` 模式下 `/student`、`/parent` 落 `/web/home`；`parent` 模式下 `/web/*`、`/student` 落 `/parent`。
- 现有 `/web/:page`、`/student`、`/parent` 路由与 `all` 模式的路由逻辑不变。

### Header 与 store
- `Header.tsx`：`showTerminalSwitcher = normalizeTerminal(import.meta.env.VITE_TERMINAL) === 'all'`；仅 `all` 渲染三端切换按钮组；`StudentSelector` 不动。
- `useAppStore.ts`：`activeTerminal` 初值按模式推导——`student`→`student`，`parent`→`parent`，`teacher`/`all`/非法→`web`；`Header` 的 `currentKey` 仍按 pathname，教师子页高亮不变。
- `all` 模式零视觉/行为变化。

### 构建、APK、文档
- 构建：`all` 用根 `npm run build`（shared-types + api + web）；`student` 用
  `VITE_TERMINAL=student VITE_API_BASE=http://192.168.0.188:3000 VITE_SOCKET_URL=http://192.168.0.188:3000 VITE_SOCKET_TOKEN=<与 apps/api/.env 一致；开发默认 vmi-tis-dev-token> npm run build -w @vmi-tis/web`；
  `teacher`/`parent` 同理，只构建验证，不交付。
- **不加 `package.json` 的 `build:student` 等脚本**：`VITE_TERMINAL=... npm` 前缀在 Windows cmd 不成立；文档分别给 bash 与 PowerShell 写法（PowerShell：`$env:VITE_TERMINAL='student'; npm run build -w @vmi-tis/web`）。
- APK：`cd apps/web && npx cap sync android` → `cd android && ./gradlew assembleDebug`；`adb install -r`（同 appId、同 debug 签名，保留应用数据；仅签名冲突才 uninstall）。appId `com.vmitis.pad` / appName `星眸智康 Pad` 不变；最终拆分留后续批次。
- 文档：`AGENTS.md` 增构建期终端模式；`docs/vmi_tis.md` 增三端入口口径；`README.md` 增 `VITE_TERMINAL` 快速用法；`docs/PROGRESS.md` 记本批；b3 §2/§5。

### 验收
- `npm run build`（`all`）EXIT 0；`npm run verify:all` EXIT 0（`all` 回归）。
- 四模式浏览器：`all` 三端切换与路由不变；`student` 首页 `/student`、无三端切换、学生选择器在、直链 `/web/students`→`/student`；`teacher` 首页 `/web/home`、直链 `/student`→`/web/home`；`parent` 首页 `/parent`、直链 `/web`→`/parent`；非法值按 `all`。
- `student` APK：平板 LAN 安装，首页 `/student`、无三端切换、学生选择器可见、训练正常；截图。
- 文档落点齐全；§5 实施记录。

### 风险与默认
- appId 共用：本批不改，交付前再出学生专用包；最终拆分留后续（用户默认 A）。
- teacher/parent 只写代码、不交付；教师端当前用浏览器 `all`（用户默认 A）。
- 构建缓存/残留：构建前清 `apps/web/dist` 与 `android/app/src/main/assets/public`；APK 用 `-r`，不卸载。
- 环境变量非法：统一 normalize 到 `all`，禁止三处各判一套。

## §3 设计评审（评审子代理）
## §4 用户批准（主 agent）

用户 2026-10-20 19:20 明确：ccapi 出设计后，主代理核对即可交 DeepSeek Flash 执行，不再逐版请用户批准；用户不懂代码细节，只保留产品方向与最终结果。范围以 §1 为准；超出 §1 的产品行为、红线、技术栈/依赖变更仍先报告。commit/push 按项目规则单独放行。

## §5 实施记录（实施者：主 agent ∥ coder）
**状态行**：实施完成



### 实施范围（2026-10-20，DeepSeek Flash 实施）

- 代码：`apps/web/src/store/useAppStore.ts`、`apps/web/src/App.tsx`、`apps/web/src/components/Header.tsx`。
- 文档：`AGENTS.md`（Tech Stack 增「构建期终端模式」）、`docs/vmi_tis.md`（第二部分目录树后增「三端入口口径」）、`README.md`（新增「构建期终端模式（`VITE_TERMINAL`）」一节，含 bash + PowerShell + APK 命令）、`docs/PROGRESS.md`（本批条目）。
- 未改：后端 / `prisma/schema.prisma` / `packages/shared-types` / `package.json` / `capacitor.config.ts`（appId `com.vmitis.pad`、appName `星眸智康 Pad`）/ `StudentSelector` / 家长页自身内容 / 学生 Pad 页面。

### 实现落点（与 §2 逐条对应）

1. **统一判断**：`useAppStore.ts:7-32` 新增 `TerminalMode` 与 `normalizeTerminal(value)`（`trim` 后精确匹配 `all` / `student` / `teacher` / `parent`，其余含空值一律 `all`），`useAppStore.ts:26` 求值一次得 `TERMINAL_MODE`；`activeTerminal` 初值改为 `initialTerminal(TERMINAL_MODE)`（`useAppStore.ts:28-32,55`，`student`/`parent` 取本端，`teacher`/`all`/非法取 `web`）。Header 与守卫都引用同一 `TERMINAL_MODE`，三处不再各判一套。
2. **路由守卫**：`App.tsx:16-43` 新增 `TERMINAL_HOME` 与 `isAllowedPath`（`all` 放行；`student` 为 `=== '/student'` 或 `/student/` 前缀；`teacher` 为 `/web` 或 `/web/` 前缀；`parent` 为 `/parent` 或 `/parent/` 前缀），`TerminalGuard` 在 `<BrowserRouter>` 内用 `useLocation` 取 pathname，越权时 `<Navigate ... replace>` 回本端首页。原有五条路由（`/`、`/web/:page`、`/student`、`/parent`、`*`）一字未改。
3. **Header**：`Header.tsx:23` `showTerminalSwitcher = TERMINAL_MODE === 'all'`，`Header.tsx:49` 起只在该值为真时渲染三端按钮组；`Header.tsx:77` 的 `StudentSelector` 未动；`currentKey` 仍按 pathname，教师子页高亮不变。

### 验收记录（实跑）

- `npm run build`（shared-types + api + web，web 脚本含 `tsc --noEmit`）：EXIT 0；web 产物 `dist/assets/index-Dwn4siKj.js` 580.41 kB。
- `npm run verify:all`：EXIT 0，Task 2 / 3 / 4 / 6 全绿（每个任务全新隔离 SQLite + 3100 测试 API）。
- `apps/web` 单独 `npx tsc --noEmit -p tsconfig.json`：EXIT 0。
- 四模式构建：`VITE_TERMINAL=all|student|teacher|parent` 各一次，均 EXIT 0；`VITE_TERMINAL=foo`（非法）与 `VITE_TERMINAL=`（空）亦 EXIT 0。
- 四模式浏览器（`npx vite preview --outDir <各模式 dist>` 分端口服务，API 为 3100 + 演示库副本；headless Chrome 实测）：
  - `all`：`/`→`/web/home`；Header 三端按钮齐全，点「学生 Pad」→`/student`；`/parent` 渲染家长端 4 Tab；学生选择器在。
  - `student`：`/`→`/student`；`/web/students`、`/parent`、`/foo` 均→`/student`；Header 按钮数 0（切换隐藏），学生选择器在（含 6 名学生）；学生 Pad 渲染正常（截图 `/home/maoea/.thincoder/browser/shots/shot-2026-10-20T11-26-36-421Z-154142.png`，本机临时未入库）。
  - `teacher`：`/`→`/web/home`；`/student`→`/web/home`；Header 按钮数 0；学生选择器在；教师侧栏 9 项在。
  - `parent`：`/`→`/parent`；`/web`→`/parent`；Header 按钮数 0；家长端 4 Tab 在，Header 学生选择器保留。
  - 非法 `foo` 与空值：`/`→`/web/home`，三端切换在 —— 等同 `all`。
- 学生版 APK：`VITE_TERMINAL=student VITE_API_BASE=http://192.168.0.188:3000 VITE_SOCKET_URL=http://192.168.0.188:3000 VITE_SOCKET_TOKEN=vmi-tis-dev-token npm run build -w @vmi-tis/web` → `npx cap sync android` → `./gradlew assembleDebug` 全部成功；APK 4,171,457 B，`aapt dump badging` 包名 `com.vmitis.pad`、`application-label:'星眸智康 Pad'`、minSdk 22 / targetSdk 34；APK 内 `assets/public/assets/index-BgGb_kQB.js` 与 student 构建产物同名（确认打进的是学生包）；`apksigner verify` 通过（仅 debug 常规 warning）。未安装。

### 偏差与已知后果

- **Node 版本**：项目验收基线为 v20.20.2，本机 WSL 当前只装了 Node 24.22.0（nvm 下无 v20），本轮构建与验收全部在该版本完成；若主代理需要严格基线，请在 Windows 侧复跑 `npm run build` + `npm run verify:all`。
- **`trim` 归一**：`normalizeTerminal` 先 `trim` 再精确匹配（大小写敏感，`Student` 视为非法按 `all`）；文档只写小写字面量值。
- **学生包内跨端链接**：`StudentPadPage` 的红区熔断页有「前往评估中心处理转介」按钮跳 `/web/assessment`，`student` 模式下会被守卫按 `/web/` 前缀挡回 `/student`。这是 §2「越权直链回落本端首页」的直接后果，未改页面代码；学生包的教师处理入口属后续批次（交付前补齐）。同一前缀规则，`/web/assessment` 未单独实测。
- **parent 页选择器**：家长页用的是全局 `Header`，其 `StudentSelector` 原样保留，未新增也未删除。
- **API 演示库副本**：浏览器验收用 `/tmp/b3-demo.db`（`apps/api/data/vmi_tis.db` 的副本）起 3100，未写主库；验收后进程已停。

### 未验证

- APK 平板真机安装/运行（`adb install -r`，保留数据；主代理执行）——含首页 `/student`、无三端切换、选择器可用、训练正常。
- `npm run build` / `npm run verify:all` 在 Node v20.20.2 下的复跑（见上）。
- `teacher` / `parent` 仅构建与浏览器验证，不交付。

### 范围外（只记录，未改）

- `apps/web/.env.example` 未列 `VITE_TERMINAL`（该文件不在本批改动清单内）；如需在 `.env.example` 里提示可选值，另行放行。

## §6 验证与收口（父代理）

### 独立复核与门禁（主代理，2026-10-20）
- 复核 diff：`useAppStore` 的 `normalizeTerminal`/`TERMINAL_MODE`；`App.tsx` 的 `TerminalGuard`；`Header.tsx` 仅 `all` 显示三端切换；`StudentPadPage` 红区页教师链接在非 `all` 模式改为提示；`.env.example` 增 `VITE_TERMINAL`；AGENTS/vmi_tis/README/PROGRESS 四处文档。`all` 路由一字未改。
- Node 20.20.2 基线复跑：`npm run build` EXIT 0；`npm run verify:all` EXIT 0（Task 2/3/4/6 全绿）。coder 本轮用 Node 24.22 构建，主代理已用项目基线复跑。
- 四模式：coder 用 `vite preview` + headless Chrome 实测；主代理核对代码与构建；`all` 零回归、`student` 三条越权直链回落、`teacher`/`parent` 回落、非法/空值按 `all`。
- student APK：`VITE_TERMINAL=student` + LAN env；`cap sync` + `assembleDebug`；包名仍 `com.vmitis.pad`；`adb install -r` 成功（`lastUpdateTime=2026-10-20 19:38:23`，`Success`）。
- 平板真机：启动直达 `/student`；Header 无三端切换；学生选择器可见（周子墨 L4）；训练页正常；LAN `192.168.0.188:3000`。截图 `/tmp/vmi-tablet-student-launch.png`。
- 未验证：红区学生在学生包的提示文案（代码条件已核对，未在平板切到张梓轩实测）；`teacher`/`parent` 只构建与浏览器验证，不交付。
- 未 commit。adId/appName 未改，最终拆分留后续批次。

- 更正：上一段末「adId/appName」应为「appId/appName」。
