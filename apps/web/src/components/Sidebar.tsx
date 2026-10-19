import {
  BarChart3,
  BookOpen,
  CalendarRange,
  ClipboardList,
  Home,
  Library,
  Settings,
  Users,
  Activity,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { key: 'home', label: '工作台首页', icon: Home },
  { key: 'students', label: '学生档案', icon: Users },
  { key: 'assessment', label: '评估中心', icon: ClipboardList },
  { key: 'iep', label: 'IEP 计划', icon: CalendarRange },
  { key: 'session', label: '课堂记分台', icon: Activity },
  { key: 'analytics', label: '数据画像', icon: BarChart3 },
  { key: 'homeschool', label: '家校作业', icon: BookOpen },
  { key: 'library', label: '操作卡库', icon: Library },
  { key: 'settings', label: '系统设置', icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="sticky top-[65px] h-[calc(100vh-65px)] w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white/90 px-3 py-4 backdrop-blur">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={`/web/${item.key}`}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-2.5 rounded-xl bg-[#0F4C5C] px-3 py-2.5 text-sm font-semibold text-white shadow-sm'
                  : 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100'
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl bg-teal-50 p-3 text-[11px] leading-5 text-teal-900">
        <div className="font-bold">今日提示</div>
        <div className="mt-1 text-teal-800/80">
          课堂记分台支持盲操：Space/1 记成功，0 记失败，↑↓ 调提示，N 下一环节。
        </div>
      </div>
    </aside>
  );
}
