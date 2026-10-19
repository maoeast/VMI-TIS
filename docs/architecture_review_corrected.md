# VMI-TIS 架构与原型审查报告（修订版）

**生成日期：** 2026-10-19  
**审查范围：** 基于完整原型HTML（2676行）+ 需求文档 vmi_tis.md + 4条工程落地建议

---

## 一、原型完成度校正（基于完整2676行代码）

### 1.1 实际已完成模块（远超初步判断）

#### **三大终端全量交互界面（100%布局完成）**

**终端一：机构/教师 Web 工作台（9个完整页面）**
1. ✅ **工作台首页** - 今日课表、4大指标卡片、待办提醒、L0-L5分布图
2. ✅ **学生档案中心** - 搜索筛选、动态表格渲染（`renderStudentListTable()`）
3. ✅ **在线评估中心** - 三子页签（电子量表施测台、红区转介单、评估报告库）
4. ✅ **IEP计划管理** - 操作卡勾选器、周课表可视化日历、晋级审批
5. ✅ **课堂训练记分台** - 五段式流程切换、Trial记分器、实时倒计时
6. ✅ **数据分析看板** - Chart.js趋势图、眼动热力图Canvas绘制
7. ✅ **家校作业打卡** - 待批作业列表、家长留言、批量派发任务
8. ✅ **操作卡资源库** - 13张标准化操作卡、语音播报TTS、一键加入IEP
9. ✅ **系统设置** - 多角色权限配置、护眼参数、数据脱敏开关

**终端二：学生端互动训练（4款Canvas游戏 + 护眼锁屏）**
1. ✅ **泡泡追追看** - Canvas 60fps动画、眼动轨迹实时绘制、点击碰撞检测
2. ✅ **奇妙聚散球** - Brock线三球距离调节、双眼视线Canvas模拟
3. ✅ **森林找星星** - 4×6网格图形-背景识别、正确/错误即时反馈
4. ✅ **眼动5点校准** - 屏幕九宫格校准点交互
5. ✅ **15分钟护眼锁屏** - 倒计时 + 全屏遮罩演示（`toggleEyeRestOverlay()`）

**终端三：家长端微信小程序（4个Tab页）**
1. ✅ **今日任务** - 每日打卡表单、练习时长记录、提交成功反馈
2. ✅ **视频打卡** - 上传入口占位、治疗师点评展示
3. ✅ **成长曲线** - 模拟Chart.js进步趋势图
4. ✅ **家校留言** - 实时消息列表、发送交互（`sendMpChatMessage()`）

#### **已实现核心交互逻辑（JavaScript）**
- ✅ 三终端无刷新切换 (`switchTerminal()`)
- ✅ 全局学生上下文切换 (`changeActiveStudent()`)
- ✅ 学生档案动态筛选与表格渲染
- ✅ 评估量表0/1判分按钮 + 连续3题0分中止规则提示
- ✅ IEP晋级审批流程模拟
- ✅ 五段式课堂环节切换 + Trial记分盒子动态生成
- ✅ Canvas实时动画循环（泡泡追踪、眼动热力图）
- ✅ 操作卡语音播报（Web Speech API）
- ✅ Toast全局提示系统
- ✅ 模态框弹窗（评估报告生成预览）

#### **Mock 数据结构（已内嵌）**
```javascript
// 学生数据库（6名示例档案）
const STUDENT_DB = [ /* 林小宇、陈果果、张梓轩等 */ ];

// 操作卡资源库（13张跨L0-L5）
const LIB_CARDS = [
  { code: 'M1-1-1', level: 'L0', mod: 'M1', title: '四点支撑 + 滑板推球', ... },
  { code: 'M2-2-1', level: 'L1', mod: 'M2', title: '聚散球 Brock 线注视', ... },
  // ... 共13张
];
```

---

## 二、与需求文档交叉验证（缺失项清单）

### 🔴 Blocker（阻断交付的核心缺失）

#### B1. 后端数据持久化层完全缺失
**现状：** 所有数据存储在 `const STUDENT_DB` 内存变量中，页面刷新即丢失。  
**影响：** 无法投入实际临床使用。  
**修复方案：**
```javascript
// 短期（开发阶段）：浏览器 localStorage
localStorage.setItem('vmi_students', JSON.stringify(STUDENT_DB));

// 中期（部署阶段）：RESTful API + MongoDB
POST /api/students       // 新建学生
GET  /api/students?level=L2&status=active
PUT  /api/students/:id
```

