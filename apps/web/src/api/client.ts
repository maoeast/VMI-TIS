import type {
  AssessmentRecord,
  AssessmentTriageReferral,
  AuditLogQueryDto,
  AutoLevelInput,
  CreateIepPlanDto,
  CreateStudentDto,
  HomeworkCheckin,
  IepPlan,
  ImportExcelResponseDto,
  PromotionCheckResult,
  SopCard,
  Student,
  TrainingSession,
  TrialRecord,
  WorkbenchSummaryDto,
} from '@vmi-tis/shared-types';

const ACTOR = {
  id: 'therapist_zhou_min',
  name: '周敏',
  role: 'OT',
};

/** 单机/局域网部署时可设置 VITE_API_BASE=http://<服务器IP>:3000 */
const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const API_PREFIX = `${API_BASE}/api`;

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

function actorHeaders(): Record<string, string> {
  return {
    'x-user-id': ACTOR.id,
    'x-user-name': encodeURIComponent(ACTOR.name),
    'x-user-role': ACTOR.role,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...actorHeaders(),
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };

  const response = await fetch(`${API_PREFIX}${path}`, { ...options, headers });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      (body as { message?: string } | null)?.message ??
      `请求失败（HTTP ${response.status}）`;
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

async function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    headers: actorHeaders(),
    body: form,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      (body as { message?: string } | null)?.message ??
        `上传失败（HTTP ${response.status}）`,
    );
  }

  return body as T;
}

// ==================== 类型 ====================

