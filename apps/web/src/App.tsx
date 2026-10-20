import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { TeacherLayout } from './components/TeacherLayout';
import { Toast } from './components/Toast';
import { ParentAppPage } from './pages/parent/ParentAppPage';
import { StudentPadPage } from './pages/student/StudentPadPage';
import { TERMINAL_MODE, type TerminalMode } from './store/useAppStore';

/** 各终端模式的首页：根路径、未知路径与越权直链都回到这里。 */
const TERMINAL_HOME: Record<TerminalMode, string> = {
  all: '/web/home',
  student: '/student',
  teacher: '/web/home',
  parent: '/parent',
};

/** `all` 放行全部路由；其余模式只放行本终端前缀（`/student` 与 `/student/` 同属学生端）。 */
function isAllowedPath(mode: TerminalMode, pathname: string): boolean {
  switch (mode) {
    case 'student':
      return pathname === '/student' || pathname.startsWith('/student/');
    case 'teacher':
      return pathname === '/web' || pathname.startsWith('/web/');
    case 'parent':
      return pathname === '/parent' || pathname.startsWith('/parent/');
    default:
      return true;
  }
}

function TerminalGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!isAllowedPath(TERMINAL_MODE, location.pathname)) {
    return <Navigate to={TERMINAL_HOME[TERMINAL_MODE]} replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <TerminalGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/web/home" replace />} />
          <Route path="/web/:page" element={<TeacherLayout />} />
          <Route path="/student" element={<StudentPadPage />} />
          <Route path="/parent" element={<ParentAppPage />} />
          <Route path="*" element={<Navigate to="/web/home" replace />} />
        </Routes>
      </TerminalGuard>
      <Toast />
    </BrowserRouter>
  );
}
