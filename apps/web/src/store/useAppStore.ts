import { create } from 'zustand';
import type { AssessmentCardChangePayload } from '@vmi-tis/shared-types';

export type Terminal = 'web' | 'student' | 'parent';
export type TerminalMode = 'all' | 'student' | 'teacher' | 'parent';
export type ToastKind = 'success' | 'error' | 'info';

const TERMINAL_MODES: readonly TerminalMode[] = [
  'all',
  'student',
  'teacher',
  'parent',
];

/**
 * 构建期终端模式归一化：空值与非法值一律按 `all`。
 * 路由守卫、Header 与本 store 的初始终端共用这一处判断，禁止各处各判一套。
 */
export function normalizeTerminal(value: unknown): TerminalMode {
  const raw = String(value ?? '').trim();
  return (TERMINAL_MODES as readonly string[]).includes(raw)
    ? (raw as TerminalMode)
    : 'all';
}

/** `VITE_TERMINAL` 在构建期注入、运行期不变，因此只求值一次。 */
export const TERMINAL_MODE = normalizeTerminal(import.meta.env.VITE_TERMINAL);

function initialTerminal(mode: TerminalMode): Terminal {
  if (mode === 'student' || mode === 'parent') {
    return mode;
  }
  return 'web';
}

interface AppState {
  activeTerminal: Terminal;
  activeWebPage: string;
  activeStudentId: string | null;
  studentsVersion: number;
  iepDraftCards: string[];
  toast: { message: string; kind: ToastKind } | null;
  /**
   * 教师端 `SWITCH_STUDENT` 发送槽：由 `TeacherLayout` 的 socket 写入，
   * `StudentSelector` 读取。socket 未连接（槽为 null）时选择器静默跳过。
   */
  teacherSwitchStudent: ((studentId: string) => void) | null;
  /**
   * 教师端 `ASSESSMENT_CARD_CHANGE` 发送槽：由 `TeacherLayout` 的 socket 写入，
   * 评估中心第 4 步读取。槽为 null（无教师 socket）时出示按钮禁用。
   */
  teacherEmitAssessmentCard:
    | ((payload: AssessmentCardChangePayload) => void)
    | null;
  setTerminal: (terminal: Terminal) => void;
  setWebPage: (page: string) => void;
  setActiveStudent: (id: string | null) => void;
  setTeacherSwitchStudent: (emit: ((studentId: string) => void) | null) => void;
  setTeacherEmitAssessmentCard: (
    emit: ((payload: AssessmentCardChangePayload) => void) | null,
  ) => void;
  bumpStudentsVersion: () => void;
  addIepCard: (cardCode: string) => void;
  clearIepDraftCards: () => void;
  showToast: (message: string, kind?: ToastKind) => void;
  clearToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set) => ({
  activeTerminal: initialTerminal(TERMINAL_MODE),
  activeWebPage: 'home',
  activeStudentId: null,
  studentsVersion: 0,
  iepDraftCards: [],
  toast: null,
  teacherSwitchStudent: null,
  teacherEmitAssessmentCard: null,
  setTerminal: (terminal) => set({ activeTerminal: terminal }),
  setWebPage: (page) => set({ activeWebPage: page }),
  setActiveStudent: (id) => set({ activeStudentId: id }),
  setTeacherSwitchStudent: (emit) => set({ teacherSwitchStudent: emit }),
  setTeacherEmitAssessmentCard: (emit) =>
    set({ teacherEmitAssessmentCard: emit }),
  bumpStudentsVersion: () =>
    set((state) => ({ studentsVersion: state.studentsVersion + 1 })),
  addIepCard: (cardCode) =>
    set((state) => ({
      iepDraftCards: state.iepDraftCards.includes(cardCode)
        ? state.iepDraftCards
        : [...state.iepDraftCards, cardCode],
    })),
  clearIepDraftCards: () => set({ iepDraftCards: [] }),
  showToast: (message, kind = 'info') => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    set({ toast: { message, kind } });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  clearToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    set({ toast: null });
  },
}));