#### B2. 红区转介熔断逻辑未实现
**需求原文（R1）：** "屈光参差 ≥ 2.00D 或斜视阳性必须暂停训练，生成《眼科转介单》PDF。"  
**现状：** 仅在学生状态中展示 `"眼科转介待回执"` 文本标签，无自动拦截。  
**修复方案：**
```javascript
// 评估提交时检查红区标识
function submitAssessment(studentId, formData) {
  const redFlags = detectRedFlags(formData); // 屈光参差/斜视判定
  if (redFlags.length > 0) {
    updateStudentStatus(studentId, 'PAUSED_RED_ZONE');
    generateReferralPDF(studentId, redFlags); // 自动打印转介单
    alert('检测到红区风险，已暂停训练并生成眼科转介单');
    return; // 阻断后续流程
  }
  // 正常评估流程...
}
```

#### B3. 自动评级算法（L0-L5）未编码
**需求原文：** "根据 DTVP-3 / Beery VMI 标准分自动计算能力层级。"  
**现状：** 学生层级为硬编码字符串 `"L2"`。  
**修复方案：**
```javascript
function calculateLevel(dtvp3Std, beeryStd, npc) {
  if (dtvp3Std < 4 || beeryStd < 4) return 'L0';
  if (npc > 10 || adjustmentAnomaly) return 'L1';
  if (dtvp3Std < 7) return 'L2';
  if (beeryStd < 8) return 'L3';
  if (dtvp3Std >= 8) return 'L4';
  return 'L5';
}
```

#### B4. 晋级触发逻辑缺失
**需求原文（R3）：** "连续3次课 ≥80% 且家长端泛化任务完成 → 自动推送待办。"  
**现状：** `approvePromotionToL3()` 为空函数，无实际计算。  
**修复方案：**
```javascript
function checkPromotionCriteria(studentId, cardId) {
  const recentSessions = getRecentSessions(studentId, 3);
  const avgAccuracy = recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / 3;
  const homeTaskDone = checkHomeTaskCompletion(studentId, cardId);
  
  if (avgAccuracy >= 0.80 && homeTaskDone) {
    createNotification({
      type: 'PROMOTION_PENDING',
      studentId,
      message: `${student.name} 达到晋级标准，待治疗师审批`
    });
  }
}
```

### 🟡 Major（影响临床效率但可绕过）

#### M1. 课堂记分台"盲操键盘快捷键"缺失 ★★★★★
**用户痛点：** 治疗师课堂上眼睛紧盯孩子操作（镊子夹珠、聚散球），无法低头找鼠标点按钮。  
**改进方案：**
```javascript
// 在 web-page-session 页面激活时监听键盘
document.addEventListener('keydown', function(e) {
  if (!isSessionPageActive()) return;
  
  switch(e.key) {
    case '1':
    case ' ':  // 空格键
      recordTrial('correct'); break;
    case '0':
      recordTrial('incorrect'); break;
    case 'ArrowUp':
      adjustPromptLevel('increase'); break;
    case 'ArrowDown':
      adjustPromptLevel('decrease'); break;
    case 'n':
      nextTrialBox(); break;
  }
});
```
**UI提示：** 在记分台右上角增加快捷键图例浮层：
```html
<div class="text-[11px] text-slate-500 bg-amber-50 p-2 rounded">
  快捷键：<kbd>空格/1</kbd>正确 <kbd>0</kbd>错误 <kbd>↑↓</kbd>提示等级 <kbd>N</kbd>下一题
</div>
```

#### M2. Excel 批量导入学生档案功能缺失 ★★★★☆
**场景：** 学期初特教学校需批量导入50+学生名单。  
**实现方案：**
```html
<!-- 新增批量导入按钮 -->
<input type="file" id="excel-upload" accept=".xlsx,.xls" onchange="importStudentsFromExcel(this.files[0])" hidden />
<button onclick="document.getElementById('excel-upload').click()">
  📊 Excel 批量导入学生
</button>
```
```javascript
// 使用 SheetJS 库解析 Excel
async function importStudentsFromExcel(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), {type: 'array'});
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  rows.forEach(row => {
    const student = {
      name: row['姓名'],
      age: row['年龄'],
      grade: row['班级'],
      enrollDate: new Date().toISOString().split('T')[0]
    };
    STUDENT_DB.push(student);
  });
  
  renderStudentListTable();
  showToast(`成功导入 ${rows.length} 名学生档案`);
}
```

