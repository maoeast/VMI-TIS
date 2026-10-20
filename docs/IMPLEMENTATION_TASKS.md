# VMI-TIS 系统实施任务卡（6 张原子级 Task Card）

**生成日期：** 2026-10-19  
**架构师：** Claude Opus  
**执行者：** DeepSeek（高级全栈开发工程师）  
**审查者：** ChatGPT（质量保证官）

---

## 执行前置说明

### 基准文件（所有任务必读）
1. `prisma/schema.prisma` - 8 张表完整数据库 Schema
2. `packages/shared-types/src/index.ts` - 前后端共享类型契约
3. `docs/vmi_tis_prototype.html` - 3076 行完整三端交互原型（**严格以此为视觉 1:1 基准**）
4. `docs/vmi_tis.md` - 完整需求规格说明书 V2.1

### 硬性约束（所有任务通用）
1. **字段名强制一致**：必须与 `prisma/schema.prisma` 和 `shared-types/index.ts` 完全匹配，不得自行改名
2. **零省略号原则**：每个函数必须写出完整实现，严禁 `// TODO` 或 `...其余代码省略`
3. **视觉还原铁律**：UI 样式必须与 `vmi_tis_prototype.html` 的 Tailwind 类名和 `#0F4C5C` 深青色主题保持一致
4. **四大强制规则不可妥协**：
   - R1 红区熔断（L1928-1931）
   - R2 连续 3 题 0 分自动中止（L2164-2178）
   - R3 连续 3 次 ≥80% 晋级触发（L2377-2391）
   - R4 15 分钟护眼硬锁（护眼遮罩逻辑见 L2776-2788）
5. **数据库兼容性**：所有数组/对象必须用 `JSON.stringify()` 序列化为 `String`，严禁使用 `String[]` 标量数组

---

## Task 1: 后端基础设施与数据库初始化

### 目标
搭建 NestJS + Prisma + SQLite 后端工程骨架，生成 13 张操作卡与 6 名示例学生的 Seed 数据，实现零安装单机版与 Docker 服务器版双模部署脚本。

### 产出文件
```
apps/api/
├── src/
│   ├── main.ts                          # NestJS 启动入口，监听 3000 端口
│   ├── app.module.ts                    # 根模块（导入 PrismaModule, StudentsModule 等）
│   ├── prisma/
│   │   ├── prisma.module.ts             # Prisma 模块封装
│   │   ├── prisma.service.ts            # PrismaClient 单例服务
│   │   └── seed.ts                      # Seed 脚本（13 张操作卡 + 6 名学生）
│   └── config/
│       └── database.config.ts           # 根据 NODE_ENV 切换 SQLite/PostgreSQL
├── package.json                         # 添加 "prisma": { "seed": "ts-node --transpile-only src/prisma/seed.ts" }
└── tsconfig.json

deploy/
├── start_standalone.bat                 # Windows 单机版一键启动脚本
└── docker-compose.yml                   # PostgreSQL 服务器版 Docker 编排
```

### 关键逻辑实现

#### 1.1 Seed 脚本数据源（13 张操作卡）
从 `vmi_tis_prototype.html` L1847-1861 提取完整操作卡定义（`LIB_CARDS`，13 张）：
```javascript
// prisma/seed.ts 部分代码示例
const SOP_CARDS = [
  {
    cardCode: 'M1-1-1',
    cardLevel: 'L0',
    moduleName: 'M1 身体稳定与感统',
    cardTitle: '四点支撑 + 滑板推球',
    targetSkill: '身体中线交叉 · 双侧协调 · 肩胛稳定',
    materialsJson: JSON.stringify(['滑板车', '软球', '2m平地']),
    procedureStepsJson: JSON.stringify([
      '1. 治疗师将球放置于学生身体中线前方 2m 处',
      '2. 学生趴于滑板车，手撑地板四点滑行至球',
      '3. 单手推球滚动至墙面反弹，双手接住',
      '4. 重复 8 次，记录成功推球并接住的次数'
    ]),
    passCriteria: '连续 3 次课成功率 ≥ 75%（6/8 次）',
    digitalGameMode: null,
    parentTaskJson: JSON.stringify({
      taskName: '地板爬行推球',
      instruction: '在家中客厅铺设软垫，让孩子四点爬行并推动软球至对面墙壁'
    }),
    cueTextJson: JSON.stringify(['请趴在滑板上', '用手推动地面向前滑', '推球让它滚到墙边'])
  },
  // ... 其余 12 张操作卡（原型 L1848-1861 提供 code/mod/level/title/aid/cue/desc 七个字段）
];
```

