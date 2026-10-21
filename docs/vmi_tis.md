# 孤独症学生视觉运动整合训练干预系统（VMI-TIS）

## 软件需求规格说明书（SRS）暨第六章软件功能模块详细设计

- **文档版本**：V2.1（工程实施级规格说明 · 含 Android 跨端打包、SQLite/PostgreSQL 双模交付、盲操快捷键、Excel 批量导入、AuditLog 医疗审计与视频清理规范）
- **配套原型**：`vmi_tis_prototype.html`（含机构/教师 Web 工作台、学生端互动训练软件、家长端微信小程序三端交互原型）
- **适用对象**：医院/特教学校项目评审专家、产品经理、全栈开发工程师、AI 编程智能体（Claude Code / ChatGPT Codex）
- **编制依据**：《孤独症学生视觉运动整合训练干预系统整体设计方案（池霞团队方法体系）》

## 第一部分：原方案《第六章 软件平台》扩充详细设计章节

> **使用说明**：本部分采用与原方案完全一致的章节编号体系（6.1–6.6），可直接替换或扩充合入原 Word 方案《第六章 软件平台》，弥补原方案在软件功能模块、页面流转、Android 移动终端适配与轻量化私有部署上的设计空白。

### 6.1 平台总体架构与多终端协同矩阵

软件平台是孤独症学生视觉运动整合训练干预系统（VMI-TIS）的数字化中枢，全面承载“筛查预警—专科转介—功能评估—IEP计划—五段式课堂训练—眼动与过程采集—家庭泛化—阶段复评”的 PDCA 业务闭环。平台采用**云边端协同与跨平台自适应架构**，支持公有云 SaaS、医院内网服务器以及学校单机零配置三种交付形态，面向三大核心终端与五类业务角色提供差异化交互界面：

| 终端名称 | 终端形态与运行环境 | 核心服务对象 | 核心业务定位与功能范畴 |
| --- | --- | --- | --- |
| **终端一：机构/教师端工作台** | PC 浏览器 / 康复师 Android 平板 App / iPad（响应式 Web & APK） | 作业治疗师(OT)、物理治疗师(PT)、眼科/视光师、特教教师、科室主任 | 学生一人一档管理、四层评估与红区转介审批、电子量表双屏施测、IEP智能制定与功能室排课、30–40分钟课堂回合记分、ICF六维数据画像、家长打卡批改、标准化操作卡资源库与权限管理 |
| **终端二：学生端互动训练与眼动软件** | Windows 数字评估训练一体机（外接60Hz红外眼动仪） / Android 护眼触控平板 App（全屏Kiosk低刺激模式） | 6–15岁学龄段及3–6岁学龄前孤独症学生 | 非接触式眼动仪5点校准、L0–L5分级互动游戏闯关（平滑追踪戳泡泡、聚散球引导、图形-背景寻宝、网格空间定位）、实时正向语音/星星强化、单次≤15分钟强制护眼锁屏管控 |
| **终端三：星眸家校桥小程序** | 微信小程序 / 手机 H5（家长手机端即点即用） | 学生家长 / 家庭照护者 | 每日5–10分钟居家泛化任务接收、真人慢速夸张示范微课观看、居家训练视频/图文上传打卡、阶段能力成长简报查阅、医教康家多学科群在线留言沟通 |

### 6.2 软件平台八大核心功能模块详细设计

#### 6.2.1 模块一：工作台首页与智能预警中心（Workbench & Smart Alerts）

1. **今日排课时间轴看板**：按时间序列展示当前登录治疗师/教师当日全部训练课表（含时段、学生姓名、当前能力层级 L0–L5、所在功能室、本节核心操作卡摘要及完成状态）。支持一键点击“进入课堂记分”或“投屏至学生端平板/一体机”。
2. **临床与教学智能预警引擎**：
   - **红区转介待办预警**：当入案初筛或训练中发现复视、斜视、视力异常等红区指征时，自动置顶高亮提醒开具转介单或审核家长上传的眼科专科回执。
   - **进阶达标复核提醒**：当系统监测到某学生在当前层级核心项目连续 3 次课正确率 ≥ 80% 且完成至少 2 种材料及居家泛化打卡时，自动推送“L(n) → L(n+1) 晋级审批”待办。
   - **阶段复评到期提醒**：距上次基线或阶段评估满 8–12 周时，自动提醒主责治疗师安排阶段复评。
3. **机构全局态势卡片**：实时统计在训学生总数、今日排课完成率、红区转介闭环率、全院家庭每日泛化打卡率及 L0–L5 六级能力人数分布条形图。

#### 6.2.2 模块二：学生康复档案中心（360° Student EHR）

1. **新生入案建档向导与 Excel/CSV 批量导入（M2 ★★★★☆）**：
   - **单人建档向导**：采集学生基本信息（姓名、性别、出生日期、生理年龄、就读学校/班级/场景）、临床诊断与共病情况、家长主诉及日常视觉行为困难表现，自动生成唯一康复档案编号（如 `VMI-2026001`）并绑定家长端手机号。
   - **特教学校学期初 Excel 批量建档**：提供标准《VMI-TIS 学生档案批量导入模板 (.xlsx/.csv)》下载，使用 `SheetJS (xlsx)` 前端/后端解析批量上传的班级名单（支持单次 50–200 人秒级导入），自动校验必填项并批量生成学号与初始待初筛状态。
2. **多维筛选与一人一档检索**：支持按学生姓名/编号模糊检索，按能力层级（L0–L5）、在训状态（绿区正常在训 / 达标待晋级 / 红区眼科转介锁定 / 巩固随访）及班级场景组合过滤。
3. **360° 个人成长档案抽屉**：集成展示学生视光专科基线、历次标准化量表评估报告、当前执行中的 IEP 计划、历史课堂回合记分明细、眼动追踪热力图演变及居家打卡记录。

#### 6.2.3 模块三：四层评估与红区分流中心（4-Tier Assessment & Red-Zone Triage）

1. **第一层：初筛问卷与红区熔断拦截器**：
   - 内置近距离用眼表现、读写跳字漏行、空间动作协调、日常寻物线索等结构化初筛问卷，以及 0–6 岁视觉发育里程碑核查表。
   - **红区熔断机制（核心合规逻辑）**：内置视力可疑/屈光不正、斜视/复视（重影）/遮盖异常、弱视危险因素/眼球震颤/伴头痛呕吐三类红区指标（种子 `RED_ZONE_TRIAGE_ITEMS`，编码 `RED_01`–`RED_03`）。初筛提交时前端同时上报勾选的结构化编码与行为项文本；服务端把「种子编码（未知编码返回 400，不静默降级）」与「行为项文本关键词 + 阈值」两条路径都跑一遍并取并集去重，不采信客户端给出的红区结论。命中任一红区项，系统立即将该学生档案状态强制置为“红区锁定（暂停常规训练）”，自动生成标准格式《医教结合眼科/视光专科转介单》；转介单红区项以种子 label 数组存入 `redZoneItemsJson`。
   - **专科回执核验解锁**：支持拍照或上传医院眼科验光配镜处方及专科处置回执扫描件，经视光师/康复主任在线会签审核通过后，方可解除红区锁定并开放对应层级的视觉训练排课。
2. **第二层：视觉通路与视觉效率专科录入台**：
   - 结构化记录双眼/单眼裸眼及矫正视力、屈光状态、调节幅度（Age Duane 尺近点 cm/D）、调节灵活度（±2.00D 双面镜 cpm）、双眼视三级功能（Worth 四点同时视、融合视范围、Randot/Titmus 立体视锐度）、集合近点（NPC cm）、NSUCO 眼动标准化观察分级（注视/追视/扫视及头身代偿评分）与遮盖试验结果。
3. **第三层：标准化电子量表双屏在线施测台**：
   - **支持量表**：Beery VMI-6（视觉运动整合全表30题/短表21题 + 视觉感知补充测验 + 运动协调补充测验）、TVPS-4（视觉感知7项子测验）、MVPT-4（无运动视觉感知，45题，4岁–成人）、DEM（发育性眼动纵横数字快速认读）、TVMS-3、RAN/RAS、SIPT/SPSRC。
   - **双屏施测交互（支持 PC+一体机 或 教师平板+学生Android平板）**：学生端屏幕呈现标准比例范图或指认题卡（锁定缩放与旋转），采集触控笔临摹轨迹、作答用时、笔压与停顿次数；评估师端屏幕同步查看学生作答画面，对照内置《评分手册标准》一键判定 `1分（通过）` 或 `0分（未通过）`，勾选伴随行为（如头部倾斜、频繁抬头、手腕悬空）。
   - **自动中止与常模换算**：当连续 3 道题判定为 0 分时自动触发测验中止（Ceiling Rule）；施测结束自动根据学生精确月龄查表换算原始分、标准分、百分位、等效发展年龄，并对比“看不准（感知）”“动不准（运动）”与“整合不准”，输出 L0–L5 综合定级建议。