#### M3. 操作审计日志表（audit_logs）未设计 ★★★☆☆
**合规要求：** 医疗数据修改需记录 WHO / WHEN / WHAT。  
**数据结构：**
```javascript
const auditLog = {
  id: 'log_20261019_001',
  userId: 'therapist_zhou',
  userName: '周敏',
  action: 'UPDATE_ASSESSMENT',
  targetType: 'student',
  targetId: 'stu001',
  changes: {
    'redFlags': { old: [], new: ['外隐斜'] },
    'status': { old: 'active', new: 'PAUSED_RED_ZONE' }
  },
  timestamp: '2026-10-19T14:23:15Z',
  ipAddress: '192.168.1.105'
};
```

#### M4. 家长打卡视频自动清理策略未配置 ★★★☆☆
**隐私合规：** 视频仅保留7天，自动转冷备或删除。  
**实现：**
```javascript
// 后端定时任务（Node.js Cron）
cron.schedule('0 2 * * *', async () => { // 每天凌晨2点
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldVideos = await db.homeTaskVideos.find({ uploadedAt: { $lt: sevenDaysAgo } });
  
  for (const video of oldVideos) {
    await fs.unlink(video.filePath); // 删除文件
    await db.homeTaskVideos.updateOne(
      { _id: video._id },
      { $set: { status: 'DELETED', deletedAt: new Date() } }
    );
  }
  console.log(`Cleaned ${oldVideos.length} expired videos`);
});
```

### 🟢 Minor（锦上添花）

#### N1. WebSocket 投屏控制未实现（当前为占位按钮）
**需求：** 教师端一键投屏游戏至学生 iPad。  
**技术方案：** Socket.io（自动 WebSocket + Polling 降级）
```javascript
// 教师端
socket.emit('start_game', { studentId: 'stu001', gameId: 'find-stars', difficulty: 2 });

// 学生端
socket.on('start_game', (data) => {
  switchStudentPadGame(data.gameId);
  showToast('治疗师已投屏新游戏');
});
```

#### N2. DTVP-3 / Beery VMI 电子量表题库未填充
**现状：** 仅展示第14题模拟界面，无30题完整题库。  
**建议：** 需购买 DTVP-3 / Beery VMI 版权后数字化题项。

#### N3. 常模查表数据未嵌入
**需求：** 根据原始分自动换算标准分（需按年龄月龄查表）。  
**数据结构：**
```javascript
const BEERY_VMI_NORMS = {
  '5y9m': { raw: 14, std: 7 },
  '6y0m': { raw: 16, std: 8 },
  // ... 按年龄月龄展开
};
```

---

## 三、四大工程落地建议整合

### 建议1：课堂记分台"盲操键盘快捷键" ✅ 已详述于 M1

### 建议2：Excel 批量导入学生档案 ✅ 已详述于 M2

### 建议3：操作审计日志与视频清理策略 ✅ 已详述于 M3/M4

### 建议4：医院内网 WebSocket 降级保底机制
**场景：** 部分医院防火墙拦截 WebSocket 连接。  
**技术选型：** Socket.io 天然支持传输降级
```javascript
// Socket.io 配置（自动 WebSocket → Long Polling 降级）
const io = require('socket.io')(server, {
  transports: ['websocket', 'polling'], // 优先 WS，失败自动降级 Polling
  cors: { origin: '*' }
});

// 客户端连接
const socket = io('http://hospital-server:3000', {
  transports: ['websocket', 'polling'] // 同步配置
});
```
**验证方式：** 
```bash
# 模拟防火墙拦截 WebSocket
iptables -A OUTPUT -p tcp --dport 3000 -m string --string "Upgrade: websocket" --algo bm -j DROP

# 观察 Socket.io 自动降级至 Polling
```

---

## 四、数据库 Schema 设计（补充 Prisma）