#### 1.2 6 名示例学生数据
从 `vmi_tis_prototype.html` L1741-1844 提取（`STUDENT_DB`，6 名）：
```javascript
const SEED_STUDENTS = [
  {
    studentCode: 'VMI-2026001',
    name: '林小宇',
    gender: '男',
    birthDate: new Date('2018-03-15'),
    schoolScene: '南京市某小学资源教室',
    currentLevel: 'L2',
    triageStatus: 'GREEN_ACTIVE',
    promotionStatus: 'PROMOTION_READY', // 已达晋级标准
    primaryTherapistId: 'therapist_zhou_min',
    parentPhone: '138****5678',
    chiefComplaint: '注意力分散，抄写慢且错漏多'
  },
  // ... 其余 5 名学生（完整数据见原型 L1741-1844）
];
```

#### 1.3 零安装单机版启动脚本（Windows bat）
参考需求文档 `vmi_tis.md` L285-295 的规格：
已实现文件：`deploy/start_standalone.bat`（配套 `deploy/run_api.bat`）。脚本负责端口检查、依赖/构建、`prisma db push`、`npm run db:seed`、健康检查、打开浏览器，并在退出时停止 API。

#### 1.4 Docker Compose 服务器版
参考需求文档 L297-305：
已实现文件：`deploy/docker-compose.yml`（配套 `apps/api/Dockerfile`）。关键点：PostgreSQL 15 + API 双服务；构建期按 PostgreSQL provider 生成 Schema；启动时执行 `prisma db push`、Seed，再启动 API。

### 验收标准（供 ChatGPT 审查）
- [ ] `npm run db:push` 在 SQLite 模式下成功生成 `apps/api/data/vmi_tis.db`
- [ ] `npm run db:seed` 导入 13 张操作卡 + 6 名学生；`npm run db:verify` 全部通过（`sop_cards = 13`、`students = 6`）
- [ ] `start_standalone.bat` 双击后自动打开浏览器访问 `http://localhost:3000`
- [ ] `docker-compose up` 启动后，容器健康检查通过且 API 接口 `GET /api/health` 返回 200
- [ ] 切换 `provider` 为 PostgreSQL 并设置对应 `DATABASE_URL` 后，相同 Seed 脚本无需修改即可运行

---

## Task 2: 学生档案 CRUD 与红区熔断 API

### 目标
实现学生档案的创建、查询、更新、删除接口，以及核心业务规则 R1（红区熔断状态机）的后端校验逻辑。

### 产出文件
```
apps/api/src/
├── students/
│   ├── students.module.ts
│   ├── students.controller.ts          # RESTful 端点
│   ├── students.service.ts             # 业务逻辑 + Prisma 操作
│   └── dto/
│       ├── create-student.dto.ts       # CreateStudentDto
│       ├── update-student.dto.ts
│       ├── import-excel.dto.ts
│       └── student-query.dto.ts
├── assessments/
│   ├── assessments.module.ts
│   ├── triage.controller.ts            # 初筛与红区检测
│   ├── triage.service.ts               # 红区熔断逻辑实现
│   └── dto/
│       ├── submit-triage.dto.ts
│       └── audit-referral.dto.ts
└── common/
    ├── filters/
    │   └── http-exception.filter.ts    # 全局异常过滤器（403 红区拦截响应）
    └── interceptors/
        └── audit-log.interceptor.ts    # AuditLog 自动记录拦截器
```

