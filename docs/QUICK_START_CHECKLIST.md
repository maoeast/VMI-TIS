# DeepSeek 快速启动检查清单

**生成时间：** 2026-10-19 22:48  
**预计完成：** 6 周（9 个工作日）

---

## ✅ 启动前检查（5 分钟）

### 1. 基准文件齐全性
- [ ] `prisma/schema.prisma` 存在且包含 8 张表定义
- [ ] `packages/shared-types/src/index.ts` 存在且包含 12 个枚举 + 8 个实体接口 + 10 个 DTO
- [ ] `docs/IMPLEMENTATION_TASKS.md` 存在且包含 6 张任务卡
- [ ] `docs/vmi_tis.md` 存在（需求规格说明书 V2.1，424 行）
- [ ] `docs/vmi_tis_prototype.html` 存在（完整原型，3076 行）

### 2. 关键行号索引确认
打开 `docs/vmi_tis.md`，跳转到 **L320-335**，确认看到以下表格：
```
| 模块归属 | 原型 DOM 容器 ID & 行号 | 原型真实 JS 函数名 & 精确行号 | 对应迁移目标 |
| --- | --- | --- | --- |
| **全局种子与本地持久化** | 顶栏切换器 L60–L106 | STUDENT_DB (L1741), LIB_CARDS (L1847), ... |
| **终端一：工作台首页** | #web-page-home (L174–L389) | switchTerminal() (L1948), ... |
| **终端一：学生档案** | #web-page-students (L392–L464) | renderStudentListTable() (L2034), ... |
```

### 3. 四大强制规则确认
打开 `docs/vmi_tis.md`，跳转到 **L191-219**，确认看到：
- **规则 R1**：红区熔断状态机（4 种状态：PENDING_SCREENING → RED_ZONE_LOCKED → REFERRAL_UPLOADED → GREEN_ACTIVE）
- **规则 R2**：连续 3 题 0 分自动中止
- **规则 R3**：连续 3 次 ≥80% 晋级触发
- **规则 R4**：15 分钟护眼硬锁

---

## 🚀 Day 1-2: Task 1 - 后端基础设施

### 快速执行脚本

工程直接建在仓库根目录；契约文件只保留根目录一份，`apps/api` 通过 npm workspace 引用：

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run db:verify
npm run build
npm run start:dev   # 开发模式；生产用 npm run start
```

数据源与字段说明：
- 13 张操作卡：`vmi_tis_prototype.html` L1847-1861
- 6 名示例学生：`vmi_tis_prototype.html` L1741-1844
- 原型每卡只有 7 个字段；`targetSkill / procedureStepsJson / passCriteria / digitalGameMode / parentTaskJson` 按卡片语义补写，`cardCode` 规范化为 `Mx-x-x`。

### 验收标准（完成后自查）
```bash
# ✅ 数据库文件存在（在仓库根目录执行）
ls apps/api/data/vmi_tis.db

# ✅ Prisma Studio 显示 13 张操作卡
npx prisma studio --schema prisma/schema.prisma
# 打开浏览器后导航至 sop_cards 表，确认有 13 条记录

# ✅ start_standalone.bat 脚本生成
grep "星眸智康" deploy/start_standalone.bat
# 预期输出包含启动脚本内容
```

---

## 🚀 Day 3-4: Task 2 - 学生档案 + 红区熔断

### 核心文件清单（按顺序创建）
1. `src/prisma/prisma.module.ts` - Prisma 模块封装
2. `src/prisma/prisma.service.ts` - PrismaClient 单例
3. `src/students/students.module.ts`
4. `src/students/students.controller.ts`
5. `src/students/students.service.ts`
6. `src/students/dto/create-student.dto.ts`
7. `src/assessments/triage.service.ts` - **红区检测核心逻辑（规则 R1）**
8. `src/common/guards/red-zone.guard.ts` - **排课拦截中间件**

### 关键代码模板（红区熔断）
```typescript
// src/assessments/triage.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTriageDto } from '@vmi-tis/shared-types';

@Injectable()
export class TriageService {
  constructor(private prisma: PrismaService) {}