### 4.1 学生档案表 (Student)
```prisma
model Student {
  id            String   @id @default(uuid())
  code          String   @unique // 学号
  name          String
  age           Int
  gender        String
  grade         String
  school        String
  level         String   // L0-L5
  status        String   // active / PAUSED_RED_ZONE / discharged
  redFlags      String[] // ['屈光参差', '外隐斜']
  enrollDate    DateTime
  
  // 关联关系
  assessments   Assessment[]
  ieps          IEP[]
  sessions      TrainingSession[]
  homeTasks     HomeTask[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 4.2 评估记录表 (Assessment)
```prisma
model Assessment {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  type          String   // DTVP3 / BeeryVMI / AgeDuane
  rawScore      Int
  standardScore Int
  percentile    Float
  testDate      DateTime
  
  // DTVP-3 分测验详情（JSON存储）
  subtests      Json?    // { eyeHandCoord: 7, position: 8, ... }
  
  redFlagsDetected String[]
  reportPdfUrl     String?
  
  createdAt     DateTime @default(now())
  @@index([studentId, testDate])
}
```

### 4.3 IEP 训练计划表
```prisma
model IEP {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  startDate     DateTime
  endDate       DateTime?
  currentLevel  String   // L2
  targetLevel   String   // L3
  
  weeklyFreq    Int      // 每周4次
  sessionMinutes Int     // 35分钟/次
  
  operationCards Json    // [{ cardId: 'M2-3-1', duration: 13 }]
  
  status        String   // active / completed / cancelled
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([studentId, status])
}
```

### 4.4 课堂训练记录表 (TrainingSession)
```prisma
model TrainingSession {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  sessionDate   DateTime
  sessionNumber Int      // 第18次课
  
  stage1Complete Boolean // 感觉唤醒
  stage2Complete Boolean // 复习联结
  stage3Complete Boolean // 核心新任务
  stage4Complete Boolean // 巩固泛化
  stage5Complete Boolean // 强化结束
  
  // Trial 记录（JSON数组）
  trials        Json     // [{ result: 'correct', promptLevel: 2 }]
  
  accuracy      Float    // 当次正确率
  duration      Int      // 实际用时（分钟）
  
  therapistNotes String? // 课堂小结
  
  createdAt     DateTime @default(now())
  @@index([studentId, sessionDate])
}
```

### 4.5 家庭作业打卡表 (HomeTask)
```prisma
model HomeTask {
  id            String   @id @default(uuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  taskName      String   // 找袜子泛化
  assignedDate  DateTime
  dueDate       DateTime
  
  status        String   // pending / completed / overdue
  
  videoUrl      String?
  videoDuration Int?     // 秒
  parentNote    String?
  
  submittedAt   DateTime?
  teacherReply  String?
  repliedAt     DateTime?
  
  // 自动清理标记
  scheduledDeleteAt DateTime? // 7天后
  
  createdAt     DateTime @default(now())
  @@index([studentId, status])
}
```

### 4.6 操作审计日志表 (AuditLog)
```prisma
model AuditLog {
  id            String   @id @default(uuid())
  
  userId        String   // therapist_zhou
  userName      String   // 周敏
  userRole      String   // therapist / admin
  
  action        String   // CREATE_STUDENT / UPDATE_ASSESSMENT / UNLOCK_RED_ZONE
  targetType    String   // student / assessment / iep
  targetId      String
  
  changesBefore Json?    // 修改前状态
  changesAfter  Json?    // 修改后状态
  
  ipAddress     String?
  userAgent     String?
  
  createdAt     DateTime @default(now())
  @@index([userId, createdAt])
  @@index([targetId, action])
}
```

---

## 五、RESTful API 路由清单

### 学生档案
```
POST   /api/students                 # 新建学生
GET    /api/students                 # 列表（支持筛选）
GET    /api/students/:id             # 详情
PUT    /api/students/:id             # 更新
DELETE /api/students/:id             # 删除（需权限）
POST   /api/students/import-excel    # Excel批量导入
```

### 评估管理
```
POST   /api/assessments              # 提交评估
GET    /api/assessments?studentId=xxx
GET    /api/assessments/:id/report-pdf # 生成评估报告PDF
```

### IEP 计划
```
POST   /api/ieps                     # 创建IEP
GET    /api/ieps/:studentId/current  # 当前有效IEP
PUT    /api/ieps/:id                 # 更新
POST   /api/ieps/:id/promote         # 晋级审批
```

### 课堂训练
```
POST   /api/sessions                 # 开课
PUT    /api/sessions/:id/trial       # 记录单次Trial
PUT    /api/sessions/:id/complete    # 结课
GET    /api/sessions/:studentId/recent # 最近N次课数据
```

### 家校互动
```
POST   /api/home-tasks               # 派发作业
PUT    /api/home-tasks/:id/submit    # 家长提交
PUT    /api/home-tasks/:id/reply     # 治疗师点评
DELETE /api/home-tasks/clean-expired # 清理过期视频（Cron定时）
```

### 操作卡资源
```
GET    /api/operation-cards          # 资源库
GET    /api/operation-cards/:id/tts  # 语音播报MP3
```

### WebSocket 投屏通道
```
socket.emit('start_game', { studentId, gameId, difficulty })
socket.emit('pause_game', { studentId })
socket.emit('end_session', { studentId })
```

---

## 六、Android APK 打包技术栈与硬件集成

### 6.1 技术栈选型
```json
{
  "framework": "React 18 + Vite 4",
  "ui": "Tailwind CSS 3.4",
  "mobile": "Capacitor 6 (替代 Cordova)",
  "charts": "Chart.js 4.4",
  "icons": "Lucide Icons",
  "database": "Prisma + PostgreSQL（服务器） / SQLite（单机）"
}
```

### 6.2 Capacitor 打包配置
```json
// capacitor.config.json
{
  "appId": "com.vmi.tis",
  "appName": "星眸智康训练系统",
  "webDir": "dist",
  "plugins": {
    "SplashScreen": { "launchAutoHide": false },
    "Keyboard": { "resize": "native" },
    "StatusBar": { "style": "dark" }
  },
  "android": {
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": true
  }
}
```

### 6.3 眼动仪硬件接口抽象
```javascript
// 统一接口抽象（适配 Windows USB + Android 前置摄像头）
class EyeTrackerAdapter {
  constructor(platform) {
    if (platform === 'windows') {
      this.impl = new TobiiProFusionSDK(); // USB 60Hz 红外眼动仪
    } else if (platform === 'android') {
      this.impl = new WebRTCGazeEstimator(); // 前置摄像头 + ML Kit
    }
  }
  
  async calibrate() {
    return this.impl.runCalibration();
  }
  
  async startTracking(callback) {
    this.impl.onGazeData((x, y, timestamp) => {
      callback({ x, y, timestamp });
    });
  }
  
  stopTracking() {
    this.impl.stop();
  }
}
```

### 6.4 Kiosk 全屏防误触锁定
```javascript
// Android Capacitor 插件（需原生 Kotlin 代码）
// plugins/kiosk-mode/android/KioskPlugin.kt
@CapacitorPlugin(name = "KioskMode")
class KioskModePlugin : Plugin() {
  @PluginMethod
  fun enable(call: PluginCall) {
    activity.window.decorView.systemUiVisibility = (
      View.SYSTEM_UI_FLAG_FULLSCREEN
      or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    )
    activity.startLockTask() // 锁定任务（需设备管理员权限）
    call.resolve()
  }
}
```

---

## 七、SQLite 单机版 ↔ PostgreSQL 服务器版双模兼容

### 7.1 Prisma Schema 兼容写法
```prisma
// 避免 SQLite 不支持的特性
datasource db {
  provider = "sqlite"  // 单机版
  // provider = "postgresql" // 服务器版
  url      = env("DATABASE_URL")
}

// ✅ 兼容写法
model Student {
  id        String   @id @default(uuid())  // SQLite 支持 UUID（通过 Prisma）
  metadata  String   // JSON 序列化为字符串
  createdAt DateTime @default(now())
}

// ❌ 不兼容写法（避免）
model Student {
  metadata  Json     // PostgreSQL 原生 JSONB，SQLite 不支持
  deletedAt DateTime @db.Timestamptz // PostgreSQL 时区类型
}
```

### 7.2 零配置交付脚本
```batch
@echo off
REM start_standalone.bat（Windows 单机版一键启动）

echo ========================================
echo 星眸智康 VMI-TIS 单机版启动中...
echo ========================================

REM 检查端口占用
netstat -ano | findstr :3000 >nul
if %errorlevel%==0 (
  echo [错误] 端口 3000 已被占用，请关闭占用进程
  pause
  exit
)

REM 初始化 SQLite 数据库
if not exist data\vmi.db (
  echo [初始化] 创建单机数据库...
  node scripts\init-sqlite.js
)

REM 启动后端服务
start "VMI-TIS 后端" node server.js

REM 等待后端启动
timeout /t 3 >nul

REM 打开浏览器
start http://localhost:3000

echo [就绪] 系统已启动，浏览器即将打开
echo 关闭此窗口将停止服务
pause
```

---

## 八、原型代码质量改进建议

### 8.1 CDN 依赖离线风险
**问题：** 依赖 Tailwind / Chart.js / Lucide CDN，离线打开失败。  
**改进：** 
```html
<!-- 原：CDN 链接 -->
<script src="https://cdn.tailwindcss.com/3.4.17"></script>

<!-- 改：下载到本地 -->
<script src="./assets/tailwind.min.js"></script>
```

### 8.2 响应式布局优化
**问题：** 小屏幕下表格横向溢出。  
**改进：**
```html
<!-- 移动端表格改为卡片布局 -->
<div class="hidden lg:block">
  <table><!-- 桌面端表格 --></table>
</div>
<div class="lg:hidden space-y-3">
  <div class="card"><!-- 移动端卡片 --></div>
</div>
```

### 8.3 全局状态管理
**问题：** `activeStudentId` 等全局变量分散在各处。  
**改进：** 引入轻量状态管理
```javascript
// 使用 Zustand 或 Pinia（如迁移至 Vue）
const useAppStore = create((set) => ({
  activeStudent: null,
  setActiveStudent: (student) => set({ activeStudent: student }),
  
  currentTerminal: 'web',
  switchTerminal: (terminal) => set({ currentTerminal: terminal })
}));
```

---

## 九、实施优先级与时间规划

### Phase 1: 核心缺陷修复（2周）【Blocker 级别】
- [ ] 搭建后端 Node.js + Express + Prisma
- [ ] 实现学生档案 CRUD API
- [ ] 红区转介熔断逻辑
- [ ] 自动评级算法（L0-L5）
- [ ] 晋级触发逻辑

### Phase 2: 临床易用性增强（1周）【Major 级别】
- [ ] 课堂记分台键盘快捷键
- [ ] Excel 批量导入功能
- [ ] 操作审计日志表
- [ ] 视频自动清理 Cron

### Phase 3: 硬件与部署（2周）
- [ ] WebSocket 投屏通道（Socket.io）
- [ ] SQLite 单机版打包
- [ ] Docker Compose 服务器版部署
- [ ] Android APK 打包（Capacitor）

### Phase 4: 完善与测试（1周）
- [ ] 完整 DTVP-3 / Beery VMI 题库
- [ ] 常模查表数据嵌入
- [ ] 端到端测试（Playwright）
- [ ] 用户培训文档

**总计：6周**

---

## 十、成本估算（更新）

### 开发成本
- 前端优化（2周）：¥28,000
- 后端开发（3周）：¥42,000
- 测试与部署（1周）：¥10,000
- **小计：¥80,000**（比原估算节省 48%，因原型完成度高）

### 硬件成本（单站点）
- Tobii Pro Fusion 眼动仪：¥45,000
- iPad Pro 12.9 英寸：¥8,000
- Android 触控一体机（备选）：¥12,000
- **小计：¥65,000**

### 年度运营成本
- 云服务器（阿里云）：¥6,000/年
- SSL 证书与域名：¥1,000/年
- 技术支持人力：¥24,000/年
- **小计：¥31,000/年**

---

## 十一、总结与行动建议

### 11.1 原型亮点
1. ✅ **三端界面100%完成** - Web/Pad/小程序全量交互原型
2. ✅ **Canvas游戏可玩** - 泡泡追踪、聚散球、找星星均可交互
3. ✅ **临床流程完整** - 五段式课堂、Trial记分、晋级审批闭环
4. ✅ **视觉设计成熟** - 深色主题 + 医疗级配色，专业度高

### 11.2 关键短板
1. ❌ **无后端持久化** - 数据库、API、文件上传全部缺失
2. ❌ **核心算法未实现** - 红区熔断、自动评级、晋级触发
3. ❌ **硬件集成未落地** - 眼动仪 SDK、WebSocket 投屏

### 11.3 下一步行动
1. **立即启动：** 后端 API 开发（优先学生 CRUD + 红区熔断）
2. **并行推进：** 键盘快捷键 + Excel 导入（临床易用性）
3. **预留时间：** 眼动仪 SDK 集成需 2 周调试周期

### 11.4 交付检查清单
- [ ] 完成「入案→评估→IEP→训练→晋级→复评」完整闭环
- [ ] 红区学生自动拦截，无眼科回执无法训练
- [ ] 三次移动平均正确率计算准确无误
- [ ] 投屏游戏延迟 < 500ms
- [ ] 家长端作业推送成功率 > 95%
- [ ] 页面首屏加载 < 2秒
- [ ] 支持 200+ 学生档案无卡顿

---

**本报告修订完成。四大工程建议已全部整合进相应章节。**

*生成工具：Kiro AI（基于完整 2676 行原型代码分析）*