4. **第四层：评估报告生成与历次对比中心**：一键生成包含筛查分流结论、视光专科结果、量表剖面图、六维能力雷达图、优势短板剖析及训练参数建议的《VMI-TIS 综合评估报告单》；当前实现为 HTML 报告（/api/reports/<id>.html），PDF 导出与脱敏打印未实现。
5. **教师端实施口径（5 步向导）**：评估中心按「① 选学生与评估阶段（`BASELINE` / `STAGE_8W` / `TRANSITION`）→ ② 初筛与红区门禁 → ③ 视光与眼动（可跳过）→ ④ 量表施测 → ⑤ 汇总、保存与报告」组织，不再使用功能 Tab 并列。
   - **门禁只在前端**：`PENDING_SCREENING` 时步骤 ③–⑤ 禁用，必须先提交初筛；`RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` 时仅禁用步骤 ③–④，仍可在步骤 ⑤ 保存初筛级 L0 记录；`GREEN_ACTIVE` 放行。服务端 `createRecord` 的红区 L0 行为与 R1 训练/排课守卫不变，`triageStatus` 仍只归 `TriageService`。
   - **阶段透传**：`submitScaleScore` 与 `createRecord` 均携带 `evalPhase`；R2 会话键为 `studentId:evalPhase:sessionId`，只有 Beery 主测验走 R2 判分。
   - **原始分链路**：Beery 主测验逐题判 1/0，连续 3 题 0 分由服务端中止；「确认原始分」把本轮 `totalRawScore` 写入记录 `beeryVmiRaw`（仍可手工修改）。TVPS-4 种子只提供样例题卡，7 项原始分手工作业录入，系统不伪造 18 题题库；MVPT-4 已接入 45 题记分台（逐题 1/0、MEM 5 秒提示、原始分与手册标准分），不内置官方图版；DEM 用种子刺激矩阵出示后手工录入用时与错误数。
   - **量表数据来源分级**：种子侧按 `OFFICIAL_LICENSED` / `MANUAL_ENTRY_ONLY` / `PROJECT_APPROXIMATION` / `STRUCTURE_ONLY` 标注，标签文案与分数来源判定统一取种子 `SCALE_DATA_STATUS_LABELS` / `SCALE_SCORE_SOURCE_LABELS` / `resolveScaleScoreSource`；报告与科研 CSV 已携带该标签。只有前两类可写入正式结论；自动换算分标“参考换算”，手册标准分优先。电子题卡仅用于训练与演示，不替代实物题册。
   - **报告**：保存后由服务端自动定级并生成 HTML 报告，页面展示 `reportFileUrl` 链接；报告失败不阻塞保存，历史评估按 `evalPhase` 分组并可逐条重新生成。

#### 6.2.3.1 量表题库与常模现状

`SCALE_PROVENANCE_REGISTRY` 的 10 个量表当前没有任何一个 `OFFICIAL_LICENSED`：5 个 `MANUAL_ENTRY_ONLY`（Beery VMI-6、TVPS-4、MVPT-4、DEM、NSUCO）、2 个 `PROJECT_APPROXIMATION`（第一层初筛、视光判读）、3 个 `STRUCTURE_ONLY`（TVMS-3、RAN/RAS、SPSRC/SIPT）。系统内置换算只标“参考换算”，正式标准分以手册录入为准；电子题卡只用于训练/演示，不替代实物题册。

| 量表 | 数据状态 | 题库 / 刺激材料 | 常模 | 缺什么 |
|---|---|---|---|---|
| Beery VMI-6 | MANUAL_ENTRY_ONLY | 30 题结构 + 简化参数化 SVG；VP/MC 由 VMI 题号派生，不是独立官方题卡 | 内置 2–20 岁项目近似锚点；正式标准分手册录入 | 官方 30 题图卡、官方常模 |
| TVPS-4 | MANUAL_ENTRY_ONLY | 126 条题号索引；题目内容未收录；电子卡由 SVG 生成 | 内置 5–18 岁项目近似矩阵；正式量表分手册录入 | 官方 126 题、官方常模 |
| MVPT-4 | MANUAL_ENTRY_ONLY | 45 条题号索引（5 维×9）；9 个参数化基元，不是官方图版 | 内置 4–13 岁锚点；14 岁以上只收手册分 | 官方 45 题图版、官方常模 |
| DEM | MANUAL_ENTRY_ONLY | 项目生成的 Test A/B/C 数字矩阵（40+40+80），非官方图版 | 内置 6–13 岁项目近似截断表 | 官方图版、官方常模 |
| NSUCO | MANUAL_ENTRY_ONLY | 实物观察规程 + 四因子 1–5 分评分细则（不是题卡型量表） | 内置 Maples (1995) 5–14 岁分年龄/性别最低达标分表，结构完整、数值待一手手册核对 | 一手手册核对；没有“题库”概念 |
| TVMS-3 | STRUCTURE_ONLY | 39 条结构化索引 + 6 类误差计分；图形复用 VMI 基元 | 没有独立常模表，只按总原始分（78）与误差百分比输出短板剖面 | 题库、常模都没有 |
| RAN/RAS | STRUCTURE_ONLY | 4 套 5×10 项目生成矩阵，非官方卡片 | 5–12 岁单阈值超时表（无 Mean/SD） | 官方卡片、完整常模 |
| SPSRC/SIPT | STRUCTURE_ONLY | 6 项 L0 课堂核查 + 130 题结构与子量表题数；题干未收录 | 只有 L0 达标线 + T 分数/-1SD 截断，没有 130 题常模表 | 题库、常模表都没有 |
| 第一层初筛 | PROJECT_APPROXIMATION | 项目临床核查条目（按方案表 1/表 2 整理，未逐字核对） | 无；只有定性红绿分流规则 | 标准题库、常模都没有 |
| 视光判读 | PROJECT_APPROXIMATION | 器械检查指标（不是题库） | Hofstetter 公式 + Scheiman & Wick 临床截断值，不是年龄常模表 | 标准题库、年龄常模表都没有 |

**正式结论边界**：只有 `OFFICIAL_LICENSED` / `MANUAL_ENTRY_ONLY` 可写入正式结论；`PROJECT_APPROXIMATION` 与 `STRUCTURE_ONLY` 只做筛查、结构展示或训练参考。TVMS-3 / SPSRC / 第一层初筛 / 视光判读没有可用的年龄常模表；RAN/RAS 只有单阈值超时表，不是完整常模。

**授权资料到位后的更新口径**：先确认授权覆盖“数字化存储、电子呈现、常模换算与报告引用”，再将该量表改为 `OFFICIAL_LICENSED`，用官方题卡与常模表替换项目近似表；未获电子呈现授权的量表仍只做手册分录入，题卡内容不进仓库/前端。更新后补正例与反例验收，并同步 `SCALE_PROVENANCE_REGISTRY`、报告来源标签与 `docs/PROGRESS.md`。

#### 6.2.4 模块四：智能 IEP/ITP 计划制定与可视化排课系统（IEP Builder & Scheduler）

1. **智能 IEP 目标与课程匹配向导**：
   - 遵循“最低短板优先、优势带动”与 SMART 原则，根据学生评估定级自动推荐 12 周长期目标与 8 周短期可测目标。
   - 从五大训练模块（模块一身体感统 L0、模块二视觉效率 L1、模块三视觉感知 L2、模块四视觉运动整合 L3、模块五生活迁移 L4–L5）中智能勾选配套操作卡与数字训练游戏，自动校验“实体操作占 70% 主体 + 数字训练 ≤ 15 分钟”的剂量合规比例。
2. **多维度可视化排课日历**：
   - 提供周一至周五按时段、按功能分区（评估室、视觉训练室、感统运动室、数字训练室、教学融合区）的网格化周课表视图。
   - 支持个别化（1对1）与小组融合课排班，自动检测房间冲突、治疗师时间冲突与眼动仪/训练平板设备占用冲突。

#### 6.2.5 模块五：课堂训练实时记分工作台（Session Workbench）

1. **30–40 分钟五段式课堂流程控制器**：
   - 严格固化“①签到与感觉唤醒（3分钟）→ ②复习与联结（4分钟）→ ③核心新任务（13分钟黄金专注期）→ ④巩固与泛化（9分钟）→ ⑤强化结束与布置作业（4分钟）”五段式计时进度条。
2. **左屏标准化操作卡同步指引**：
   - 根据当前所处课堂环节，自动切换显示对应操作卡的【配套实体教具】【分步执行方法】【大字号标准口头指导语（支持离线 TTS 慢速语音播报）】【难度升降级按钮】及【临床安全注意事项】。