### 关键逻辑实现

#### 2.1 红区熔断状态机（规则 R1）
参考原型 `vmi_tis_prototype.html` L1928-1931（红区硬拦截逻辑）：
```typescript
// apps/api/src/assessments/triage.service.ts
export class TriageService {
  async submitTriage(dto: SubmitTriageDto): Promise<AssessmentTriageReferral> {
    const redZoneItems: string[] = [];
    
    // 检测屈光参差 ≥ 2.00D
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
      
      // 审计日志
      await this.auditLogService.log({
        action: 'RED_ZONE_LOCK',
        targetType: 'student',
        targetId: dto.studentId,
        changesAfter: { triageStatus: 'RED_ZONE_LOCKED', redZoneItems },
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

#### 2.2 红区拦截中间件（排课接口前置检查）
```typescript
// apps/api/src/common/guards/red-zone.guard.ts
@Injectable()
export class RedZoneGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const studentId = request.body.studentId || request.params.studentId;
    
    if (!studentId) return true; // 无学生 ID 放行
    
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { triageStatus: true },
    });
    
    // 红区状态直接拦截
    if (student.triageStatus === 'RED_ZONE_LOCKED' || 
        student.triageStatus === 'REFERRAL_UPLOADED') {
      throw new ForbiddenException(
        '该学生处于红区锁定状态，必须完成眼科会诊并通过视光师审核后方可排课'
      );
    }
    
    return true;
  }
}
```

#### 2.3 Excel 批量导入功能（M2 优化项）
参考原型 L2951-2964（Excel 导入按钮与解析逻辑）：
```typescript
// apps/api/src/students/students.controller.ts
@Post('import-excel')
@UseInterceptors(FileInterceptor('file'))
async importExcel(
  @UploadedFile() file: Express.Multer.File,
): Promise<ImportExcelResponseDto> {
  const workbook = XLSX.read(file.buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet);
  
  const results = { success: true, imported: 0, failed: 0, errors: [] };
  
  for (let i = 0; i < rows.length; i++) {
    try {
      await this.studentsService.create({
        name: rows[i]['姓名'],
        gender: rows[i]['性别'],
        birthDate: new Date(rows[i]['出生日期']),
        schoolScene: rows[i]['所在机构'],
        primaryTherapistId: rows[i]['主责治疗师'],
      });
      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 2, // Excel 行号从 2 开始（第 1 行是表头）
        reason: error.message,
      });
    }
  }
  
  // 审计日志
  await this.auditLogService.log({
    action: 'IMPORT_EXCEL',
    targetType: 'student',
    targetId: 'batch',
    changesAfter: { imported: results.imported, failed: results.failed },
  });
  
  return results;
}
```

### 验收标准（供 ChatGPT 审查）
- [ ] `POST /api/students` 创建学生后返回完整 Student 对象（包含自动生成的 `studentCode`）
- [ ] `GET /api/students?level=L2&triageStatus=GREEN_ACTIVE` 筛选查询返回正确结果
- [ ] 提交初筛时检测到屈光参差 ≥ 2.00D，学生状态自动变为 `RED_ZONE_LOCKED`
- [ ] 红区学生调用 `POST /api/schedules`（排课接口）时返回 `403 Forbidden` 并拒绝操作
- [ ] Excel 批量导入 50 名学生耗时 < 5 秒，失败行记录到 `errors` 数组
- [ ] 所有修改操作自动写入 `audit_logs` 表（`action: 'CREATE_STUDENT'` / `'RED_ZONE_LOCK'`）

---

## Task 3: 四层评估与自动分级算法

### 目标
实现 Beery VMI-6 / TVPS-4 / MVPT-3 / DEM / NPC / NSUCO 六大评估工具的数据录入与自动分级算法（L0-L5），以及规则 R2（连续 3 题 0 分自动中止）。

### 产出文件
```
apps/api/src/assessments/
├── assessment-record.controller.ts
├── assessment-record.service.ts
├── assessment-grading.service.ts      # 输入映射 + 调用种子 5 个纯函数
├── report.service.ts                  # HTML 报告（含 assessmentMetaJson 段落）
└── dto/
    ├── submit-scale-score.dto.ts
    ├── create-assessment-record.dto.ts
    └── assessment-record-query.dto.ts
