/**
 * VMI-TIS 前后端共享 TypeScript 类型契约
 * 严格与 prisma/schema.prisma 保持一致
 * 所有枚举值必须与数据库字符串字段约束匹配
 */

// ==================== 枚举类型 ====================

/** 学生初筛分流状态（四阶段状态机，规则 R1 红区熔断） */
export enum StudentTriageStatus {
  /** 待初筛 */
  PENDING_SCREENING = 'PENDING_SCREENING',
  /** 红区锁定（屈光参差≥2.00D 或斜视阳性） */
  RED_ZONE_LOCKED = 'RED_ZONE_LOCKED',
  /** 眼科回执已上传待审核 */
  REFERRAL_UPLOADED = 'REFERRAL_UPLOADED',
  /** 绿区放行可排课 */
  GREEN_ACTIVE = 'GREEN_ACTIVE',
}

/** 学生能力层级（L0-L5 六层） */
export enum CapabilityLevel {
  L0 = 'L0', // 身体稳定与前庭本体
  L1 = 'L1', // 视觉效率（NPC、调节、追视扫视）
  L2 = 'L2', // 视觉感知（TVPS-4、MVPT-3）
  L3 = 'L3', // 视觉运动整合（Beery VMI-6、图形临摹）
  L4 = 'L4', // 适应应用（课堂抄写、文具使用）
  L5 = 'L5', // 生活迁移（穿衣、自理、社区参与）
}

/** 学生晋级状态 */
export enum PromotionStatus {
  /** 训练中 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 达标待审批（连续3次≥80% + 2种材料 + 1次家庭打卡） */
  PROMOTION_READY = 'PROMOTION_READY',
}

/** 评估阶段 */
export enum EvalPhase {
  /** 基线评估 */
  BASELINE = 'BASELINE',
  /** 阶段复评（第8周） */
  STAGE_8W = 'STAGE_8W',
  /** 转衔评估（毕业前） */
  TRANSITION = 'TRANSITION',
}

/** 转介单审核状态 */
export enum ReferralAuditStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** IEP 计划状态 */
export enum IepPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
}

/** 课堂五段式环节 */
export enum SessionStage {
  STAGE_1_WARMUP = 1,     // 签到唤醒 3min
  STAGE_2_REVIEW = 2,     // 复习联结 4min
  STAGE_3_CORE = 3,       // 核心新任务 13min
  STAGE_4_PRACTICE = 4,   // 巩固泛化 9min
  STAGE_5_CLOSURE = 5,    // 强化结束 4min
}

/** 提示层级（1最少提示 → 5最多提示） */
export enum PromptLevel {
  INDEPENDENT = 1,        // 独立完成
  VERBAL = 2,             // 言语提示
  GESTURE = 3,            // 手势提示
  SLOW_DEMO = 4,          // 慢速示范
  HAND_OVER_HAND = 5,     // 手把手辅助
}

/** 学生情绪状态 */
export enum EmotionStatus {
  ENGAGED = 'ENGAGED',           // 投入配合
  RESISTANT = 'RESISTANT',       // 畏难抗拒
  FATIGUED = 'FATIGUED',         // 疲劳分心
}

/** 家庭作业打卡状态 */
export enum HomeworkCheckinStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

/** 用户角色 */
export enum UserRole {
  OT = 'OT',                     // 作业治疗师
  PT = 'PT',                     // 物理治疗师
  OPTOMETRIST = 'OPTOMETRIST',   // 视光师
  TEACHER = 'TEACHER',           // 特教教师
  ADMIN = 'ADMIN',               // 系统管理员
}

/** 审计日志操作类型 */
export enum AuditAction {
  CREATE_STUDENT = 'CREATE_STUDENT',
  UPDATE_STUDENT = 'UPDATE_STUDENT',
  DELETE_STUDENT = 'DELETE_STUDENT',
  IMPORT_EXCEL = 'IMPORT_EXCEL',
  RED_ZONE_LOCK = 'RED_ZONE_LOCK',
  UNLOCK_RED_ZONE = 'UNLOCK_RED_ZONE',
  UPLOAD_REFERRAL = 'UPLOAD_REFERRAL',
  APPROVE_PROMOTION = 'APPROVE_PROMOTION',
  CRON_CLEAN_VIDEOS = 'CRON_CLEAN_VIDEOS',
  UPDATE_ASSESSMENT = 'UPDATE_ASSESSMENT',
  CREATE_IEP = 'CREATE_IEP',
  UPDATE_IEP = 'UPDATE_IEP',
  CREATE_SESSION = 'CREATE_SESSION',
  RECORD_TRIAL = 'RECORD_TRIAL',
  UPDATE_STAGE = 'UPDATE_STAGE',
  RESET_DIGITAL_LIMIT = 'RESET_DIGITAL_LIMIT',
  FINISH_SESSION = 'FINISH_SESSION',
  CREATE_HOMEWORK = 'CREATE_HOMEWORK',
  SUBMIT_CHECKIN = 'SUBMIT_CHECKIN',
  REPLY_CHECKIN = 'REPLY_CHECKIN',
}