3. **右屏回合制实时记分器（Trial-by-Trial Logger）**：
   - 针对核心训练项目预设 10 回合（或自定义组数）可视化记分格，治疗师既可通过手持 Android 平板的大尺寸触控按钮点选，也可在 PC 端使用治疗师盲操键盘快捷键（M1 ★★★★★）在不低头看屏幕的情况下完成记分：
      - `空格键 (Space)` 或数字键 `1`：记录 1 次 `✓ 成功达标`；
      - 数字键 `0`：记录 1 次 `✗ 需辅助/失误`；
      - 方向键 `↑` / `↓`：实时升/降当前 NCAEP 5 级提示等级；
      - 字母键 `N`：一键切换至五段式课堂的下一训练环节。
   - 同步点选本回合使用的 NCAEP 5 级提示层级（`⑤独立完成` → `④言语提示` → `③手势提示` → `②慢速夸张示范` → `①全躯体辅助`）、注视与头部代偿表现（头不动眼追踪 / 轻微转头代偿 / 注视短暂跳行）及个体化正向强化物（如恐龙贴纸、击掌、滑板游戏）。
   - **结课自动闭环**：点击“下课结课”后，系统自动计算本节课综合正确率，校验是否触发“连续 3 次 ≥ 80%”晋级规则，并将当日配套的 5–10 分钟家庭泛化任务一键推送至家长端微信小程序。

#### 6.2.6 模块六：学生端数字训练与多源眼动交互系统（Student Pad & Eye-Tracking）

1. **低刺激护眼与 Android 专机锁定（Kiosk Mode）规范**：采用低饱和度柔和背景色（森林雾绿/暖沙白）、无频闪动画与大圆角触控热区；在 Android 平板端支持专机锁定模式（屏蔽底部 Home/返回导航栏与外部通知推送），消除感官过载与分心干扰。
2. **双模式眼动采集与 5 点卡通校准**：
   - **旗舰一体机模式（Windows + USB 红外眼动仪）**：通过屏幕四角及中心依次出现的“小飞船/笑脸”引导动画，30 秒内完成 60Hz 红外眼动仪空间映射校准，高精度采集注视点、微眼跳与瞳孔直径。
   - **移动平板模式（Android Pad 触控笔 + 前置 AI 视觉追踪）**：采集高清电容笔/手指触控轨迹、反应时与点击热区，并可选开启前置摄像头轻量化视线与头位代偿监测（识别孩子是否歪头或凑近屏幕 `<30cm`）。
3. **分级数字训练游戏矩阵（与实体操作卡一一对应）**：
   - **L1 平滑追踪·泡泡追追看（对应操作卡 2-2）**：沿水平、垂直、对角线及“8”字轨迹移动笑脸泡泡，实时叠加眼动仪捕捉的注视光圈，训练眼-头分离与平滑追踪，计算出指戳破反应时与追踪增益（Gain）。
   - **L1 聚散调节·奇妙聚散球（对应操作卡 2-1）**：模拟红（30cm）、绿（60cm）、黄（90cm）三球远中近注视引导与生理性复视双线交叉提示，辅助实体 Brock 线聚散球练习。
   - **L2 图形-背景与空间定位·森林找星星/数字寻宝（对应操作卡 3-1/3-3）**：在不同干扰密度的图形网格或数字串中按序寻找指定目标（如黄色五角星、数字“69”），实时采集按行扫视轨迹与漏找率。
   - **L3 视觉运动整合·点阵小画家（对应操作卡 4-3）**：支持触控笔在通道内描线、按数字顺序点连线及几何图形闭合临摹。
4. **AI 难度自适应与 ≤ 15 分钟强制护眼锁屏**：
   - 当连续 3 回合正确率 > 85% 时自动平滑提升目标移动速度或背景密度并撤除闪烁提示；当正确率 < 60% 时自动降级难度以确保 70%–85%“跳一跳够得着”成功率。
   - 内置硬件级护眼倒计时，单次数字训练累计达 15 分钟立即弹出全屏绿植远眺休息锁屏页，防止屏幕依赖与视疲劳。

#### 6.2.7 模块七：数据画像、ICF 效果验证与科研导出中心（Analytics & ICF Research）

1. **个人六维能力成长雷达图**：从身体稳定与感统（L0）、视觉效率（L1）、视觉感知（L2）、手眼协调与精细（L3）、书写与工具适应（L4）、课堂与生活迁移（L5）六个维度，动态叠加对比入案基线（T0）、阶段中（T1）与阶段复评（T2）能力剖面。
2. **眼动扫视轨迹图与注视热力图回放**：可视化对比干预前（眼跳无序折返、跳行漏字、局部固着）与干预后（按行从左到右有序扫视、注视点集中稳定）的眼动轨迹动画与 DEM 纵横比变化。
3. **基于 ICF 框架的多中心科研数据导出**：支持按单案多基线设计或随机对照研究（RCT）要求，批量脱敏导出身体功能指标、活动参与评分及每次课堂过程数据（CSV/Excel 格式）。当前实现为评估记录 CSV：`GET /api/analytics/export-csv`（UTF-8 BOM + CRLF + RFC 4180 转义，Excel 直接打开不乱码），列序固定、后续只追加，含学生编码、性别、月龄（按评估日期换算）、班级场景、评估阶段、各量表分与数据状态/分数来源、定级与六维雷达 JSON；不导出姓名、家长电话、出生日期与学生/记录 UUID。课堂过程数据的 Excel 分表导出尚未实现。

#### 6.2.8 模块八：家校协同小程序与标准化课程资源库（Home-School & SOP Library）

1. **星眸家校桥微信小程序（家长端四模块）**：
   - **今日任务**：展示今日 5–10 分钟居家自然情境练习（如洗衣机衣物找配对袜子、手指伙伴笑脸追视、餐前摆碗筷、穿衣扣纽扣），支持勾选完成表现并上传 15 秒打卡视频。
   - **示范微课**：内置康复师录制的慢速夸张动作示范与常见错误提示纠正视频。
   - **成长报告**：以通俗易懂的图表向家长展示孩子每周进步曲线与阶段评估简报。
   - **医教沟通**：提供家长与作业治疗师（OT）、特教班主任、视光医生的多学科在线留言群。
2. **标准化操作卡与教具资源库**：结构化管理五大模块全部操作卡、13 类临床实体教具图解及视觉支持素材（步骤图、日程表），支持机构上传校本/院本扩展课程。
3. **医疗级操作审计日志（AuditLog，M3 ★★★☆☆）与打卡视频 7 天自动清理（M4 ★★★☆☆）**：
   - **全链路合规审计（WHO / WHEN / WHAT）**：所有涉及学生建档、红区熔断锁定、眼科回执审核解锁、量表判分、IEP 晋级审批的关键修改，均自动写入 `audit_logs` 表，记录操作人 ID/角色、时间戳、IP 地址及修改前后状态快照（`changesBeforeJson` / `changesAfterJson`）。
   - **家长打卡视频 7 天自动过期清理**：为保护未成年人隐私并节省本地一体机/服务器磁盘空间，后端内置 `Node.js Cron (@nestjs/schedule)` 每日凌晨 `02:00` 自动扫描 `homework_checkins` 表中满 7 天的视频文件，物理删除过期视频文件并将状态标记为 `VIDEO_EXPIRED_CLEANED`，永久保留文字打卡记录与治疗师文字点评。

## 第二部分：工程实施需求规格说明书（供 Claude Code / ChatGPT Codex 编程直读）

> **致 AI 编程智能体（Claude Code / ChatGPT Codex）的实施指令**： 当你收到本文档与配套原型文件 `vmi_tis_prototype.html` 时，请以 `vmi_tis_prototype.html` 作为 **1:1 视觉 UI 与交互基准（Visual & Interaction Source of Truth）**，严格按照下方的**跨平台技术栈（Web + Android APK）、SQLite/PostgreSQL 双模免安装数据库架构、核心状态机规则与 API 契约**，将其转化为前后端分离、生产级可用的全栈工程代码。

### 1. 推荐技术栈与工程目录结构（支持 Web + Android APK + 免安装交付）

为确保系统既能在 PC 浏览器运行，又能**直接打包成原生 Android `.apk` 安装包**运行在康复师手持平板与学生护眼训练平板上，同时实现**客户现场“双击即可运行、零数据库安装配置”**，工程强制采用以下技术选型：

- **前端与 Android 跨平台技术栈（一套代码同时构建 Web 与 Android APK）**：
   - **核心框架**：强制采用 `React 18 + Vite 5 + TypeScript`（单页应用 SPA 架构，**严禁使用重度依赖 Node 服务端渲染的 Next.js SSR 特性**，以确保 100% 静态编译打包进 Android APK）。
   - **UI 与可视化**：`Tailwind CSS 3.4`、`Lucide React`、`Chart.js 4`、`HTML5 Canvas`（60fps 硬件加速渲染互动游戏与眼动轨迹）、`Zustand`（状态管理 + `localStorage / IndexedDB` 离线缓存，支持训练室断网暂存回合记分）。
   - **Android 原生打包桥接**：`@capacitor/core` + `@capacitor/android`（Capacitor 6.x）。通过 `npx cap sync android` 将 Vite 构建产物一键封装为 Android 原生工程，并集成：
      - `@capacitor/status-bar` & 全屏沉浸模式（隐藏 Android 顶部状态栏与底部虚拟按键，防止孤独症儿童误触退出）；
      - `@capacitor-community/text-to-speech`（调用 Android 本地离线中文语音引擎播报标准指导语，无需外网）；
      - `@capacitor/camera` & `@capacitor/filesystem`（康复师使用 Android 平板直接拍照上传眼科转介回执或录制学生训练过程）。
   - **家长端**：当前实现为响应式移动 H5（与工作台同属 `apps/web`），与工作台共享 `packages/shared-types`；后续可替换为 Taro 小程序。
