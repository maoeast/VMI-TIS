import { create } from 'zustand';

export type Terminal = 'web' | 'student' | 'parent';
export type ToastKind = 'success' | 'error' | 'info';

interface AppState {
  activeTerminal: Terminal;
  activeWebPage: string;
  activeStudentId: string | null;
  studentsVersion: number;
  iepDraftCards: string[];
  toast: { message: string; kind: ToastKind } | null;
  setTerminal: (terminal: Terminal) => void;
  setWebPage: (page: string) => void;
  setActiveStudent: (id: string | null) => void;
  bumpStudentsVersion: () => void;
  addIepCard: (cardCode: string) => void;
  clearIepDraftCards: () => void;
  showToast: (message: string, kind?: ToastKind) => void;
  clearToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set) => ({
  activeTerminal: 'web',
  activeWebPage: 'home',
  activeStudentId: null,
  studentsVersion: 0,
  iepDraftCards: [],
  toast: null,
  setTerminal: (terminal) => set({ activeTerminal: terminal }),
  setWebPage: (page) => set({ activeWebPage: page }),
  setActiveStudent: (id) => set({ activeStudentId: id }),
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