// ==================== 数据库实体接口（与 Prisma Model 1:1 映射）====================

export interface Student {
  id: string;
  studentCode: string;
  name: string;
  gender?: string;
  birthDate: Date;
  schoolScene: string;
  currentLevel: CapabilityLevel;
  triageStatus: StudentTriageStatus;
  promotionStatus: PromotionStatus;
  primaryTherapistId: string;
  parentPhone?: string;
  chiefComplaint?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentTriageReferral {
  id: string;
  studentId: string;
  behaviorItemsJson: string; // JSON.stringify([{item, score}])
  redZoneItemsJson: string;  // JSON.stringify(['屈光参差', '外隐斜'])
  isRedZone: boolean;
  referralCode?: string;
  hospitalName?: string;
  hospitalDiagnosis?: string;
  receiptFileUrl?: string;
  auditStatus: ReferralAuditStatus;
  auditedBy?: string;
  auditedAt?: Date;
  createdAt: Date;
}

export interface AssessmentRecord {
  id: string;
  studentId: string;
  evalPhase: EvalPhase;
  acuityLeft?: string;
  acuityRight?: string;
  refractionStatus?: string;
  accomAmplitudeD?: number;
  accomFacilityCpm?: number;
  npcCm?: number;
  binocularTier?: string;
  nsucoScoreJson?: string; // JSON.stringify({pursuit:4, saccade:3, vergence:2})
  beeryVmiRaw?: number;
  beeryVmiStd?: number;
  beeryVpStd?: number;
  beeryMcStd?: number;
  tvps4Std?: number;
  mvpt3Std?: number;
  demNormTier?: string;
  radarScoresJson?: string; // JSON.stringify({stabilize:70, efficiency:68, ...})
  autoLevel?: CapabilityLevel;
  reportFileUrl?: string;
  createdAt: Date;
}

export interface SopCard {
  id: string;
  cardCode: string; // M1-1-1, M2-2-1
  cardLevel: CapabilityLevel;
  moduleName: string;
  cardTitle: string;
  targetSkill: string;
  materialsJson: string; // JSON.stringify(['镊子', '珠子'])
  procedureStepsJson: string;
  passCriteria: string;
  digitalGameMode?: 'bubble' | 'brock' | 'star' | null;
  parentTaskJson?: string;
  cueTextJson?: string; // JSON.stringify(['请看这里', '用镊子夹起珠子'])
  createdAt: Date;
}

export interface IepPlan {
  id: string;
  studentId: string;
  planPhase: number;
  targetLevel: CapabilityLevel;
  weeklyFrequency: number;
  sessionMinutes: number;
  digitalLimitMin: number;
  selectedCardsJson: string; // JSON.stringify(['M2-3-1', 'M2-3-2'])
  weeklyScheduleJson: string;
  homeworkFrequency: number;
  status: IepPlanStatus;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingSession {
  id: string;
  studentId: string;
  sopCardId: string;
  sessionDate: Date;
  sessionNumber: number;
  currentStage: SessionStage;
  trialsJson: string; // JSON.stringify([{result:'pass', promptLevel:2}])
  accuracyRate: number;
  digitalDurationSec: number;
  therapistNotes?: string;
  emotionStatus?: EmotionStatus;
  isFinished: boolean;
  finishedAt?: Date;
  createdAt: Date;
}

export interface HomeworkCheckin {
  id: string;
  studentId: string;
  taskName: string;
  durationMin: number;
  assignedDate: Date;
  dueDate: Date;
  status: HomeworkCheckinStatus;
  videoUrl?: string;
  videoDurationSec?: number;
  parentNote?: string;
  submittedAt?: Date;
  teacherReply?: string;
  repliedAt?: Date;
  scheduledDeleteAt?: Date; // submittedAt + 7 days
  videoDeletedAt?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  targetType: string;
  targetId: string;
  changesBeforeJson?: string;
  changesAfterJson?: string;
  ipAddress?: string;
  createdAt: Date;
}

// ==================== API 请求/响应 DTO ====================

/** POST /api/students 新建学生请求 */
export interface CreateStudentDto {
  name: string;
  gender?: string;
  birthDate: string; // ISO 8601
  schoolScene: string;
  primaryTherapistId: string;
  parentPhone?: string;
  chiefComplaint?: string;
}

/** POST /api/students/import-excel 批量导入学生响应 */
export interface ImportExcelResponseDto {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

/** POST /api/assessments/triage 提交初筛请求 */
export interface SubmitTriageDto {
  studentId: string;
  behaviorItems: Array<{ item: string; score: number }>;
  redZoneItems: string[]; // ['屈光参差', '外隐斜']
}

/** POST /api/assessments/referral-audit 审核眼科回执请求 */
export interface AuditReferralDto {
  referralId: string;
  auditStatus: ReferralAuditStatus;
  auditedBy: string;
  hospitalDiagnosis?: string;
}

/** POST /api/assessments/scale-score 提交量表逐题判分请求 */
export interface SubmitScaleScoreDto {
  studentId: string;
  evalPhase: EvalPhase;
  beeryVmiRaw?: number;
  tvps4Std?: number;
  mvpt3Std?: number;
  // ... 其他评估指标
}

/** POST /api/iep-plans 创建 IEP 计划请求 */
export interface CreateIepPlanDto {
  studentId: string;
  targetLevel: CapabilityLevel;
  weeklyFrequency: number;
  sessionMinutes: number;
  digitalLimitMin: number;
  selectedCards: string[]; // ['M2-3-1', 'M2-3-2']
  weeklySchedule: Record<string, string[]>; // {Mon: ['09:00', '14:00']}
  homeworkFrequency: number;
}

/** POST /api/sessions/:id/trial 记录单回合请求 */
export interface RecordTrialDto {
  result: 'pass' | 'fail';
  promptLevel: PromptLevel;
  /** 本回合使用的训练材料；用于 R3 跨材料判定（可选） */
  material?: string;
  /** 本回合数字训练秒数；用于 R4 护眼额度累计（可选） */
  digitalSeconds?: number;
  /** 本回合是否属于数字训练（可选） */
  isDigital?: boolean;
}

/** POST /api/sessions/:id/finish 结课请求 */
export interface FinishSessionDto {
  therapistNotes?: string;
  emotionStatus?: EmotionStatus;
}

/** GET /api/workbench/summary 工作台首页响应 */
export interface WorkbenchSummaryDto {
  todaySchedules: Array<{
    time: string;
    studentName: string;
    sopCardTitle: string;
  }>;
  activeStudentsCount: number;
  pendingPromotions: number;
  pendingReferrals: number;
  levelDistribution: Record<CapabilityLevel, number>;
}

/** GET /api/audit-logs 查询审计日志响应 */
export interface AuditLogQueryDto {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== WebSocket 双屏同步事件 ====================

/** 教师端 → 学生端：投屏切换游戏 */
export interface SwitchPadTaskPayload {
  event: 'SWITCH_PAD_TASK';
  studentId: string;
  gameMode: 'bubble' | 'brock' | 'star' | 'calibration';
  difficulty: {
    speed: number;
    trajectory: string;
    promptFade: string;
  };
  remainingEyeQuotaSec: number; // 剩余数字护眼额度（秒）
}

/** 学生端 → 教师端：游戏回合完成 */
export interface PadTrialCompletedPayload {
  event: 'PAD_TRIAL_COMPLETED';
  studentId: string;
  gameMode: string;
  accuracyRate: number;
  avgReactionTimeMs: number;
  smoothPursuitGain: number;
}

/** 眼动仪 60Hz 数据流帧 */
export interface EyeTrackerFramePayload {
  timestamp: number; // epoch ms
  gazeX: number;
  gazeY: number;
  leftPupilMm: number;
  rightPupilMm: number;
  headMovementFlag: boolean;
  validity: number; // 0-1
}

// ==================== 业务逻辑辅助类型 ====================

/** Trial 回合记录（序列化到 TrainingSession.trialsJson） */
export interface TrialRecord {
  result: 'pass' | 'fail';
  promptLevel: PromptLevel;
  material?: string;
  digitalSeconds?: number;
  timestamp?: number;
}

/** 红区预警项 */
export interface RedZoneItem {
  item: string; // '屈光参差', '外隐斜', '上下斜视'
  value: string;
}

/** 六维雷达图分数 */
export interface RadarScores {
  stabilize: number;   // 身体稳定
  efficiency: number;  // 视觉效率
  perception: number;  // 视觉感知
  integration: number; // 视觉运动整合
  adaptation: number;  // 适应应用
  transfer: number;    // 生活迁移
}

/** 自动评级算法输入 */
export interface AutoLevelInput {
  stabilityPass: boolean;
  npcCm?: number;
  accomFacilityCpm?: number;
  nsucoScore?: { pursuit: number; saccade: number };
  tvps4Std?: number;
  mvpt3Std?: number;
  beeryVmiStd?: number;
  /** 课堂抄写/文具使用补充评估；false → L4，true/未测 → L5 */
  classroomAdaptationPass?: boolean;
}

/** 晋级触发检查结果 */
export interface PromotionCheckResult {
  canPromote: boolean;
  recentSessions: Array<{
    sessionNumber: number;
    accuracyRate: number;
  }>;
  materialCount: number;
  homeCheckinCount: number;
  reason?: string;
}