- **后端技术栈**：
   - `Node.js 20 LTS + NestJS + TypeScript`（或 `Express/Fastify + TypeScript`），内置 RESTful API、`Socket.io` 双屏实时同步服务以及静态资源托管（生产环境下由后端直接托管前端 `dist` 目录与上传文件，减少 Nginx 配置复杂度）。
- **数据库双模自适应架构（Prisma ORM：SQLite 零安装单机版 ↔ PostgreSQL 医院集群版）**：
   - 采用 **`Prisma ORM`** 统一数据访问层，通过环境变量 `DATABASE_URL` 无缝切换两种交付模式，**业务代码零修改**：
      1. **轻量免安装交付模式（默认推荐：特教学校资源教室 / 独立康复机构 / 演示一体机）**：使用 **`SQLite 3`**（`DATABASE_URL="file:./data/vmi_tis.db"`）。整个数据库就是一个本地文件，随软件安装包内置全部 13 张操作卡与常模种子数据，客户电脑**无需安装任何数据库软件**，双击启动程序即可使用，拷贝 `vmi_tis.db` 文件即可完成备份。
      2. **医院/集团高并发交付模式（妇幼保健院多科室联网 / 区域教委云平台）**：使用 **`PostgreSQL 15+` + Docker Compose**。通过项目根目录提供的 `install_server.bat` 脚本一键拉起容器化 PostgreSQL 与后端服务，自动完成建表与初始数据灌入。

```
vmi-tis-platform/
├── apps/
│   ├── api/                         # 后端：NestJS 10 + Prisma 5 + Socket.io
│   │   ├── src/
│   │   │   ├── students/            # 学生档案、筛选、Excel/CSV 批量导入
│   │   │   ├── assessments/         # 四层评估、R1 红区、R2 中止、L0–L5 定级、报告
│   │   │   ├── iep/                 # IEP 计划与 R3 晋级复核
│   │   │   ├── sessions/            # 五段式课堂、回合记分、R4 护眼锁
│   │   │   ├── schedules/           # 排课前置校验
│   │   │   ├── sop-cards/           # 13 张标准化操作卡
│   │   │   ├── workbench/           # 工作台汇总
│   │   │   ├── homework/            # 家庭作业与 7 天过期视频清理
│   │   │   ├── analytics/           # 数据画像
│   │   │   ├── gateway/             # Socket.io 双屏通道
│   │   │   └── common/              # 审计、异常过滤器、守卫、装饰器
│   │   └── data/                    # SQLite 数据库、报告与上传文件（运行时生成）
│   └── web/                         # 三端合一：React 18 + Vite 5 + Tailwind + Zustand
│       ├── src/pages/web/           # 教师端 9 页
│       ├── src/pages/student/       # 学生 Pad 4 款 Canvas 游戏 + 护眼遮罩
│       ├── src/pages/parent/        # 家长端 4 个 Tab（响应式 H5）
│       ├── src/components/          # Header / Sidebar / Toast / TrialBox
│       ├── src/hooks/               # useKeyboardShortcuts / useWebSocket
│       ├── android/                 # Capacitor 6 生成的 Android 工程
│       └── capacitor.config.ts      # 包名 com.vmitis.pad
├── packages/
│   └── shared-types/                # 前后端共享枚举、实体接口与 DTO
├── prisma/
│   └── schema.prisma                # 唯一 Schema（SQLite/PostgreSQL 双模）
├── scripts/                         # prepare-schema / generate-client / verify-taskN
├── deploy/                          # 单机 bat 与 Docker 编排
└── docs/                            # 设计文档、任务卡与进度日志
```

> **实现落点（2026-10-19）**：三端合一是 `apps/web` 的路由级终端（`/web`、`/student`、`/parent`）；家长端当前为响应式 H5，未使用 Taro 小程序；眼动仪硬件桥接（`services/eyetracker-bridge`）与多角色 RBAC 登录尚未实现，单机版用 `x-user-*` 请求头标识操作者。API 直接托管 `apps/web/dist`，浏览器打开 `http://localhost:3000` 即可使用。

> **三端入口口径（构建期终端开关）**：同一份 `apps/web` 代码由构建期变量 `VITE_TERMINAL` 决定编译成哪一端。`all`（缺省）是三端切换齐全的演示包；`student` 学生专用包默认进入 `/student`、隐藏顶部三端切换、保留“当前学生”选择器；`teacher` 默认 `/web/home`；`parent` 默认 `/parent`。空值与非法值一律按 `all`。非 `all` 模式的路由守卫只放行本终端前缀，根路径、未知路径与越权直链（学生包访问 `/web/students`、`/parent`、`/foo` 等）统一重定向回该终端首页；`teacher` / `parent` 只按需构建，暂不单独交付。三种构建共用 `capacitor.config.ts` 里的 `appId` `com.vmitis.pad` 与 `appName` `星眸智康 Pad`，学生专用包的最终拆分留后续批次。

### 2. Android 平板适配与硬件外设桥接规范（Android & Hardware Adaptation）

在开发 `apps/web` 时，按以下跨端规范实现；当前已落地 `capacitor.config.ts`（`appId` / `appName` / `webDir` / `androidScheme`）与 `android/` 工程，Kiosk 全屏、局域网扫码配网、IndexedDB 离线队列与眼动仪硬件桥接为后续增强项。

1. **Capacitor Android 全屏防误触配置（`capacitor.config.ts`）**：
   - `appId`: `"com.vmitis.pad"`，`appName`: `"星眸智康 Pad"`。
   - 当路由进入 `/student`（学生训练端）时，自动调用 Android Immersive Sticky 全屏模式，隐藏系统状态栏与底部导航条；退出学生端返回教师工作台时，需验证教师手势或四位口令（如长按右上角 3 秒或输入 `0808`），防止孤独症学生在训练中自行切出桌面。
2. **局域网服务器发现与离线容灾**：
   - Android 平板端登录页右上角提供【服务器连接设置】弹窗，支持输入机构内网主机 IP（如 `http://192.168.1.100:3000`）或扫描教师 PC 端工作台生成的二维码一键配网绑定。
   - 在感统运动室等 Wi-Fi 信号薄弱区域，康复师平板在 `SessionWorkbench` 录入的 10 回合记分优先写入本地 `IndexedDB` 队列，网络恢复后自动静默同步至后端。
3. **眼动仪硬件双模驱动抽象层（`EyeTrackerAdapter`）**：
   - **模式 A（Windows 评估训练一体机）**：前端连接本地 `ws://127.0.0.1:9800/eyetracker-stream`，接收外接 USB 红外眼动仪（60Hz）真实凝视点坐标 `(gazeX, gazeY)` 与瞳孔数据。
   - **模式 B（Android 护眼平板）**：自动检测运行环境为 Capacitor Android，平滑降级为“高精度触控笔/手指轨迹采集 + 前置摄像头头位/视线估计（可选开启 WebRTC/MediaPipe 虹膜中心检测）”，确保所有训练游戏（泡泡追追看、奇妙聚散球、森林找星星、眼动5点校准）在 Android 平板上 100% 流畅运行。

### 3. 核心业务状态机与强制算法规则（Hard Business Rules）

在编写后端服务与前端状态流转时，必须硬编码实现以下 4 条核心临床/教学业务规则：

#### 规则 R1：入案初筛红区熔断与眼科转介状态机（Red-Zone Triage State Machine）

- **状态枚举（`StudentTriageStatus`）**：
   - `PENDING_SCREENING`（待初筛）
   - `RED_ZONE_LOCKED`（红区熔断锁定：发现视力异常/屈光不正、斜视/复视、遮盖试验异常、眼球震颤等任一红区项）
   - `REFERRAL_UPLOADED`（家长/教师已上传眼科医院专科回执，待视光师复核）
   - `GREEN_ACTIVE`（绿区正常在训：初筛无红区项，或眼科回执已由视光师审核通过）
- **强制拦截逻辑**：当 `triage_status === 'RED_ZONE_LOCKED'` 或 `'REFERRAL_UPLOADED'` 时，后端排课接口 `POST /api/schedules` 与数字训练启动接口必须拒绝创建高负荷视觉训练任务（返回 `403 Forbidden: 触发先转介后训练红区保护，请先完成眼科专科处置与回执审核`），仅允许安排模块一（L0 身体稳定非视觉负荷活动）。

#### 规则 R2：电子量表自动中止（Ceiling Rule）与常模分层算法

