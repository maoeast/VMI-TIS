# ChatGPT 审查官验收手册 - VMI-TIS 系统

**生成时间：** 2026-10-19  
**审查频率：** 每周五验收一次  
**审查周期：** 6 周（Week 1 - Week 6）

---

## 一、审查官职责与权限

### 1.1 职责范围
你是 VMI-TIS 系统的首席质量官（Reviewer），负责审查 DeepSeek 编写的代码是否符合：
1. **契约一致性**：字段名、类型与 `prisma/schema.prisma` / `shared-types/index.ts` 完全匹配
2. **业务规则完整性**：四大强制规则（R1-R4）的实现逻辑正确无误
3. **代码质量标准**：无省略号、无 TODO、注释完整、错误处理规范
4. **数据库兼容性**：SQLite / PostgreSQL 双模无缝切换
5. **原型还原度**：UI 样式与 `vmi_tis_prototype.html` 保持一致

### 1.2 审查权限
- ✅ **允许：** 指出代码缺陷、要求修复、提出优化建议
- ✅ **允许：** 拒绝验收不合格的任务卡，要求重新实现
- ❌ **禁止：** 直接修改 DeepSeek 的代码（除非紧急修复 Blocker）
- ❌ **禁止：** 修改契约文件（`prisma/schema.prisma` / `shared-types/index.ts`）

---

## 二、审查基准文件（必读）

### 2.1 契约文件（Claude Opus 已生成）
1. **`prisma/schema.prisma`**（10,360 字符）
   - 8 张表完整定义
   - SQLite/PostgreSQL 双模兼容设计
   - 严禁使用 `String[]` 标量数组或 `@db.Timestamptz`

2. **`packages/shared-types/src/index.ts`**（10,353 字符）
   - 12 个枚举类型（StudentTriageStatus / CapabilityLevel / PromptLevel 等）
   - 8 个数据库实体接口
   - 10 个 API DTO

3. **`docs/IMPLEMENTATION_TASKS.md`**（28,652 字符）
   - 6 张原子级任务卡
   - 每张任务卡末尾附带验收标准

### 2.2 需求规格文档
1. **`docs/vmi_tis.md`**（需求规格说明书 V2.1，424 行）
   - 第 191-219 行：四大强制规则（R1-R4）
   - 第 223-230 行：数据库 Schema 权威指向（唯一事实源为 `prisma/schema.prisma`）
   - 第 320-335 行：原型真实 DOM 与 JS 函数行号索引表

2. **`docs/vmi_tis_prototype.html`**（完整原型，3076 行）
   - 视觉还原基准：所有 UI 必须与此保持一致

---

## 三、每周验收检查点

### Week 1 验收（Task 1 - 后端基础设施）

#### 验收时间：第 1 周周五
#### 验收内容：NestJS 工程 + Seed 脚本 + 双模部署脚本

#### 检查清单（8 项）
```bash
# 1. 数据库文件生成
cd apps/api
ls ./data/vmi_tis.db
# 预期：文件存在

# 2. Prisma Studio 显示 13 张操作卡
npx prisma studio --schema ../../prisma/schema.prisma
# 预期：sop_cards 表有 13 条记录，字段名与 schema.prisma 完全匹配

# 3. Prisma Studio 显示 6 名示例学生
# 预期：students 表有 6 条记录，包含：
# - 林小宇（L2，PROMOTION_READY）
# - 陈果果（L1，GREEN_ACTIVE）
# - 张梓轩（L1，RED_ZONE_LOCKED）
# - 王梓涵（L0，GREEN_ACTIVE）
# - 刘诺一（L3，PROMOTION_READY）
# - 周子墨（L4，GREEN_ACTIVE）

# 4. start_standalone.bat 脚本存在
cat ../../deploy/start_standalone.bat | grep "星眸智康"
# 预期：包含完整启动脚本内容

# 5. docker-compose.yml 存在
cat ../../deploy/docker-compose.yml | grep "postgres"
# 预期：包含 PostgreSQL 15 服务定义

# 6. Seed 脚本数据源正确性检查
# 打开 apps/api/src/prisma/seed.ts
# 检查操作卡数据是否从原型 L1847-1861 提取
# 检查学生数据是否从原型 L1741-1844 提取

# 7. JSON 序列化正确性
npx prisma studio --schema ../../prisma/schema.prisma
# 选择 sop_cards 表中的任意一条记录
# 检查 materialsJson 字段是否为 JSON 字符串格式
# 例如："[\"镊子\",\"珠子\"]"（不是数组类型）

# 8. 文件顶部注释完整性
head -5 apps/api/src/prisma/seed.ts
# 预期：包含来源注释，例如：
# /**
#  * VMI-TIS 系统 Seed 脚本
#  * 数据源：vmi_tis_prototype.html L1847-1861
#  */
```