  async submitTriage(dto: SubmitTriageDto) {
    const redZoneItems: string[] = [];
    
    // 检测屈光参差 ≥ 2.00D（参考原型 L1928）
    const refractionDiff = dto.behaviorItems.find(
      item => item.item === '屈光参差（左右眼度数差异）'
    );
    if (refractionDiff && refractionDiff.score >= 2.0) {
      redZoneItems.push('屈光参差 ≥ 2.00D');
    }
    
    // 检测斜视阳性
    const strabismus = dto.behaviorItems.find(
      item => item.item.includes('斜视')
    );
    if (strabismus && strabismus.score > 0) {
      redZoneItems.push('斜视阳性');
    }
    
    const isRedZone = redZoneItems.length > 0;
    
    // 创建转介记录
    const referral = await this.prisma.assessmentTriageReferral.create({
      data: {
        studentId: dto.studentId,
        behaviorItemsJson: JSON.stringify(dto.behaviorItems),
        redZoneItemsJson: JSON.stringify(redZoneItems),
        isRedZone,
        referralCode: isRedZone ? this.generateReferralCode() : null,
        auditStatus: isRedZone ? 'PENDING' : 'APPROVED',
      },
    });
    
    // 红区自动锁定学生状态
    if (isRedZone) {
      await this.prisma.student.update({
        where: { id: dto.studentId },
        data: { triageStatus: 'RED_ZONE_LOCKED' },
      });
    }
    
    return referral;
  }
  
  private generateReferralCode(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seq = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `REF-${date}-${seq}`;
  }
}
```

### 验收测试脚本
```bash
# 1. 启动开发服务器
npm run start:dev

# 2. 创建测试学生
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name":"测试学生",
    "birthDate":"2018-01-01",
    "schoolScene":"测试机构",
    "primaryTherapistId":"test_therapist"
  }'
# 记录返回的 studentId

# 3. 提交红区初筛
curl -X POST http://localhost:3000/api/assessments/triage \
  -H "Content-Type: application/json" \
  -d '{
    "studentId":"<上面的studentId>",
    "behaviorItems":[
      {"item":"屈光参差（左右眼度数差异）","score":2.5}
    ],
    "redZoneItems":[]
  }'
# 说明：redZoneItems 由服务端重新计算，这里传空数组以满足 DTO 必填约束
# 预期：返回 isRedZone: true

# 4. 验证排课拦截
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{"studentId":"<上面的studentId>"}'
# 预期：返回 403 Forbidden + 错误信息
```

---

## 🚀 Day 5-8: Task 3 & 4 - 评估 + 训练核心

### 核心逻辑优先级
1. **规则 R2（Day 5）**：连续 3 题 0 分自动中止
   - 文件：`src/assessments/assessment-record.service.ts`
   - 原型参考：L2164-2178

2. **规则 R3（Day 6）**：连续 3 次 ≥80% 晋级触发
   - 文件：`src/iep/promotion-check.service.ts`
   - 原型参考：L2377-2391

3. **规则 R4（Day 7）**：15 分钟护眼硬锁
   - 文件：`src/common/guards/digital-limit.guard.ts`
   - 原型参考：L2776-2788

4. **L0-L5 自动分级算法（Day 8）**
   - 文件：`src/assessments/auto-level.service.ts`
   - 需求文档参考：vmi_tis.md L200-208

### 快速验证命令
```bash
# 规则 R2 测试
curl -X POST http://localhost:3000/api/assessments/scale-score \
  -d '{"sessionId":"xxx","score":0}'
# 连续提交 3 次，第 3 次应返回 shouldTerminate: true

# 规则 R3 测试
# 创建 3 次课记录（accuracyRate: 0.85, 0.88, 0.90）
curl -X POST http://localhost:3000/api/sessions/:id/finish
# 查询学生状态，应为 PROMOTION_READY

# 规则 R4 测试
curl -X POST http://localhost:3000/api/sessions/:id/trial \
  -d '{"result":"pass","promptLevel":1}'
# 累计 900 秒后再调用应返回 403
```

---

## 🚀 Day 9-10: Task 5 - React 工程化

### 快速搭建
```bash
# 1. 创建 Vite + React 工程
# 在仓库根目录执行
npm create vite@latest apps/web -- --template react-ts
cd apps/web
npm install

# 2. 安装依赖
npm install zustand socket.io-client chart.js axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. 配置 Tailwind（#0F4C5C 主题）
# 编辑 tailwind.config.js：
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'vmi-primary': '#0F4C5C',
        'vmi-secondary': '#0B3946',
      }
    }
  }
}

# 4. 创建页面目录
mkdir -p src/pages/{web,student,parent}
mkdir -p src/components
mkdir -p src/hooks
```

### 迁移优先级（按原型行号）
1. **工作台首页**：`HomePage.tsx` ← L115-330
2. **学生档案**：`StudentsPage.tsx` ← L332-461
3. **课堂记分台**：`SessionPage.tsx` ← L763-987（含盲操快捷键 L3036-3063）
4. **泡泡游戏**：`BubbleGame.tsx` ← L2590-2652

### 盲操快捷键模板
```typescript
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