```

### 关键逻辑实现

#### 3.1 连续 3 题 0 分自动中止（规则 R2）
参考原型 L2164-2178（评估量表判分逻辑）；当前实现（`AssessmentRecordService.submitScaleScore`）：
```typescript
const scores = this.recentScores.get(sessionKey) ?? [];
if (dto.score !== undefined) scores.push(dto.score);
this.recentScores.set(sessionKey, scores);

// 唯一公式源：种子文件的连续 3 题 0 分中止函数
const ceiling = evaluateCeilingRule(scores as Array<0 | 1 | null>);
if (ceiling.shouldTerminate) this.terminatedSessions.add(sessionKey);
```

响应保留 `lastThree` / `message`，并返回 `consecutiveZeroCount` / `ceilingItemIndex` / `totalRawScore`；状态键含 `studentId + evalPhase + sessionId`，`reset` 清空该键。中止后保留累计 `scores` 与 `totalRawScore`，会话标记为已中止并拒绝继续提交，直到 `reset`。

#### 3.2 L0-L5 综合定级算法

唯一公式源是种子文件的 `determineRecommendedLevelL0ToL5`。`AssessmentGradingService` 负责：
- 按学生出生日期计算精确月龄/年龄；
- 原始分优先调用 `calculateBeeryVmiNorms` / `calculateTvps4ProfileNorms` / `evaluateDemTestResult`；
- 映射 `stabilityPass` / `quadrupedHoldSec` / `classroomCopyAccuracyPct` / NSUCO 最低分 / 红区布尔；
- 调用定级函数，把原始输入、换算结果与定级分析写入 `assessmentMetaJson`，`autoLevel` 回写 `student.currentLevel`。

红区返回的 `triageStatus` 只写 meta，不回写学生 `triageStatus`（R1 只归 `TriageService`）。

### 验收标准（供 ChatGPT 审查）
- [ ] 提交评估时连续 3 题 0 分，接口返回 `shouldTerminate: true` 并保存当前进度
- [ ] 自动分级算法：NPC = 12cm → 输出 `L1`；TVPS-4 = 75 且 Beery VMI = 85 → 输出 `L2`
- [ ] `GET /api/assessments/:studentId/records` 返回该学生所有评估记录（按 `evalPhase` 分组）
- [ ] 评估报告生成接口 `POST /api/assessments/:id/generate-report` 返回 PDF 文件 URL

---

## Task 4: IEP 计划与课堂训练记分台

### 目标
实现 IEP 计划的创建与晋级审批流程，以及课堂训练五段式记分台的后端 API，包含规则 R3（连续 3 次 ≥80% 晋级触发）和规则 R4（15 分钟护眼硬锁）。

### 产出文件
```
apps/api/src/
├── iep/
│   ├── iep.module.ts
│   ├── iep.controller.ts
│   ├── iep.service.ts
│   └── promotion-check.service.ts     # 晋级触发检查逻辑
├── sessions/
│   ├── sessions.module.ts
│   ├── sessions.controller.ts
│   ├── sessions.service.ts
│   └── dto/
│       ├── start-session.dto.ts
│       ├── record-trial.dto.ts
│       └── finish-session.dto.ts
└── common/
    └── guards/
        └── digital-limit.guard.ts     # 15 分钟护眼守卫