#### 常见缺陷（拒绝验收理由）
- ❌ `materialsJson` 字段存储为数组类型（应为 JSON 字符串）
- ❌ 操作卡数量不足 13 张
- ❌ 学生状态硬编码错误（张梓轩应为 `RED_ZONE_LOCKED`，而非 `GREEN_ACTIVE`）
- ❌ Seed 脚本无来源注释

#### 修复建议模板
```markdown
【Week 1 验收不通过】Task 1 - 后端基础设施

缺陷清单：
1. ❌ `sop_cards` 表中 `materialsJson` 字段存储为数组类型，而非 JSON 字符串
   - 期望：`"[\"镊子\",\"珠子\"]"`（String 类型）
   - 实际：`["镊子", "珠子"]`（Array 类型）
   - 违反契约：`prisma/schema.prisma` L102 定义为 `String`

2. ❌ 学生"张梓轩"状态应为 `RED_ZONE_LOCKED`，实际为 `GREEN_ACTIVE`
   - 依据：原型 L1776-1792（张梓轩条目）定义其为红区示例学生

修复指令：
1. 打开 `apps/api/src/prisma/seed.ts`
2. 修改第 X 行：`materialsJson: ['镊子', '珠子']` → `materialsJson: JSON.stringify(['镊子', '珠子'])`
3. 修改第 Y 行：`triageStatus: 'GREEN_ACTIVE'` → `triageStatus: 'RED_ZONE_LOCKED'`
4. 重新执行：`npm run db:push -- --force-reset && npm run db:seed`
5. 重新验收

预计修复时间：30 分钟
```

---

### Week 2 验收（Task 2 - 学生档案 + 红区熔断）

#### 验收时间：第 2 周周五
#### 验收内容：RESTful API + 规则 R1 实现

#### 检查清单（10 项）

##### A. API 端点完整性
```bash
# 1. 启动开发服务器
cd apps/api
npm run start:dev

# 2. 测试 POST /api/students（创建学生）
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name":"审查测试学生",
    "birthDate":"2018-03-15",
    "schoolScene":"测试机构",
    "primaryTherapistId":"test_therapist"
  }'
# 预期：返回完整 Student 对象，包含自动生成的 studentCode（如 VMI-2026007）

# 3. 测试 GET /api/students（列表查询）
curl http://localhost:3000/api/students
# 预期：返回学生列表（至少 7 条：6 条 Seed + 1 条新建）

# 4. 测试 GET /api/students?level=L2&triageStatus=GREEN_ACTIVE（筛选查询）
curl "http://localhost:3000/api/students?level=L2&triageStatus=GREEN_ACTIVE"
# 预期：仅返回符合条件的学生（林小宇、王浩宇）

# 5. 测试 Excel 批量导入
# 创建测试 Excel 文件（50 行学生数据）
curl -X POST http://localhost:3000/api/students/import-excel \
  -F "file=@test_students.xlsx"
# 预期：返回 {"success": true, "imported": 50, "failed": 0}
# 耗时 < 5 秒
```