export function useKeyboardShortcuts(
  onCorrect: () => void,
  onIncorrect: () => void,
  onAdjustPrompt: (direction: 'up' | 'down') => void,
  onNextStage: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框焦点
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      
      switch (e.key) {
        case ' ':
        case '1':
          e.preventDefault();
          onCorrect();
          break;
        case '0':
          e.preventDefault();
          onIncorrect();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onAdjustPrompt('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onAdjustPrompt('down');
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          onNextStage();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCorrect, onIncorrect, onAdjustPrompt, onNextStage]);
}
```

---

## 🚀 Day 11: Task 6 - WebSocket + Android

### WebSocket 服务端（20 分钟）
```bash
# 安装依赖
cd apps/api
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# 创建文件
touch src/websocket/websocket.gateway.ts
```

```typescript
// src/websocket/websocket.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'], // 降级保底
})
export class WebSocketGateway {
  @WebSocketServer()
  server: Server;
  
  @SubscribeMessage('SWITCH_PAD_TASK')
  handleSwitchPadTask(client: any, payload: any) {
    this.server.to(`student-${payload.studentId}`).emit('SWITCH_PAD_TASK', payload);
    return { success: true };
  }
}
```

### Android 打包（30 分钟）
```bash
cd apps/web
npm run build
npx cap init
npx cap add android
npx cap sync android
npx cap open android
# 在 Android Studio 中编译 APK
```

---

## ⚠️ 常见陷阱（必读）

### 陷阱 1：Prisma Schema 使用标量数组
```typescript
// ❌ 错误（SQLite 不支持）
materials: String[]

// ✅ 正确
materialsJson: String  // 存储：JSON.stringify(['镊子', '珠子'])
```

### 陷阱 2：子代理模型选择
```typescript
// ❌ 错误（会静默崩溃）
subagent({ role: 'coder', model: 'deepseek-flash' });

// ✅ 正确
subagent({ role: 'coder', model: 'glm:glm-5.3-flash' });
```

### 陷阱 3：原型行号偏差
```bash
# 错误：在原型 HTML 中找不到 nextStageSession() 函数
# 原因：函数名错误，真实名称是 selectSessionStage()
# 解决：查阅 vmi_tis.md L320-335 的真实函数名索引表
```

### 陷阱 4：忘记写来源注释
```typescript
// ❌ 错误：文件顶部无注释
export class StudentsService {}

// ✅ 正确
/**
 * 学生档案服务
 * 迁移自：vmi_tis_prototype.html L332-461
 * 契约：packages/shared-types/src/index.ts (Student / CreateStudentDto)
 */
export class StudentsService {}
```

---

## 📊 每日进度记录模板

```markdown
# VMI-TIS 开发进度日志

## 2026-10-19（第 1 天）
- ✅ Task 1.1: NestJS 工程初始化完成
- ✅ Task 1.2: Prisma Schema 推送成功（`./data/vmi_tis.db` 已生成）
- ⏳ Task 1.3: Seed 脚本编写中（13 张操作卡数据已提取）
- **遇到的问题：** 无
- **明天计划：** 完成 Seed 脚本 + 编写 start_standalone.bat

## 2026-10-20（第 2 天）
- ✅ Task 1.3: Seed 脚本完成（13 张操作卡 + 6 名学生导入成功）
- ✅ Task 1.4: `start_standalone.bat` 脚本编写完成
- ✅ Task 1.5: `docker-compose.yml` 编写完成
- **验收结果：** npx prisma studio 显示 13 条操作卡记录 ✅
- **明天计划：** 开始 Task 2（学生档案 CRUD）
```

---

## 🎯 最终交付检查（Week 6 结束）

```bash
# 功能完整性（18 项）
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

# 性能指标（5 项）
✅ 首屏加载 < 2 秒
✅ Canvas 帧率 > 55fps
✅ 投屏延迟 < 500ms
✅ 200+ 学生无卡顿
✅ 单机版启动 < 10 秒

# 数据库兼容性（3 项）
✅ SQLite/PostgreSQL 切换无缝
✅ Schema 无不兼容语法
✅ JSON 字段正确序列化
```

---

**准备好了吗？现在开始执行 Task 1！** 🚀

*本检查清单由 Claude Opus 生成于 2026-10-19，供 DeepSeek 快速上手使用。*