- **自动中止规则**：在 Beery VMI-6 或 TVPS-4 在线施测过程中，每当评估师提交单题判分 `score = 0` 时，系统检查最近连续 3 道题得分是否均为 `0`。若是，立即弹出提示并自动结束当前测验；中止后保留本轮累计得分与 `totalRawScore`，会话标记为已中止并拒绝继续计分，只有显式 `reset` 才清空。
- **综合定级算法（`L0–L5`）**：唯一公式源为 `packages/shared-types/src/vmi_tis_assessment_scales_seed.ts` 的 `determineRecommendedLevelL0ToL5`；后端 `AssessmentGradingService` 只做输入映射、调用与落库，不复制公式。
   - 红区优先：学生 `triageStatus` 为 `RED_ZONE_LOCKED` / `REFERRAL_UPLOADED` 且回执未审核通过 → `L0`；种子返回的 `triageStatus` 只写入 `assessmentMetaJson`，**不回写学生 `triageStatus`**（R1 只归 `TriageService`）。
   - 身体稳定：`spsrcSensoryStable` 未达标或 `quadrupedHoldSec < 5` → `L0`。
   - 视觉效率：`NPC > 10cm`、调节灵活度 `< 6 cpm` 或 NSUCO 追视/扫视最低分 `≤ 2` → `L1`。
   - 视觉感知：TVPS-4 标准分 `< 80`，且 TVPS-4 不高于 Beery VMI/VP/MC 的运动协调表现 → `L2`。
   - 视觉运动整合：Beery VMI-6 标准分 `< 80` 或运动协调补充测验 `< 80` → `L3`。
   - 适应应用：Beery VMI-6 标准分 `< 90` 或课堂抄写正确率 `< 85` → `L4`。
   - 全部达标 → `L5`。
- **原始分与常模**：`calculateBeeryVmiNorms` / `calculateTvps4ProfileNorms` / `evaluateDemTestResult` 负责换算；原始输入、换算结果、DEM/TVPS 明细与定级分析统一写入 `AssessmentRecord.assessmentMetaJson`。老记录无该字段时，报告与页面按空处理。

#### 规则 R3：连续 3 次 ≥ 80% 晋级与动态降级判定引擎

- 每次课堂结课调用 `POST /api/sessions/:id/finish` 时，系统自动查询该学生在当前层级关键操作卡最近 3 次课的回合正确率 `accuracy_rate`（计算公式：`成功回合数 / 总回合数 * 100`）及跨材料/家庭打卡记录：
   - **晋级触发**：若 `session_1 >= 80% && session_2 >= 80% && session_3 >= 80%` 且至少包含 2 种训练材料及 1 次家庭打卡完成，自动将学生状态标记为 `PROMOTION_READY`，并在工作台首页生成【晋级复核待办】。
   - **降级保护**：若当堂课正确率 `< 50%` 或情绪配合度标记为 `畏难抗拒`，系统自动建议下一节课将提示层级退回一级（如从“言语提示”退回“手势提示”或“慢速示范”）或降低干扰密度。

#### 规则 R4：30–40 分钟五段式单元与 ≤ 15 分钟护眼防沉迷硬锁

- **五段式时间分配模板**：默认总时长 33–35 分钟，按 `Stage 1 签到唤醒 (3m)` → `Stage 2 复习联结 (4m)` → `Stage 3 核心新任务 (13m)` → `Stage 4 巩固与泛化 (9m)` → `Stage 5 强化与结束 (4m)` 驱动课堂计时器。
- **15 分钟数字护眼锁**：学生端（`student-pad`）每次启动数字训练游戏时，开启 `900 秒` 倒计时。倒计时归零时立即暂停 Canvas 游戏循环，全屏弹出不可跳过的《护眼远眺休息》遮罩层，并向教师端推送提醒，必须由教师端输入授权或等待休息结束后方可重置。

### 4. 数据库模型设计（Prisma 双模 Schema + PostgreSQL DDL）

#### 4.1 兼容 SQLite（单机免安装）与 PostgreSQL（医院服务器）的 `prisma/schema.prisma`

为了同时兼容 `sqlite` 与 `postgresql`，模型中复杂数组/对象统一采用 `String`（JSON 序列化字符串）存储，**严禁在 `schema.prisma` 中使用 `String[]` 标量数组或 `@db.Timestamptz` 等仅 PostgreSQL 支持的语法**（否则在 SQLite 免安装单机模式下执行 `npx prisma db push` 会直接报错）。切换数据库时仅需修改 `provider`（`sqlite` 或 `postgresql`）与 `.env` 中的 `DATABASE_URL`：

> **权威定义**：数据库 Schema 以仓库根目录 `prisma/schema.prisma` 为唯一事实源。本文件不再重复内嵌 Schema；字段名、关系、索引与 JSON 序列化约束一律以该文件为准。
>
> 当前 8 张表：`Student` / `AssessmentTriageReferral` / `AssessmentRecord` / `SopCard` / `IepPlan` / `TrainingSession` / `HomeworkCheckin` / `AuditLog`。
> 切换 SQLite / PostgreSQL 时，只改该文件的 `provider` 与 `DATABASE_URL`；Docker 构建通过 `scripts/prepare-schema.mjs` 生成 PostgreSQL 副本，不在仓库维护第二份 Schema。

### 5. 核心 API 与双屏 WebSocket 接口契约

#### 5.1 RESTful API 路由清单

| 方法与路由路径 | 功能说明 | 关键请求参数 / 业务逻辑校验 |
| --- | --- | --- |
| `GET /api/health` | 健康检查 | 返回服务名、数据库模式与运行时长 |
| `GET /api/workbench/summary` | 工作台首页数据 | 今日课表、活跃学生、待晋级、待审核转介、L0–L5 分布 |
| `GET /api/students` | 学生列表与筛选 | `level` / `triageStatus` / `keyword` / 分页 |
| `POST /api/students` | 新生入案建档 | 默认 `PENDING_SCREENING`，自动生成 `VMI-<年份><序号>` 学号 |
| `GET/PATCH/DELETE /api/students/:id` | 学生详情 / 更新 / 删除 | 详情含转介、评估、IEP、课次、家庭作业 |
| `POST /api/students/import-excel` | Excel/CSV 批量导入 | `ExcelJS` 解析；失败行返回 `errors`；单次 50 行 < 5 秒 |
| `POST /api/assessments/triage` | 初筛与红区核查 | 请求带 `redZoneCodes`（种子编码）与 `behaviorItems`（文本）；服务端把编码与「关键字 + 阈值」两条路径取并集重算，未知编码返回 400，命中即 `RED_ZONE_LOCKED` 并生成转介单 |
| `POST /api/assessments/referral-upload` | 上传眼科回执 | 状态 → `REFERRAL_UPLOADED` |
| `POST /api/assessments/referral-audit` | 审核回执 | `APPROVED` → `GREEN_ACTIVE`；`REJECTED` → `RED_ZONE_LOCKED` |
| `GET /api/assessments/referrals/:studentId` | 转介列表 | 按学生返回转介单与审核状态 |
| `POST /api/assessments/scale-score` | 逐题判分 | R2：连续 3 题 0 分返回 `shouldTerminate=true`，并返回 `consecutiveZeroCount` / `ceilingItemIndex` / `totalRawScore`；`reset` 重置会话 |
| `POST /api/assessments/records` | 保存评估记录 | 写入原始分/常模换算/`assessmentMetaJson`；L0–L5 由种子纯函数计算并回写学生层级 |
| `GET /api/assessments/:studentId/records` | 评估记录分组 | 按 `BASELINE` / `STAGE_8W` / `TRANSITION` 分组 |
| `POST /api/assessments/:id/generate-report` | 生成评估报告 | 当前输出 HTML 报告并返回 `/api/reports/<id>.html` |
| `POST /api/iep-plans` | 创建 IEP | 校验数字上限 0–15 分钟；`selectedCards` / `weeklySchedule` 序列化为 JSON |
| `GET/PATCH /api/iep-plans` | 查询 / 更新 IEP | 支持按学生过滤、审核人与状态更新 |
| `POST /api/iep-plans/:id/approve` | 审核 IEP | 写入 `approvedBy` / `approvedAt` |
| `GET /api/promotions/:studentId/check` | 晋级条件检查 | R3：最近 3 次课 ≥80%、跨 ≥2 种材料、≥1 次家庭打卡 |
| `POST /api/promotions/:studentId/approve` | 晋级审批 | 层级 +1，`promotionStatus` 回到 `IN_PROGRESS` |
| `POST /api/sessions` | 开始训练课 | 自动匹配当前层级操作卡；无 L4 专属卡时向下取 L3 |
| `GET /api/sessions` / `GET /api/sessions/:id` | 课次列表 / 详情 | 含学生、操作卡、回合 JSON |
| `PATCH /api/sessions/:id/stage` | 五段式环节切换 | 广播 `SESSION_STAGE_CHANGED` |
| `POST /api/sessions/:id/trial` | 单回合记分 | 追加 `pass/fail`、提示层级、材料与时长；实时重算正确率 |
| `POST /api/sessions/:id/digital` | 数字时长同步 | 返回累计秒数与剩余额度 |
| `POST /api/sessions/:id/digital-start` | 数字训练前置校验 | R4：≥900 秒返回 403 + `remainingQuotaSec=0` |
| `POST /api/sessions/:id/digital-reset` | 教师授权解锁 | 重置数字时长并记录审计 |
| `POST /api/sessions/:id/finish` | 结课与晋级检查 | 返回结课记录与 R3 检查结果 |
| `POST /api/schedules` | 排课前置校验 | 红区学生返回 403 `RED_ZONE_LOCKED`；绿区返回 IEP 周课表检查 |
| `GET /api/sop-cards` | 操作卡库 | 支持层级、模块、关键词筛选 |
| `GET /api/sop-cards/code/:cardCode` | 按编码取卡 | 返回单张操作卡 |
| `GET/POST /api/homework-checkins` | 家庭作业列表 / 布置 | 默认 `PENDING`，建议时长 `durationMin` |
| `POST /api/homework-checkins/:id/checkin` | 家长打卡 | 状态 → `COMPLETED`，设置 `scheduledDeleteAt = now + 7d` |
| `POST /api/homework-checkins/:id/reply` | 教师点评 | 写入 `teacherReply` / `repliedAt` |
| `POST /api/homework-checkins/:id/parent-message` | 家长留言 | 写入 `parentNote` |
| `POST /api/homework-checkins/clean-expired-videos` | 清理过期视频 | 删除本地文件并标记 `videoDeletedAt`，保留文字 |
| `GET /api/analytics/overview` | 数据总览 | 学生数、课次、平均正确率、层级/分流分布、最近课次 |
| `GET /api/analytics/student/:id` | 学生画像 | 六维雷达、正确率趋势、数字时长趋势、定级历史 |
| `GET /api/audit-logs` | 审计日志 | 按动作 / 目标类型 / 目标 ID / 分页过滤 |