##### B. 规则 R1（红区熔断状态机）
```bash
# 6. 提交初筛（触发红区）
STUDENT_ID=$(curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"红区测试","birthDate":"2018-01-01","schoolScene":"测试","primaryTherapistId":"test"}' \
  | jq -r '.id')

curl -X POST http://localhost:3000/api/assessments/triage \
  -H "Content-Type: application/json" \
  -d "{
    \"studentId\":\"$STUDENT_ID\",
    \"behaviorItems\":[
      {\"item\":\"屈光参差（左右眼度数差异）\",\"score\":2.5}
    ]
  }"
# 预期：返回 {"isRedZone": true, "redZoneItemsJson": "[\"屈光参差 ≥ 2.00D\"]"}

# 7. 验证学生状态自动变更
curl http://localhost:3000/api/students/$STUDENT_ID
# 预期：triageStatus 已变为 "RED_ZONE_LOCKED"

# 8. 测试排课拦截（红区硬拦截）
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\"}"
# 预期：返回 403 Forbidden
# 错误信息："该学生处于红区锁定状态，必须完成眼科会诊并通过视光师审核后方可排课"

# 9. 审核眼科回执（解锁）
curl -X POST http://localhost:3000/api/assessments/referral-audit \
  -H "Content-Type: application/json" \
  -d "{
    \"referralId\":\"xxx\",
    \"auditStatus\":\"APPROVED\",
    \"auditedBy\":\"therapist_zhou\",
    \"hospitalDiagnosis\":\"已佩戴眼镜矫正\"
  }"
# 预期：学生 triageStatus 变为 "GREEN_ACTIVE"

# 10. 验证解锁后可排课
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\"}"
# 预期：返回 200 OK，排课成功
```

##### C. 审计日志自动记录
```bash
# 11. 查询审计日志
curl http://localhost:3000/api/audit-logs?targetId=$STUDENT_ID
# 预期：包含以下记录：
# - action: "CREATE_STUDENT"
# - action: "RED_ZONE_LOCK"
# - action: "UNLOCK_RED_ZONE"
```

#### 常见缺陷（拒绝验收理由）
- ❌ 红区学生排课接口返回 500 错误（应返回 403 Forbidden）
- ❌ 审核通过后学生状态未变更为 `GREEN_ACTIVE`
- ❌ Excel 批量导入 50 名学生耗时 > 5 秒
- ❌ 审计日志未自动记录（`audit_logs` 表为空）
- ❌ DTO 字段名与 `shared-types/index.ts` 不一致

---

### Week 4 验收（Task 3 & 4 - 评估 + 训练核心）

#### 验收时间：第 4 周周五
#### 验收内容：规则 R2 / R3 / R4 + L0-L5 自动分级算法

#### 检查清单（12 项）

##### A. 规则 R2（连续 3 题 0 分自动中止）
```bash
# 1. 开启评估会话
SESSION_ID=$(curl -X POST http://localhost:3000/api/assessments/sessions \
  -H "Content-Type: application/json" \
  -d '{"studentId":"xxx","evalPhase":"BASELINE"}' \
  | jq -r '.id')

# 2. 连续提交 3 题 0 分
curl -X POST http://localhost:3000/api/assessments/scale-score \
  -d "{\"sessionId\":\"$SESSION_ID\",\"score\":0}"
curl -X POST http://localhost:3000/api/assessments/scale-score \
  -d "{\"sessionId\":\"$SESSION_ID\",\"score\":0}"
curl -X POST http://localhost:3000/api/assessments/scale-score \
  -d "{\"sessionId\":\"$SESSION_ID\",\"score\":0}"
# 预期：第 3 次返回 {"shouldTerminate": true, "message": "检测到连续 3 题得分为 0..."}

# 3. 验证评估记录已保存
curl http://localhost:3000/api/assessments/records?sessionId=$SESSION_ID
# 预期：已保存当前进度，包含 3 题记录
```

##### B. 规则 R3（连续 3 次 ≥80% 晋级触发）
```bash
# 4. 创建 3 次课记录（正确率 85%, 88%, 90%）
STUDENT_ID="stu001"  # 林小宇
curl -X POST http://localhost:3000/api/sessions \
  -d "{\"studentId\":\"$STUDENT_ID\",\"sopCardId\":\"M2-3-1\",\"sessionNumber\":18}"
SESSION_ID=$(上一步返回的 id)

# 记录 10 个 Trial（8 成功 2 失败 = 80%）
for i in {1..8}; do
  curl -X POST http://localhost:3000/api/sessions/$SESSION_ID/trial \
    -d '{"result":"pass","promptLevel":2}'
done
for i in {1..2}; do
  curl -X POST http://localhost:3000/api/sessions/$SESSION_ID/trial \
    -d '{"result":"fail","promptLevel":2}'
done

# 结课
curl -X POST http://localhost:3000/api/sessions/$SESSION_ID/finish
# 重复上述步骤 2 次（第 19 次课 88%，第 20 次课 90%）

# 5. 验证晋级触发
curl http://localhost:3000/api/students/$STUDENT_ID
# 预期：promotionStatus 已变为 "PROMOTION_READY"

# 6. 验证待办推送
curl http://localhost:3000/api/workbench/summary
# 预期：pendingPromotions 计数 +1
```