export interface StudentListResponse {
  items: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentDetail extends Student {
  triageReferrals: AssessmentTriageReferral[];
  assessmentRecords: AssessmentRecord[];
  iepPlans: IepPlan[];
  trainingSessions: TrainingSession[];
  homeworkCheckins: HomeworkCheckin[];
}

export interface SessionDetail extends TrainingSession {
  student: Pick<Student, 'id' | 'studentCode' | 'name' | 'currentLevel'>;
  sopCard: SopCard;
}

export interface TrialResponse {
  session: TrainingSession;
  trialCount: number;
  accuracyRate: number;
  digitalDurationSec: number;
  remainingQuotaSec: number;
}

export interface FinishResponse {
  session: TrainingSession;
  promotion: PromotionCheckResult;
}

export interface ScaleScoreResponse {
  shouldTerminate: boolean;
  sessionId: string;
  submittedItems: number;
  lastThree: number[];
  message?: string;
}

export interface AssessmentRecordsResponse {
  studentId: string;
  total: number;
  groups: Record<string, AssessmentRecord[]>;
  records: AssessmentRecord[];
}

export interface ReportResponse {
  recordId: string;
  reportFileUrl: string;
  format: string;
  generatedAt: string;
}

export interface AnalyticsOverview {
  totalStudents: number;
  totalSessions: number;
  finishedSessions: number;
  averageAccuracy: number;
  levelDistribution: Record<string, number>;
  triageDistribution: Record<string, number>;
  recentSessions: Array<{
    id: string;
    date: string;
    studentName: string;
    sopCardTitle: string;
    accuracyRate: number;
    digitalDurationSec: number;
  }>;
}

export interface StudentAnalytics {
  student: {
    id: string;
    studentCode: string;
    name: string;
    currentLevel: string;
    triageStatus: string;
    promotionStatus: string;
  };
  totalSessions: number;
  finishedSessions: number;
  averageAccuracy: number;
  completedHomework: number;
  radarScores: Record<string, number>;
  accuracyTrend: Array<{
    date: string;
    accuracyRate: number;
    sopCardTitle: string;
  }>;
  digitalTrend: Array<{ date: string; digitalDurationSec: number }>;
  levelHistory: Array<{
    id: string;
    date: string;
    evalPhase: string;
    autoLevel: string | null;
  }>;
}

export interface HomeworkListResponse extends Array<HomeworkCheckin> {}

export interface StartSessionPayload {
  studentId: string;
  sopCardId?: string;
}

export interface RecordTrialPayload {
  result: 'pass' | 'fail';
  promptLevel: number;
  material?: string;
  digitalSeconds?: number;
  isDigital?: boolean;
}

export interface TriagePayload {
  studentId: string;
  behaviorItems: Array<{ item: string; score: number }>;
  redZoneItems?: string[];
}

export interface CreateAssessmentRecordPayload
  extends Partial<AutoLevelInput> {
  studentId: string;
  evalPhase: 'BASELINE' | 'STAGE_8W' | 'TRANSITION';
  beeryVmiRaw?: number;
  nsucoScore?: { pursuit: number; saccade: number; vergence?: number };
  radarScores?: Record<string, number>;
}

// ==================== API 方法 ====================

export const studentApi = {
  list: (params: Record<string, string | number | undefined> = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        search.set(key, String(value));
      }
    }
    const query = search.toString();
    return api.get<StudentListResponse>(
      `/students${query ? `?${query}` : ''}`,
    );
  },
  get: (id: string) => api.get<StudentDetail>(`/students/${id}`),
  create: (dto: CreateStudentDto) =>
    api.post<Student>('/students', dto),
  update: (id: string, dto: Partial<CreateStudentDto>) =>
    api.patch<Student>(`/students/${id}`, dto),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/students/${id}`),
  importExcel: (file: File) =>
    upload<ImportExcelResponseDto>('/students/import-excel', file),
};

export const sopCardApi = {
  list: (params: { level?: string; module?: string; keyword?: string } = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    return api.get<SopCard[]>(`/sop-cards${query ? `?${query}` : ''}`);
  },
};

export const workbenchApi = {
  summary: () => api.get<WorkbenchSummaryDto>('/workbench/summary'),
};

export const healthApi = {
  get: () =>
    api.get<{
      status: string;
      service: string;
      database: string;
      timestamp: string;
      uptimeSec: number;
    }>('/health'),
};

export const triageApi = {
  submit: (payload: TriagePayload) =>
    api.post<AssessmentTriageReferral>('/assessments/triage', payload),
  uploadReferral: (payload: {
    referralId: string;
    hospitalName: string;
    hospitalDiagnosis?: string;
    receiptFileUrl?: string;
  }) =>
    api.post<AssessmentTriageReferral>(
      '/assessments/referral-upload',
      payload,
    ),
  audit: (payload: {
    referralId: string;
    auditStatus: 'APPROVED' | 'REJECTED';
    auditedBy: string;
    hospitalDiagnosis?: string;
  }) =>
    api.post<AssessmentTriageReferral>(
      '/assessments/referral-audit',
      payload,
    ),
  list: (studentId: string) =>
    api.get<AssessmentTriageReferral[]>(
      `/assessments/referrals/${studentId}`,
    ),
};

export const assessmentApi = {
  submitScaleScore: (payload: {
    studentId: string;
    evalPhase: string;
    sessionId?: string;
    itemIndex?: number;
    score?: number;
    reset?: boolean;
  }) =>
    api.post<ScaleScoreResponse>('/assessments/scale-score', payload),
  createRecord: (payload: CreateAssessmentRecordPayload) =>
    api.post<AssessmentRecord>('/assessments/records', payload),
  records: (studentId: string, evalPhase?: string) =>
    api.get<AssessmentRecordsResponse>(
      `/assessments/${studentId}/records${
        evalPhase ? `?evalPhase=${evalPhase}` : ''
      }`,
    ),
  generateReport: (recordId: string) =>
    api.post<ReportResponse>(`/assessments/${recordId}/generate-report`),
};

export const iepApi = {
  list: (studentId?: string) =>
    api.get<IepPlan[]>(
      `/iep-plans${studentId ? `?studentId=${studentId}` : ''}`,
    ),
  create: (dto: CreateIepPlanDto) =>
    api.post<IepPlan>('/iep-plans', dto),
  approve: (id: string, approvedBy: string) =>
    api.post<IepPlan>(`/iep-plans/${id}/approve`, { approvedBy }),
  checkPromotion: (studentId: string) =>
    api.get<PromotionCheckResult>(`/promotions/${studentId}/check`),
  approvePromotion: (studentId: string, approvedBy: string) =>
    api.post<Student>(`/promotions/${studentId}/approve`, { approvedBy }),
};

export const sessionApi = {
  list: (studentId?: string) =>
    api.get<SessionDetail[]>(
      `/sessions${studentId ? `?studentId=${studentId}` : ''}`,
    ),
  get: (id: string) => api.get<SessionDetail>(`/sessions/${id}`),
  start: (payload: StartSessionPayload) =>
    api.post<SessionDetail>('/sessions', payload),
  recordTrial: (id: string, payload: RecordTrialPayload) =>
    api.post<TrialResponse>(`/sessions/${id}/trial`, payload),
  updateStage: (id: string, stage: number) =>
    api.patch<TrainingSession>(`/sessions/${id}/stage`, { stage }),
  addDigital: (id: string, seconds: number) =>
    api.post<{
      digitalDurationSec: number;
      remainingQuotaSec: number;
      locked: boolean;
    }>(`/sessions/${id}/digital`, { seconds }),
  digitalStart: (id: string) =>
    api.post<{
      allowed: boolean;
      remainingQuotaSec: number;
    }>(`/sessions/${id}/digital-start`),
  resetDigital: (id: string, authorizationCode: string) =>
    api.post<{
      digitalDurationSec: number;
      remainingQuotaSec: number;
    }>(`/sessions/${id}/digital-reset`, { authorizationCode }),
  finish: (id: string, payload: { therapistNotes?: string } = {}) =>
    api.post<FinishResponse>(`/sessions/${id}/finish`, payload),
};

export const homeworkApi = {
  list: (studentId?: string) =>
    api.get<HomeworkCheckin[]>(
      `/homework-checkins${studentId ? `?studentId=${studentId}` : ''}`,
    ),
  create: (payload: {
    studentId: string;
    taskName: string;
    durationMin?: number;
  }) => api.post<HomeworkCheckin>('/homework-checkins', payload),
  uploadVideo: (id: string, file: File) =>
    upload<{ videoUrl: string; fileName: string }>(
      `/homework-checkins/${id}/video`,
      file,
    ),
  checkin: (
    id: string,
    payload: {
      videoUrl?: string;
      videoDurationSec?: number;
      parentNote?: string;
    },
  ) => api.post<HomeworkCheckin>(`/homework-checkins/${id}/checkin`, payload),
  reply: (id: string, teacherReply: string) =>
    api.post<HomeworkCheckin>(`/homework-checkins/${id}/reply`, {
      teacherReply,
    }),
  parentMessage: (id: string, message: string) =>
    api.post<HomeworkCheckin>(`/homework-checkins/${id}/parent-message`, {
      message,
    }),
  cleanVideos: () =>
    api.post<{ scanned: number; cleaned: number; deletedFiles: number }>(
      '/homework-checkins/clean-expired-videos',
    ),
};

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview'),
  student: (id: string) =>
    api.get<StudentAnalytics>(`/analytics/student/${id}`),
};

export const auditApi = {
  list: (params: { action?: string; page?: number; pageSize?: number } = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        search.set(key, String(value));
      }
    }
    const query = search.toString();
    return api.get<AuditLogQueryDto>(`/audit-logs${query ? `?${query}` : ''}`);
  },
};

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseTrialRecords(value: string): TrialRecord[] {
  return parseJson<TrialRecord[]>(value, []);
}