#### 5.2 双屏协同与眼动仪 60Hz WebSocket 协议

1. **教师端与学生端（一体机 / Android Pad）双屏同步频道（Socket.io 默认路径 `/socket.io`，含医院内网 Polling 降级保底）**：
   - **传输降级配置（应对医院内网防火墙拦截 WebSocket）**：服务端与客户端 `Socket.io` 必须显式配置 `transports: ['websocket', 'polling']`，优先使用低延迟 WebSocket，当遇到医院内网代理或防火墙阻断 Upgrade 握手时，自动无缝降级为 HTTP Long-Polling，确保投屏控制 100% 可达。
   - 教师端点击“投屏学生端”或切换课堂环节时发送：

      ```
      {
        "event": "SWITCH_PAD_TASK",
        "studentId": "stu1",
        "gameMode": "bubble",
        "difficulty": { "speed": 1.8, "trajectory": "figure8", "promptFade": "verbal" },
        "remainingEyeQuotaSec": 755
      }
      ```
   - 学生端完成一轮互动或触发 15 分钟锁屏时回传：

      ```
      {
        "event": "PAD_TRIAL_COMPLETED",
        "studentId": "stu1",
        "gameMode": "bubble",
        "accuracyRate": 0.88,
        "avgReactionTimeMs": 640,
        "smoothPursuitGain": 0.89
      }
      ```
   - 教师端跨窗口选学生同步（`SWITCH_STUDENT`，教师 `/web` → 学生 `/student` 窗口或平板）：

      ```
      {
        "event": "SWITCH_STUDENT",
        "studentId": "stu1"
      }
      ```

   - 角色与回执：只接受教师端发送，成功 ack `{ "ok": true }`；学生端发送返回 `{ "ok": false, "error": "forbidden" }`；空 `studentId` 返回 `{ "ok": false, "error": "invalid_payload" }`。
   - 房间：服务端广播到 `role:student`，不按目标 `student:<id>` 发送——学生连接时按当时的学生加入 `student:<id>`，切到新学生后才换房，按目标房间发会收不到。`student:<id>` 继续只服务 `SWITCH_PAD_TASK` 与训练事件；教师 socket 只进 `role:therapist`。
   - 学生端收到后把当前学生切到 `studentId` 并重载课次、红区状态与 R4 数字额度；学生端自身的选择器只改本窗口当前学生、不回推教师；最后一次选择生效。未知学生 id 由学生端请求 404 提示，不阻断其他窗口。

   - 评估双屏出示（`ASSESSMENT_CARD_CHANGE`，教师 `/web/assessment` 第 4 步 → 学生 `/student` 窗口或平板）：

      ```
      {
        "event": "ASSESSMENT_CARD_CHANGE",
        "studentId": "stu1",
        "action": "show",
        "cardType": "tvps4",
        "tvpsSubtestCode": "MEM",
        "tvpsItemIndex": 0,
        "tvpsPhase": "target",
        "tvpsRemaining": 5
      }
      ```

   - 三种卡：`beery`（`beeryItemNumber` 题号 1–30）、`tvps4`（`tvpsSubtestCode` / `tvpsItemIndex` / `tvpsPhase` = `target`|`options` / `tvpsRemaining` 秒）、`dem`（`demTest` = `A`|`B`|`C`）；收回发 `{ "action": "hide", "cardType": null }`。只传索引与阶段，学生端按种子常量自行渲染，不传题目内容。
   - 角色与回执：只接受教师端发送，成功 ack `{ "ok": true }`；学生端发送返回 `{ "ok": false, "error": "forbidden" }`；空 `studentId` 或 `show` 带非法 `cardType` 返回 `{ "ok": false, "error": "invalid_payload" }`。
   - 房间：与 `SWITCH_STUDENT` 一致广播 `role:student`；学生端按 `studentId` 过滤，未知 id 不查存在性（广播照发，无人显示）。
   - 教师端：第 4 步每张卡一个「远程出示」，出示后切题 / 翻子测验 / 换矩阵 / TVPS 每秒倒计时自动重发；「收回评估卡」发 `hide`；离开第 4 步自动收回。TVPS 记忆呈现由教师端计时，到 0 推进到 `options` 再发。
   - 学生端：收到 `show` 设卡并进入评估画面（训练计时与数字额度同步暂停），收到 `hide` 清卡回训练；只读渲染（隐藏题号 / 子测验 / 矩阵切换），不自行改阶段、不自动计分。本机「评估出示」仍可用，与远程卡最后一次写入生效；收到 `SWITCH_STUDENT` 或 `SWITCH_PAD_TASK` 时清卡回训练。
2. **本地非接触式眼动仪数据流（`/ws/eyetracker-stream`，60Hz）**：
   - 数据帧结构：`{ "timestamp": 1760515200120, "gazeX": 512.4, "gazeY": 384.1, "leftPupilMm": 4.1, "rightPupilMm": 4.1, "headMovementFlag": false, "validity": 1 }`。

### 6. 客户现场零门槛交付方案（一键启动脚本与 Docker 编排规范）

请在工程 `deploy/` 目录下直接生成以下两个交付脚本，彻底解决客户现场安装数据库的痛点：

#### 6.1 方案 A：学校/单机一体机“零安装”一键启动脚本（`deploy/start_standalone.bat`，基于 SQLite）

客户无需安装 PostgreSQL 或 Docker，解压交付包后双击即可运行：

已实现文件：`deploy/start_standalone.bat`（配套 `deploy/run_api.bat`）。关键行为：

- 检查 Node.js 与 3000 端口占用；
- 首次运行自动安装依赖并构建后端与前端；
- 执行 `prisma db push` 建库，再用 `npm run db:seed` 导入 13 张操作卡与 6 名学生；
- 后端健康检查通过后打开 `http://localhost:3000`（API 直接托管 `apps/web/dist`，无需另起前端服务）；
- 退出主窗口时停止 API 进程。

#### 6.2 方案 B：医院/多科室联网版 Docker 一键部署编排（`deploy/docker-compose.yml`，基于 PostgreSQL）

医院信息科只需执行 `docker compose up -d`，即可在 1 分钟内自动完成 PostgreSQL 15 安装、建表、种子数据初始化与 Web 服务启动：

已实现文件：`deploy/docker-compose.yml`（配套 `apps/api/Dockerfile`）。关键行为：

- PostgreSQL 15 与 API 双服务，数据库健康检查通过后启动 API；
- 构建期由 `scripts/prepare-schema.mjs --target postgresql` 生成 PostgreSQL 版 Schema，仓库不维护第二份 Schema；
- 构建期同时编译 `apps/web`，API 直接托管前端 `dist`；
- 启动时执行 `prisma db push` 与 Seed，再启动 API；
- API 暴露 3000 端口，数据持久化到 `pgdata` 卷。

### 7. 多模型协同研发流水线（Claude Opus 总体规划 → DeepSeek 编码实施 → ChatGPT 审查把关）

针对“**Claude Code (Opus) 负责总体架构与任务拆解 → DeepSeek 负责高性价比逐模块编码实施 → ChatGPT (Codex/o3/Sol) 负责代码与临床合规审查**”的三模型协同模式，建议在工程根目录下建立 `docs/ai-pipeline/` 目录，通过**标准化契约文件**实现三个模型之间的无缝交接，避免上下文丢失。

