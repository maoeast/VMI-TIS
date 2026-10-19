import {
  GraduationCap,
  Monitor,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { StudentSelector } from './StudentSelector';

const TERMINALS = [
  { key: 'web', label: '教师工作台', icon: Monitor, path: '/web/home' },
  { key: 'student', label: '学生 Pad', icon: GraduationCap, path: '/student' },
  { key: 'parent', label: '家长端', icon: Smartphone, path: '/parent' },
] as const;

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const setTerminal = useAppStore((state) => state.setTerminal);
  const activeTerminal = useAppStore((state) => state.activeTerminal);

  const currentKey = location.pathname.startsWith('/student')
    ? 'student'
    : location.pathname.startsWith('/parent')
      ? 'parent'
      : 'web';

  return (
    <header className="sticky top-0 z-40 bg-[#0F4C5C] text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/20 text-teal-100">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">
              星眸智康 VMI-TIS
            </div>
            <div className="text-[11px] text-teal-100/80">
              孤独症学生视觉运动整合训练干预系统
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
            {TERMINALS.map((terminal) => {
              const Icon = terminal.icon;
              const active =
                currentKey === terminal.key ||
                (terminal.key === 'web' && activeTerminal === 'web');
              return (
                <button
                  key={terminal.key}
                  type="button"
                  onClick={() => {
                    setTerminal(terminal.key);
                    navigate(terminal.path);
                  }}
                  className={
                    active
                      ? 'flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#0F4C5C]'
                      : 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-100 hover:bg-white/10'
                  }
                >
                  <Icon className="h-4 w-4" />
                  {terminal.label}
                </button>
              );
            })}
          </div>
          <StudentSelector />
        </div>
      </div>
    </header>
  );
}