```

### 关键逻辑实现

#### 4.1 连续 3 次 ≥80% 晋级触发（规则 R3）
参考原型 L2377-2391（晋级判定逻辑）：
```typescript
// apps/api/src/iep/promotion-check.service.ts
export class PromotionCheckService {
  async checkPromotionCriteria(
    studentId: string,
    cardId: string,
  ): Promise<PromotionCheckResult> {
    // 查询最近 3 次课记录
    const recentSessions = await this.prisma.trainingSession.findMany({
      where: {
        studentId,
        sopCardId: cardId,
        isFinished: true,
      },
      orderBy: { sessionDate: 'desc' },
      take: 3,
    });
    
    if (recentSessions.length < 3) {
      return {
        canPromote: false,
        recentSessions: [],
        materialCount: 0,
        homeCheckinCount: 0,
        reason: '课时不足 3 次',
      };
    }
    
    // 检查正确率
    const allAbove80 = recentSessions.every(s => s.accuracyRate >= 0.80);
    
    if (!allAbove80) {
      return {
        canPromote: false,
        recentSessions: recentSessions.map(s => ({
          sessionNumber: s.sessionNumber,
          accuracyRate: s.accuracyRate,
        })),
        materialCount: 0,
        homeCheckinCount: 0,
        reason: '最近 3 次课未全部达到 80%',
      };
    }
    
    // 检查跨材料数量（至少 2 种）
    const uniqueMaterials = new Set(
      recentSessions.map(s => JSON.parse(s.trialsJson)[0]?.material)
    ).size;
    
    // 检查家庭打卡次数（至少 1 次）
    const homeCheckinCount = await this.prisma.homeworkCheckin.count({
      where: {
        studentId,
        taskName: { contains: cardId },
        status: 'COMPLETED',
      },
    });
    
    const canPromote = uniqueMaterials >= 2 && homeCheckinCount >= 1;
    
    if (canPromote) {
      // 自动标记为待审批
      await this.prisma.student.update({
        where: { id: studentId },
        data: { promotionStatus: 'PROMOTION_READY' },
      });
      
      // 审计日志
      await this.auditLogService.log({
        action: 'APPROVE_PROMOTION',
        targetType: 'student',
        targetId: studentId,
        changesAfter: {
          promotionStatus: 'PROMOTION_READY',
          reason: `连续 3 次课 ≥80%（${recentSessions.map(s => s.accuracyRate).join(', ')}），跨 ${uniqueMaterials} 种材料，家庭打卡 ${homeCheckinCount} 次`,
        },
      });
    }
    
    return {
      canPromote,
      recentSessions: recentSessions.map(s => ({
        sessionNumber: s.sessionNumber,
        accuracyRate: s.accuracyRate,
      })),
      materialCount: uniqueMaterials,
      homeCheckinCount,
      reason: canPromote ? undefined : `材料数 ${uniqueMaterials}/2，打卡 ${homeCheckinCount}/1`,
    };
  }
}
```

#### 4.2 15 分钟护眼硬锁（规则 R4）
参考原型 L2776-2788（护眼遮罩逻辑）：
```typescript
// apps/api/src/common/guards/digital-limit.guard.ts
@Injectable()
export class DigitalLimitGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.params.id;
    
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: { digitalDurationSec: true },
    });
    
    // 累计数字训练时长超过 900 秒（15 分钟）
    if (session.digitalDurationSec >= 900) {
      throw new ForbiddenException({
        statusCode: 403,
        message: '本次课数字训练时长已达 15 分钟上限，请切换至实体操作卡训练',
        remainingQuotaSec: 0,
      });
    }
    
    return true;
  }
}
```

### 验收标准（供 ChatGPT 审查）
- [ ] 创建 IEP 计划后，`weeklyScheduleJson` 字段正确序列化为 JSON 字符串
- [ ] 学生连续 3 次课正确率分别为 85%, 88%, 90%，且完成 2 种材料 + 1 次打卡，自动标记为 `PROMOTION_READY`
- [ ] 课堂记分台记录单回合 `POST /api/sessions/:id/trial`，累计 10 个 Trial 后正确计算 `accuracyRate`
- [ ] 数字训练累计 900 秒后，再次调用 `POST /api/sessions/:id/trial` 返回 `403` 并提示切换实体训练
- [ ] 五段式环节切换 `PATCH /api/sessions/:id/stage` 从 Stage 3 切换至 Stage 4 时，前端收到 WebSocket 推送

---

## Task 5: 前端 React 工程化与三终端迁移

### 目标
将原型 HTML 的 3076 行 JavaScript 逻辑迁移到 React 18 + TypeScript + Vite 工程，实现三终端（教师 Web 工作台、学生 Pad 端、家长小程序）的组件化拆分。

### 产出文件
```
apps/web/
├── src/
│   ├── main.tsx                        # React 入口
│   ├── App.tsx                         # 路由配置
│   ├── store/
│   │   └── useAppStore.ts              # Zustand 全局状态管理
│   ├── pages/
│   │   ├── web/
│   │   │   ├── HomePage.tsx            # 工作台首页（原型 L115-330）
│   │   │   ├── StudentsPage.tsx        # 学生档案中心（原型 L332-461）
│   │   │   ├── AssessmentPage.tsx      # 在线评估中心（原型 L463-619）
│   │   │   ├── IepPage.tsx             # IEP 计划管理（原型 L621-761）
│   │   │   ├── SessionPage.tsx         # 课堂记分台（原型 L763-987）
│   │   │   ├── AnalyticsPage.tsx       # 数据分析看板（原型 L989-1068）
│   │   │   ├── HomeschoolPage.tsx      # 家校作业打卡（原型 L1070-1203）
│   │   │   ├── LibraryPage.tsx         # 操作卡资源库（原型 L1205-1443）
│   │   │   └── SettingsPage.tsx        # 系统设置（原型 L1445-1543）
│   │   ├── student/
│   │   │   ├── BubbleGame.tsx          # 泡泡追追看（原型 L2590-2652）
│   │   │   ├── BrockGame.tsx           # 聚散球（原型 L2654-2698）
│   │   │   ├── StarGame.tsx            # 找星星（原型 L2700-2751）
│   │   │   └── CalibrationGame.tsx     # 眼动校准（原型 L2753-2774）
│   │   └── parent/
│   │       ├── TasksTab.tsx            # 今日任务（原型 L1864-1937）
│   │       ├── VideosTab.tsx           # 视频打卡（原型 L1939-2024）
│   │       ├── ProgressTab.tsx         # 成长曲线（原型 L2026-2095）
│   │       └── ChatTab.tsx             # 家校留言（原型 L2097-2174）
│   ├── components/
│   │   ├── Header.tsx                  # 顶部导航栏（原型 L52-79）
│   │   ├── Sidebar.tsx                 # 侧边栏（原型 L81-113）
│   │   ├── Toast.tsx                   # 全局提示（原型 L2990-2997）
│   │   └── TrialBox.tsx                # Trial 记分盒子（原型 L2329-2356）
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts     # 盲操快捷键（原型 L3036-3063）
│   │   └── useWebSocket.ts             # 双屏同步
│   └── styles/
│       └── tailwind.css                # Tailwind 配置（保持 #0F4C5C 主题）
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 关键逻辑实现