#### 7.1 三模型职责边界与交接产物矩阵

| 阶段与角色 | 选用模型 | 核心职责（做什么 / 不做什么） | 输入文件 | 强制输出产物（交接给下一环节） |
| --- | --- | --- | --- | --- |
| **Step 1：总架构师与任务拆解（Planner）** | **Claude Code (Opus)** | **只做架构设计与接口契约，不写海量业务实现代码**。负责初始化目录树、定稿双模 `schema.prisma`、定义前后端共享 TypeScript 类型契约，并将全栈开发拆解为 DeepSeek 可单次独立完成的 6 个原子任务卡 | `vmi_tis_prototype.html` + `VMI-TIS_软件需求规格说明书与详细设计.md` | 1. `prisma/schema.prisma` 2. `packages/shared-types/index.ts` 3. `docs/IMPLEMENTATION_TASKS.md`（含6个原子任务卡） |
| **Step 2：主程序员与模块实施（Builder）** | **DeepSeek (V3 / R1 / Coder)** | **严格按任务卡与类型契约写全量业务代码**（零省略号、零 TODO）。按任务卡顺序依次实现后端 API、状态机、13张操作卡种子数据、React 三端页面、盲操快捷键与 Canvas 游戏 | `docs/IMPLEMENTATION_TASKS.md` + `packages/shared-types/index.ts` + `vmi_tis_prototype.html` | 各模块完整 `.ts` / `.tsx` 源码文件、单元测试与 `deploy/` 部署脚本 |
| **Step 3：首席质量官与合规审查（Reviewer）** | **ChatGPT (Sol / o3 / Codex)** | **静态与逻辑双重审计**。对照《SRS V2.1》与 `vmi_tis_prototype.html` 逐项核查 DeepSeek 产出的代码是否违反 SQLite 兼容性、是否遗漏红区熔断/连续3次≥80%晋级/15分钟锁屏，并输出可直接喂回给 DeepSeek 的修复补丁指令 | DeepSeek 编写的源码 + `VMI-TIS_软件需求规格说明书与详细设计.md` | `docs/CODE_REVIEW_REPORT.md`（含 Blocker 缺陷定位与修复 Diff 指令） |

#### 7.1.1 附：`vmi_tis_prototype.html`（3075行 V2.1版）真实 DOM 与 JS 函数行号索引表（防幻觉基准）

> **重要纠偏说明**：外部审查报告第 3.2 节中曾误写 `nextStageSession()`、`playBubbleGame()` 等不存在的函数名。Claude Opus 拆解任务卡与 DeepSeek 迁移代码时，**必须以本表中的真实 ID、真实函数名与精确行号为准**：

| 模块归属 | 原型 DOM 容器 ID & 行号 | 原型真实 JS 函数名 & 精确行号 | 对应迁移目标（React 组件 / 后端接口） |
| --- | --- | --- | --- |
| **全局种子与本地持久化** | 顶栏切换器 `L60–L106` | `STUDENT_DB` (`L1741`), `LIB_CARDS` (`L1847`), `AUDIT_LOGS` (`L1866`), `persistStateToStorage()` (`L1890`) | `prisma/seed.ts` + Zustand Store |
| **终端一：工作台首页** | `#web-page-home` (`L174–L389`) | `switchTerminal()` (`L1948`), `switchWebPage()` (`L1977`), `changeActiveStudent()` (`L2017`) | `views/workbench/WorkbenchHome.tsx` + `GET /api/workbench/summary` |
| **终端一：学生档案与Excel导入** | `#web-page-students` (`L392–L464`) | `renderStudentListTable()` (`L2034`), `saveNewStudent()` (`L2093`), `downloadImportTemplate()` (`L2937`), `handleBatchImportFile()` (`L2951`) | `views/workbench/StudentArchive.tsx` + `POST /api/students/import-excel` |
| **终端一：四层评估与红区熔断** | `#web-page-assessment` (`L467–L721`) | `isStudentRedZoneLocked()` (`L1928`), `calculateAutoLevel()` (`L2164`), `scoreCurrentItem()` (`L2192`), `updateTriageRedStatus()` (`L2235`), `approveReferralReceipt()` (`L2259`) | `views/workbench/AssessmentCenter.tsx` + 规则 R1/R2 后端接口 |
| **终端一：IEP 制定与周课表** | `#web-page-iep` (`L724–L876`) | `approvePromotionToL3()` (`L2275`) | `views/workbench/IepScheduler.tsx` + `POST /api/iep-plans` |
| **终端一：课堂记分台与盲操快捷键** | `#web-page-session` (`L879–L1042`) | `selectSessionStage()` (`L2292`), `renderTrialBoxes()` (`L2345`), `recordTrialResult()` (`L2368`), `finishClassSession()` (`L2377`), `keydown 盲操监听` (`L3036–L3064`) | `views/workbench/SessionWorkbench.tsx` + 规则 R3 结课晋级接口 |
| **终端一：数据画像与眼动热力图** | `#web-page-analytics` (`L1045–L1112`) | `renderSaasCharts()` (`L2406`), `drawSaasGazeCanvases()` (`L2477`), `replayEyeHeatmaps()` (`L2541`) | `views/workbench/AnalyticsDashboard.tsx` |
| **终端一：家校批改、课程库与审计** | `#web-page-homeschool` (`L1115`), `#web-page-library` (`L1213`), `#web-page-settings` (`L1237`) | `replyHomework()` (`L2547`), `renderLibCards()` (`L2568`), `speakCue()` (`L2879`), `renderAuditLogsTable()` (`L1912`), `triggerExpiredVideoClean()` (`L3030`) | `HomeSchoolView.tsx`, `SopLibraryView.tsx`, `SettingsAuditView.tsx` |
| **终端二：学生端 4 款游戏与护眼锁** | `#terminal-view-student` (`L1317–L1491`) | `switchStudentPadGame()` (`L2597`), `initPadBubbleLoop()` (`L2631`), `drawPadBrockCanvas()` (`L2729`), `initPadStarGrid()` (`L2786`), `calibPointClick()` (`L2821`), `toggleEyeRestOverlay()` (`L2827`) | `views/student-pad/*` + 规则 R4 900秒护眼硬锁 |
| **终端三：家长端微信小程序** | `#terminal-view-parent` (`L1496–L1691`) | `switchMpTab()` (`L2839`), `submitMiniProgramCheckin()` (`L2852`), `sendMpChatMessage()` (`L2864`) | `apps/parent-miniprogram` + `POST /api/mp/checkins` |

#### 7.2 第一棒：给 Claude Code (Opus) 的【总体架构规划与任务卡拆解】Prompt

```
你现在担任 VMI-TIS（孤独症学生视觉运动整合训练干预系统）的首席软件架构师（Planner）。
请完整读取项目根目录下的：
1. `VMI-TIS_软件需求规格说明书与详细设计.md`（V2.1 工程规范）
2. `vmi_tis_prototype.html`（完整 3076 行三端交互原型，务必使用文件搜索或分段完整读取，切勿只读前300行）

【你的任务边界】：
本项目的具体业务代码将交由 DeepSeek 逐模块编写，并由 ChatGPT 进行合规审查。因此你【不需要】直接编写全部前端页面和后端业务实现，而是要完成最高质量的“顶层架构锚定与原子级任务拆解”，确保 DeepSeek 在编码时不会跑偏或产生幻觉。

请依次生成并落盘以下 3 个核心工程基座文件：
1. `prisma/schema.prisma`：
   - 严格采用《SRS V2.1》第 4.1 节的双模兼容设计（默认 `provider = "sqlite"`，无缝兼容 `postgresql`）。
   - 严禁使用 SQLite 不支持的 `String[]` 标量数组或原生 `Json` 类型（统一使用 JSON 序列化 `String` 字段）。
   - 必须完整包含 `Student`、`AssessmentTriageReferral`、`AssessmentRecord`（使用 Beery VMI-6 / TVPS-4 / MVPT-4 / DEM / NPC / NSUCO，严禁误用 DTVP-3；当前 schema 保留 `mvpt3Std` 历史列）、`SopCard`、`IepPlan`、`TrainingSession`、`HomeworkCheckin`（含7天视频自动清理字段）和 `AuditLog`（WHO/WHEN/WHAT 医疗审计表）共 8 张表。
2. `packages/shared-types/src/index.ts`：
   - 定义前后端 100% 共享的 TypeScript 接口、枚举（`StudentTriageStatus`、`CapabilityLevel L0-L5`、`PromptLevel`）、API 请求/响应 DTO，以及 Socket.io 双屏同步事件负载（`SWITCH_PAD_TASK`、`PAD_TRIAL_COMPLETED`、`eyetracker-stream`）。
3. `docs/IMPLEMENTATION_TASKS.md`（给 DeepSeek 的原子级编码说明书）：
   - 将全栈工程拆解为 6 个互不重叠、输入输出明确的 Task Card（Task 1: 后端基础设施与13张操作卡 Seed；Task 2: 红区熔断 R1、量表自动定级与连续3题0分中止 R2、连续3次≥80%晋级 R3、AuditLog 与7天视频清理 Cron；Task 3: 教师 Web 工作台前5页与 Excel 批量导入；Task 4: 课堂33分钟五段式记分台与盲操键盘快捷键 `Space/1/0/↑/↓/N`；Task 5: 学生端 4 款 Canvas 游戏、眼动校准与 15 分钟强制锁屏 R4；Task 6: 家长端小程序/H5 与 Capacitor Android APK + SQLite 一键启动脚本）。
   - 每个 Task Card 必须明确列出：要创建的文件路径清单、引用的 `shared-types` 接口名、对应的 `vmi_tis_prototype.html` 行号范围，以及给 ChatGPT 验收的测试断言（Acceptance Criteria）。
```