##### C. 规则 R4（15 分钟护眼硬锁）
```bash
# 7. 累计数字训练 900 秒
curl -X POST http://localhost:3000/api/sessions \
  -d '{"studentId":"xxx","sopCardId":"M2-2-1","sessionNumber":21}'
SESSION_ID=$(上一步返回的 id)

# 模拟学生端数字游戏（每次 Trial 累计 90 秒）
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/sessions/$SESSION_ID/trial \
    -d '{"result":"pass","promptLevel":1,"digitalDurationSec":90}'
done

# 8. 验证护眼硬锁
curl -X POST http://localhost:3000/api/sessions/$SESSION_ID/trial \
  -d '{"result":"pass","promptLevel":1}'
# 预期：返回 403 Forbidden
# 错误信息："本次课数字训练时长已达 15 分钟上限，请切换至实体操作卡训练"
```

##### D. L0-L5 自动分级算法
```bash
# 9. 测试 L0 判定（身体稳定不达标）
curl -X POST http://localhost:3000/api/assessments/auto-level \
  -d '{"stabilityPass":false}'
# 预期：返回 "L0"

# 10. 测试 L1 判定（NPC > 10cm）
curl -X POST http://localhost:3000/api/assessments/auto-level \
  -d '{"stabilityPass":true,"npcCm":12}'
# 预期：返回 "L1"

# 11. 测试 L2 判定（TVPS-4 < 80）
curl -X POST http://localhost:3000/api/assessments/auto-level \
  -d '{"stabilityPass":true,"npcCm":8,"tvps4Std":75,"beeryVmiStd":85}'
# 预期：返回 "L2"

# 12. 测试 L3 判定（Beery VMI < 80）
curl -X POST http://localhost:3000/api/assessments/auto-level \
  -d '{"stabilityPass":true,"npcCm":8,"tvps4Std":85,"beeryVmiStd":75}'
# 预期：返回 "L3"
```

#### 常见缺陷（拒绝验收理由）
- ❌ 连续 3 题 0 分未触发自动中止
- ❌ 晋级判定逻辑错误（正确率 85%, 88%, 70% 被误判为达标）
- ❌ 护眼硬锁失效（累计 1000 秒仍可继续游戏）
- ❌ 自动分级算法优先级错误（NPC = 12cm 被判定为 L2，应为 L1）

---

### Week 5 验收（Task 5 - React 工程化）

#### 验收时间：第 5 周周五
#### 验收内容：三终端前端页面 + 盲操快捷键 + Canvas 游戏

#### 检查清单（15 项）

##### A. 工程化基础
```bash
# 1. 启动开发服务器
cd apps/web
npm run dev
# 预期：自动打开浏览器访问 http://localhost:5173

# 2. 检查 Tailwind 主题色
# 打开浏览器开发者工具 → Elements → 检查顶部导航栏背景色
# 预期：background-color: rgb(15, 76, 92) (#0F4C5C)

# 3. 三终端切换按钮
# 点击顶部"教师端" / "学生端" / "家长端"按钮
# 预期：无刷新切换界面
```

##### B. 教师 Web 工作台（9 个页面）
```bash
# 4. 工作台首页
# 检查是否显示：今日课表、4 大指标卡片、L0-L5 分布图、智能预警
# 预期：与原型 L115-330 视觉一致

# 5. 学生档案中心
# 检查筛选工具栏（姓名/层级/状态）、动态表格渲染
# 预期：与原型 L332-461 视觉一致

# 6. 课堂记分台
# 检查五段式环节按钮、10 个 Trial 记分盒子、实时倒计时
# 预期：与原型 L763-987 视觉一致

# 7. Excel 批量导入按钮
# 点击"Excel 批量导入"按钮，上传测试文件
# 预期：成功上传并显示导入结果
```