#### 5.1 盲操快捷键（M1 优化项）
参考原型 L3036-3063（键盘事件监听）：
```typescript
// apps/web/src/hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts(
  onCorrect: () => void,
  onIncorrect: () => void,
  onAdjustPrompt: (direction: 'up' | 'down') => void,
  onNextStage: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框焦点状态
      if ((e.target as HTMLElement).tagName === 'INPUT' ||
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      
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

#### 5.2 Canvas 游戏迁移示例（泡泡追追看）
参考原型 L2590-2652（Canvas 60fps 动画循环）：
```typescript
// apps/web/src/pages/student/BubbleGame.tsx
export function BubbleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    let animationId: number;
    let bubbles: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    
    // 初始化泡泡
    for (let i = 0; i < 5; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
      });
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制并更新泡泡
      bubbles.forEach(bubble => {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 更新位置
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;
        
        // 边界反弹
        if (bubble.x < 20 || bubble.x > canvas.width - 20) bubble.vx *= -1;
        if (bubble.y < 20 || bubble.y > canvas.height - 20) bubble.vy *= -1;
      });
      
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 碰撞检测
    bubbles = bubbles.filter(bubble => {
      const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
      if (distance < 20) {
        setScore(prev => prev + 1);
        return false; // 移除被点击的泡泡
      }
      return true;
    });
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0B3946]">
      <h1 className="text-2xl text-white mb-4">泡泡追追看 · 得分：{score}</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-4 border-teal-500 rounded-xl"
        onClick={handleClick}
      />
    </div>
  );
}
```

### 验收标准（供 ChatGPT 审查）
- [ ] `npm run dev` 启动后，浏览器访问 `http://localhost:5173` 显示完整三终端切换界面
- [ ] 教师工作台 9 个页面的 Tailwind 样式类与原型 HTML 完全一致（颜色 `#0F4C5C`、圆角 `rounded-xl`）
- [ ] 课堂记分台按下空格键触发"记录成功"，按 `0` 触发"记录失误"，快捷键在输入框聚焦时不生效
- [ ] Canvas 泡泡游戏帧率稳定在 60fps，点击泡泡时碰撞检测准确
- [ ] 学生端累计数字训练 900 秒后，自动弹出护眼遮罩并禁止继续游戏