#### 7.3 第二棒：给 DeepSeek 的【逐模块具体编码实施】Prompt 模板

拿到 Claude Opus 生成的 `docs/IMPLEMENTATION_TASKS.md` 和 `packages/shared-types/src/index.ts` 后，每次向 DeepSeek 投递一个 Task Card：

```
你现在担任 VMI-TIS 系统的高级全栈开发工程师（Builder）。
顶层架构师（Claude Opus）已经完成了数据库 Schema 与共享 TypeScript 类型定义。请读取以下基准文件：
1. `prisma/schema.prisma` 与 `packages/shared-types/src/index.ts`（严格遵守其中的字段名与 DTO 类型，不得自行改名）
2. `docs/IMPLEMENTATION_TASKS.md` 中的【Task X】（本次仅实施该任务卡要求的文件）
3. `vmi_tis_prototype.html` 中对应的 DOM 结构、Tailwind 样式类（深青色 `#0F4C5C` 护眼主题）与交互逻辑函数

【编码硬性约束】：
1. **100% 完整代码输出**：严禁出现 `// ...其余代码省略`、`// TODO: 实现逻辑` 或占位符，每个函数必须写出完整的生产级实现。
2. **临床与工程规则硬编码**：
   - 若涉及数据库 JSON 字段读写（如 `redZoneItemsJson`、`trialsDetailJson`、`radarSixDimsJson`），在 Service 层统一封装 `JSON.parse / JSON.stringify` 强类型转换，确保 SQLite 与 PostgreSQL 双模零报错运行。
   - 若涉及红区熔断（规则 R1）：当 `triageStatus !== 'GREEN_ACTIVE'` 时，排课与启动训练接口必须抛出 `403 Forbidden`，前端点击“去上课/投屏”必须弹出红区拦截提示并跳转转介回执页。
   - 若涉及课堂记分台：必须绑定 `keydown` 盲操快捷键（`Space`/`1` 记成功、`0` 记失误、`ArrowUp`/`ArrowDown` 调提示等级、`N` 切换下一环节），并忽略输入框聚焦状态。
   - 若涉及 Socket.io 双屏同步：客户端与服务端必须显式配置 `transports: ['websocket', 'polling']`，防止医院内网防火墙拦截。

请直接输出【Task X】下所有目标文件的完整代码及启动验证命令。
```

#### 7.4 第三棒：给 ChatGPT (Sol / o3 / Codex) 的【代码与临床合规审查】Prompt 模板

每当 DeepSeek 完成一个阶段的代码，将该阶段代码连同《SRS V2.1》交给 ChatGPT 进行独立把关：

```
你现在担任 VMI-TIS 医疗与特教康复软件的首席质量审查官（Reviewer）。
架构师（Claude Opus）制定了《VMI-TIS_软件需求规格说明书与详细设计.md》(V2.1) 与 `docs/IMPLEMENTATION_TASKS.md`，开发工程师（DeepSeek）完成了当前模块的代码编写。

请以最严苛的工程与医疗合规标准，对刚刚提交的代码进行逐文件审查，重点排查以下 6 类高危问题：
1. **双模数据库兼容性审查**：代码中是否存在任何破坏 SQLite 免安装模式运行的语法（如未序列化的数组写入、PostgreSQL 专有 SQL 函数）？
2. **四大临床强规则（R1–R4）穿透审查**：
   - R1 红区熔断：是否在后端 Controller/Service 层和前端路由跳转处都做了硬拦截？还是仅仅改了个文字标签？
   - R2 自动中止与定级：量表施测是否真实判断了“连续 3 题 0 分自动中止”？定级算法是否严格按照 L0(身体稳定) → L1(NPC>10cm/双面镜<6cpm/NSUCO≤2) → L2(TVPS-4<80) → L3(Beery VMI-6<80) 优先级计算？
   - R3 晋级与降级：结课接口是否真实查询了最近 3 次课正确率 `>= 80%` 并更新 `promotionStatus = 'PROMOTION_READY'`？`< 50%` 时是否返回了降级提示建议？
   - R4 护眼硬锁：学生端是否真实实现了 900 秒（15分钟）强制暂停 Canvas 并弹出需教师解锁的护眼遮罩？
3. **四大工程优化项核验**：盲操键盘快捷键（`Space/1/0/↑/↓/N` 事件解绑与输入框防冲突）、`SheetJS` Excel 批量导入异常捕获、`AuditLog`（WHO/WHEN/WHAT）写入完整性、7 天前打卡视频定时物理清理（保留文字记录）是否全部真实生效？
4. **原型 1:1 还原度审查**：对比 `vmi_tis_prototype.html`，检查是否有缺失的图表（Chart.js 六维雷达图、眼动前后对比 Canvas 热力图）或断链按钮。

【审查报告输出格式】：
- **结论评级**：`PASS（允许进入下一 Task）` 或 `BLOCK（需退回 DeepSeek 修复）`
- **缺陷清单**：按 `[Blocker / Major / Minor]` 分级列出具体文件名、行号与原因。
- **给 DeepSeek 的一键修复指令（Fix Prompt）**：若存在缺陷，请在报告末尾直接生成一段可复制给 DeepSeek 的精准修复 Prompt（包含需要替换的代码片段说明）。
```

### 8. 附：单模型端到端 5 阶段执行指令（备用）

在实际启动编码时，您只需将本文档与 `vmi_tis_prototype.html` 放入空项目根目录，按以下 5 个阶段依次复制指令发送给 Claude Code 或 ChatGPT Codex：

- **Stage 1（初始化 Monorepo、双模数据库与核心后端）**：

   > “请读取《VMI-TIS 软件需求规格说明书 V2.0》与 `vmi_tis_prototype.html`，初始化 Monorepo 工程。使用 NestJS + Prisma 建立后端服务，默认启用 SQLite 免安装模式（`file:./data/vmi_tis.db`）并兼容 PostgreSQL，编写 `seed.ts` 录入全部 13 张标准化训练操作卡与 6 名示例学生完整档案，实现红区熔断转介状态机（规则 R1）、电子量表连续3题0分中止（规则 R2）及连续3次≥80%晋级判定 API（规则 R3）。”
- **Stage 2（构建终端一：机构/教师端响应式工作台，支持 PC 与康复师平板）**：

   > “请在 `apps/client-app` 中使用 `React 18 + Vite + TypeScript + Tailwind CSS + Chart.js` 严格对照 `vmi_tis_prototype.html` 中 `terminal-view-web` 的视觉风格（深青色 `#0F4C5C` 低刺激医疗护眼主题）与 8 个左侧导航页面，完整实现工作台首页、学生档案表、双屏电子量表施测台、IEP排课日历、33分钟五段式课堂回合记分台（含离线缓存队列）及个人能力画像页。”
- **Stage 3（构建终端二：学生端互动训练与双模眼动软件）**：

   > “请对照 `vmi_tis_prototype.html` 中 `terminal-view-student` 实现学生全屏训练端，包含眼动 5 点小飞船校准、泡泡追追看（8字平滑追踪 Canvas 与眼动光圈）、奇妙聚散球（生理性复视交叉线模拟）、森林找星星（图形背景分离）以及 15 分钟硬件级护眼防沉迷锁屏组件（规则 R4），并通过 `EyeTrackerAdapter` 同时支持 Windows 本地 60Hz 眼动仪 WebSocket 数据流与 Android 平板触控模式。”
- **Stage 4（构建终端三：家长端微信小程序/H5 与全链路联调）**：

   > “请对照 `vmi_tis_prototype.html` 中 `terminal-view-parent` 实现家长端四页面（今日任务视频打卡、真人示范微课、成长报告、医教沟通群），并与教师端工作台打通家庭作业一键派发与打卡批改接口。”
- **Stage 5（封装 Android 原生 APK 与客户现场一键交付脚本）**：

   > “请在 `apps/client-app` 中集成 Capacitor 6（`@capacitor/android`、`@capacitor/status-bar`、`@capacitor-community/text-to-speech`），配置学生训练端全屏 Kiosk 沉浸模式与局域网服务器扫码配网弹窗，生成可直接在 Android Studio 编译 `.apk` 的 `android/` 目录；同时在 `deploy/` 目录下生成 SQLite 单机免安装启动脚本 `start_standalone.bat` 与医院服务器版 `docker-compose.yml`。”