##### C. 盲操快捷键（M1 优化项）
```bash
# 8. 进入课堂记分台页面
# 9. 按下空格键
# 预期：第 1 个 Trial 盒子变为绿色（记录成功），输入框聚焦时无效
# 10. 按下 0 键
# 预期：第 2 个 Trial 盒子变为红色（记录失败）
# 11. 按下 ↑ 键
# 预期：提示等级 +1
# 12. 按下 N 键
# 预期：切换至下一环节（Stage 2 → Stage 3）
```

##### D. Canvas 游戏（4 款）
```bash
# 13. 泡泡追追看
# 切换至学生端 → 点击"泡泡追追看"
# 预期：Canvas 60fps 动画循环，泡泡移动流畅，点击碰撞检测准确

# 14. 聚散球
# 点击"奇妙聚散球"
# 预期：Brock 线三球距离调节正常，双眼视线 Canvas 模拟显示

# 15. 找星星
# 点击"森林找星星"
# 预期：4×6 网格图形-背景识别，正确/错误即时反馈
```

#### 常见缺陷（拒绝验收理由）
- ❌ 顶部导航栏背景色为 `#000000`（应为 `#0F4C5C`）
- ❌ 盲操快捷键在输入框聚焦时仍然生效（应无效）
- ❌ Canvas 泡泡游戏帧率 < 50fps
- ❌ 课堂记分台布局与原型差异过大（如缺少倒计时显示）

---

### Week 6 验收（Task 6 - WebSocket + Android）

#### 验收时间：第 6 周周五（最终验收）
#### 验收内容：双屏同步 + Android APK 打包

#### 检查清单（8 项）

##### A. WebSocket 双屏同步
```bash
# 1. 同时打开教师端与学生端
# 教师端：http://localhost:5173?terminal=web
# 学生端：http://localhost:5173?terminal=student

# 2. 教师端点击"投屏泡泡游戏"
# 预期：学生端 Canvas 游戏立即切换（延迟 < 500ms）

# 3. 学生端完成一轮游戏
# 预期：教师端记分台自动收到正确率数据并更新 Trial 盒子

# 4. WebSocket 降级测试
# 打开浏览器开发者工具 → Network
# 检查 WebSocket 连接失败时是否自动降级为 HTTP Long-Polling
# 预期：降级成功，双屏同步仍然工作
```

##### B. Android APK 打包
```bash
# 5. 编译 APK
cd apps/web
npm run build
npx cap sync android
npx cap open android
# 在 Android Studio 中点击 "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"

# 6. 安装 APK 至真机平板
# 将生成的 .apk 文件传输至 Android 平板
# 安装并打开应用

# 7. 验证全屏沉浸模式
# 预期：状态栏和虚拟按键隐藏，应用占据全屏

# 8. 验证 15 分钟护眼锁屏
# 学生端累计数字训练 900 秒
# 预期：全屏遮罩弹出，显示"请休息眼睛，教师解锁后继续"
```

#### 最终交付清单（26 项全部通过）
```
✅ 功能完整性（18 项）
  ✅ 红区熔断：排课接口返回 403
  ✅ 自动中止：连续 3 题 0 分弹窗
  ✅ 晋级触发：连续 3 次 ≥80% → PROMOTION_READY
  ✅ 护眼硬锁：900 秒强制锁屏
  ✅ 盲操快捷键：Space/1/0/↑↓/N 生效
  ✅ Excel 导入：50 名学生 < 5 秒
  ✅ 审计日志：所有修改自动记录
  ✅ 视频清理：7 天前自动删除
  ✅ WebSocket 降级：自动 Polling
  ✅ Android APK：真机全屏沉浸
  ✅ 三终端切换：Web/Pad/小程序无缝切换
  ✅ 学生档案 CRUD：增删改查全量实现
  ✅ IEP 计划：创建/更新/审批流程完整
  ✅ 课堂记分台：五段式环节切换正常
  ✅ Canvas 游戏：泡泡/聚散球/找星星可玩
  ✅ 家长端：4 个 Tab 全量实现
  ✅ 操作卡库：13 张卡片 + TTS 语音播报
  ✅ 数据分析：Chart.js 趋势图渲染

✅ 性能指标（5 项）
  ✅ 首屏加载 < 2 秒
  ✅ Canvas 帧率 > 55fps
  ✅ 投屏延迟 < 500ms
  ✅ 200+ 学生无卡顿
  ✅ 单机版启动 < 10 秒

✅ 数据库兼容性（3 项）
  ✅ SQLite/PostgreSQL 切换无缝
  ✅ Schema 无不兼容语法
  ✅ JSON 字段正确序列化
```