---

## Task 6: WebSocket 双屏同步与 Capacitor Android 打包

### 目标
实现 Socket.io 双屏投屏控制（教师端 → 学生端游戏切换），以及 Capacitor Android APK 打包配置（全屏沉浸 + 局域网配网）。

### 产出文件
```
apps/api/src/
└── websocket/
    ├── websocket.module.ts
    ├── websocket.gateway.ts            # Socket.io 服务端
    └── events/
        ├── switch-pad-task.event.ts
        ├── pad-trial-completed.event.ts
        └── eyetracker-stream.event.ts

apps/web/
├── capacitor.config.ts                 # Capacitor 配置（Android 全屏沉浸）
├── android/                            # 自动生成的 Android 原生工程
└── src/
    └── plugins/
        ├── kiosk-mode.plugin.ts        # Android 全屏防误触插件
        └── network-config.plugin.ts    # 局域网扫码配网插件
```

### 关键逻辑实现

#### 6.1 WebSocket 双屏同步
参考需求文档 L434-462（双屏协议规范）：
```typescript
// apps/api/src/websocket/websocket.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'], // 降级保底
})
export class WebSocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;
  
  // 教师端 → 学生端：投屏切换游戏
  @SubscribeMessage('SWITCH_PAD_TASK')
  handleSwitchPadTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SwitchPadTaskPayload,
  ) {
    // 广播至指定学生的设备
    this.server
      .to(`student-${payload.studentId}`)
      .emit('SWITCH_PAD_TASK', payload);
    
    return { success: true, message: '已投屏至学生端' };
  }
  
  // 学生端 → 教师端：游戏回合完成
  @SubscribeMessage('PAD_TRIAL_COMPLETED')
  async handlePadTrialCompleted(
    @MessageBody() payload: PadTrialCompletedPayload,
  ) {
    // 保存回合数据到数据库
    await this.sessionsService.recordTrial({
      studentId: payload.studentId,
      result: payload.accuracyRate >= 0.8 ? 'pass' : 'fail',
      promptLevel: 1, // 数字游戏默认独立完成
    });
    
    // 推送至教师端
    this.server
      .to(`therapist-room`)
      .emit('PAD_TRIAL_COMPLETED', payload);
  }
  
  handleConnection(client: Socket) {
    // 学生端设备加入房间
    const studentId = client.handshake.query.studentId as string;
    if (studentId) {
      client.join(`student-${studentId}`);
    }
    
    // 教师端加入房间
    const role = client.handshake.query.role as string;
    if (role === 'therapist') {
      client.join('therapist-room');
    }
  }
}
```