---

## 四、审查报告模板

### 4.1 验收通过报告
```markdown
# VMI-TIS Week X 验收报告 - ✅ 通过

**验收日期：** 2026-10-XX  
**验收任务：** Task X - [任务名称]  
**验收人员：** ChatGPT  
**执行人员：** DeepSeek

## 验收结果
✅ **通过** - 所有检查项均符合验收标准

## 检查项得分（X/X 项）
- ✅ 契约一致性：字段名与 schema.prisma 完全匹配
- ✅ 业务规则完整性：四大强制规则实现正确
- ✅ 代码质量：无省略号、注释完整、错误处理规范
- ✅ 数据库兼容性：SQLite/PostgreSQL 双模无缝切换
- ✅ 原型还原度：UI 样式与原型保持一致

## 亮点
1. 红区熔断状态机实现严谨，拦截逻辑无漏洞
2. Excel 批量导入性能优异（50 名学生 2.3 秒完成）
3. 审计日志自动记录完整，包含 IP 地址和变更前后对比

## 改进建议（非阻塞）
1. 建议增加单元测试覆盖率（当前 0%）
2. 建议优化数据库查询性能（部分接口响应时间 > 1 秒）

## 下周任务
继续执行 Task X+1 - [下一任务名称]

---
**本报告由 ChatGPT 审查官生成，DeepSeek 可继续下一任务。**
```

### 4.2 验收不通过报告
```markdown
# VMI-TIS Week X 验收报告 - ❌ 不通过

**验收日期：** 2026-10-XX  
**验收任务：** Task X - [任务名称]  
**验收人员：** ChatGPT  
**执行人员：** DeepSeek

## 验收结果
❌ **不通过** - 存在 Blocker 级别缺陷，需要修复后重新验收

## 缺陷清单（X 项）

### Blocker 1: 红区熔断状态机失效
**严重等级：** 🔴 Blocker  
**发现位置：** `apps/api/src/assessments/triage.service.ts` L42  
**问题描述：**  
提交初筛时检测到屈光参差 ≥ 2.00D，但学生状态未自动变更为 `RED_ZONE_LOCKED`。

**期望行为：**  
```typescript
await this.prisma.student.update({
  where: { id: dto.studentId },
  data: { triageStatus: 'RED_ZONE_LOCKED' },
});
```

**实际代码：**  
```typescript
// 缺失状态变更逻辑
```

**修复指令：**  
1. 在 `triage.service.ts` L42 后添加上述代码
2. 重新执行验收测试用例 #6

---

### Blocker 2: Prisma Schema 使用标量数组
**严重等级：** 🔴 Blocker  
**发现位置：** `prisma/schema.prisma` L105  
**问题描述：**  
`materials` 字段定义为 `String[]`，SQLite 不支持标量数组。

**期望定义：**  
```prisma
materialsJson  String  @map("materials_json")
```

**实际定义：**  
```prisma
materials      String[]
```

**修复指令：**  
1. 修改 `schema.prisma` L105
2. 执行 `npx prisma db push --force-reset`
3. 修改 Seed 脚本中的数据插入逻辑：`materialsJson: JSON.stringify(['镊子', '珠子'])`
4. 重新执行验收测试用例 #7

---

## 修复后提交
请在修复上述缺陷后：
1. 提交代码：`git commit -m "fix: Week X Blocker 修复"`
2. 通知审查官重新验收

预计修复时间：1-2 小时

---
**本报告由 ChatGPT 审查官生成，DeepSeek 需修复后重新验收。**
```

---

## 五、紧急升级机制

### 遇到以下情况请立即上报 @Claude Opus：

1. **连续 2 周验收不通过**：DeepSeek 重复出现相同类型缺陷
2. **核心业务规则实现错误**：四大强制规则（R1-R4）存在逻辑漏洞
3. **契约冲突**：发现 `prisma/schema.prisma` 与 `shared-types/index.ts` 不一致
4. **进度严重滞后**：某个任务卡耗时超过原计划 2 倍以上

---

**祝审查顺利！如有疑问请随时上报。**

*本手册由 Claude Opus 生成于 2026-10-19，供 ChatGPT 审查官使用。*