#### 6.2 Capacitor Android 配置
参考需求文档 L173-186（Capacitor 规范）：
```typescript
// apps/web/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vmi.tis.student',
  appName: '星眸智康训练系统',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0B3946',
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
```

#### 6.3 Android 全屏沉浸插件（Kiosk 模式）
```kotlin
// apps/web/android/app/src/main/java/com/vmi/tis/KioskModePlugin.kt
package com.vmi.tis

import android.view.View
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "KioskMode")
class KioskModePlugin : Plugin() {
  
  @PluginMethod
  fun enable(call: PluginCall) {
    activity.runOnUiThread {
      val decorView = activity.window.decorView
      decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_FULLSCREEN
        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      )
      activity.startLockTask() // 需设备管理员权限
      call.resolve()
    }
  }
  
  @PluginMethod
  fun disable(call: PluginCall) {
    activity.runOnUiThread {
      activity.stopLockTask()
      call.resolve()
    }
  }
}
```

### 验收标准（供 ChatGPT 审查）
- [ ] 教师端点击"投屏泡泡游戏"按钮，学生端 Canvas 游戏立即切换（延迟 < 500ms）
- [ ] 学生端完成一轮游戏后，教师端记分台自动收到正确率数据并更新 Trial 盒子
- [ ] WebSocket 连接失败时自动降级为 HTTP Long-Polling（通过 Chrome DevTools Network 验证）
- [ ] Android APK 在真机平板上安装后，全屏沉浸模式生效（状态栏和虚拟按键隐藏）
- [ ] 学生端首次打开时弹出局域网配网弹窗，扫码后自动连接教师端服务器

---

## 全局验收标准（所有任务完成后）

### 功能完整性
- [ ] 红区熔断：学生状态为 `RED_ZONE_LOCKED` 时，排课接口返回 `403 Forbidden`
- [ ] 自动中止：评估量表连续 3 题 0 分，弹窗中止并保存进度
- [ ] 晋级触发：连续 3 次课 ≥80% + 2 种材料 + 1 次打卡 → 自动标记 `PROMOTION_READY`
- [ ] 护眼硬锁：学生端累计 900 秒数字训练，强制锁屏并提示教师解锁
- [ ] 盲操快捷键：课堂记分台 `Space/1` 记成功、`0` 记失败、`↑↓` 调提示、`N` 下一环节
- [ ] Excel 批量导入：50 名学生 < 5 秒完成，失败行记录到 `errors` 数组
- [ ] 审计日志：所有修改操作自动写入 `audit_logs` 表
- [ ] 视频清理：7 天前视频物理删除 + 状态标记 `VIDEO_EXPIRED_CLEANED`
- [ ] WebSocket 降级：医院内网拦截 WebSocket → 自动降级 HTTP Polling
- [ ] Android APK：真机平板全屏沉浸无误触

### 性能指标
- [ ] 页面首屏加载 < 2 秒
- [ ] Canvas 游戏帧率 > 55fps
- [ ] WebSocket 投屏延迟 < 500ms
- [ ] 支持 200+ 学生档案无卡顿
- [ ] SQLite 单机版启动 < 10 秒

### 数据库兼容性
- [ ] SQLite / PostgreSQL 切换后，相同 Seed 脚本无需修改即可运行
- [ ] Prisma Schema 无 SQLite 不支持语法（`String[]` / `@db.Timestamptz`）
- [ ] 所有 JSON 字段用 `JSON.stringify()` 序列化为 `String`

---

**任务卡编制完成。请 DeepSeek 按顺序逐张执行，ChatGPT 按验收标准逐项审查。**
